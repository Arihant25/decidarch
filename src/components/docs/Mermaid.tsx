'use client';

import { useEffect, useId, useRef, useState } from 'react';
import mermaid from 'mermaid';
import styles from './Mermaid.module.css';

let initialized = false;

function ensureInit() {
  if (initialized) return;
  mermaid.initialize({
    startOnLoad: false,
    securityLevel: 'strict',
    theme: 'base',
    fontFamily: 'var(--font-tech), monospace',
    themeVariables: {
      // Blueprint palette to match the docs page
      background: '#050d18',
      primaryColor: '#0b1a30',
      primaryBorderColor: '#54c8ff',
      primaryTextColor: '#e9f3ff',
      lineColor: '#54c8ff',
      secondaryColor: '#0e2138',
      tertiaryColor: '#0b1a30',
      noteBkgColor: '#0e2138',
      noteTextColor: '#bad3ee',
      noteBorderColor: '#54c8ff',
      actorBkg: '#0b1a30',
      actorBorder: '#54c8ff',
      actorTextColor: '#e9f3ff',
      signalColor: '#9dbedd',
      signalTextColor: '#cfe9ff',
      labelBoxBkgColor: '#0e2138',
      labelBoxBorderColor: '#54c8ff',
      labelTextColor: '#e9f3ff',
    },
  });
  initialized = true;
}

interface MermaidProps {
  chart: string;
  /** Accessible description of the diagram. */
  caption?: string;
}

/**
 * Renders a Mermaid diagram on the client. Server-rendered fallback shows the
 * raw definition so there's always meaningful content before hydration.
 */
export function Mermaid({ chart, caption }: MermaidProps) {
  const rawId = useId();
  const id = `mmd-${rawId.replace(/[^a-zA-Z0-9]/g, '')}`;
  const [svg, setSvg] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let cancelled = false;
    ensureInit();
    mermaid
      .render(id, chart)
      .then(({ svg }) => {
        if (!cancelled) setSvg(svg);
      })
      .catch(() => {
        if (!cancelled) setFailed(true);
      });
    return () => {
      cancelled = true;
    };
  }, [chart, id]);

  if (failed || svg === null) {
    // Pre-hydration / fallback: show the definition as a code block.
    return (
      <figure className={styles.figure}>
        <pre className={styles.pre}>
          {chart.trim()}
        </pre>
        {caption && (
          <figcaption className={styles.figcaption}>
            {caption}
          </figcaption>
        )}
      </figure>
    );
  }

  return (
    <figure className={styles.figureLarge}>
      <div
        ref={containerRef}
        role="img"
        aria-label={caption}
        className={styles.diagramContainer}
        // SVG is produced by mermaid from a trusted, hard-coded definition.
        dangerouslySetInnerHTML={{ __html: svg }}
      />
      {caption && (
        <figcaption className={`${styles.figcaption} ${styles.figcaptionLarge}`}>
          {caption}
        </figcaption>
      )}
    </figure>
  );
}
