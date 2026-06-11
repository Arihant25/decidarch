'use client';

import { useState, useEffect, useRef, useCallback } from 'react';

export function useCountdown(durationSeconds: number, startedAt?: number) {
  const [elapsed, setElapsed] = useState(0);
  const [isExpired, setIsExpired] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }

    if (!startedAt) return;

    const update = () => {
      const currentElapsed = Math.floor((Date.now() - startedAt) / 1000);
      setElapsed(currentElapsed);
      setIsExpired(currentElapsed >= durationSeconds);
    };

    update();
    intervalRef.current = setInterval(update, 1000);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [durationSeconds, startedAt]);

  const formatTime = useCallback((seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  }, []);

  return {
    elapsed,
    isExpired,
    formatted: formatTime(elapsed),
    percentage: durationSeconds > 0 ? (elapsed / durationSeconds) * 100 : 0,
  };
}
