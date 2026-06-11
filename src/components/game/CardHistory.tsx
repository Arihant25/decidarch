'use client';

import { useGame } from '@/context/GameContext';
import styles from './CardHistory.module.css';

export function CardHistory() {
  const { gameState } = useGame();

  if (!gameState) return null;

  const decisions = gameState.groupDecisions;

  return (
    <div className={styles.container}>
      <h3 className={styles.header}>Decision Log</h3>

      <div className={styles.list}>
        {decisions.length === 0 ? (
          <div className={styles.empty}>{'// no decisions filed yet'}</div>
        ) : (
          decisions.map((decision, index) => (
            <div key={decision.concernId} className={styles.historyCard}>
              <div className={styles.cardHeader}>
                <span className={styles.number}>{String(index + 1).padStart(2, '0')}</span>
                <span className={styles.concernTitle}>{decision.concernTitle}</span>
                {decision.revisedByEvent && (
                  <span className={styles.revisedBadge} title={`Revised due to: ${decision.revisedByEvent}`}>
                    Revised
                  </span>
                )}
              </div>

              <div className={styles.decisionDetails}>
                <div className={styles.optionRow}>
                  <span className={styles.label}>CHOSEN</span>
                  <span className={styles.value}>{decision.optionName}</span>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
