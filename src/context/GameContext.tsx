'use client';

import React, { createContext, useContext, useState, useCallback, useRef, useEffect } from 'react';
import { GameState, ServerMessage, Player, GameVersion, Impact } from '@/lib/types';
import { useSocket } from '@/hooks/useSocket';

interface GameContextValue {
  // State
  gameState: GameState | null;
  playerId: string | null;
  roomCode: string | null;
  isConnected: boolean;
  error: string | null;
  isHost: boolean;
  currentPlayer: Player | null;
  previewDeltas: Record<string, number> | null;
  countdown: number | null;

  // Actions
  createRoom: (playerName: string, gameVersion?: GameVersion) => void;
  joinRoom: (roomCode: string, playerName: string) => void;
  startGame: () => void;
  startCountdown: () => void;
  submitDecision: (optionId: string, rationale: string) => void;
  submitGroupDecision: (optionId: string, rationale: string, valueImpacts?: Partial<Record<string, Impact>>) => void;
  selectGroupOption: (optionId: string | null) => void;
  advancePhase: () => void;
  reviseDecision: (concernId: string, optionId: string, rationale: string) => void;
  skipRevision: () => void;
  sendChat: (text: string) => void;
  kickPlayer: (playerId: string) => void;
  clearError: () => void;
  disconnect: () => void;
  setPreviewDeltas: (deltas: Record<string, number> | null) => void;
  updateGroupDraft: (draft: { rationale?: string; valueImpacts?: Partial<Record<string, import('@/lib/types').Impact>> }) => void;
  updateRevisionDraft: (draft: { concernId?: string | null; optionId?: string | null; rationale?: string }) => void;
}

const GameContext = createContext<GameContextValue | null>(null);

export function useGame() {
  const ctx = useContext(GameContext);
  if (!ctx) throw new Error('useGame must be used within a GameProvider');
  return ctx;
}

