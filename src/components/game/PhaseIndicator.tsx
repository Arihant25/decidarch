'use client';

import { GamePhase } from '@/lib/types';
import styles from './PhaseIndicator.module.css';

import { Pencil, Eye, Users, Zap, RefreshCw, Trophy, PartyPopper, ClipboardList } from 'lucide-react';

const PHASE_CONFIG: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
  'individual-prep': { label: 'Individual Prep', color: 'var(--phase-prep)', icon: <Pencil size={13} /> },
  'reveal': { label: 'Reveal Decisions', color: 'var(--phase-reveal)', icon: <Eye size={13} /> },
  'group-decision': { label: 'Group Decision', color: 'var(--phase-group)', icon: <Users size={13} /> },
  'event': { label: 'Event Card', color: 'var(--phase-event)', icon: <Zap size={13} /> },
  'event-revision': { label: 'Revise Decisions', color: 'var(--phase-event)', icon: <RefreshCw size={13} /> },
  'scoring': { label: 'Final Scoring', color: 'var(--phase-scoring)', icon: <Trophy size={13} /> },
  'finished': { label: 'Game Over', color: 'var(--phase-scoring)', icon: <PartyPopper size={13} /> },
};

interface Props {
  phase: GamePhase;
  concernIndex: number;
  totalConcerns: number;
}

export function PhaseIndicator({ phase, concernIndex, totalConcerns }: Props) {
  const config = PHASE_CONFIG[phase] || { label: phase, color: 'var(--faint)', icon: <ClipboardList size={13} /> };
  const progress = phase === 'scoring' || phase === 'finished'
    ? totalConcerns
    : Math.min(concernIndex + 1, totalConcerns);

  return (
    <div className={styles.indicator}>
      <span className={styles.tick} style={{ background: config.color }} aria-hidden="true" />
      <span className={styles.icon} style={{ color: config.color }}>{config.icon}</span>
      <span className={styles.label} style={{ color: config.color }}>
        {config.label}
      </span>
      {phase !== 'scoring' && phase !== 'finished' && (
        <span className={styles.progress}>
          CARD {progress}/{totalConcerns}
        </span>
      )}
    </div>
  );
}
