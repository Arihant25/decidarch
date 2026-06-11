'use client';

import React, { createContext, useContext, useState, useCallback, useRef, useEffect } from 'react';
import { GameState, ServerMessage, Player } from '@/lib/types';
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

  // Actions
  createRoom: (playerName: string) => void;
  joinRoom: (roomCode: string, playerName: string) => void;
  startGame: () => void;
  submitDecision: (optionId: string, rationale: string) => void;
  submitGroupDecision: (optionId: string, rationale: string) => void;
  selectGroupOption: (optionId: string | null) => void;
  advancePhase: () => void;
  reviseDecision: (concernId: string, optionId: string, rationale: string) => void;
  skipRevision: () => void;
  sendChat: (text: string) => void;
  kickPlayer: (playerId: string) => void;
  clearError: () => void;
  disconnect: () => void;
  setPreviewDeltas: (deltas: Record<string, number> | null) => void;
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

  // Use refs for stable callback references
  const gameStateRef = useRef(gameState);
  useEffect(() => {
    gameStateRef.current = gameState;
  });

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

      case 'game-state':
        setGameState(message.payload);
        break;

      case 'player-joined': {
        const current = gameStateRef.current;
        if (current) {
          const exists = current.players.some((p) => p.id === message.payload.player.id);
          if (!exists) {
            setGameState({
              ...current,
              players: [...current.players, message.payload.player],
            });
          }
        }
        break;
      }

      case 'player-left': {
        const current = gameStateRef.current;
        if (current) {
          setGameState({
            ...current,
            players: current.players.map((p) =>
              p.id === message.payload.playerId ? { ...p, connected: false } : p
            ),
          });
        }
        break;
      }

      case 'player-kicked':
        // If we were kicked
        setGameState(null);
        setPlayerId(null);
        setRoomCode(null);
        setError('You have been removed from the game.');
        break;

      case 'chat-message': {
        const current = gameStateRef.current;
        if (current) {
          // Don't add duplicate messages
          const exists = current.chatMessages.some((m) => m.id === message.payload.id);
          if (!exists) {
            setGameState({
              ...current,
              chatMessages: [...current.chatMessages, message.payload],
            });
          }
        }
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

  const createRoom = useCallback(
    (playerName: string) => {
      setError(null);
      if (typeof window !== 'undefined') {
        localStorage.setItem('decidarch_session', JSON.stringify({ roomCode: 'NEW', playerName }));
      }
      connect({ action: 'create', name: playerName });
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

  const submitDecision = useCallback(
    (optionId: string, rationale: string) => {
      send({ type: 'submit-decision', payload: { optionId, rationale } });
    },
    [send]
  );

  const submitGroupDecision = useCallback(
    (optionId: string, rationale: string) => {
      send({ type: 'submit-group-decision', payload: { optionId, rationale } });
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
        createRoom,
        joinRoom,
        startGame,
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
      }}
    >
      {children}
    </GameContext.Provider>
  );
}
