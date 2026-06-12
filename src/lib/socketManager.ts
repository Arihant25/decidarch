// ============================================================
// DecidArch V2 — WebSocket Manager
// ============================================================

import { WebSocket, WebSocketServer } from 'ws';
import { IncomingMessage } from 'http';
import { URL } from 'url';
import { ClientMessage, ServerMessage, GameVersion, Impact } from './types';
import {
  createRoom,
  joinRoom,
  getRoom,
  updateRoom,
  removePlayerFromRoom,
  kickPlayer,
} from './roomManager';
import {
  createGame,
  submitIndividualDecision,
  advanceToGroupDecision,
  submitGroupDecision,
  advanceToEventRevision,
  reviseDecision,
  skipRevision,
  addChatMessage,
  addSystemMessage,
} from './gameEngine';

// --------------- Connection Tracking ---------------

interface ClientConnection {
  ws: WebSocket;
  playerId: string;
  roomCode: string;
}

const connections = new Map<WebSocket, ClientConnection>();
const playerSockets = new Map<string, WebSocket>(); // playerId -> ws

// --------------- Broadcasting ---------------

function broadcastToRoom(roomCode: string, message: ServerMessage, excludePlayerId?: string) {
  const state = getRoom(roomCode);
  if (!state) return;

  const data = JSON.stringify(message);
  for (const [ws, conn] of connections) {
    if (conn.roomCode === roomCode && conn.playerId !== excludePlayerId && ws.readyState === WebSocket.OPEN) {
      ws.send(data);
    }
  }
}

function sendTo(ws: WebSocket, message: ServerMessage) {
  if (ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify(message));
  }
}

function broadcastGameState(roomCode: string) {
  const state = getRoom(roomCode);
  if (!state) return;
  broadcastToRoom(roomCode, { type: 'game-state', payload: state });
}

// --------------- Message Handlers ---------------

function handleJoin(ws: WebSocket, payload: { roomCode: string; playerName: string }) {
  const { roomCode, playerName } = payload;

  if (!roomCode || !playerName) {
    sendTo(ws, { type: 'error', payload: { message: 'Room code and player name are required.' } });
    return;
  }

  const result = joinRoom(roomCode, playerName);
  if (result.error || !result.playerId) {
    sendTo(ws, { type: 'error', payload: { message: result.error || 'Failed to join.' } });
    return;
  }

  const state = getRoom(roomCode);
  if (!state) {
    sendTo(ws, { type: 'error', payload: { message: 'Room not found.' } });
    return;
  }

  // Track connection
  const conn: ClientConnection = { ws, playerId: result.playerId, roomCode: roomCode.toUpperCase() };
  connections.set(ws, conn);
  playerSockets.set(result.playerId, ws);

  // Send joined confirmation
  sendTo(ws, {
    type: 'joined',
    payload: { playerId: result.playerId, gameState: state },
  });

  // Broadcast to others
  const player = state.players.find((p) => p.id === result.playerId);
  if (player) {
    broadcastToRoom(roomCode, { type: 'player-joined', payload: { player } }, result.playerId);

    // System message
    const { state: newState, message } = addSystemMessage(state, `${playerName} joined the game.`);
    updateRoom(roomCode, newState);
    broadcastToRoom(roomCode, { type: 'chat-message', payload: message }, result.playerId);
  }
}

