'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import { useGame } from '@/context/GameContext';
import { CARD_DATA } from '@/lib/cardData';
import { Impact, IMPACT_VALUES } from '@/lib/types';
import { isOptionDisabled } from '@/lib/gameEngine';
import { Zap } from 'lucide-react';
import styles from './EventPhase.module.css';

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

export function EventPhase() {
  const { gameState, isHost, advancePhase, reviseDecision, skipRevision, setPreviewDeltas } = useGame();
  const [selectedConcernId, setSelectedConcernId] = useState<string | null>(null);
  const [selectedOptionId, setSelectedOptionId] = useState<string | null>(null);
  const [rationale, setRationale] = useState('');

  const eventCard = gameState?.activeEventId
    ? CARD_DATA.events.find((e) => e.id === gameState.activeEventId)
    : undefined;

  const isRevisionPhase = gameState?.phase === 'event-revision';

  const activeConcern = selectedConcernId
    ? CARD_DATA.concerns.find((c) => c.id === selectedConcernId)
    : null;

  useEffect(() => {
    if (selectedOptionId && activeConcern && gameState) {
      const opt = activeConcern.designOptions.find((o) => o.id === selectedOptionId);
      const currentDecision = gameState.groupDecisions.find((d) => d.concernId === activeConcern.id);
      const oldOpt = activeConcern.designOptions.find((o) => o.id === currentDecision?.optionId);

      if (opt && oldOpt) {
        const deltas: Record<string, number> = {};
        const allAttrs = new Set([...Object.keys(opt.impacts), ...Object.keys(oldOpt.impacts)]);
        allAttrs.forEach((attr) => {
          const oldVal = IMPACT_VALUES[(oldOpt.impacts[attr] || '=') as Impact] || 0;
          const newVal = IMPACT_VALUES[(opt.impacts[attr] || '=') as Impact] || 0;
          deltas[attr] = newVal - oldVal;
        });
        setPreviewDeltas(deltas);
      } else {
        setPreviewDeltas(null);
      }
    } else {
      setPreviewDeltas(null);
    }

    return () => setPreviewDeltas(null);
  }, [selectedOptionId, activeConcern, gameState, setPreviewDeltas]);

  if (!gameState || !gameState.activeEventId || !eventCard) return null;

  const handleRevise = () => {
    if (!selectedConcernId || !selectedOptionId || !rationale.trim()) return;
    reviseDecision(selectedConcernId, selectedOptionId, rationale.trim());

    // Reset selection after submitting one revision
    setSelectedConcernId(null);
    setSelectedOptionId(null);
    setRationale('');
  };

  return (
    <div className={styles.container}>
      {/* Event Card */}
      <div className={`${styles.eventCard} animate-card-flip`}>
        <div className={styles.hazardStrip} aria-hidden="true" />
        <div className={styles.eventHeader}>
          <span className={styles.eventTag}>EVT</span>
          <span className={styles.eventKind}>Site Event</span>
          <span className={styles.eventIcon}>
            <Zap size={18} />
          </span>
        </div>
        <h2 className={styles.eventTitle}>{eventCard.title}</h2>
        {eventCard.imageUrl && (
          <div className={styles.eventImageWrapper}>
            <Image
              src={eventCard.imageUrl}
              alt={eventCard.title}
              width={400}
              height={200}
              className={styles.eventImage}
            />
          </div>
        )}
        <p className={styles.eventDesc}>{eventCard.description}</p>
        <div className={styles.effectBox}>
          <span className={styles.effectLabel}>EFFECT</span>
          {eventCard.effect}
        </div>
      </div>

      {!isRevisionPhase ? (
        <div className={styles.actionArea}>
          <p className={styles.prompt}>
            Review the event above. This may impact your previous decisions or
            stakeholder priorities.
          </p>
          {isHost ? (
            <button
              className="btn btn-primary btn-lg"
              onClick={advancePhase}
              id="btn-advance-event"
            >
              Proceed to Revision Phase <span aria-hidden="true">→</span>
            </button>
          ) : (
            <p className={styles.waitMessage}>WAITING FOR HOST TO PROCEED…</p>
          )}
        </div>
      ) : (
        <div className={styles.revisionArea}>
          <div className={styles.revisionHeader}>
            <h3>
              <span className={styles.headingTick} aria-hidden="true" />
              REVISE PAST DECISIONS
            </h3>
            <p>Do you need to change any previous decisions based on this event?</p>
          </div>

          <div className={styles.pastDecisions}>
            {gameState.groupDecisions.map((decision, index) => (
              <div
                key={decision.concernId}
                className={`${styles.decisionItem} ${selectedConcernId === decision.concernId ? styles.decisionSelected : ''
                  }`}
                onClick={() => setSelectedConcernId(selectedConcernId === decision.concernId ? null : decision.concernId)}
              >
                <span className={styles.decisionIndex}>
                  {String(index + 1).padStart(2, '0')}
                </span>
                <div className={styles.decisionInfo}>
                  <span className={styles.decisionConcern}>{decision.concernTitle}</span>
                  <span className={styles.decisionOption}>
                    CURRENTLY: {decision.optionName}
                  </span>
                </div>
                <span className={styles.reviseTag}>REVISE</span>
              </div>
            ))}
          </div>

          {activeConcern && isHost && (
            <div className={`${styles.revisionForm} animate-fade-in-up`}>
              <h4>
                REVISING — <span>{activeConcern.title}</span>
              </h4>

              <div className={styles.optionsList}>
                {activeConcern.designOptions.map((opt, index) => {
                  const disabled = isOptionDisabled(gameState, opt.id);
                  const allAttributes = Object.keys(opt.impacts);
                  const currentDecision = gameState.groupDecisions.find((d) => d.concernId === activeConcern.id);
                  const isPreviouslySelected = currentDecision?.optionId === opt.id;

                  return (
                    <div
                      key={opt.id}
                      className={`${styles.optionCard} ${selectedOptionId === opt.id ? styles.optionSelected : ''
                        } ${disabled ? styles.optionDisabled : ''}`}
                      onClick={() => {
                        if (disabled) return;
                        setSelectedOptionId(selectedOptionId === opt.id ? null : opt.id);
                      }}
                    >
                      <div className={styles.optionHeader}>
                        <span className={styles.optIndex}>
                          OPT {String(index + 1).padStart(2, '0')}
                        </span>
                        <span className={styles.optName}>{opt.name}</span>
                        {isPreviouslySelected && (
                          <span className={styles.previouslySelectedBadge}>CURRENT CHOICE</span>
                        )}
                      </div>
                      <div className={styles.impactGrid}>
                        {allAttributes.map((attr) => (
                          <div key={attr} className={styles.impactRow}>
                            <span className={styles.impactAttr}>{attr}</span>
                            <ImpactBadge impact={opt.impacts[attr] as Impact} />
                          </div>
                        ))}
                      </div>
                    </div>
                  )
                })}
              </div>

              <textarea
                className="textarea"
                placeholder="Rationale for this change..."
                value={rationale}
                onChange={(e) => setRationale(e.target.value)}
                rows={2}
              />

              <button
                className="btn btn-success"
                onClick={handleRevise}
                disabled={!selectedOptionId || !rationale.trim()}
              >
                Submit Revision
              </button>
            </div>
          )}

          {!isHost && activeConcern && (
            <div className={styles.hostNotice}>
              THE HOST IS REVISING &ldquo;{activeConcern.title}&rdquo;
            </div>
          )}

          <div className={styles.finishSection}>
            {isHost ? (
              <button
                className="btn btn-secondary btn-lg"
                onClick={skipRevision}
                id="btn-finish-revision"
              >
                Finish Revisions &amp; Continue
              </button>
            ) : (
              <p className={styles.waitMessage}>
                WAITING FOR HOST TO FINISH REVISIONS…
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
