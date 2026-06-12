'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { motion, MotionConfig } from 'motion/react';
import { ConcernCard, EthicsConcernCard, GameVersion } from '@/lib/types';
import styles from './DealIntro.module.css';

interface DealIntroProps {
  cardCount: number;
  roomCode: string;
  gameVersion: GameVersion;
  /** The concern currently on the board — shown on the single face-up card */
  concern: ConcernCard | EthicsConcernCard | null;
  onComplete: () => void;
}

/** Sequence steps — compared numerically so later steps imply earlier ones */
const STEP_DECK = 0;
const STEP_DEAL = 1;
const STEP_FLIP = 2;
const STEP_STAMP = 3;
const STEP_GATHER = 4;

const MAX_FAN_CARDS = 7;
const DEAL_STAGGER = 0.09;
const GATHER_STAGGER = 0.05;

/** Deterministic pseudo-random in [-1, 1] so rerenders keep the same jitter */
function jitter(seed: number) {
  const x = Math.sin(seed * 127.1 + 311.7) * 43758.5453;
  return (x - Math.floor(x)) * 2 - 1;
}

/**
 * Creates and resumes an AudioContext eagerly so it is warm by the time the
 * first sound needs to play. Silently no-ops if audio is unavailable or
 * autoplay is blocked (e.g. page refresh with no user gesture yet).
 */
function createAudioContext(): AudioContext | null {
  if (typeof window === 'undefined' || typeof AudioContext === 'undefined') return null;
  try {
    const ctx = new AudioContext();
    ctx.resume().catch(() => { });
    return ctx;
  } catch {
    return null;
  }
}

/**
 * Schedules one filtered noise "swish" per card on an already-warmed context,
 * timed to match the deal stagger. Silently no-ops if the context is not yet
 * running (e.g. autoplay blocked).
 */
function scheduleDealSounds(ctx: AudioContext | null, count: number, stagger: number): void {
  if (!ctx || ctx.state !== 'running') return;
  try {
    const noise = ctx.createBuffer(1, Math.ceil(ctx.sampleRate * 0.15), ctx.sampleRate);
    const data = noise.getChannelData(0);
    for (let s = 0; s < data.length; s++) data[s] = Math.random() * 2 - 1;

    for (let i = 0; i < count; i++) {
      const t = ctx.currentTime + 0.03 + i * stagger;
      const src = ctx.createBufferSource();
      src.buffer = noise;
      src.playbackRate.value = 1 + jitter(i + 70) * 0.15;
      const swish = ctx.createBiquadFilter();
      swish.type = 'bandpass';
      swish.Q.value = 0.8;
      swish.frequency.setValueAtTime(2400, t);
      swish.frequency.exponentialRampToValueAtTime(700, t + 0.12);
      const gain = ctx.createGain();
      gain.gain.setValueAtTime(0, t);
      gain.gain.linearRampToValueAtTime(0.3, t + 0.015);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.13);
      src.connect(swish);
      swish.connect(gain);
      gain.connect(ctx.destination);
      src.start(t);
      src.stop(t + 0.16);
    }
  } catch {
    /* audio unavailable */
  }
}

/**
 * Synthesized stamp impact on the deal-sounds context: a pitch-dropping low
 * "thunk" plus a short bright noise click (the paper slap). Timed slightly
 * late so it lands as the stamp's entrance spring hits the sheet.
 */
function playStampSound(ctx: AudioContext | null) {
  if (!ctx || ctx.state !== 'running') return;
  try {
    const t = ctx.currentTime + 0.1;

    const thunk = ctx.createOscillator();
    thunk.type = 'sine';
    thunk.frequency.setValueAtTime(170, t);
    thunk.frequency.exponentialRampToValueAtTime(55, t + 0.12);
    const thunkGain = ctx.createGain();
    thunkGain.gain.setValueAtTime(0, t);
    thunkGain.gain.linearRampToValueAtTime(0.55, t + 0.008);
    thunkGain.gain.exponentialRampToValueAtTime(0.001, t + 0.22);
    thunk.connect(thunkGain);
    thunkGain.connect(ctx.destination);
    thunk.start(t);
    thunk.stop(t + 0.25);

    const slap = ctx.createBufferSource();
    const noise = ctx.createBuffer(1, Math.ceil(ctx.sampleRate * 0.06), ctx.sampleRate);
    const data = noise.getChannelData(0);
    for (let s = 0; s < data.length; s++) data[s] = Math.random() * 2 - 1;
    slap.buffer = noise;
    const bright = ctx.createBiquadFilter();
    bright.type = 'highpass';
    bright.frequency.value = 1200;
    const slapGain = ctx.createGain();
    slapGain.gain.setValueAtTime(0.28, t);
    slapGain.gain.exponentialRampToValueAtTime(0.001, t + 0.05);
    slap.connect(bright);
    bright.connect(slapGain);
    slapGain.connect(ctx.destination);
    slap.start(t);
    slap.stop(t + 0.06);
  } catch {
    /* audio unavailable */
  }
}

