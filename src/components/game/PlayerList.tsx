'use client';

import { useGame } from '@/context/GameContext';
import { Check, MoreHorizontal } from 'lucide-react';
import styles from './PlayerList.module.css';

export function PlayerList() {
  const { gameState, playerId } = useGame();

  if (!gameState) return null;

  const getStatusIcon = (playerId: string) => {
    // Check if player has submitted decision in individual prep
    if (gameState.phase === 'individual-prep') {
      const hasSubmitted = !!gameState.individualDecisions[playerId];
      return hasSubmitted ? <span className={styles.statusDone}><Check size={16} /></span> : <span className={styles.statusThinking}><MoreHorizontal size={16} /></span>;
    }
    return null;
  };

  return (
    <div className={styles.panel}>
      <h3 className={styles.heading}>Players</h3>
      <div className={styles.list}>
        {gameState.players.map((p) => {
          const isMe = p.id === playerId;
          
          return (
            <div key={p.id} className={styles.playerItem}>
              <div className={styles.avatar}>
                {p.name.charAt(0).toUpperCase()}
                <span className={`${styles.onlineDot} ${!p.connected ? styles.offlineDot : ''}`} />
              </div>
              
              <div className={styles.info}>
                <div className={styles.nameRow}>
                  <span className={styles.name}>{p.name}</span>
                  {isMe && <span className={styles.meBadge}>You</span>}
                </div>
                {p.isHost && <span className={styles.hostBadge}>Host</span>}
              </div>

              <div className={styles.status}>
                {getStatusIcon(p.id)}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
