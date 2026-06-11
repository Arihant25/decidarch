'use client';

import { useGame } from '@/context/GameContext';
import { ConcernCard } from '@/lib/types';
import styles from './GroupReveal.module.css';

interface Props {
  concern: ConcernCard;
}

export function GroupReveal({ concern }: Props) {
  const { gameState, advancePhase, isHost } = useGame();

  if (!gameState) return null;

  const decisions = Object.values(gameState.individualDecisions);
  const getOptionName = (optionId: string) =>
    concern.designOptions.find((o) => o.id === optionId)?.name || 'Unknown Option';

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <p className={styles.headerLabel}>
          <span className={styles.headerTick} aria-hidden="true" />
          FIG. 02 — INDIVIDUAL POSITIONS ON RECORD
        </p>
        <h2>Decisions Revealed</h2>
        <p className={styles.headerSub}>
          Review what each architect suggested before making a group decision.
        </p>
      </div>

      <div className={styles.decisionsGrid}>
        {decisions.map((decision, idx) => (
          <div
            key={decision.playerId}
            className={`${styles.decisionCard} animate-fade-in-up`}
            style={{ animationDelay: `${idx * 150}ms` }}
          >
            <div className={styles.cardHeader}>
              <div className={styles.playerInfo}>
                <div className={styles.avatar}>
                  {decision.playerName.charAt(0).toUpperCase()}
                </div>
                <span className={styles.playerName}>{decision.playerName}</span>
              </div>
              <span className={styles.cardIndex}>
                {String(idx + 1).padStart(2, '0')}
              </span>
            </div>

            <div className={styles.chosenOption}>
              <span className={styles.optionLabel}>SUGGESTED</span>
              <span className={styles.optionName}>{getOptionName(decision.optionId)}</span>
            </div>

            <div className={styles.rationaleBox}>
              <span className={styles.rationaleLabel}>RATIONALE</span>
              <p className={styles.rationaleText}>&ldquo;{decision.rationale}&rdquo;</p>
            </div>
          </div>
        ))}
      </div>

      {isHost && (
        <div className={styles.hostControls}>
          <button
            className="btn btn-primary btn-lg"
            onClick={advancePhase}
            id="btn-advance-group"
          >
            Proceed to Group Decision <span aria-hidden="true">→</span>
          </button>
        </div>
      )}

      {!isHost && (
        <div className={styles.waitMessage}>
          WAITING FOR HOST TO PROCEED TO GROUP DECISION…
        </div>
      )}
    </div>
  );
}