/**
 * The live concern card on the board underneath the overlay: its centre as an
 * offset from the viewport centre (the cards' coordinate origin) plus its
 * size, so the hero card can morph into the exact same panel.
 */
function measureBoardCard() {
  const el =
    document.querySelector('[data-deal-target]') ??
    document.querySelector('[data-deal-fallback]');
  if (!el) return null;
  const r = el.getBoundingClientRect();
  // The fallback is the whole centre column — clamp to a plausible panel size
  const w = Math.min(r.width, 800);
  const h = Math.min(r.height, window.innerHeight * 0.5);
  return {
    x: r.left + w / 2 - window.innerWidth / 2,
    y: r.top + h / 2 - window.innerHeight / 2,
    w,
    h,
  };
}

export function DealIntro({ cardCount, roomCode, gameVersion, concern, onComplete }: DealIntroProps) {
  const [step, setStep] = useState(STEP_DECK);
  const [target, setTarget] = useState<ReturnType<typeof measureBoardCard>>(null);
  const timersRef = useRef<ReturnType<typeof setTimeout>[]>([]);
  const audioRef = useRef<AudioContext | null>(null);
  const doneRef = useRef(false);

  const fanCount = Math.min(cardCount, MAX_FAN_CARDS);

  // Card + fan geometry, computed once on mount (client-only component)
  const { cardW, cardH, deckY, slots } = useMemo(() => {
    const vw = typeof window !== 'undefined' ? window.innerWidth : 1280;
    const vh = typeof window !== 'undefined' ? window.innerHeight : 800;
    // Mirror the CSS card sizing: width clamp(92px, 11vw, 138px), 5/7 aspect
    const w = Math.min(Math.max(92, vw * 0.11), 138);
    const h = w * (7 / 5);
    // Caption strip: bottom offset clamp(2rem, 6vh, 3.5rem) plus text height.
    // Keep the deck's bottom edge clear of it, but stay below centre.
    const captionSpace = Math.min(Math.max(32, vh * 0.06), 56) + 36;
    const dy = Math.max(Math.min(vh * 0.34, 320, vh / 2 - h / 2 - captionSpace), 60);
    const spread = Math.min(vw * 0.78, 880);
    return {
      cardW: w,
      cardH: h,
      deckY: dy,
      slots: Array.from({ length: fanCount }, (_, i) => {
        const t = fanCount === 1 ? 0.5 : i / (fanCount - 1);
        return {
          x: (t - 0.5) * spread,
          // Hand-of-cards arc: edges sit lower than the middle
          y: Math.pow((t - 0.5) * 2, 2) * 46 - 20 + jitter(i) * 6,
          rotate: (t - 0.5) * 36 + jitter(i + 40) * 3,
        };
      }),
    };
  }, [fanCount]);

  const finish = () => {
    if (doneRef.current) return;
    doneRef.current = true;
    timersRef.current.forEach(clearTimeout);
    audioRef.current?.close().catch(() => { });
    audioRef.current = null;
    onComplete();
  };

  useEffect(() => {
    // Pre-create and warm the audio context immediately so it is in the
    // 'running' state well before the deal animation fires at dealAt ms.
    audioRef.current = createAudioContext();

    const dealAt = 900;
    // Generous holds between phases so each beat has time to land
    const flipAt = dealAt + fanCount * DEAL_STAGGER * 1000 + 1150;
    // Long enough to read the face-up concern before the stamp lands
    const stampAt = flipAt + 2000;
    const gatherAt = stampAt + 1400;
    const doneAt = gatherAt + fanCount * GATHER_STAGGER * 1000 + 650;

    timersRef.current = [
      setTimeout(() => {
        setStep(STEP_DEAL);
        scheduleDealSounds(audioRef.current, fanCount, DEAL_STAGGER);
      }, dealAt),
      setTimeout(() => {
        setTarget(measureBoardCard());
        setStep(STEP_FLIP);
      }, flipAt),
      setTimeout(() => {
        setStep(STEP_STAMP);
        playStampSound(audioRef.current);
      }, stampAt),
      setTimeout(() => {
        // Remeasure in case the board reflowed underneath the overlay
        setTarget((prev) => measureBoardCard() ?? prev);
        setStep(STEP_GATHER);
      }, gatherAt),
      setTimeout(finish, doneAt),
    ];
    return () => {
      timersRef.current.forEach(clearTimeout);
      audioRef.current?.close().catch(() => { });
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const concernLabel = gameVersion === 'ethics' ? 'ETHICS CONCERN' : 'DESIGN CONCERN';
  const concernIdLabel = concern
    ? concern.id.replace(/[a-z]+-/, 'NO. ').replace('-', ' ')
    : null;
  const caption =
    step === STEP_DECK
      ? 'SHUFFLING CONCERN DECK'
      : step === STEP_DEAL
        ? `DEALING ${cardCount} CONCERN SHEETS`
        : step === STEP_FLIP
          ? 'DRAWING ACTIVE CONCERN'
          : step === STEP_STAMP
            ? 'COMMENCE DRAFTING'
            : 'FILING TO DRAFT BOARD';

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

          {/* Dealt cards — card 0 is the "hero": the actual active concern,
              the only one that flips face up. On flip it morphs into the
              board panel's exact size, then glides onto its position. */}
          {slots.map((slot, i) => {
            const isHero = i === 0;
            // Stagger the move on deal and gather; flip/stamp transitions are
            // instant. The hero leads the gather, the rest tuck in behind it.
            const moveDelay =
              step === STEP_DEAL
                ? i * DEAL_STAGGER
                : step === STEP_GATHER && !isHero
                  ? i * GATHER_STAGGER
                  : 0;
            // Let the flip get going before the hero's size morph starts
            const sizeDelay = step === STEP_FLIP ? 0.15 : moveDelay;
            const deckPose = { x: 0, y: deckY - 8, rotate: jitter(i + 9) * 2, scale: 0.96 };
            const fanPose = { x: slot.x, y: slot.y, rotate: slot.rotate, scale: 1 };
            const heroSize = { width: target?.w ?? cardW * 2.1, height: target?.h ?? cardH * 1.3 };
            const pose = isHero
              ? step >= STEP_GATHER
                // Land square on the live concern card, at its exact size
                ? { x: target?.x ?? 0, y: target?.y ?? 0, rotate: 0, scale: 1, ...heroSize }
                : step >= STEP_FLIP
                  // Front and centre as the full-size concern sheet
                  ? { x: 0, y: 0, rotate: 0, scale: 1, ...heroSize }
                  : step >= STEP_DEAL
                    ? { ...fanPose, width: cardW, height: cardH }
                    : { ...deckPose, width: cardW, height: cardH }
              : step >= STEP_GATHER
                ? {
                  x: (target?.x ?? 0) + jitter(i + 50) * 5,
                  y: (target?.y ?? 0) + jitter(i + 60) * 5,
                  rotate: jitter(i + 21) * 3,
                  scale: 0.92,
                }
                : step >= STEP_DEAL
                  ? fanPose
                  : deckPose;
            return (
              <motion.div
                key={i}
                className={styles.card}
                style={{ zIndex: isHero && step >= STEP_FLIP ? 45 : 10 + i }}
                initial={{ ...deckPose, ...(isHero ? { width: cardW, height: cardH } : {}) }}
                animate={pose}
                exit={
                  isHero
                    // Pixel-aligned over the real panel — fade only, no shrink
                    ? { opacity: 0, transition: { duration: 0.4, ease: 'easeIn' } }
                    : { opacity: 0, scale: 0.96, transition: { duration: 0.35, ease: 'easeIn' } }
                }
                transition={{
                  delay: moveDelay,
                  x: { type: 'spring', stiffness: 160, damping: 17, delay: moveDelay },
                  y: { type: 'spring', stiffness: 110, damping: 15, delay: moveDelay },
                  rotate: { type: 'spring', stiffness: 130, damping: 13, delay: moveDelay },
                  scale: { duration: 0.3, delay: moveDelay },
                  width: { type: 'spring', stiffness: 170, damping: 23, delay: sizeDelay },
                  height: { type: 'spring', stiffness: 170, damping: 23, delay: sizeDelay },
                }}
              >
                <motion.div
                  className={styles.cardInner}
                  animate={{ rotateY: isHero && step >= STEP_FLIP ? 180 : 0 }}
                  transition={{ type: 'spring', stiffness: 210, damping: 20 }}
                >
                  <div className={styles.cardBack}>
                    <CardBack />
                  </div>
                  {isHero && concern ? (
                    /* The real active concern, styled like the board's sheet */
                    <div className={`${styles.cardFace} ${styles.cardFaceConcern}`}>
                      <span className={styles.cfHeader}>
                        <i className={styles.cfTag}>{gameVersion === 'ethics' ? 'ETH' : 'CON'}</i>
                        <i className={styles.cfKind}>
                          {gameVersion === 'ethics' ? 'Ethical Concern' : 'Concern'}
                        </i>
                        <i className={styles.cfId}>{concernIdLabel}</i>
                      </span>
                      <strong className={styles.cfTitle}>{concern.title}</strong>
                      <span className={styles.cfDesc}>{concern.description}</span>
                    </div>
                  ) : (
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
                  )}
                </motion.div>
              </motion.div>
            );
          })}

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
                animate={
                  step >= STEP_GATHER
                    ? { opacity: 0, scale: 0.92, rotate: -7 }
                    : { opacity: 1, scale: 1, rotate: -7 }
                }
                exit={{ opacity: 0, scale: 1.15, transition: { duration: 0.3 } }}
                transition={
                  step >= STEP_GATHER
                    ? { duration: 0.35, ease: 'easeIn' }
                    : { type: 'spring', stiffness: 330, damping: 18 }
                }
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
