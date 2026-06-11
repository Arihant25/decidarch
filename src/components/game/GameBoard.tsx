'use client';

import { useGame } from '@/context/GameContext';
import Link from 'next/link';
import { CARD_DATA } from '@/lib/cardData';
import { PhaseIndicator } from './PhaseIndicator';
import { ProjectCard } from './ProjectCard';
import { StakeholderPanel } from './StakeholderPanel';
import { IndividualPrep } from './IndividualPrep';
import { GroupReveal } from './GroupReveal';
import { GroupDecision } from './GroupDecision';
import { EventPhase } from './EventPhase';
import { ScoreBoard } from './ScoreBoard';
import { ChatPanel } from './ChatPanel';
import { PlayerList } from './PlayerList';
import { CardHistory } from './CardHistory';
import { CurrentStats } from './CurrentStats';
import { useCountdown } from '@/hooks/useCountdown';
import styles from './GameBoard.module.css';

export function GameBoard() {
  const { gameState } = useGame();

  const { formatted, isExpired, percentage } = useCountdown(
    gameState?.timerDuration ?? 0,
    gameState?.startedAt
  );

  if (!gameState) return null;

  const currentConcernId = gameState.concernOrder[gameState.currentConcernIndex];
  const currentConcern = CARD_DATA.concerns.find((c) => c.id === currentConcernId);

  const renderPhase = () => {
    switch (gameState.phase) {
      case 'individual-prep':
        return currentConcern ? <IndividualPrep concern={currentConcern} /> : null;
      case 'reveal':
        return currentConcern ? <GroupReveal concern={currentConcern} /> : null;
      case 'group-decision':
        return currentConcern ? <GroupDecision concern={currentConcern} /> : null;
      case 'event':
      case 'event-revision':
        return <EventPhase />;
      case 'scoring':
      case 'finished':
        return <ScoreBoard />;
      default:
        return null;
    }
  };

  return (
    <div className={styles.layout}>
      {/* Top drawing strip */}
      <header className={styles.topBar}>
        <Link href="/" className={`${styles.cell} ${styles.logoCell}`}>
          DECID<span>ARCH</span>
        </Link>
        <span className={`${styles.cell} ${styles.roomCell}`}>
          SESSION {gameState.roomCode}
        </span>
        <div className={`${styles.cell} ${styles.phaseCell}`}>
          <PhaseIndicator
            phase={gameState.phase}
            concernIndex={gameState.currentConcernIndex}
            totalConcerns={gameState.concernOrder.length}
          />
        </div>
        <span className={styles.cellFiller} aria-hidden="true" />
        <span
          className={`${styles.cell} ${styles.timerCell} ${isExpired ? styles.timerExpired : ''
            }`}
        >
          <svg
            width="13"
            height="13"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <circle cx="12" cy="12" r="10" />
            <polyline points="12 6 12 12 16 14" />
          </svg>
          {formatted}
        </span>
      </header>

      {/* Timer progress bar */}
      <div className={styles.timerBar}>
        <div
          className={styles.timerBarFill}
          style={{
            width: `${Math.min(percentage, 100)}%`,
            background:
              percentage >= 100
                ? 'var(--red)'
                : percentage >= 85
                  ? 'var(--gold)'
                  : 'var(--mint)',
          }}
        />
      </div>

      {/* Main content area */}
      <div className={styles.mainArea}>
        {/* Left sidebar */}
        <aside className={styles.sidebar}>
          <ProjectCard project={CARD_DATA.project} />
          <StakeholderPanel stakeholders={CARD_DATA.stakeholders} />
          <PlayerList />
        </aside>

        {/* Center content */}
        <main className={styles.center}>{renderPhase()}</main>

        {/* Right sidebar */}
        <aside className={styles.rightSidebar}>
          <CurrentStats />
          <CardHistory />
          <ChatPanel />
        </aside>
      </div>
    </div>
  );
}
