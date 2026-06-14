'use client';

import React, { useState, useEffect } from 'react';
import { ConcernCard, EthicsConcernCard, Impact, IMPACT_VALUES } from '@/lib/types';
import { useGame } from '@/context/GameContext';
import { isOptionDisabled } from '@/lib/gameEngine';
import { ImpactBadge } from './ImpactBadge';
import styles from './IndividualPrep.module.css';

interface Props {
  concern: ConcernCard | EthicsConcernCard;
}

export function IndividualPrep({ concern }: Props) {
  const { gameState, playerId, submitDecision, setPreviewDeltas, isSpectator } = useGame();
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [rationale, setRationale] = useState('');

  const isEthics = gameState?.gameVersion === 'ethics';

  useEffect(() => {
    if (!isEthics && selectedOption) {
      const classicConcern = concern as ConcernCard;
      const opt = classicConcern.designOptions.find((o) => o.id === selectedOption);
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
  }, [selectedOption, concern, setPreviewDeltas, isEthics]);

  if (!gameState) return null;

  const hasSubmitted = gameState.individualDecisions[playerId || ''];
  const submittedCount = Object.keys(gameState.individualDecisions).length;
  const totalPlayers = gameState.players.filter((p) => p.connected).length;

  const handleSubmitClassic = () => {
    if (!selectedOption || !rationale.trim()) return;
    submitDecision(selectedOption, rationale.trim());
  };

  const handleSubmitEthics = () => {
    if (!rationale.trim()) return;
    submitDecision('', rationale.trim());
  };

  const ethicsConcern = isEthics ? (concern as EthicsConcernCard) : null;
  const classicConcern = !isEthics ? (concern as ConcernCard) : null;
  const allAttributes = classicConcern
    ? Array.from(new Set(classicConcern.designOptions.flatMap((o) => Object.keys(o.impacts))))
    : [];

  return (
    <div className={styles.container}>
      {/* Concern Card */}
      {/* data-deal-target: the deal intro overlay flies its cards to this element */}
      <div className={`${styles.concernCard} animate-card-flip`} data-deal-target>
        <div className={styles.concernHeader}>
          <span className={styles.concernTag}>{isEthics ? 'ETH' : 'CON'}</span>
          <span className={styles.concernKind}>{isEthics ? 'Ethical Concern' : 'Concern'}</span>
          <span className={styles.concernId}>
            {concern.id.replace(/[a-z]+-/, 'NO. ').replace('-', ' ')}
          </span>
        </div>
        <h2 className={styles.concernTitle}>{concern.title}</h2>
        <p className={styles.concernDesc}>{concern.description}</p>
        {ethicsConcern && (
          <div className={styles.safeguardHint}>
            <strong className={styles.safeguardHintLabel}>SAFEGUARD HINT</strong>
            <p className={styles.safeguardHintText}>{ethicsConcern.safeguardHint}</p>
          </div>
        )}
        {ethicsConcern && (
          <div className={styles.affectedValues}>
            {ethicsConcern.affectedValues.map((v) => (
              <span key={v} className={styles.valueBadge}>
                {v}
              </span>
            ))}
          </div>
        )}
      </div>

      {isSpectator ? (
        <div className={styles.submitted}>
          <span className={styles.stamp}>LIVE</span>
          <h3>Architects are deciding</h3>
          <p>PROPOSALS IN — {submittedCount}/{totalPlayers}</p>
          <div className={styles.progressBar}>
            <div
              className={styles.progressFill}
              style={{ '--progress-width': `${totalPlayers ? (submittedCount / totalPlayers) * 100 : 0}%` } as React.CSSProperties}
            />
          </div>
        </div>
      ) : hasSubmitted ? (
        <div className={styles.submitted}>
          <span className={styles.stamp}>FILED</span>
          <h3>Decision Submitted</h3>
          <p>AWAITING OTHER ARCHITECTS — {submittedCount}/{totalPlayers}</p>
          <div className={styles.progressBar}>
            <div
              className={styles.progressFill}
              style={{ '--progress-width': `${(submittedCount / totalPlayers) * 100}%` } as React.CSSProperties}
            />
          </div>
        </div>
      ) : isEthics ? (
        /* ---- Ethics mode: free-text safeguard ---- */
        <div className={`${styles.rationaleSection} animate-fade-in-up`}>
          <div className={styles.optionsHeading}>
            <h3>
              <span className={styles.headingTick} aria-hidden="true" />
              PROPOSE YOUR SAFEGUARD
            </h3>
            <p>From your stakeholder&apos;s perspective, how should this ethical concern be addressed?</p>
          </div>
          <label htmlFor="eth-rationale" className="label">
            YOUR SAFEGUARD PROPOSAL
          </label>
          <textarea
            id="eth-rationale"
            className="textarea"
            placeholder={ethicsConcern?.safeguardHint ?? 'Describe your proposed safeguard...'}
            value={rationale}
            onChange={(e) => setRationale(e.target.value)}
            rows={4}
          />
          <button
            className={`btn btn-primary btn-lg ${styles.submitBtn}`}
            onClick={handleSubmitEthics}
            disabled={!rationale.trim()}
            id="btn-submit-decision"
          >
            Submit My Proposal <span aria-hidden="true">→</span>
          </button>
        </div>
      ) : (
        /* ---- Classic mode: design option selection ---- */
        <>
          <div className={styles.optionsHeading}>
            <h3>
              <span className={styles.headingTick} aria-hidden="true" />
              CHOOSE A DESIGN OPTION
            </h3>
            <p>Select the option that best satisfies stakeholder quality concerns.</p>
          </div>

          <div className={styles.optionsGrid}>
            {classicConcern!.designOptions.map((option, index) => {
              const disabled = isOptionDisabled(gameState, option.id);
              return (
                <button
                  key={option.id}
                  className={`${styles.optionCard} ${selectedOption === option.id ? styles.optionSelected : ''} ${disabled ? styles.optionDisabled : ''} animate-fade-in-up`}
                  style={{ '--anim-delay': `${index * 100}ms` } as React.CSSProperties}
                  onClick={() => {
                    if (disabled) return;
                    setSelectedOption(selectedOption === option.id ? null : option.id);
                  }}
                  disabled={disabled}
                  id={`option-${option.id}`}
                >
                  <div className={styles.optionHeader}>
                    <span className={styles.optionNumber}>OPT {String(index + 1).padStart(2, '0')}</span>
                    {selectedOption === option.id && <span className={styles.selectedBadge}>SELECTED</span>}
                  </div>
                  <h4 className={styles.optionName}>{option.name}</h4>
                  <p className={styles.optionDesc}>{option.description}</p>
                  <div className={styles.impactGrid}>
                    {allAttributes.map((attr) => {
                      const impactVal = (option.impacts[attr] || '=') as Impact;
                      return (
                        <div key={attr} className={styles.impactRow}>
                          <ImpactBadge impact={impactVal} />
                          <span className={styles.impactAttr}>{attr}</span>
                        </div>
                      );
                    })}
                  </div>
                </button>
              );
            })}

            <div className={styles.rationaleSection}>
              <label htmlFor="rationale" className="label">YOUR RATIONALE — WHY THIS OPTION?</label>
              <textarea
                id="rationale"
                className="textarea"
                placeholder={selectedOption ? 'Explain your reasoning...' : 'Select an option first...'}
                value={rationale}
                onChange={(e) => setRationale(e.target.value)}
                disabled={!selectedOption}
              />
              <button
                className={`btn btn-primary btn-lg ${styles.submitBtn}`}
                onClick={handleSubmitClassic}
                disabled={!selectedOption || !rationale.trim()}
                id="btn-submit-decision"
              >
                Submit My Decision <span aria-hidden="true">→</span>
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

