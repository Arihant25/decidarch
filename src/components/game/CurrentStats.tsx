'use client';

import { useGame } from '@/context/GameContext';
import { calculateScores } from '@/lib/scoring';
import { useScoreDeltas } from '@/hooks/useScoreDeltas';
import styles from './CurrentStats.module.css';

export function CurrentStats() {
  const { gameState, previewDeltas } = useGame();

  const score = gameState ? calculateScores(gameState) : null;
  const scoresMap: Record<string, number> = score
    ? Object.fromEntries(score.qaScores.map((q) => [q.attribute, q.score]))
    : {};
  const { deltas, wave } = useScoreDeltas(scoresMap);

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
              className={`${styles.statRow} ${
                delta > 0 ? styles.rowFlashUp : delta < 0 ? styles.rowFlashDown : ''
              }`}
            >
              <span className={styles.attrName}>{qa.attribute}</span>
              <span className={styles.scoreWrap}>
                {delta !== 0 && (
                  <span
                    key={`d-${wave}`}
                    className={`${styles.deltaBadge} ${
                      delta > 0 ? styles.deltaUp : styles.deltaDown
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
                      className={`${styles.statTotal} ${
                        nextScore < 0 ? styles.statNegative : styles.statPositive
                      }`}
                    >
                      {nextScore > 0 ? `+${nextScore}` : nextScore}
                    </span>
                  </span>
                ) : (
                  <span
                    key={`s-${wave}`}
                    className={`${styles.statTotal} ${delta !== 0 ? styles.statPop : ''} ${
                      qa.score < 0 ? styles.statNegative : styles.statPositive
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