function handleStartCountdown(ws: WebSocket) {
  const conn = connections.get(ws);
  if (!conn) return;

  const state = getRoom(conn.roomCode);
  if (!state) return;

  const host = state.players.find((p) => p.id === conn.playerId);
  if (!host?.isHost) {
    sendTo(ws, { type: 'error', payload: { message: 'Only the host can start the game.' } });
    return;
  }

  if (state.players.filter((p) => p.connected).length < 2) {
    sendTo(ws, { type: 'error', payload: { message: 'Need at least 2 players to start.' } });
    return;
  }

  const roomCode = conn.roomCode;

  // Broadcast countdown to all players
  broadcastToRoom(roomCode, { type: 'countdown', payload: { count: 3 } });
  setTimeout(() => broadcastToRoom(roomCode, { type: 'countdown', payload: { count: 2 } }), 1000);
  setTimeout(() => broadcastToRoom(roomCode, { type: 'countdown', payload: { count: 1 } }), 2000);
  setTimeout(() => {
    const currentState = getRoom(roomCode);
    if (!currentState || currentState.phase !== 'lobby') return;
    const gameState = createGame(roomCode, currentState.players, currentState.gameVersion);
    updateRoom(roomCode, gameState);
    const { state: withMsg } = addSystemMessage(gameState, 'Game started! Review the concern card and prepare your decision.');
    updateRoom(roomCode, withMsg);
    broadcastGameState(roomCode);
  }, 3000);
}

function handleStartGame(ws: WebSocket) {
  const conn = connections.get(ws);
  if (!conn) return;

  const state = getRoom(conn.roomCode);
  if (!state) return;

  // Only host can start
  const host = state.players.find((p) => p.id === conn.playerId);
  if (!host?.isHost) {
    sendTo(ws, { type: 'error', payload: { message: 'Only the host can start the game.' } });
    return;
  }

  if (state.players.filter((p) => p.connected).length < 2) {
    sendTo(ws, { type: 'error', payload: { message: 'Need at least 2 players to start.' } });
    return;
  }

  const gameState = createGame(conn.roomCode, state.players, state.gameVersion);
  updateRoom(conn.roomCode, gameState);

  const { state: withMsg } = addSystemMessage(gameState, 'Game started! Review the concern card and prepare your decision.');
  updateRoom(conn.roomCode, withMsg);

  broadcastGameState(conn.roomCode);
}

function handleSubmitDecision(ws: WebSocket, payload: { optionId: string; rationale: string }) {
  const conn = connections.get(ws);
  if (!conn) return;

  const state = getRoom(conn.roomCode);
  if (!state) return;

  const newState = submitIndividualDecision(state, conn.playerId, payload.optionId, payload.rationale);
  updateRoom(conn.roomCode, newState);
  broadcastGameState(conn.roomCode);
}

function handleAdvancePhase(ws: WebSocket) {
  const conn = connections.get(ws);
  if (!conn) return;

  const state = getRoom(conn.roomCode);
  if (!state) return;

  // Only host can advance phases
  const host = state.players.find((p) => p.id === conn.playerId);
  if (!host?.isHost) {
    sendTo(ws, { type: 'error', payload: { message: 'Only the host can advance the phase.' } });
    return;
  }

  let newState = state;
  if (state.phase === 'reveal') {
    newState = advanceToGroupDecision(state);
  } else if (state.phase === 'event') {
    newState = advanceToEventRevision(state);
  }

  updateRoom(conn.roomCode, newState);
  broadcastGameState(conn.roomCode);
}

function handleSubmitGroupDecision(ws: WebSocket, payload: { optionId: string; rationale: string; valueImpacts?: Partial<Record<string, Impact>> }) {
  const conn = connections.get(ws);
  if (!conn) return;

  // Only host can submit group decision
  const state = getRoom(conn.roomCode);
  if (!state) return;

  const host = state.players.find((p) => p.id === conn.playerId);
  if (!host?.isHost) {
    sendTo(ws, { type: 'error', payload: { message: 'Only the host can submit the group decision.' } });
    return;
  }

  const newState = submitGroupDecision(state, payload.optionId, payload.rationale, payload.valueImpacts);
  updateRoom(conn.roomCode, newState);

  broadcastGameState(conn.roomCode);
}

function handleSelectGroupOption(ws: WebSocket, payload: { optionId: string | null }) {
  const conn = connections.get(ws);
  if (!conn) return;

  const state = getRoom(conn.roomCode);
  if (!state) return;

  // Any player can suggest an option selection
  state.hostSelectedOptionId = payload.optionId;
  updateRoom(conn.roomCode, state);
  broadcastGameState(conn.roomCode);
}

