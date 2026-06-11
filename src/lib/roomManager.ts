// ============================================================
// DecidArch V2 — Room Manager (In-Memory)
// ============================================================

import { GameState, Player } from './types';
import { customAlphabet } from 'nanoid';

const generateCode = customAlphabet('ABCDEFGHJKLMNPQRSTUVWXYZ23456789', 6);

interface Room {
  state: GameState;
  lastActivity: number;
}

const rooms = new Map<string, Room>();

// Auto-expire rooms after 2 hours
const ROOM_EXPIRY_MS = 2 * 60 * 60 * 1000;

setInterval(() => {
  const now = Date.now();
  for (const [code, room] of rooms) {
    if (now - room.lastActivity > ROOM_EXPIRY_MS) {
      rooms.delete(code);
      console.log(`[RoomManager] Expired room ${code}`);
    }
  }
}, 60_000); // check every minute

export function createRoom(hostName: string): { roomCode: string; playerId: string } {
  let roomCode = generateCode();
  // Ensure uniqueness
  while (rooms.has(roomCode)) {
    roomCode = generateCode();
  }

  const playerId = crypto.randomUUID();
  const host: Player = {
    id: playerId,
    name: hostName,
    connected: true,
    isHost: true,
  };

  const state: GameState = {
    roomCode,
    phase: 'lobby',
    players: [host],
    maxPlayers: 8,
    currentConcernIndex: 0,
    currentRound: 1,
    concernOrder: [],
    eventOrder: [],
    drawnEventIndices: [],
    individualDecisions: {},
    groupDecisions: [],
    chatMessages: [],
    timerDuration: 45 * 60,
  };

  rooms.set(roomCode, { state, lastActivity: Date.now() });
  console.log(`[RoomManager] Created room ${roomCode} by ${hostName}`);
  return { roomCode, playerId };
}

export function joinRoom(
  roomCode: string,
  playerName: string
): { playerId: string; error?: string } | { playerId?: undefined; error: string } {
  const room = rooms.get(roomCode.toUpperCase());
  if (!room) {
    return { error: 'Room not found. Check the code and try again.' };
  }

  if (room.state.phase !== 'lobby') {
    // Allow reconnection if player was in the game
    const existingPlayer = room.state.players.find(
      (p) => p.name.toLowerCase() === playerName.toLowerCase() && !p.connected
    );
    if (existingPlayer) {
      existingPlayer.connected = true;
      room.lastActivity = Date.now();
      return { playerId: existingPlayer.id };
    }
    return { error: 'Game already in progress.' };
  }

  // Check for duplicate names, but allow reconnecting disconnected players in lobby
  const existingPlayer = room.state.players.find(
    (p) => p.name.toLowerCase() === playerName.toLowerCase()
  );
  if (existingPlayer) {
    if (!existingPlayer.connected) {
      existingPlayer.connected = true;
      room.lastActivity = Date.now();
      return { playerId: existingPlayer.id };
    }
    return { error: 'A player with that name is already in the room.' };
  }

  if (room.state.players.length >= room.state.maxPlayers) {
    return { error: `Room is full (max ${room.state.maxPlayers} players).` };
  }

  const playerId = crypto.randomUUID();
  const player: Player = {
    id: playerId,
    name: playerName,
    connected: true,
    isHost: false,
  };

  room.state.players.push(player);
  room.lastActivity = Date.now();
  console.log(`[RoomManager] ${playerName} joined room ${roomCode}`);
  return { playerId };
}

export function getRoom(roomCode: string): GameState | null {
  const room = rooms.get(roomCode.toUpperCase());
  if (!room) return null;
  room.lastActivity = Date.now();
  return room.state;
}

export function updateRoom(roomCode: string, state: GameState): void {
  const room = rooms.get(roomCode.toUpperCase());
  if (room) {
    room.state = state;
    room.lastActivity = Date.now();
  }
}

export function removePlayerFromRoom(roomCode: string, playerId: string): void {
  const room = rooms.get(roomCode.toUpperCase());
  if (!room) return;

  const player = room.state.players.find((p) => p.id === playerId);
  if (player) {
    player.connected = false;
    room.lastActivity = Date.now();
    console.log(`[RoomManager] ${player.name} disconnected from room ${roomCode}`);
  }

  // Do not delete the room immediately. Allow players to reconnect.
  if (room.state.players.every((p) => !p.connected)) {
    console.log(`[RoomManager] All players disconnected from room ${roomCode}, will expire later.`);
  }
}

export function kickPlayer(roomCode: string, playerId: string): boolean {
  const room = rooms.get(roomCode.toUpperCase());
  if (!room) return false;

  room.state.players = room.state.players.filter((p) => p.id !== playerId);
  room.lastActivity = Date.now();
  return true;
}
