'use client';

import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { TutorialStep } from './tutorialSteps';
import styles from './GameTutorial.module.css';

interface GameTutorialProps {
  steps: TutorialStep[];
  stepIndex: number;
  /** Advance one step; the parent calls completion after the last step */
  onNext: () => void;
  /** Abort the tour — reveals everything and hands off to the deal intro */
  onSkip: () => void;
}

interface Box {
  top: number;
  left: number;
  width: number;
  height: number;
}

interface TipPos {
  x: number;
  y: number;
  /** Leader line from the tooltip to the ring; null when there is no target */
  line: { x1: number; y1: number; x2: number; y2: number } | null;
}

/** Breathing room between the target's edge and the highlight ring */
const RING_PAD = 6;
/** Gap between the ring and the tooltip */
const TIP_GAP = 18;
const EDGE = 10;

const clamp = (v: number, lo: number, hi: number) => Math.min(Math.max(v, lo), Math.max(lo, hi));

/**
 * Union of the on-screen boxes for a tour key. A key may tag several nodes
 * (e.g. top bar + progress strip). Measuring the children rather than the
 * node itself makes the ring hug the content: slot wrappers are
 * display:contents (no box of their own), and the centre column's box
 * includes large empty padding around the actual phase panel.
 */
function measureTarget(key: string): Box | null {
  const nodes = document.querySelectorAll(`[data-tour="${key}"]`);
  let box: Box | null = null;
  nodes.forEach((node) => {
    const kids = Array.from(node.children).map((c) => c.getBoundingClientRect());
    const rects = kids.some((r) => r.width > 0 || r.height > 0)
      ? kids
      : [node.getBoundingClientRect()];
    for (const r of rects) {
      if (r.width === 0 && r.height === 0) continue;
      if (!box) {
        box = { top: r.top, left: r.left, width: r.width, height: r.height };
      } else {
        const right = Math.max(box.left + box.width, r.right);
        const bottom = Math.max(box.top + box.height, r.bottom);
        box.left = Math.min(box.left, r.left);
        box.top = Math.min(box.top, r.top);
        box.width = right - box.left;
        box.height = bottom - box.top;
      }
    }
  });
  return box;
}

/** Place the tooltip beside the ring: right → left → below → above → centre */
function placeTip(box: Box, tw: number, th: number): TipPos {
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  const ring = {
    top: box.top - RING_PAD,
    left: box.left - RING_PAD,
    right: box.left + box.width + RING_PAD,
    bottom: box.top + box.height + RING_PAD,
  };
  const cx = (ring.left + ring.right) / 2;
  const cy = (ring.top + ring.bottom) / 2;

  let x: number;
  let y: number;
  let anchor: { x2: number; y2: number };

  if (ring.right + TIP_GAP + tw <= vw - EDGE) {
    x = ring.right + TIP_GAP;
    y = clamp(cy - th / 2, EDGE, vh - th - EDGE);
    anchor = { x2: ring.right, y2: cy };
  } else if (ring.left - TIP_GAP - tw >= EDGE) {
    x = ring.left - TIP_GAP - tw;
    y = clamp(cy - th / 2, EDGE, vh - th - EDGE);
    anchor = { x2: ring.left, y2: cy };
  } else if (ring.bottom + TIP_GAP + th <= vh - EDGE) {
    x = clamp(cx - tw / 2, EDGE, vw - tw - EDGE);
    y = ring.bottom + TIP_GAP;
    anchor = { x2: cx, y2: ring.bottom };
  } else if (ring.top - TIP_GAP - th >= EDGE) {
    x = clamp(cx - tw / 2, EDGE, vw - tw - EDGE);
    y = ring.top - TIP_GAP - th;
    anchor = { x2: cx, y2: ring.top };
  } else {
    x = clamp(vw / 2 - tw / 2, EDGE, vw - tw - EDGE);
    y = clamp(vh / 2 - th / 2, EDGE, vh - th - EDGE);
    anchor = { x2: cx, y2: cy };
  }

  // Leader line starts at the tooltip edge nearest the target
  const tipCx = x + tw / 2;
  const tipCy = y + th / 2;
  const x1 = anchor.x2 > x + tw ? x + tw : anchor.x2 < x ? x : tipCx;
  const y1 = x1 === tipCx ? (anchor.y2 > tipCy ? y + th : y) : tipCy;

  return { x, y, line: { x1, y1, ...anchor } };
}