function handleUpdateGroupDraft(
  ws: WebSocket,
  payload: { rationale?: string; valueImpacts?: Partial<Record<string, Impact>> }
) {
  const conn = connections.get(ws);
  if (!conn) return;

  const state = getRoom(conn.roomCode);
  if (!state || state.phase !== 'group-decision') return;

  const updated: typeof state = { ...state };
  if (payload.rationale !== undefined) updated.groupDraftRationale = payload.rationale;
  if (payload.valueImpacts !== undefined) updated.groupDraftValueImpacts = payload.valueImpacts;

  updateRoom(conn.roomCode, updated);
  broadcastGameState(conn.roomCode);
}

function handleUpdateRevisionDraft(
  ws: WebSocket,
  payload: { concernId?: string | null; optionId?: string | null; rationale?: string }
) {
  const conn = connections.get(ws);
  if (!conn) return;

  const state = getRoom(conn.roomCode);
  if (!state || state.phase !== 'event-revision') return;

  const host = state.players.find((p) => p.id === conn.playerId);
  if (!host?.isHost) return;

  const updated = { ...state };
  if ('concernId' in payload) updated.revisionDraftConcernId = payload.concernId;
  if ('optionId' in payload) updated.revisionDraftOptionId = payload.optionId;
  if (payload.rationale !== undefined) updated.revisionDraftRationale = payload.rationale;

  updateRoom(conn.roomCode, updated);
  broadcastGameState(conn.roomCode);
}

function handleReviseDecision(
  ws: WebSocket,
  payload: { concernId: string; optionId: string; rationale: string }
) {
  const conn = connections.get(ws);
  if (!conn) return;

  const state = getRoom(conn.roomCode);
  if (!state) return;

  const host = state.players.find((p) => p.id === conn.playerId);
  if (!host?.isHost) {
    sendTo(ws, { type: 'error', payload: { message: 'Only the host can revise decisions.' } });
    return;
  }

  const newState = reviseDecision(state, payload.concernId, payload.optionId, payload.rationale);
  const { state: withMsg } = addSystemMessage(newState, 'A previous decision was revised due to the event.');
  updateRoom(conn.roomCode, withMsg);
  broadcastGameState(conn.roomCode);
}

function handleSkipRevision(ws: WebSocket) {
  const conn = connections.get(ws);
  if (!conn) return;

  const state = getRoom(conn.roomCode);
  if (!state) return;

  const newState = skipRevision(state);
  const { state: withMsg } = addSystemMessage(newState, 'Team decided not to revise any decisions.');
  updateRoom(conn.roomCode, withMsg);
  broadcastGameState(conn.roomCode);
}

function handleChatMessage(ws: WebSocket, payload: { text: string }) {
  const conn = connections.get(ws);
  if (!conn) return;

  const state = getRoom(conn.roomCode);
  if (!state) return;

  if (!payload.text.trim()) return;

  const { state: newState, message } = addChatMessage(state, conn.playerId, payload.text);
  updateRoom(conn.roomCode, newState);
  broadcastToRoom(conn.roomCode, { type: 'chat-message', payload: message });
}

function handleKickPlayer(ws: WebSocket, payload: { playerId: string }) {
  const conn = connections.get(ws);
  if (!conn) return;

  const state = getRoom(conn.roomCode);
  if (!state) return;

  const host = state.players.find((p) => p.id === conn.playerId);
  if (!host?.isHost) {
    sendTo(ws, { type: 'error', payload: { message: 'Only the host can kick players.' } });
    return;
  }

  if (payload.playerId === conn.playerId) {
    sendTo(ws, { type: 'error', payload: { message: 'You cannot kick yourself.' } });
    return;
  }

  const kicked = kickPlayer(conn.roomCode, payload.playerId);
  if (kicked) {
    // Close the kicked player's socket
    const kickedWs = playerSockets.get(payload.playerId);
    if (kickedWs) {
      sendTo(kickedWs, { type: 'player-kicked', payload: { playerId: payload.playerId } });
      kickedWs.close();
    }

    broadcastGameState(conn.roomCode);
  }
}

