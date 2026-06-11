'use client';

import { useGame } from '@/context/GameContext';
import { calculateScores } from '@/lib/scoring';
import { StakeholderCard } from '@/lib/types';
import { useScoreDeltas } from '@/hooks/useScoreDeltas';
import styles from './StakeholderPanel.module.css';

interface Props {
  stakeholders: StakeholderCard[];
}

export function StakeholderPanel({ stakeholders }: Props) {
  const { gameState } = useGame();

  let scoresMap: Record<string, number> = {};
  if (gameState) {
    const score = calculateScores(gameState);
    scoresMap = score.qaScores.reduce((acc, qs) => {
      acc[qs.attribute] = qs.score;
      return acc;
    }, {} as Record<string, number>);
  }

  const { deltas, wave } = useScoreDeltas(scoresMap);

  return (
    <div className={styles.panel}>
      <h3 className={styles.heading}>Stakeholders</h3>
      {stakeholders.map((s) => {
        const allSatisfied = s.priorities.every(p => {
          const curr = scoresMap[p.attribute] || 0;
          return curr >= p.importance;
        });

        // Net effect of the latest decision on this stakeholder's priorities
        const reaction = s.priorities.reduce(
          (sum, p) => sum + (deltas[p.attribute] ?? 0),
          0
        );

        return (
          <div
            key={s.id}
            className={`${styles.card} ${
              reaction > 0 ? styles.cardCheer : reaction < 0 ? styles.cardGrumble : ''
            }`}
          >
            {reaction !== 0 && (
              <span
                key={`r-${wave}`}
                className={`${styles.reaction} ${
                  reaction > 0 ? styles.reactionUp : styles.reactionDown
                }`}
              >
                {reaction > 0 ? '😊' : '😠'} {reaction > 0 ? `+${reaction}` : reaction}
              </span>
            )}
            <div className={styles.cardHeader}>
              <div className={styles.nameRow}>
                <span className={styles.name}>{s.name}</span>
                <span
                  key={allSatisfied ? 'sat' : 'unsat'}
                  className={`${styles.statusBadge} ${styles.badgePop} ${allSatisfied ? styles.statusSatisfied : styles.statusUnsatisfied}`}
                >
                  {allSatisfied ? 'SATISFIED' : 'UNSATISFIED'}
                </span>
              </div>
              <span className={styles.role}>{s.role}</span>
            </div>
          <p className={styles.description}>{s.description}</p>
          <div className={styles.priorities}>
            {s.priorities.map((p) => {
              const pd = deltas[p.attribute] ?? 0;
              return (
                <div key={p.attribute} className={styles.priority}>
                  <span className={styles.attrName}>{p.attribute}</span>
                  <span className={styles.attrValue}>
                    {pd !== 0 && (
                      <span
                        key={`pd-${wave}`}
                        className={pd > 0 ? styles.prioUp : styles.prioDown}
                      >
                        {pd > 0 ? `▲+${pd}` : `▼${pd}`}
                      </span>
                    )}{' '}
                    QA-Priority: <strong>{p.importance}</strong>
                  </span>
                </div>
              );
            })}
          </div>
        </div>
        );
      })}
    </div>
  );
}
