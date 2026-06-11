'use client';

import { useGame } from '@/context/GameContext';
import { calculateScores, calculateEthicsScore } from '@/lib/scoring';
import { useScoreDeltas } from '@/hooks/useScoreDeltas';
import styles from './CurrentStats.module.css';

export function CurrentStats() {
  const { gameState, previewDeltas } = useGame();

  const isEthics = gameState?.gameVersion === 'ethics';

  // ---- Classic mode scores (hooks must be called unconditionally) ----
  const classicScore = !isEthics && gameState ? calculateScores(gameState) : null;
  const scoresMap: Record<string, number> = classicScore
    ? Object.fromEntries(classicScore.qaScores.map((q) => [q.attribute, q.score]))
    : {};
  const { deltas, wave } = useScoreDeltas(scoresMap);

  // ---- Ethics mode: show V-importance per stakeholder ----
  if (isEthics && gameState) {
    const score = calculateEthicsScore(gameState);
    return (
      <div className={styles.container}>
        <h3 className={styles.header}>Ethics Scores</h3>
        <div className={styles.list}>
          {score.stakeholderScores.map((s) => (
            <div key={s.stakeholderId} className={styles.statRow}>
              <span className={styles.attrName} style={{ fontSize: '0.7rem' }}>
                {s.name ?? s.category.split('(')[0].trim()}
              </span>
              <span className={`${styles.statTotal} ${s.totalContribution >= 0 ? styles.statPositive : styles.statNegative}`}>
                {s.totalContribution > 0 ? `+${s.totalContribution}` : s.totalContribution}
              </span>
            </div>
          ))}
          <div className={`${styles.statRow}`} style={{ borderTop: '1px solid rgba(141,198,255,0.15)', marginTop: '0.25rem', paddingTop: '0.25rem' }}>
            <span className={styles.attrName}>TOTAL</span>
            <span className={`${styles.statTotal} ${score.finalScore >= 0 ? styles.statPositive : styles.statNegative}`}>
              {score.finalScore > 0 ? `+${score.finalScore}` : score.finalScore}
            </span>
          </div>
        </div>
      </div>
    );
  }

  // ---- Classic mode ----
  const score = classicScore;

  if (!gameState || !score) return null;


  return (
    <div className={styles.container}>
      <h3 className={styles.header}>Current QA Scores</h3>
      <div className={styles.list}>
        {score.qaScores.map((qa) => {
          let previewVal = 0;
          if (previewDeltas && typeof previewDeltas[qa.attribute] === 'number') {
            previewVal = previewDeltas[qa.attribute];
          }
          const nextScore = qa.score + previewVal;
          const delta = deltas[qa.attribute] ?? 0;

          return (
            <div
              key={qa.attribute}
              className={`${styles.statRow} ${delta > 0 ? styles.rowFlashUp : delta < 0 ? styles.rowFlashDown : ''
                }`}
            >
              <span className={styles.attrName}>{qa.attribute}</span>
              <span className={styles.scoreWrap}>
                {delta !== 0 && (
                  <span
                    key={`d-${wave}`}
                    className={`${styles.deltaBadge} ${delta > 0 ? styles.deltaUp : styles.deltaDown
                      }`}
                  >
                    {delta > 0 ? `▲ +${delta}` : `▼ ${delta}`}
                  </span>
                )}
                {previewDeltas && previewVal !== 0 ? (
                  <span className={styles.previewContainer}>
                    <span className={styles.oldScore}>{qa.score > 0 ? `+${qa.score}` : qa.score}</span>
                    <span className={styles.arrow}>➔</span>
                    <span
                      className={`${styles.statTotal} ${nextScore < 0 ? styles.statNegative : styles.statPositive
                        }`}
                    >
                      {nextScore > 0 ? `+${nextScore}` : nextScore}
                    </span>
                  </span>
                ) : (
                  <span
                    key={`s-${wave}`}
                    className={`${styles.statTotal} ${delta !== 0 ? styles.statPop : ''} ${qa.score < 0 ? styles.statNegative : styles.statPositive
                      }`}
                  >
                    {qa.score > 0 ? `+${qa.score}` : qa.score}
                  </span>
                )}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

