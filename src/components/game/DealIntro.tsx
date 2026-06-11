'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { motion, MotionConfig } from 'motion/react';
import { GameVersion } from '@/lib/types';
import styles from './DealIntro.module.css';

interface DealIntroProps {
  cardCount: number;
  roomCode: string;
  gameVersion: GameVersion;
  onComplete: () => void;
}

/** Sequence steps — compared numerically so later steps imply earlier ones */
const STEP_DECK = 0;
const STEP_DEAL = 1;
const STEP_FLIP = 2;
const STEP_STAMP = 3;

const MAX_FAN_CARDS = 7;
const DEAL_STAGGER = 0.09;
const FLIP_STAGGER = 0.06;

/** Deterministic pseudo-random in [-1, 1] so rerenders keep the same jitter */
function jitter(seed: number) {
  const x = Math.sin(seed * 127.1 + 311.7) * 43758.5453;
  return (x - Math.floor(x)) * 2 - 1;
}

export function DealIntro({ cardCount, roomCode, gameVersion, onComplete }: DealIntroProps) {
  const [step, setStep] = useState(STEP_DECK);
  const timersRef = useRef<ReturnType<typeof setTimeout>[]>([]);
  const doneRef = useRef(false);

  const fanCount = Math.min(cardCount, MAX_FAN_CARDS);

  // Fan geometry, computed once on mount (client-only component)
  const slots = useMemo(() => {
    const vw = typeof window !== 'undefined' ? window.innerWidth : 1280;
    const spread = Math.min(vw * 0.78, 880);
    return Array.from({ length: fanCount }, (_, i) => {
      const t = fanCount === 1 ? 0.5 : i / (fanCount - 1);
      return {
        x: (t - 0.5) * spread,
        // Hand-of-cards arc: edges sit lower than the middle
        y: Math.pow((t - 0.5) * 2, 2) * 46 - 20 + jitter(i) * 6,
        rotate: (t - 0.5) * 36 + jitter(i + 40) * 3,
      };
    });
  }, [fanCount]);

  const deckY = useMemo(() => {
    const vh = typeof window !== 'undefined' ? window.innerHeight : 800;
    return Math.min(vh * 0.34, 320);
  }, []);

  const finish = () => {
    if (doneRef.current) return;
    doneRef.current = true;
    timersRef.current.forEach(clearTimeout);
    onComplete();
  };

  useEffect(() => {
    const dealAt = 900;
    const flipAt = dealAt + fanCount * DEAL_STAGGER * 1000 + 520;
    const stampAt = flipAt + fanCount * FLIP_STAGGER * 1000 + 480;
    const doneAt = stampAt + 1500;

    timersRef.current = [
      setTimeout(() => setStep(STEP_DEAL), dealAt),
      setTimeout(() => setStep(STEP_FLIP), flipAt),
      setTimeout(() => setStep(STEP_STAMP), stampAt),
      setTimeout(finish, doneAt),
    ];
    return () => timersRef.current.forEach(clearTimeout);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const concernLabel = gameVersion === 'ethics' ? 'ETHICS CONCERN' : 'DESIGN CONCERN';
  const caption =
    step === STEP_DECK
      ? 'SHUFFLING CONCERN DECK'
      : step === STEP_DEAL
        ? `DEALING ${cardCount} CONCERN SHEETS`
        : step === STEP_FLIP
          ? 'REVIEWING DRAFT SET'
          : 'COMMENCE DRAFTING';

  return (
    <MotionConfig reducedMotion="user">
      <motion.div
        className={styles.overlay}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0, transition: { duration: 0.45, ease: 'easeInOut' } }}
        transition={{ duration: 0.25 }}
        onClick={finish}
        role="status"
        aria-label="Dealing concern cards — click to skip"
      >
        {/* Camera rig — shakes when the stamp lands */}
        <motion.div
          className={styles.table}
          animate={step >= STEP_STAMP ? { x: [0, -7, 6, -3, 0], y: [0, 4, -3, 2, 0] } : { x: 0, y: 0 }}
          transition={{ duration: 0.4, ease: 'easeOut' }}
        >
          {/* Deck stack (decorative thickness under the dealt cards) */}
          <motion.div
            className={styles.deck}
            initial={{ y: deckY + 160, opacity: 0, scale: 0.8 }}
            animate={
              step >= STEP_FLIP
                ? { y: deckY + 120, opacity: 0, scale: 0.85 }
                : { y: deckY, opacity: 1, scale: 1 }
            }
            transition={{ type: 'spring', stiffness: 180, damping: 20 }}
          >
            {[0, 1, 2, 3].map((d) => (
              <motion.div
                key={d}
                className={styles.deckCard}
                style={{ top: -d * 2.5, zIndex: d }}
                initial={{ rotate: jitter(d + 9) * 2 }}
                animate={
                  step === STEP_DECK
                    ? { rotate: [jitter(d + 9) * 2, (d - 1.5) * 7, jitter(d + 9) * 2] }
                    : { rotate: jitter(d + 9) * 2 }
                }
                transition={{ duration: 0.45, delay: 0.4 + d * 0.04, ease: 'easeInOut' }}
              >
                <CardBack />
              </motion.div>
            ))}
          </motion.div>

          {/* Dealt cards */}
          {slots.map((slot, i) => (
            <motion.div
              key={i}
              className={styles.card}
              style={{ zIndex: 10 + i }}
              initial={{ x: 0, y: deckY - 8, rotate: jitter(i + 9) * 2, scale: 0.96 }}
              animate={
                step >= STEP_DEAL
                  ? { x: slot.x, y: slot.y, rotate: slot.rotate, scale: 1 }
                  : { x: 0, y: deckY - 8, rotate: jitter(i + 9) * 2, scale: 0.96 }
              }
              exit={{
                x: slot.x * 1.7,
                y: -900,
                rotate: slot.rotate * 4,
                opacity: 0,
                transition: { duration: 0.5, delay: i * 0.03, ease: 'easeIn' },
              }}
              transition={{
                delay: step === STEP_DEAL ? i * DEAL_STAGGER : 0,
                x: { type: 'spring', stiffness: 160, damping: 17, delay: step === STEP_DEAL ? i * DEAL_STAGGER : 0 },
                y: { type: 'spring', stiffness: 110, damping: 15, delay: step === STEP_DEAL ? i * DEAL_STAGGER : 0 },
                rotate: { type: 'spring', stiffness: 130, damping: 13, delay: step === STEP_DEAL ? i * DEAL_STAGGER : 0 },
                scale: { duration: 0.3 },
              }}
            >
              <motion.div
                className={styles.cardInner}
                animate={{ rotateY: step >= STEP_FLIP ? 180 : 0 }}
                transition={{
                  type: 'spring',
                  stiffness: 210,
                  damping: 20,
                  delay: step === STEP_FLIP ? i * FLIP_STAGGER : 0,
                }}
              >
                <div className={styles.cardBack}>
                  <CardBack />
                </div>
                <div className={styles.cardFace}>
                  <span className={styles.faceTopRow}>
                    <span>SHEET</span>
                    <span>{String(i + 1).padStart(2, '0')}/{String(cardCount).padStart(2, '0')}</span>
                  </span>
                  <span className={styles.faceNumber}>{String(i + 1).padStart(2, '0')}</span>
                  <span className={styles.faceLabel}>{concernLabel}</span>
                  <span className={styles.faceRedacted} aria-hidden="true">
                    <i style={{ width: '82%' }} />
                    <i style={{ width: '58%' }} />
                    <i style={{ width: '70%' }} />
                  </span>
                  <span className={styles.faceHatch} aria-hidden="true" />
                </div>
              </motion.div>
            </motion.div>
          ))}

          {/* Registration stamp */}
          {step >= STEP_STAMP && (
            <>
              <motion.div
                className={styles.flash}
                initial={{ opacity: 0.55 }}
                animate={{ opacity: 0 }}
                transition={{ duration: 0.5, ease: 'easeOut' }}
                aria-hidden="true"
              />
              <motion.div
                className={styles.stamp}
                initial={{ opacity: 0, scale: 2.6, rotate: -24 }}
                animate={{ opacity: 1, scale: 1, rotate: -7 }}
                exit={{ opacity: 0, scale: 1.15, transition: { duration: 0.3 } }}
                transition={{ type: 'spring', stiffness: 330, damping: 18 }}
              >
                <span className={styles.stampTop}>DECIDARCH · SESSION {roomCode}</span>
                <span className={styles.stampMain}>ISSUED FOR CONSTRUCTION</span>
                <span className={styles.stampSub}>
                  {cardCount} CONCERNS DEALT — REV A — {new Date().toISOString().slice(0, 10)}
                </span>
              </motion.div>
            </>
          )}
        </motion.div>

        {/* Caption + skip hint */}
        <div className={styles.captionRow}>
          <span className={styles.caption}>
            {caption}
            <span className={styles.cursor} aria-hidden="true" />
          </span>
        </div>
        <motion.span
          className={styles.skipHint}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.2, duration: 0.4 }}
        >
          CLICK TO SKIP
        </motion.span>
      </motion.div>
    </MotionConfig>
  );
}

/** Blueprint card back — compass rose over a drafting grid */
function CardBack() {
  return (
    <span className={styles.backArt} aria-hidden="true">
      <svg viewBox="0 0 60 60" className={styles.compass}>
        <circle cx="30" cy="30" r="26" fill="none" stroke="currentColor" strokeWidth="1" opacity="0.7" />
        <circle cx="30" cy="30" r="19" fill="none" stroke="currentColor" strokeWidth="0.5" strokeDasharray="2 3" opacity="0.6" />
        <path d="M30 6 L34 30 L30 54 L26 30 Z" fill="currentColor" opacity="0.55" />
        <path d="M6 30 L30 26 L54 30 L30 34 Z" fill="currentColor" opacity="0.35" />
        <circle cx="30" cy="30" r="2.5" fill="currentColor" />
      </svg>
      <span className={styles.backWord}>DECIDARCH</span>
    </span>
  );
}
