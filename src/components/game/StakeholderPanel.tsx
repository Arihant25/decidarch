'use client';

import { useGame } from '@/context/GameContext';
import { calculateScores } from '@/lib/scoring';
import { StakeholderCard, EthicsStakeholderCard } from '@/lib/types';
import { useScoreDeltas } from '@/hooks/useScoreDeltas';
import styles from './StakeholderPanel.module.css';

interface Props {
  stakeholders?: StakeholderCard[];
  ethicsStakeholders?: EthicsStakeholderCard[];
}

export function StakeholderPanel({ stakeholders, ethicsStakeholders }: Props) {
  const { gameState } = useGame();

  // ---- Classic mode: QA-score-backed panel ----
  let scoresMap: Record<string, number> = {};
  if (gameState && gameState.gameVersion === 'classic') {
    const score = calculateScores(gameState);
    scoresMap = score.qaScores.reduce((acc, qs) => {
      acc[qs.attribute] = qs.score;
      return acc;
    }, {} as Record<string, number>);
  }

  const { deltas, wave } = useScoreDeltas(scoresMap);

  // ---- Ethics mode ----
  if (gameState?.gameVersion === 'ethics' && ethicsStakeholders) {
    return (
      <div className={styles.panel}>
        <h3 className={styles.heading}>Stakeholders</h3>
        {ethicsStakeholders.map((s) => {
          // Apply any V-importance event overrides for display
          const effectiveValues = s.values.map((v) => ({
            ...v,
            importance: gameState.stakeholderVImportanceOverrides[s.id]?.[v.name] ?? v.importance,
          }));

          return (
            <div key={s.id} className={styles.card}>
              <div className={styles.cardHeader}>
                <div className={styles.nameRow}>
                  <span className={styles.name}>{s.name ?? s.category.split('(')[0].trim()}</span>
                </div>
                <span className={styles.role}>{s.category}</span>
              </div>
              <div className={styles.priorities}>
                {effectiveValues.map((v) => (
                  <div key={v.name} className={styles.priority}>
                    <span className={styles.attrName}>{v.name}</span>
                    <span className={styles.attrValue}>
                      V-imp: <strong>{v.importance}</strong>
                    </span>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    );
  }

  // ---- Classic mode ----
  if (!stakeholders) return null;

  const priorityOverrides = gameState?.stakeholderPriorityOverrides ?? {};

  return (
    <div className={styles.panel}>
      <h3 className={styles.heading}>Stakeholders</h3>
      {stakeholders.map((s) => {
        const overrides = priorityOverrides[s.id] ?? {};
        const allSatisfied = s.priorities.every(p => {
          const effectivePriority = overrides[p.attribute] ?? p.importance;
          const curr = scoresMap[p.attribute] || 0;
          return curr >= effectivePriority;
        });

        const reaction = s.priorities.reduce(
          (sum, p) => sum + (deltas[p.attribute] ?? 0),
          0
        );

        return (
          <div
            key={s.id}
            className={`${styles.card} ${reaction > 0 ? styles.cardCheer : reaction < 0 ? styles.cardGrumble : ''
              }`}
          >
            {reaction !== 0 && (
              <span
                key={`r-${wave}`}
                className={`${styles.reaction} ${reaction > 0 ? styles.reactionUp : styles.reactionDown
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
                const effectivePriority = overrides[p.attribute] ?? p.importance;
                const isOverridden = effectivePriority !== p.importance;
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
                      QA-Priority:{' '}
                      <strong className={isOverridden ? styles.priorityOverridden : undefined}>
                        {effectivePriority}
                      </strong>
                      {isOverridden && (
                        <span className={styles.priorityOriginal}> /{p.importance}</span>
                      )}
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
