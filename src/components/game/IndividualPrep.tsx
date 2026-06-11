'use client';

import { useState, useEffect } from 'react';
import { ConcernCard, Impact, IMPACT_VALUES } from '@/lib/types';
import { useGame } from '@/context/GameContext';
import { isOptionDisabled } from '@/lib/gameEngine';
import styles from './IndividualPrep.module.css';

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

export function IndividualPrep({ concern }: Props) {
  const { gameState, playerId, submitDecision, setPreviewDeltas } = useGame();
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [rationale, setRationale] = useState('');

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

  const hasSubmitted = gameState.individualDecisions[playerId || ''];
  const submittedCount = Object.keys(gameState.individualDecisions).length;
  const totalPlayers = gameState.players.filter((p) => p.connected).length;

  const handleSubmit = () => {
    if (!selectedOption || !rationale.trim()) return;
    submitDecision(selectedOption, rationale.trim());
  };

  const allAttributes = new Set<string>();
  concern.designOptions.forEach((opt) => {
    Object.keys(opt.impacts).forEach((k) => allAttributes.add(k));
  });
  const attrList = Array.from(allAttributes);

  return (
    <div className={styles.container}>
      {/* Concern Card */}
      <div className={`${styles.concernCard} animate-card-flip`}>
        <div className={styles.concernHeader}>
          <span className={styles.concernTag}>CON</span>
          <span className={styles.concernKind}>Concern</span>
          <span className={styles.concernId}>
            {concern.id.replace('concern-', 'NO. ')}
          </span>
        </div>
        <h2 className={styles.concernTitle}>{concern.title}</h2>
        <p className={styles.concernDesc}>{concern.description}</p>
      </div>

      {hasSubmitted ? (
        <div className={styles.submitted}>
          <span className={styles.stamp}>FILED</span>
          <h3>Decision Submitted</h3>
          <p>
            AWAITING OTHER ARCHITECTS — {submittedCount}/{totalPlayers}
          </p>
          <div className={styles.progressBar}>
            <div
              className={styles.progressFill}
              style={{ width: `${(submittedCount / totalPlayers) * 100}%` }}
            />
          </div>
        </div>
      ) : (
        <>
          {/* Design Options */}
          <div className={styles.optionsHeading}>
            <h3>
              <span className={styles.headingTick} aria-hidden="true" />
              CHOOSE A DESIGN OPTION
            </h3>
            <p>Select the option that best satisfies stakeholder quality concerns.</p>
          </div>

          <div className={styles.optionsGrid}>
            {concern.designOptions.map((option, index) => {
              const disabled = isOptionDisabled(gameState, option.id);
              return (
                <button
                  key={option.id}
                  className={`${styles.optionCard} ${selectedOption === option.id ? styles.optionSelected : ''
                    } ${disabled ? styles.optionDisabled : ''} animate-fade-in-up`}
                  style={{ animationDelay: `${index * 100}ms` }}
                  onClick={() => {
                    if (disabled) return;
                    setSelectedOption(selectedOption === option.id ? null : option.id);
                  }}
                  disabled={disabled}
                  id={`option-${option.id}`}
                >
                  <div className={styles.optionHeader}>
                    <span className={styles.optionNumber}>
                      OPT {String(index + 1).padStart(2, '0')}
                    </span>
                    {selectedOption === option.id && (
                      <span className={styles.selectedBadge}>SELECTED</span>
                    )}
                  </div>
                  <h4 className={styles.optionName}>{option.name}</h4>
                  <p className={styles.optionDesc}>{option.description}</p>

                  {/* Impact grid */}
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
                </button>
              )
            })}
          </div>

          {/* Rationale */}
          {selectedOption && (
            <div className={`${styles.rationaleSection} animate-fade-in-up`}>
              <label htmlFor="rationale" className="label">
                YOUR RATIONALE — WHY THIS OPTION?
              </label>
              <textarea
                id="rationale"
                className="textarea"
                placeholder="Explain your reasoning..."
                value={rationale}
                onChange={(e) => setRationale(e.target.value)}
                rows={3}
              />
              <button
                className={`btn btn-primary btn-lg ${styles.submitBtn}`}
                onClick={handleSubmit}
                disabled={!rationale.trim()}
                id="btn-submit-decision"
              >
                Submit My Decision <span aria-hidden="true">→</span>
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
