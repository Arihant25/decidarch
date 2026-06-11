'use client';

import { useEffect, useState } from 'react';
import { useParams, useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { GameProvider, useGame } from '@/context/GameContext';
import { WaitingRoom } from '@/components/lobby/WaitingRoom';
import { GameBoard } from '@/components/game/GameBoard';
import { GameVersion } from '@/lib/types';
import { EVENT_CARDS } from '@/lib/cardData';
import styles from './page.module.css';

function RoomContent() {
  const params = useParams();
  const searchParams = useSearchParams();
  const router = useRouter();
  const code = (params.code as string)?.toUpperCase();
  const initialName = searchParams.get('name') || '';
  const initialVersion = searchParams.get('version') as GameVersion | null;
  const [name] = useState(() => {
    if (initialName) return initialName;
    if (typeof window === 'undefined') return '';
    try {
      const saved = localStorage.getItem('decidarch_session');
      if (saved) {
        const data = JSON.parse(saved);
        if (data.roomCode === code && data.playerName) {
          return data.playerName as string;
        }
      }
    } catch {
      // ignore malformed session data
    }
    return '';
  });
  const { gameState, roomCode, createRoom, joinRoom, error, clearError } = useGame();

  useEffect(() => {
    if (name && !initialName) {
      // Name came from localStorage — update URL
      router.replace(`/room/${code}?name=${encodeURIComponent(name)}`);
    }

    if (name) {
      if (code === 'NEW') {
        const version: GameVersion = initialVersion === 'ethics' ? 'ethics' : 'classic';
        createRoom(name, version);
      } else if (code) {
        joinRoom(code, name);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (code === 'NEW' && roomCode && roomCode !== 'NEW' && name) {
      window.history.replaceState(null, '', `/room/${roomCode}?name=${encodeURIComponent(name)}`);
    }
  }, [code, roomCode, name]);

  useEffect(() => {
    if (error && error.includes('Room not found')) {
      localStorage.removeItem('decidarch_session');
    }
  }, [error]);

  const currentPhase = gameState?.phase;
  useEffect(() => {
    if (currentPhase && currentPhase !== 'lobby') {
      EVENT_CARDS.forEach((card) => {
        if (card.imageUrl) {
          const img = new Image();
          img.src = card.imageUrl;
        }
      });
    }
  }, [currentPhase]);

  if (!name) {
    if (code === 'NEW') {
      return (
        <div className={styles.errorPage}>
          <div className={styles.errorCard}>
            <p className={styles.cardLabel}>FORM E-1 · MISSING CREDENTIALS</p>
            <h2 className={styles.cardTitle}>Missing Player Name</h2>
            <p className={styles.cardText}>
              Please go back and enter your name to join.
            </p>
            <Link href="/" className="btn btn-primary">
              Back to Home
            </Link>
          </div>
        </div>
      );
    }

    return (
      <div className={styles.errorPage}>
        <div className={styles.errorCard}>
          <p className={styles.cardLabel}>FORM A-2 · LATE ARRIVAL</p>
          <h2 className={styles.cardTitle}>
            Join Room <span className={styles.codeChip}>{code}</span>
          </h2>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              const formData = new FormData(e.currentTarget);
              const newName = formData.get('name') as string;
              if (newName.trim()) {
                window.location.href = `/room/${code}?name=${encodeURIComponent(
                  newName.trim()
                )}`;
              }
            }}
            className={styles.joinForm}
          >
            <div className={styles.field}>
              <label htmlFor="late-join-name" className="label">
                ARCHITECT NAME
              </label>
              <input
                id="late-join-name"
                name="name"
                type="text"
                className="input"
                placeholder="e.g. Ada Lovelace"
                required
                autoFocus
                maxLength={20}
              />
            </div>
            <button type="submit" className="btn btn-primary">
              Join Room <span aria-hidden="true">→</span>
            </button>
          </form>
        </div>
      </div>
    );
  }

  if (error && !gameState) {
    const isKicked = error === 'You have been removed from the game.' || error?.includes('Room not found');
    return (
      <div className={styles.errorPage}>
        <div className={styles.errorCard}>
          <p className={styles.cardLabel}>FORM E-2 · SITE INCIDENT</p>
          <h2 className={`${styles.cardTitle} ${styles.cardTitleError}`}>
            Whoops.
          </h2>
          <p className={styles.cardText}>{error}</p>
          <div className={styles.actions}>
            <Link href="/" className="btn btn-primary">
              Back to Home
            </Link>
            {!isKicked && (
              <button
                className="btn btn-secondary"
                onClick={
                  error === 'Game already in progress.'
                    ? () => window.location.reload()
                    : clearError
                }
              >
                Try Again
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  if (!gameState) {
    return (
      <div className={styles.loadingPage}>
        <div className={styles.compass} aria-hidden="true">
          <span className={styles.compassRing} />
          <span className={styles.compassNeedle} />
        </div>
        <p className={styles.loadingText}>ESTABLISHING SITE CONNECTION…</p>
      </div>
    );
  }

  if (gameState.phase === 'lobby') {
    return <WaitingRoom />;
  }

  return <GameBoard />;
}

export default function RoomPage() {
  return (
    <GameProvider>
      <RoomContent />
    </GameProvider>
  );
}
