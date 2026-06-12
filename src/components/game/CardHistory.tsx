'use client';

import { useGame } from '@/context/GameContext';
import { CARD_DATA } from '@/lib/cardData';
import { ETHICS_CARD_DATA } from '@/lib/cardDataEthics';
import styles from './CardHistory.module.css';

interface CardHistoryProps {
  isCollapsed: boolean;
  onToggle: () => void;
}

export function CardHistory({ isCollapsed, onToggle }: CardHistoryProps) {
  const { gameState } = useGame();

  if (!gameState) return null;

  const isEthics = gameState.gameVersion === 'ethics';
  const decisions = gameState.groupDecisions;

  // Resolved past events: drawn events that are no longer the active event
  const pastEventIds = gameState.drawnEventIndices
    .map((i) => gameState.eventOrder[i])
    .filter((id) => id !== gameState.activeEventId);

  const pastEvents = isEthics
    ? pastEventIds.map((id) => ETHICS_CARD_DATA.events.find((e) => e.id === id)).filter(Boolean)
    : pastEventIds.map((id) => CARD_DATA.events.find((e) => e.id === id)).filter(Boolean);

  return (
    <div className={`${styles.container} ${isCollapsed ? styles.collapsed : ''}`}>

      {/* Past events — always visible */}
      {pastEvents.length > 0 && (
        <div className={styles.eventLog}>
          <div className={styles.eventLogHeading}>Past Events</div>
          <div className={styles.eventCards}>
            {pastEvents.map((evt, index) => {
              if (!evt) return null;
              const isEthicsEvt = 'consequence' in evt;
              return (
                <div key={evt.id} className={styles.eventCard}>
                  <div className={styles.cardHeader}>
                    <span className={styles.eventIndex}>{String(index + 1).padStart(2, '0')}</span>
                    <span className={styles.concernTitle}>{evt.title}</span>
                  </div>
                  <div className={styles.decisionDetails}>
                    <span className={styles.eventEffect}>
                      {isEthicsEvt ? evt.consequence : (evt as { effect: string }).effect}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      <button className={styles.header} onClick={onToggle} aria-expanded={!isCollapsed}>
        <span className={styles.headerTitle}>
          {isEthics ? 'Safeguard Log' : 'Decision Log'}
        </span>
        <span className={styles.toggleIcon}>{isCollapsed ? '+' : '−'}</span>
      </button>

      <div className={styles.body}>
        <div className={styles.list}>
          {decisions.length === 0 ? (
            <div className={styles.empty}>{'// no decisions filed yet'}</div>
          ) : (
            decisions.map((decision, index) => (
              <div key={decision.concernId} className={styles.historyCard}>
                <div className={styles.cardHeader}>
                  <span className={styles.number}>{String(index + 1).padStart(2, '0')}</span>
                  <span className={styles.concernTitle}>{decision.concernTitle}</span>
                  {decision.revisedByEvent && (
                    <span className={styles.revisedBadge} title={`Revised due to: ${decision.revisedByEvent}`}>
                      Revised
                    </span>
                  )}
                </div>

                <div className={styles.decisionDetails}>
                  <div className={styles.optionRow}>
                    <span className={styles.label}>{isEthics ? 'SAFEGUARD' : 'CHOSEN'}</span>
                    <span className={styles.value}>{decision.optionName}</span>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