export function GameProvider({ children }: { children: React.ReactNode }) {
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [playerId, setPlayerId] = useState<string | null>(null);
  const [roomCode, setRoomCode] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [previewDeltas, setPreviewDeltas] = useState<Record<string, number> | null>(null);
  const [countdown, setCountdown] = useState<number | null>(null);

  // Ref so handleMessage can call disconnect() without a stale closure
  const disconnectRef = useRef<(() => void) | null>(null);

  const handleMessage = useCallback((message: ServerMessage) => {
    switch (message.type) {
      case 'room-created':
        setRoomCode(message.payload.roomCode);
        setPlayerId(message.payload.playerId);
        setError(null);
        if (typeof window !== 'undefined') {
          try {
            const saved = localStorage.getItem('decidarch_session');
            if (saved) {
              const data = JSON.parse(saved);
              localStorage.setItem('decidarch_session', JSON.stringify({ ...data, roomCode: message.payload.roomCode }));
            }
          } catch {
            // ignore malformed session data
          }
        }
        break;

      case 'joined':
        setPlayerId(message.payload.playerId);
        setGameState(message.payload.gameState);
        setRoomCode(message.payload.gameState.roomCode);
        setError(null);
        break;

      case 'countdown':
        setCountdown(message.payload.count);
        break;

      case 'game-state':
        setGameState(message.payload);
        setCountdown(null);
        if (message.payload.phase === 'finished' && typeof window !== 'undefined') {
          localStorage.removeItem('decidarch_session');
        }
        break;

      case 'player-joined': {
        setGameState((current) => {
          if (!current) return current;
          if (current.players.some((p) => p.id === message.payload.player.id)) return current;
          return { ...current, players: [...current.players, message.payload.player] };
        });
        break;
      }

      case 'player-left': {
        setGameState((current) => {
          if (!current) return current;
          return {
            ...current,
            players: current.players.map((p) =>
              p.id === message.payload.playerId ? { ...p, connected: false } : p
            ),
          };
        });
        break;
      }

      case 'player-kicked':
        // Prevent auto-reconnect before clearing state
        disconnectRef.current?.();
        setGameState(null);
        setPlayerId(null);
        setRoomCode(null);
        setError('You have been removed from the game.');
        break;

      case 'chat-message': {
        setGameState((current) => {
          if (!current) return current;
          if (current.chatMessages.some((m) => m.id === message.payload.id)) return current;
          return { ...current, chatMessages: [...current.chatMessages, message.payload] };
        });
        break;
      }

      case 'error':
        setError(message.payload.message);
        break;
    }
  }, []);

  const { connect, send, disconnect, isConnected } = useSocket({
    onMessage: handleMessage,
  });

  // Keep ref in sync so handleMessage can call disconnect()
  useEffect(() => {
    disconnectRef.current = disconnect;
  }, [disconnect]);

  const createRoom = useCallback(
    (playerName: string, gameVersion: GameVersion = 'classic') => {
      setError(null);
      if (typeof window !== 'undefined') {
        localStorage.setItem('decidarch_session', JSON.stringify({ roomCode: 'NEW', playerName }));
      }
      connect({ action: 'create', name: playerName, version: gameVersion });
    },
    [connect]
  );

  const joinRoom = useCallback(
    (code: string, playerName: string) => {
      setError(null);
      setRoomCode(code.toUpperCase());
      if (typeof window !== 'undefined') {
        localStorage.setItem('decidarch_session', JSON.stringify({ roomCode: code.toUpperCase(), playerName }));
      }
      connect({ action: 'join', name: playerName, room: code.toUpperCase() });
    },
    [connect]
  );

  const startGame = useCallback(() => {
    send({ type: 'start-game', payload: {} });
  }, [send]);

  const startCountdown = useCallback(() => {
    send({ type: 'start-countdown', payload: {} });
  }, [send]);

  const submitDecision = useCallback(
    (optionId: string, rationale: string) => {
      send({ type: 'submit-decision', payload: { optionId, rationale } });
    },
    [send]
  );

  const submitGroupDecision = useCallback(
    (optionId: string, rationale: string, valueImpacts?: Partial<Record<string, Impact>>) => {
      send({ type: 'submit-group-decision', payload: { optionId, rationale, valueImpacts } });
    },
    [send]
  );

  const selectGroupOption = useCallback(
    (optionId: string | null) => {
      send({ type: 'select-group-option', payload: { optionId } });
    },
    [send]
  );

  const advancePhase = useCallback(() => {
    send({ type: 'advance-phase', payload: {} });
  }, [send]);

  const reviseDecision = useCallback(
    (concernId: string, optionId: string, rationale: string) => {
      send({ type: 'revise-decision', payload: { concernId, optionId, rationale } });
    },
    [send]
  );

  const skipRevision = useCallback(() => {
    send({ type: 'skip-revision', payload: {} });
  }, [send]);

  const sendChat = useCallback(
    (text: string) => {
      send({ type: 'chat-message', payload: { text } });
    },
    [send]
  );

  const kickPlayer = useCallback(
    (targetPlayerId: string) => {
      send({ type: 'kick-player', payload: { playerId: targetPlayerId } });
    },
    [send]
  );

  const updateGroupDraft = useCallback(
    (draft: { rationale?: string; valueImpacts?: Partial<Record<string, Impact>> }) => {
      send({ type: 'update-group-draft', payload: draft });
    },
    [send]
  );

  const updateRevisionDraft = useCallback(
    (draft: { concernId?: string | null; optionId?: string | null; rationale?: string }) => {
      send({ type: 'update-revision-draft', payload: draft });
    },
    [send]
  );

  const clearError = useCallback(() => setError(null), []);

  const isHost = gameState?.players.find((p) => p.id === playerId)?.isHost ?? false;
  const currentPlayer = gameState?.players.find((p) => p.id === playerId) ?? null;

  return (
    <GameContext.Provider
      value={{
        gameState,
        playerId,
        roomCode,
        isConnected,
        error,
        isHost,
        currentPlayer,
        previewDeltas,
        countdown,
        createRoom,
        joinRoom,
        startGame,
        startCountdown,
        submitDecision,
        submitGroupDecision,
        selectGroupOption,
        advancePhase,
        reviseDecision,
        skipRevision,
        sendChat,
        kickPlayer,
        clearError,
        disconnect,
        setPreviewDeltas,
        updateGroupDraft,
        updateRevisionDraft,
      }}
    >
      {children}
    </GameContext.Provider>
  );
}
