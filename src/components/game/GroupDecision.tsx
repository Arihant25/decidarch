'use client';

import { useState, useEffect } from 'react';
import { ConcernCard, Impact, IMPACT_VALUES } from '@/lib/types';
import { useGame } from '@/context/GameContext';
import { isOptionDisabled } from '@/lib/gameEngine';
import styles from './GroupDecision.module.css';

interface Props {
  concern: ConcernCard;
}

function ImpactBadge({ impact }: { impact: Impact }) {
  const classMap: Record<string, string> = {
    '++': 'impact impact-very-positive',
    '+': 'impact impact-positive',
    '=': 'impact impact-neutral',
    '-': 'impact impact-negative',
    '--': 'impact impact-very-negative',
  };
  return <span className={classMap[impact] || 'impact impact-neutral'}>{impact}</span>;
}

export function GroupDecision({ concern }: Props) {
  const { gameState, isHost, submitGroupDecision, selectGroupOption, setPreviewDeltas } = useGame();
  const [rationale, setRationale] = useState('');

  const selectedOption = gameState?.hostSelectedOptionId || null;

  useEffect(() => {
    if (selectedOption) {
      const opt = concern.designOptions.find((o) => o.id === selectedOption);
      if (opt) {
        const deltas: Record<string, number> = {};
        for (const [k, v] of Object.entries(opt.impacts)) {
          deltas[k] = IMPACT_VALUES[v as Impact] || 0;
        }
        setPreviewDeltas(deltas);
      } else {
        setPreviewDeltas(null);
      }
    } else {
      setPreviewDeltas(null);
    }
    return () => setPreviewDeltas(null);
  }, [selectedOption, concern, setPreviewDeltas]);

  if (!gameState) return null;

  const allAttributes = new Set<string>();
  concern.designOptions.forEach((opt) => {
    Object.keys(opt.impacts).forEach((k) => allAttributes.add(k));
  });
  const attrList = Array.from(allAttributes);

  const handleSubmit = () => {
    if (!selectedOption || !rationale.trim()) return;
    submitGroupDecision(selectedOption, rationale.trim());
  };

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <p className={styles.headerLabel}>
          <span className={styles.headerTick} aria-hidden="true" />
          FORM C-3 — CONSENSUS RECORD
        </p>
        <h2>Group Decision</h2>
        <p className={styles.headerSub}>
          Discuss the revealed suggestions and agree on the final design choice.
        </p>
        {!isHost && (
          <p className={styles.hostNotice}>THE HOST FILES THE FINAL GROUP DECISION</p>
        )}
      </div>

      <div className={styles.content}>
        <div className={styles.optionsList}>
          {concern.designOptions.map((option, index) => {
            const disabled = isOptionDisabled(gameState, option.id);
            return (
              <div
                key={option.id}
                className={`${styles.optionCard} ${selectedOption === option.id ? styles.optionSelected : ''
                  } ${!isHost || disabled ? styles.optionDisabled : ''}`}
                onClick={() => {
                  if (isHost && !disabled) {
                    selectGroupOption(selectedOption === option.id ? null : option.id);
                  }
                }}
              >
                <div className={styles.optionHeader}>
                  <span className={styles.optionNumber}>
                    OPT {String(index + 1).padStart(2, '0')}
                  </span>
                  {selectedOption === option.id && (
                    <span className={styles.selectedBadge}>CHOSEN</span>
                  )}
                </div>
                <h4 className={styles.optionName}>{option.name}</h4>
                <p className={styles.optionDesc}>{option.description}</p>

                <div className={styles.impactGrid}>
                  {attrList.map((attr) => {
                    const impactVal = (option.impacts[attr] || '=') as Impact;
                    return (
                      <div key={attr} className={styles.impactRow}>
                        <span className={styles.impactAttr}>{attr}</span>
                        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                          <ImpactBadge impact={impactVal} />
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Show individual rationales for this option */}
                {(() => {
                  const decisionsForOption = Object.values(gameState.individualDecisions).filter(d => d.optionId === option.id);
                  if (decisionsForOption.length === 0) return null;
                  return (
                    <div className={styles.optionComments}>
                      <p className={styles.commentsLabel}>ARCHITECT COMMENTS</p>
                      <ul className={styles.commentsList}>
                        {decisionsForOption.map(d => (
                          <li key={d.playerId} className={styles.commentItem}>
                            <strong>{d.playerName}:</strong> &ldquo;{d.rationale}&rdquo;
                          </li>
                        ))}
                      </ul>
                    </div>
                  );
                })()}
              </div>
            )
          })}
        </div>

        {isHost && (
          <div className={styles.submissionPanel}>
            <label className="label">GROUP RATIONALE</label>
            <textarea
              className="textarea"
              placeholder="Why did the group choose this option?"
              value={rationale}
              onChange={(e) => setRationale(e.target.value)}
              rows={4}
            />
            <button
              className={`btn btn-success btn-lg ${styles.confirmBtn}`}
              onClick={handleSubmit}
              disabled={!selectedOption || !rationale.trim()}
            >
              Confirm Final Group Decision <span aria-hidden="true">→</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
