'use client';

import { useGame } from '@/context/GameContext';
import Link from 'next/link';
import { calculateScores } from '@/lib/scoring';
import styles from './ScoreBoard.module.css';

export function ScoreBoard() {
  const { gameState } = useGame();

  if (!gameState) return null;

  const score = calculateScores(gameState);

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <p className={styles.formLabel}>FORM D-4 · FINAL INSPECTION</p>
        <h2 className={styles.title}>
          {score.lost ? 'Project Rejected' : 'Project Delivered'}
        </h2>
        {!score.lost && (
          <p className={styles.scoreLine}>
            FINAL SCORE — <strong>{score.finalScore}</strong>
          </p>
        )}
        <span
          className={`${styles.gradeStamp} ${score.lost ? styles.gradeLost : styles.gradeWin
            }`}
          aria-label={`Grade ${score.grade}`}
        >
          GRADE
          <br />
          {score.grade}
        </span>
      </div>

      {score.lost && score.loss && (
        <div className={styles.lossReason}>
          <span className={styles.lossLabel}>REASON FOR REJECTION</span>
          <p className={styles.lossSummary}>{score.loss.summary}</p>
          <div className={styles.lossRows}>
            {score.loss.details.map((d) => (
              <div key={`${d.stakeholderName ?? 'qa'}-${d.attribute}`} className={styles.lossRow}>
                <span className={styles.lossWho}>
                  {d.stakeholderName ? (
                    <>
                      <strong>{d.stakeholderName}</strong>
                      <span className={styles.lossAttr}> · {d.attribute}</span>
                    </>
                  ) : (
                    <strong>{d.attribute}</strong>
                  )}
                </span>
                <span className={styles.lossNumbers}>
                  <span>SCORE {d.qaScore}</span>
                  <span>NEEDED {d.required}</span>
                  <span className={styles.lossShort}>SHORT BY {d.required - d.qaScore}</span>
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className={styles.grid}>
        {/* QA Scores */}
        <div className={styles.section}>
          <h3>
            <i>01</i> QUALITY ATTRIBUTE SCORES
          </h3>
          <p className={styles.helpText}>Sum of &lsquo;+&rsquo; minus sum of &lsquo;−&rsquo;</p>
          <div className={styles.table}>
            {score.qaScores.map((qa) => (
              <div key={qa.attribute} className={styles.row}>
                <span className={styles.attrName}>{qa.attribute}</span>
                <div className={styles.attrStats}>
                  <span className={styles.statPlus}>+{qa.plusCount}</span>
                  <span className={styles.statMinus}>-{qa.minusCount}</span>
                  <span
                    className={`${styles.statTotal} ${qa.score < 0 ? styles.statNegative : styles.statPositive
                      }`}
                  >
                    {qa.score > 0 ? `+${qa.score}` : qa.score}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Stakeholders */}
        <div className={styles.section}>
          <h3>
            <i>02</i> STAKEHOLDER SATISFACTION
          </h3>
          <p className={styles.helpText}>QA-Score minus QA-Priority</p>
          <div className={styles.stakeholders}>
            {score.stakeholderSatisfactions.map((s) => (
              <div key={s.stakeholderName} className={styles.stakeholderCard}>
                <div className={styles.shHeader}>
                  <h4>{s.stakeholderName}</h4>
                  <span className={s.allSatisfied ? styles.shSatisfied : styles.shUnsatisfied}>
                    {s.allSatisfied ? 'SATISFIED' : 'UNSATISFIED'}
                  </span>
                </div>
                <div className={styles.shDetails}>
                  {s.attributeDetails.map((d) => (
                    <div key={d.attribute} className={styles.shRow}>
                      <span>{d.attribute}</span>
                      <div className={styles.shNumbers}>
                        <span>PRI {d.qaPriority}</span>
                        <span>SCO {d.qaScore}</span>
                        <span className={d.satisfied ? styles.satPlus : styles.satMinus}>
                          SAT {d.satisfaction > 0 ? `+${d.satisfaction}` : d.satisfaction}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
                <div className={styles.shTotal}>
                  TOTAL SATISFACTION — <strong>{s.totalSatisfaction}</strong>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Final Calculation */}
      <div className={styles.finalCalc}>
        <h3>
          <i>03</i> FINAL CALCULATION
        </h3>
        <div className={styles.calcRow}>
          <span>Total Stakeholder Satisfaction</span>
          <span>{score.totalStakeholderSatisfaction}</span>
        </div>
        <div className={styles.calcRow}>
          <span>Unaddressed Concern Cards</span>
          <span className={styles.calcMinus}>-{score.unaddressedConcerns}</span>
        </div>
        <div className={styles.calcTotal}>
          <span>FINAL SCORE</span>
          <span>{score.finalScore}</span>
        </div>
      </div>

      <div className={styles.footer}>
        <Link href="/" className="btn btn-primary btn-lg">
          Return to Home <span aria-hidden="true">→</span>
        </Link>
      </div>
    </div>
  );
}
