'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useParams, useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { AnimatePresence } from 'motion/react';
import { GameProvider, useGame } from '@/context/GameContext';
import { WaitingRoom } from '@/components/lobby/WaitingRoom';
import { GameBoard } from '@/components/game/GameBoard';
import { DealIntro } from '@/components/game/DealIntro';
import { GameTutorial } from '@/components/game/GameTutorial';
import { getTutorialSteps, TourKey } from '@/components/game/tutorialSteps';
import { GameVersion } from '@/lib/types';
import { CARD_DATA, EVENT_CARDS } from '@/lib/cardData';
import { ETHICS_CARD_DATA } from '@/lib/cardDataEthics';
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

  // Game-start onboarding — plays only when this client watches the game start
  // (lobby → active phase). A refresh or rejoin lands mid-game and skips it.
  // The tutorial walks through the (initially blank) board section by section;
  // finishing or skipping it hands off to the card-dealing intro.
  const [showTutorial, setShowTutorial] = useState(false);
  const [tutorialStep, setTutorialStep] = useState(0);
  const [showDealIntro, setShowDealIntro] = useState(false);
  const introPlayedRef = useRef(false);
  const prevPhaseRef = useRef<string | null>(null);
  const currentPhase = gameState?.phase;

  useEffect(() => {
    const prevPhase = prevPhaseRef.current;
    prevPhaseRef.current = currentPhase ?? null;
    if (
      !introPlayedRef.current &&
      prevPhase === 'lobby' &&
      currentPhase &&
      currentPhase !== 'lobby' &&
      currentPhase !== 'scoring' &&
      currentPhase !== 'finished'
    ) {
      introPlayedRef.current = true;
      setShowTutorial(true);
    }
  }, [currentPhase]);

  const finishTutorial = useCallback(() => {
    setShowTutorial(false);
    if (!window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setShowDealIntro(true);
    }
  }, []);

  // If other players race the game to its end mid-tour, the tour stands down
  const tutorialActive =
    showTutorial && currentPhase !== 'scoring' && currentPhase !== 'finished';

  const tutorialSteps = useMemo(
    () => getTutorialSteps(gameState?.gameVersion ?? 'classic'),
    [gameState?.gameVersion]
  );

  // Sections revealed so far: every step up to and including the current one
  const tourRevealed = useMemo(() => {
    const revealed = new Set<TourKey>();
    for (let i = 0; i <= tutorialStep && i < tutorialSteps.length; i++) {
      const key = tutorialSteps[i].key;
      if (key) revealed.add(key);
    }
    return revealed;
  }, [tutorialStep, tutorialSteps]);

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

  // The concern on the board right now — the intro's face-up card mirrors it
  const introConcernId = gameState.concernOrder[gameState.currentConcernIndex];
  const introConcern =
    gameState.gameVersion === 'ethics'
      ? (ETHICS_CARD_DATA.concerns.find((c) => c.id === introConcernId) ?? null)
      : (CARD_DATA.concerns.find((c) => c.id === introConcernId) ?? null);

  return (
    <>
      {/* data-dealing hides the live concern card (see globals.css) through
          the tutorial and the deal intro, until the intro's hero card has
          landed in its place */}
      <div
        style={{ display: 'contents' }}
        data-dealing={tutorialActive || showDealIntro || undefined}
      >
        <GameBoard tourRevealed={tutorialActive ? tourRevealed : null} />
      </div>
      {tutorialActive && (
        <GameTutorial
          steps={tutorialSteps}
          stepIndex={tutorialStep}
          onNext={() =>
            tutorialStep >= tutorialSteps.length - 1
              ? finishTutorial()
              : setTutorialStep((s) => s + 1)
          }
          onSkip={finishTutorial}
        />
      )}
      <AnimatePresence>
        {showDealIntro && (
          <DealIntro
            cardCount={gameState.concernOrder.length}
            roomCode={gameState.roomCode}
            gameVersion={gameState.gameVersion}
            concern={introConcern}
            onComplete={() => setShowDealIntro(false)}
          />
        )}
      </AnimatePresence>
    </>
  );
}

export default function RoomPage() {
  return (
    <GameProvider>
      <RoomContent />
    </GameProvider>
  );
}