// --------------- Connection Lifecycle ---------------

function handleDisconnect(ws: WebSocket) {
  const conn = connections.get(ws);
  if (!conn) return;

  removePlayerFromRoom(conn.roomCode, conn.playerId);
  playerSockets.delete(conn.playerId);
  connections.delete(ws);

  const state = getRoom(conn.roomCode);
  if (state) {
    broadcastToRoom(conn.roomCode, { type: 'player-left', payload: { playerId: conn.playerId } });

    const player = state.players.find((p) => p.id === conn.playerId);
    if (player) {
      const { state: withMsg, message } = addSystemMessage(state, `${player.name} disconnected.`);
      updateRoom(conn.roomCode, withMsg);
      broadcastToRoom(conn.roomCode, { type: 'chat-message', payload: message });
    }

    broadcastGameState(conn.roomCode);
  }
}

// --------------- WebSocket Server Setup ---------------

export function setupWebSocket(wss: WebSocketServer) {
  wss.on('connection', (ws: WebSocket, req: IncomingMessage) => {
    console.log('[WS] New connection');

    // Parse query params for auto-create
    const url = new URL(req.url || '/', `http://${req.headers.host}`);
    const action = url.searchParams.get('action');
    const playerName = url.searchParams.get('name');
    const roomCode = url.searchParams.get('room');
    const roomVersion = url.searchParams.get('version');

    if (action === 'create' && playerName) {
      const safeVersion: GameVersion = roomVersion === 'ethics' ? 'ethics' : 'classic';
      const { roomCode: newCode, playerId } = createRoom(playerName, safeVersion);
      const state = getRoom(newCode);

      const conn: ClientConnection = { ws, playerId, roomCode: newCode };
      connections.set(ws, conn);
      playerSockets.set(playerId, ws);

      sendTo(ws, { type: 'room-created', payload: { roomCode: newCode, playerId } });
      if (state) {
        sendTo(ws, { type: 'game-state', payload: state });
      }
    } else if (action === 'join' && playerName && roomCode) {
      handleJoin(ws, { roomCode, playerName });
    }

    ws.on('message', (data) => {
      try {
        const message: ClientMessage = JSON.parse(data.toString());

        switch (message.type) {
          case 'join':
            handleJoin(ws, message.payload);
            break;
          case 'start-countdown':
            handleStartCountdown(ws);
            break;
          case 'start-game':
            handleStartGame(ws);
            break;
          case 'submit-decision':
            handleSubmitDecision(ws, message.payload);
            break;
          case 'advance-phase':
            handleAdvancePhase(ws);
            break;
          case 'submit-group-decision':
            handleSubmitGroupDecision(ws, message.payload);
            break;
          case 'select-group-option':
            handleSelectGroupOption(ws, message.payload);
            break;
          case 'update-group-draft':
            handleUpdateGroupDraft(ws, message.payload);
            break;
          case 'revise-decision':
            handleReviseDecision(ws, message.payload);
            break;
          case 'skip-revision':
            handleSkipRevision(ws);
            break;
          case 'update-revision-draft':
            handleUpdateRevisionDraft(ws, message.payload);
            break;
          case 'chat-message':
            handleChatMessage(ws, message.payload);
            break;
          case 'kick-player':
            handleKickPlayer(ws, message.payload);
            break;
          default:
            sendTo(ws, { type: 'error', payload: { message: 'Unknown message type.' } });
        }
      } catch (err) {
        console.error('[WS] Error parsing message:', err);
        sendTo(ws, { type: 'error', payload: { message: 'Invalid message format.' } });
      }
    });

    ws.on('close', () => {
      handleDisconnect(ws);
    });

    ws.on('error', (err) => {
      console.error('[WS] Error:', err);
      handleDisconnect(ws);
    });
  });

  console.log('[WS] WebSocket server initialized');
}
