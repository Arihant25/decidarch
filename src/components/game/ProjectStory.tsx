'use client';

import { useEffect, useRef, useState } from 'react';
import styles from './ProjectStory.module.css';

/** Characters revealed per tick / tick interval — purely cosmetic */
const CHARS_PER_TICK = 2;
const TICK_MS = 24;

function formatDuration(ms: number): string {
  const totalMinutes = Math.max(1, Math.round(ms / 60_000));
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  if (hours === 0) return `${totalMinutes} minute${totalMinutes !== 1 ? 's' : ''}`;
  const hPart = `${hours} hour${hours !== 1 ? 's' : ''}`;
  if (minutes === 0) return hPart;
  return `${hPart} and ${minutes} minute${minutes !== 1 ? 's' : ''}`;
}

/**
 * Renders the deterministic project retrospective, streamed
 * character by character like an LLM response.
 */
export function ProjectStory({ story, durationMs }: { story: string; durationMs?: number }) {
  // Story and reveal progress live together so progress can be
  // reset during render if a different story ever comes in.
  const [progress, setProgress] = useState({ story, count: 0 });
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  if (progress.story !== story) {
    setProgress({ story, count: 0 });
  }

  const visibleCount = Math.min(progress.count, story.length);
  const done = visibleCount >= story.length;

  useEffect(() => {
    intervalRef.current = setInterval(() => {
      setProgress((prev) => {
        const next = Math.min(prev.count + CHARS_PER_TICK, story.length);
        if (next >= story.length && intervalRef.current) {
          clearInterval(intervalRef.current);
          intervalRef.current = null;
        }
        return { story, count: next };
      });
    }, TICK_MS);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [story]);

  const skip = () => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    setProgress({ story, count: story.length });
  };

  return (
    <div className={styles.card}>
      <div className={styles.cardHeader}>
        <span className={styles.cardLabel}>
          <span className={styles.dot} aria-hidden="true" />
          APPENDIX A · PROJECT RETROSPECTIVE
        </span>
        {!done && (
          <button type="button" className={styles.skipBtn} onClick={skip}>
            SKIP ▸▸
          </button>
        )}
      </div>
      <p className={styles.cardSub}>
        A story of what really happened in the last{' '}
        {durationMs != null ? formatDuration(durationMs) : '—'}.
      </p>
      <div className={styles.body} aria-live="polite">
        {story.slice(0, visibleCount)}
        {!done && <span className={styles.cursor} aria-hidden="true" />}
      </div>
    </div>
  );
}
