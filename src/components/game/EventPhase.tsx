'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import { useGame } from '@/context/GameContext';
import { CARD_DATA } from '@/lib/cardData';
import { ETHICS_CARD_DATA } from '@/lib/cardDataEthics';
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
  const { gameState, isHost, advancePhase, reviseDecision, skipRevision, setPreviewDeltas, updateRevisionDraft } = useGame();
  const [selectedConcernId, setSelectedConcernId] = useState<string | null>(null);
  const [selectedOptionId, setSelectedOptionId] = useState<string | null>(null);
  const [rationale, setRationale] = useState('');

  const isEthics = gameState?.gameVersion === 'ethics';

  const eventCard = gameState?.activeEventId
    ? CARD_DATA.events.find((e) => e.id === gameState.activeEventId)
    : undefined;

  const ethicsEventCard = gameState?.activeEventId
    ? ETHICS_CARD_DATA.events.find((e) => e.id === gameState.activeEventId)
    : undefined;

  const isRevisionPhase = gameState?.phase === 'event-revision';

  // Dramatic reveal: an incoming-alert screen plays before the card slams in.
  // Players joining mid-revision skip straight to the card.
  const [revealedEventId, setRevealedEventId] = useState<string | null>(null);
  const activeEventId = gameState?.activeEventId ?? null;
  const revealed = isRevisionPhase || (activeEventId !== null && revealedEventId === activeEventId);

  useEffect(() => {
    if (!activeEventId || isRevisionPhase) return;
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const timer = setTimeout(() => setRevealedEventId(activeEventId), reduceMotion ? 0 : 1600);
    return () => clearTimeout(timer);
  }, [activeEventId, isRevisionPhase]);

  // Non-host players read from the broadcast draft; host uses local state
  const viewConcernId = isHost ? selectedConcernId : (gameState?.revisionDraftConcernId ?? null);
  const viewOptionId = isHost ? selectedOptionId : (gameState?.revisionDraftOptionId ?? null);
  const viewRationale = isHost ? rationale : (gameState?.revisionDraftRationale ?? '');

  const activeConcern = viewConcernId
    ? CARD_DATA.concerns.find((c) => c.id === viewConcernId)
    : null;

  // Host: broadcast selection changes to all players
  const handleSelectConcern = (concernId: string | null) => {
    const next = selectedConcernId === concernId ? null : concernId;
    setSelectedConcernId(next);
    setSelectedOptionId(null);
    updateRevisionDraft({ concernId: next, optionId: null });
  };

  const handleSelectOption = (optionId: string | null) => {
    const next = selectedOptionId === optionId ? null : optionId;
    setSelectedOptionId(next);
    updateRevisionDraft({ optionId: next });
  };

  const handleRationaleChange = (text: string) => {
    setRationale(text);
    updateRevisionDraft({ rationale: text });
  };

  useEffect(() => {
    // Use viewOptionId so non-hosts also see the delta preview
    const optId = isHost ? selectedOptionId : (gameState?.revisionDraftOptionId ?? null);
    const concern = activeConcern;
    if (optId && concern && gameState) {
      const opt = concern.designOptions.find((o) => o.id === optId);
      const currentDecision = gameState.groupDecisions.find((d) => d.concernId === concern.id);
      const oldOpt = concern.designOptions.find((o) => o.id === currentDecision?.optionId);

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
  }, [isHost, selectedOptionId, activeConcern, gameState, setPreviewDeltas]);

  if (!gameState || !gameState.activeEventId) return null;

  // ---- Incoming alert screen, shown before the card is revealed ----
  if (!revealed) {
    return (
      <div className={styles.container}>
        <button
          type="button"
          className={styles.alertScreen}
          onClick={() => setRevealedEventId(activeEventId)}
          aria-label="Incoming event — click to reveal now"
        >
          <span className={`${styles.alertStrip} ${styles.alertStripTop}`} aria-hidden="true" />
          <span className={styles.alertIcon} aria-hidden="true"><Zap size={44} /></span>
          <span className={styles.alertTitle}>INCOMING {isEthics ? 'ETHICS' : 'SITE'} EVENT</span>
          <span className={styles.alertSub}>SIGNAL DETECTED — DECRYPTING TRANSMISSION…</span>
          <span className={`${styles.alertStrip} ${styles.alertStripBottom}`} aria-hidden="true" />
        </button>
      </div>
    );
  }

  // ---- Ethics mode: simpler event display, V-importance is applied server-side on advance ----
  if (isEthics && ethicsEventCard) {
    return (
      <div className={styles.container}>
        <div className={`${styles.eventCard} ${styles.cardSlam}`}>
          <div className={styles.hazardStrip} aria-hidden="true" />
          <div className={styles.eventHeader}>
            <span className={styles.eventTag}>EVT</span>
            <span className={styles.eventKind}>Ethics Event</span>
            <span className={styles.eventIcon}><Zap size={18} /></span>
          </div>
          <h2 className={`${styles.eventTitle} ${styles.staggerIn} ${styles.s1}`}>{ethicsEventCard.title}</h2>
          <p className={`${styles.eventDesc} ${styles.staggerIn} ${styles.s2}`}>{ethicsEventCard.description}</p>
          <div className={`${styles.effectBox} ${styles.staggerIn} ${styles.s3}`}>
            <span className={styles.effectLabel}>CONSEQUENCE</span>
            {ethicsEventCard.consequence}
          </div>
          <div className={styles.impactFlash} aria-hidden="true" />
        </div>

        <div className={`${styles.actionArea} ${styles.actionsIn}`}>
          <p className={styles.prompt}>
            This event has changed stakeholder priorities. The V-importance update will be applied when you continue.
          </p>
          {isHost ? (
            <button className="btn btn-primary btn-lg" onClick={advancePhase} id="btn-advance-event">
              Apply &amp; Continue <span aria-hidden="true">→</span>
            </button>
          ) : (
            <p className={styles.waitMessage}>WAITING FOR HOST TO CONTINUE…</p>
          )}
        </div>
      </div>
    );
  }

  if (!eventCard) return null;

  const handleRevise = () => {
    if (!selectedConcernId || !selectedOptionId || !rationale.trim()) return;
    reviseDecision(selectedConcernId, selectedOptionId, rationale.trim());

    // Reset selection after submitting one revision
    setSelectedConcernId(null);
    setSelectedOptionId(null);
    setRationale('');
    updateRevisionDraft({ concernId: null, optionId: null, rationale: '' });
  };

  return (
    <div className={styles.container}>
      {/* Event Card */}
      <div className={`${styles.eventCard} ${styles.cardSlam}`}>
        <div className={styles.hazardStrip} aria-hidden="true" />
        <div className={styles.eventHeader}>
          <span className={styles.eventTag}>EVT</span>
          <span className={styles.eventKind}>Site Event</span>
          <span className={styles.eventIcon}>
            <Zap size={18} />
          </span>
        </div>
        <h2 className={`${styles.eventTitle} ${styles.staggerIn} ${styles.s1}`}>{eventCard.title}</h2>
        {eventCard.imageUrl && (
          <div className={`${styles.eventImageWrapper} ${styles.staggerIn} ${styles.s2}`}>
            <Image
              src={eventCard.imageUrl}
              alt={eventCard.title}
              width={400}
              height={200}
              className={styles.eventImage}
            />
          </div>
        )}
        <p className={`${styles.eventDesc} ${styles.staggerIn} ${styles.s2}`}>{eventCard.description}</p>
        <div className={`${styles.effectBox} ${styles.staggerIn} ${styles.s3}`}>
          <span className={styles.effectLabel}>EFFECT</span>
          {eventCard.effect}
        </div>
        <div className={styles.impactFlash} aria-hidden="true" />
      </div>

      {!isRevisionPhase ? (
        <div className={`${styles.actionArea} ${styles.actionsIn}`}>
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
                className={`${styles.decisionItem} ${viewConcernId === decision.concernId ? styles.decisionSelected : ''
                  }`}
                onClick={() => isHost ? handleSelectConcern(decision.concernId) : undefined}
                style={!isHost ? { cursor: 'default' } : undefined}
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
                {isHost && <span className={styles.reviseTag}>REVISE</span>}
                {!isHost && viewConcernId === decision.concernId && (
                  <span className={styles.reviseTag}>HOST REVIEWING</span>
                )}
              </div>
            ))}
          </div>

          {activeConcern && (
            <div className={`${styles.revisionForm} animate-fade-in-up`}>
              <h4>
                REVISING — <span>{activeConcern.title}</span>
                {!isHost && <span className={styles.observingBadge}> (HOST SELECTING)</span>}
              </h4>

              <div className={styles.optionsList}>
                {activeConcern.designOptions.map((opt, index) => {
                  const disabled = isHost && isOptionDisabled(gameState, opt.id);
                  const allAttributes = Object.keys(opt.impacts);
                  const currentDecision = gameState.groupDecisions.find((d) => d.concernId === activeConcern.id);
                  const isPreviouslySelected = currentDecision?.optionId === opt.id;

                  return (
                    <div
                      key={opt.id}
                      className={`${styles.optionCard} ${viewOptionId === opt.id ? styles.optionSelected : ''
                        } ${disabled ? styles.optionDisabled : ''}`}
                      onClick={() => {
                        if (!isHost || disabled) return;
                        handleSelectOption(opt.id);
                      }}
                      style={!isHost ? { cursor: 'default' } : undefined}
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
                            <ImpactBadge impact={opt.impacts[attr] as Impact} />
                            <span className={styles.impactAttr}>{attr}</span>
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
                value={viewRationale}
                onChange={(e) => isHost ? handleRationaleChange(e.target.value) : undefined}
                readOnly={!isHost}
                rows={2}
              />

              {isHost && (
                <button
                  className="btn btn-success"
                  onClick={handleRevise}
                  disabled={!selectedOptionId || !rationale.trim()}
                >
                  Submit Revision
                </button>
              )}
            </div>
          )}

          <div className={styles.finishSection}>
            {isHost ? (
              <button
                className="btn btn-secondary btn-lg"
                onClick={() => { skipRevision(); updateRevisionDraft({ concernId: null, optionId: null, rationale: '' }); }}
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