export function GameTutorial({ steps, stepIndex, onNext, onSkip }: GameTutorialProps) {
  const step = steps[stepIndex];
  const isLast = stepIndex === steps.length - 1;
  const [box, setBox] = useState<Box | null>(null);
  const [tip, setTip] = useState<TipPos | null>(null);
  const tipRef = useRef<HTMLDivElement>(null);

  // Track the highlighted section across step changes, resizes and scrolls.
  // Measured in a rAF callback (after the section has been revealed and the
  // tooltip rendered) rather than synchronously in the effect body.
  useLayoutEffect(() => {
    const key = step?.key;
    if (!key) return;
    const node = document.querySelector(`[data-tour="${key}"]`);
    const scrollEl =
      node && node.getBoundingClientRect().width > 0 ? node : node?.firstElementChild;
    scrollEl?.scrollIntoView({ block: 'nearest' });

    // Animation-finish callbacks below can outlive this step — drop them
    let cancelled = false;
    const update = () => {
      if (cancelled) return;
      const measured = measureTarget(key);
      setBox(measured);
      const el = tipRef.current;
      if (!el) return;
      if (measured) {
        setTip(placeTip(measured, el.offsetWidth, el.offsetHeight));
      } else {
        // Target not on the board (e.g. unmounted panel) — centre the callout
        setTip({
          x: window.innerWidth / 2 - el.offsetWidth / 2,
          y: window.innerHeight / 2 - el.offsetHeight / 2,
          line: null,
        });
      }
    };
    const raf = requestAnimationFrame(() => {
      update();
      // Rects measured while entrance animations run can be off — once each
      // finite animation under the target settles, measure again. Infinite
      // animations (status pulses) never resolve and are simply ignored.
      document.querySelectorAll(`[data-tour="${key}"]`).forEach((n) => {
        if (typeof n.getAnimations !== 'function') return;
        n.getAnimations({ subtree: true }).forEach((a) => {
          a.finished.then(update).catch(() => {});
        });
      });
    });
    window.addEventListener('resize', update);
    // capture-phase: also fires for the scrolling sidebars, not just the window
    window.addEventListener('scroll', update, true);
    return () => {
      cancelled = true;
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', update);
      window.removeEventListener('scroll', update, true);
    };
  }, [step?.key]);

  // Esc skips, → advances; Enter is left to the focused button to avoid double-firing
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onSkip();
      else if (e.key === 'ArrowRight') onNext();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onNext, onSkip]);

  if (!step) return null;

  const welcome = step.key === null;
  const ring = !welcome && box
    ? {
        top: box.top - RING_PAD,
        left: box.left - RING_PAD,
        width: box.width + RING_PAD * 2,
        height: box.height + RING_PAD * 2,
      }
    : null;

  return (
    <div className={styles.overlay} role="dialog" aria-modal="true" aria-label="Workspace tour">
      {/* Click-catcher; advancing on click mirrors the deal intro's click-to-continue */}
      <div
        className={`${styles.backdrop} ${welcome ? styles.backdropDim : ''}`}
        onClick={onNext}
      />

      {ring && (
        <div className={styles.ring} style={ring} aria-hidden="true">
          <span className={`${styles.tick} ${styles.tickTl}`} />
          <span className={`${styles.tick} ${styles.tickBr}`} />
        </div>
      )}

      {ring && tip?.line && (
        <svg className={styles.leader} aria-hidden="true">
          <line
            x1={tip.line.x1}
            y1={tip.line.y1}
            x2={tip.line.x2}
            y2={tip.line.y2}
            className={styles.leaderLine}
          />
          <circle cx={tip.line.x2} cy={tip.line.y2} r="3" className={styles.leaderDot} />
        </svg>
      )}

      <div
        key={stepIndex}
        ref={tipRef}
        className={welcome ? styles.welcome : styles.tooltip}
        style={
          welcome
            ? undefined
            : {
                top: tip?.y ?? 0,
                left: tip?.x ?? 0,
                visibility: tip ? 'visible' : 'hidden',
              }
        }
      >
        <span className={styles.kicker}>
          <span className={styles.kickerLabel}>{step.label}</span>
          {!welcome && (
            <span className={styles.kickerCount}>
              {String(stepIndex).padStart(2, '0')} / {String(steps.length - 1).padStart(2, '0')}
            </span>
          )}
        </span>
        <h3 className={styles.title}>{step.title}</h3>
        <p className={styles.body}>{step.body}</p>
        <div className={styles.actions}>
          <button type="button" className={styles.skipBtn} onClick={onSkip}>
            SKIP TOUR
          </button>
          <button type="button" className={styles.nextBtn} onClick={onNext} autoFocus>
            {welcome ? 'START TOUR' : isLast ? 'DEAL THE CARDS' : 'NEXT'}{' '}
            <span aria-hidden="true">→</span>
          </button>
        </div>
      </div>
    </div>
  );
}
