'use client';

import { useEffect, useRef, useState } from 'react';

export interface ScoreDeltaState {
  /** Attribute → score change since the previous snapshot (only non-zero entries) */
  deltas: Record<string, number>;
  /** Increments each time a new batch of deltas lands — use as a React key to restart animations */
  wave: number;
}

/**
 * Watches a map of QA scores and reports short-lived deltas whenever they change
 * (i.e. when a group decision or event revision lands). Deltas clear after `holdMs`.
 */
export function useScoreDeltas(scores: Record<string, number>, holdMs = 2600): ScoreDeltaState {
  const prevRef = useRef<Record<string, number> | null>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [state, setState] = useState<ScoreDeltaState>({ deltas: {}, wave: 0 });

  // Stable signature so the effect only fires on real score changes,
  // not on every render's fresh object identity.
  const signature = Object.keys(scores)
    .sort()
    .map((k) => `${k}:${scores[k]}`)
    .join('|');

  useEffect(() => {
    const prev = prevRef.current;
    prevRef.current = { ...scores };

    // First snapshot (or joining mid-game before state arrives): record, don't diff.
    if (!prev || Object.keys(prev).length === 0) return;

    const deltas: Record<string, number> = {};
    let changed = false;
    for (const key of new Set([...Object.keys(prev), ...Object.keys(scores)])) {
      const d = (scores[key] ?? 0) - (prev[key] ?? 0);
      if (d !== 0) {
        deltas[key] = d;
        changed = true;
      }
    }
    if (!changed) return;

    setState((s) => ({ deltas, wave: s.wave + 1 }));
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(() => setState((s) => ({ ...s, deltas: {} })), holdMs);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [signature]);

  useEffect(
    () => () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    },
    []
  );

  return state;
}
