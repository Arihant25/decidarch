'use client';

import { useState, useEffect, useRef, useCallback, useLayoutEffect } from 'react';
import { ConcernCard, EthicsConcernCard, Impact, IMPACT_VALUES } from '@/lib/types';
import { useGame } from '@/context/GameContext';
import { isOptionDisabled } from '@/lib/gameEngine';
import styles from './GroupDecision.module.css';

interface Props {
  concern: ConcernCard | EthicsConcernCard;
}

const IMPACT_OPTIONS: Impact[] = ['++', '+', '-', '--'];

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
  const { gameState, isHost, submitGroupDecision, selectGroupOption, setPreviewDeltas, updateGroupDraft } = useGame();

  // Local state mirrors the shared draft; we initialise from server state
  const [rationale, setRationale] = useState(gameState?.groupDraftRationale ?? '');
  const [valueImpacts, setValueImpacts] = useState<Partial<Record<string, Impact>>>(
    gameState?.groupDraftValueImpacts ?? {}
  );

  // Track whether the local user is actively editing to avoid overwriting their cursor position
  const suppressUntilRef = useRef(0);

  const isEthics = gameState?.gameVersion === 'ethics';
  const selectedOption = gameState?.hostSelectedOptionId || null;

  const ethicsConcern = isEthics ? (concern as EthicsConcernCard) : null;
  const classicConcern = !isEthics ? (concern as ConcernCard) : null;

  // Sync remote draft into local state only while the user is not typing
  useLayoutEffect(() => {
    if (Date.now() < suppressUntilRef.current) return;
    setRationale(gameState?.groupDraftRationale ?? '');
    setValueImpacts(gameState?.groupDraftValueImpacts ?? {});
  }, [gameState?.groupDraftRationale, gameState?.groupDraftValueImpacts]);

  const handleRationaleChange = useCallback((value: string) => {
    setRationale(value);
    suppressUntilRef.current = Date.now() + 1000; // suppress remote overwrites for 1 s after last keystroke
    updateGroupDraft({ rationale: value });
  }, [updateGroupDraft]);

  const handleValueImpactToggle = useCallback((valueName: string, imp: Impact) => {
    setValueImpacts((prev) => {
      const next = { ...prev, [valueName]: prev[valueName] === imp ? undefined : imp };
      updateGroupDraft({ valueImpacts: next });
      return next;
    });
  }, [updateGroupDraft]);

  // Preview score deltas for classic mode when an option is selected
  useEffect(() => {
    if (!isEthics && selectedOption && classicConcern) {
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
  }, [selectedOption, concern, setPreviewDeltas, isEthics, classicConcern]);

  if (!gameState) return null;

  const allAttributes = classicConcern
    ? Array.from(new Set(classicConcern.designOptions.flatMap((o) => Object.keys(o.impacts))))
    : [];

  const handleSubmitEthics = () => {
    if (!rationale.trim()) return;
    submitGroupDecision('', rationale.trim(), valueImpacts);
  };

  const handleSubmitClassic = () => {
    if (!selectedOption || !rationale.trim()) return;
    submitGroupDecision(selectedOption, rationale.trim());
  };

  // ---- Ethics mode ----
  if (isEthics && ethicsConcern) {
    const proposals = Object.values(gameState.individualDecisions);

    return (
      <div className={styles.container}>
        <div className={styles.header}>
          <p className={styles.headerLabel}>
            <span className={styles.headerTick} aria-hidden="true" />
            FORM C-3 — ETHICS CONSENSUS RECORD
          </p>
          <h2>Group Safeguard Decision</h2>
          <p className={styles.headerSub}>
            Review all proposals. Agree on the group safeguard and rate its impact on each affected value.
          </p>
        </div>

        <div className={styles.content}>
          {/* Show individual proposals */}
          <div className={styles.optionsList}>
            {proposals.map((p) => (
              <div key={p.playerId} className={styles.optionCard}>
                <div className={styles.optionHeader}>
                  <span className={styles.optionNumber}>{p.playerName}</span>
                </div>
                <p className={styles.optionDesc}>{p.rationale}</p>
              </div>
            ))}
          </div>

          <div className={styles.submissionPanel}>
            <label className="label">GROUP SAFEGUARD — AGREED SOLUTION</label>
            <textarea
              className="textarea"
              placeholder="Describe the group's agreed safeguard..."
              value={rationale}
              onChange={(e) => handleRationaleChange(e.target.value)}
              rows={3}
            />

            <div style={{ marginTop: '1rem' }}>
              <p className="label" style={{ marginBottom: '0.5rem' }}>
                RATE IMPACT ON AFFECTED VALUES
              </p>
              <p style={{ fontSize: '0.75rem', opacity: 0.6, marginBottom: '0.75rem' }}>
                How does the chosen safeguard affect each value? (++ very positive … -- very negative)
              </p>
              {ethicsConcern.affectedValues.map((valueName) => (
                <div key={valueName} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.4rem 0', borderBottom: '1px solid rgba(141,198,255,0.1)' }}>
                  <span style={{ fontSize: '0.8rem', letterSpacing: '0.05em' }}>{valueName}</span>
                  <div style={{ display: 'flex', gap: '0.35rem' }}>
                    {IMPACT_OPTIONS.map((imp) => (
                      <button
                        key={imp}
                        type="button"
                        className={`impact impact-${imp === '++' ? 'very-positive' : imp === '+' ? 'positive' : imp === '-' ? 'negative' : 'very-negative'}`}
                        style={{
                          cursor: 'pointer',
                          outline: valueImpacts[valueName] === imp ? '2px solid var(--cyan)' : 'none',
                          outlineOffset: '2px',
                          opacity: valueImpacts[valueName] === imp ? 1 : 0.45,
                          transition: 'opacity 0.15s, outline 0.15s',
                        }}
                        onClick={() => handleValueImpactToggle(valueName, imp)}
                      >
                        {imp}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            {isHost ? (
              <button
                className={`btn btn-success btn-lg ${styles.confirmBtn}`}
                onClick={handleSubmitEthics}
                disabled={!rationale.trim()}
                style={{ marginTop: '1rem' }}
              >
                Confirm Group Safeguard <span aria-hidden="true">→</span>
              </button>
            ) : (
              <button
                className={`btn btn-success btn-lg ${styles.confirmBtn}`}
                disabled
                style={{ marginTop: '1rem', opacity: 0.4, cursor: 'not-allowed' }}
              >
                Only host can continue
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  // ---- Classic mode ----
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
      </div>

      <div className={styles.content}>
        <div className={styles.optionsList}>
          {classicConcern!.designOptions.map((option, index) => {
            const disabled = isOptionDisabled(gameState, option.id);
            return (
              <div
                key={option.id}
                className={`${styles.optionCard} ${selectedOption === option.id ? styles.optionSelected : ''} ${disabled ? styles.optionDisabled : ''}`}
                onClick={() => {
                  if (!disabled) {
                    selectGroupOption(selectedOption === option.id ? null : option.id);
                  }
                }}
              >
                <div className={styles.optionHeader}>
                  <span className={styles.optionNumber}>OPT {String(index + 1).padStart(2, '0')}</span>
                  {selectedOption === option.id && <span className={styles.selectedBadge}>CHOSEN</span>}
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
            );
          })}
        </div>

        <div className={styles.submissionPanel}>
          <label className="label">GROUP RATIONALE</label>
          <textarea
            className="textarea"
            placeholder="Why did the group choose this option?"
            value={rationale}
            onChange={(e) => handleRationaleChange(e.target.value)}
            rows={4}
          />
          {isHost ? (
            <button
              className={`btn btn-success btn-lg ${styles.confirmBtn}`}
              onClick={handleSubmitClassic}
              disabled={!selectedOption || !rationale.trim()}
            >
              Confirm Final Group Decision <span aria-hidden="true">→</span>
            </button>
          ) : (
            <button
              className={`btn btn-success btn-lg ${styles.confirmBtn}`}
              disabled
              style={{ opacity: 0.4, cursor: 'not-allowed' }}
            >
              Only host can continue
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
