'use client';

import { useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import styles from './page.module.css';
import { GameVersion } from '@/lib/types';

const CS_SCIENTISTS = [
  'Alan Turing', 'Ada Lovelace', 'Grace Hopper', 'Donald Knuth',
  'John von Neumann', 'Edsger Dijkstra', 'Barbara Liskov', 'Linus Torvalds',
  'Dennis Ritchie', 'Ken Thompson', 'Tim Berners-Lee', 'Vint Cerf',
  'Bjarne Stroustrup', 'Guido van Rossum', 'James Gosling', 'Brendan Eich',
  'Margaret Hamilton', 'Frances Allen', 'Lynn Conway', 'Tony Hoare',
  'Leslie Lamport', 'Niklaus Wirth', 'David Patterson', 'John Hennessy',
  'Fran Allen', 'Peter Naur', 'Robin Milner', 'Dana Scott',
];

const QUALITY_ATTRIBUTES = [
  'USABILITY',
  'SECURITY',
  'PERFORMANCE',
  'AVAILABILITY',
  'MAINTAINABILITY',
];

const FAN_CARDS = [
  {
    tag: 'PRJ',
    kind: 'Project',
    title: 'Social News Platform',
    note: 'Design the system. Keep it viable.',
    accent: 'cyan' as const,
    motif: (
      <svg viewBox="0 0 48 48" fill="none" stroke="currentColor" strokeWidth="1.5">
        <rect x="8" y="14" width="32" height="26" rx="1" />
        <path d="M8 22h32M16 22v18M30 22v18" />
        <path d="M12 14V8h10v6M26 14V4h10v10" />
      </svg>
    ),
  },
  {
    tag: 'STK',
    kind: 'Stakeholder',
    title: 'The User',
    note: 'Usability ++ · Performance ++',
    accent: 'gold' as const,
    motif: (
      <svg viewBox="0 0 48 48" fill="none" stroke="currentColor" strokeWidth="1.5">
        <circle cx="24" cy="16" r="7" />
        <path d="M10 42c1.5-9 7-13 14-13s12.5 4 14 13" />
        <path d="M24 9V4M33 12l3-3M15 12l-3-3" />
      </svg>
    ),
  },
  {
    tag: 'CON',
    kind: 'Concern',
    title: 'Article Storage',
    note: '3 design options · trade-offs apply',
    accent: 'mint' as const,
    motif: (
      <svg viewBox="0 0 48 48" fill="none" stroke="currentColor" strokeWidth="1.5">
        <circle cx="24" cy="10" r="4" />
        <circle cx="10" cy="38" r="4" />
        <circle cx="24" cy="38" r="4" />
        <circle cx="38" cy="38" r="4" />
        <path d="M24 14v8M24 22 10 34M24 22v12M24 22l14 12" />
      </svg>
    ),
  },
  {
    tag: 'EVT',
    kind: 'Event',
    title: 'Requirement Change',
    note: 'Reconsider earlier decisions.',
    accent: 'red' as const,
    motif: (
      <svg viewBox="0 0 48 48" fill="none" stroke="currentColor" strokeWidth="1.5">
        <path d="M27 4 12 27h10l-3 17 17-25H26l4-15z" />
      </svg>
    ),
  },
];

export default function Home() {
  const router = useRouter();
  const fanRef = useRef<HTMLDivElement>(null);
  const [createName, setCreateName] = useState('');
  const [gameMode, setGameMode] = useState<GameVersion>('classic');
  const [joinName, setJoinName] = useState('');
  const [joinCode, setJoinCode] = useState('');
  const [activeTab, setActiveTab] = useState<'create' | 'join'>('create');
  const [createPlaceholder] = useState(() => `e.g. ${CS_SCIENTISTS[Math.floor(Math.random() * CS_SCIENTISTS.length)]}`);
  const [joinPlaceholder] = useState(() => `e.g. ${CS_SCIENTISTS[Math.floor(Math.random() * CS_SCIENTISTS.length)]}`);
  const [savedSession] = useState<{ roomCode: string; playerName: string } | null>(() => {
    if (typeof window === 'undefined') return null;
    try {
      const saved = localStorage.getItem('decidarch_session');
      if (saved) {
        const data = JSON.parse(saved);
        if (data.roomCode && data.playerName && data.roomCode !== 'NEW') {
          return data as { roomCode: string; playerName: string };
        }
      }
    } catch {
      // ignore malformed session data
    }
    return null;
  });

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!createName.trim()) return;
    router.push(`/room/new?name=${encodeURIComponent(createName.trim())}&version=${gameMode}`);
  };

  const handleJoin = (e: React.FormEvent) => {
    e.preventDefault();
    if (!joinName.trim() || !joinCode.trim()) return;
    router.push(
      `/room/${joinCode.trim().toUpperCase()}?name=${encodeURIComponent(joinName.trim())}`
    );
  };

  const handleFanMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const el = fanRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width - 0.5;
    const y = (e.clientY - rect.top) / rect.height - 0.5;
    el.style.setProperty('--tilt-x', `${(y * -10).toFixed(2)}deg`);
    el.style.setProperty('--tilt-y', `${(x * 16).toFixed(2)}deg`);
  };

  const handleFanLeave = () => {
    const el = fanRef.current;
    if (!el) return;
    el.style.setProperty('--tilt-x', '0deg');
    el.style.setProperty('--tilt-y', '0deg');
  };

  return (
    <div className={styles.page}>
      <div className={styles.grid} aria-hidden="true" />
      <div className={styles.vignette} aria-hidden="true" />

      {/* Top drawing strip */}
      <header className={styles.topbar}>
        <span className={styles.topbarCell}>DWG NO. A-101</span>
        <span className={styles.topbarCell}>DECIDARCH — SOFTWARE ARCHITECTURE DECISION GAME</span>
        <span className={styles.topbarCellWide} aria-hidden="true" />
        <Link href="/rules" className={styles.topbarLink}>HOW TO PLAY</Link>
        <span className={styles.topbarCell}>SCALE — NTS</span>
      </header>

      <main className={styles.main}>
        {/* ——— Hero / drawing area ——— */}
        <section className={styles.hero}>
          <p className={styles.figLabel}>
            <span className={styles.figTick} aria-hidden="true" />
            FIG. 01 — A MULTIPLAYER CARD GAME FOR SOFTWARE ARCHITECTS
          </p>

          <h1 className={styles.title}>
            <span className={styles.titleSolid}>DECID</span>
            <span className={styles.titleRow}>
              <span className={styles.titleOutline}>ARCH</span>
              <span className={styles.stamp} aria-label="Multiplayer">
                ONLINE
              </span>
            </span>
          </h1>

          {/* Dimension line */}
          <svg
            className={styles.dimLine}
            viewBox="0 0 560 28"
            preserveAspectRatio="none"
            aria-hidden="true"
          >
            <g stroke="currentColor" strokeWidth="1">
              <line x1="1" y1="4" x2="1" y2="24" />
              <line x1="559" y1="4" x2="559" y2="24" />
              <line className={styles.dimStroke} x1="1" y1="14" x2="559" y2="14" />
              <path d="M1 14l9 -4v8z" fill="currentColor" stroke="none" />
              <path d="M559 14l-9 -4v8z" fill="currentColor" stroke="none" />
            </g>
          </svg>

          <p className={styles.subtitle}>
            Draft a system. Balance your stakeholders. Defend every trade-off
            until the requirements change underneath you.
          </p>

          <ul className={styles.specs}>
            <li><b>PLAYERS</b>2–8 architects</li>
            <li><b>DURATION</b>30–45 min</li>
            <li><b>MODE</b>realtime multiplayer</li>
          </ul>

          {/* Interactive card fan */}
          <div
            ref={fanRef}
            className={styles.fan}
            onMouseMove={handleFanMove}
            onMouseLeave={handleFanLeave}
            aria-hidden="true"
          >
            <div className={styles.fanInner}>
              {FAN_CARDS.map((card, i) => (
                <div
                  key={card.tag}
                  className={`${styles.fanCard} ${styles[`accent-${card.accent}`]}`}
                  style={{ '--i': i } as React.CSSProperties}
                >
                  <div className={styles.fanCardHead}>
                    <span className={styles.fanCardTag}>{card.tag}</span>
                    <span className={styles.fanCardKind}>{card.kind}</span>
                  </div>
                  <div className={styles.fanCardMotif}>{card.motif}</div>
                  <div className={styles.fanCardBody}>
                    <span className={styles.fanCardTitle}>{card.title}</span>
                    <span className={styles.fanCardNote}>{card.note}</span>
                  </div>
                  <div className={styles.fanCardFoot}>
                    <span>DECIDARCH</span>
                    <span>{String(i + 1).padStart(2, '0')} / 04</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ——— Control panel ——— */}
        <aside className={styles.panel}>
          <span className={`${styles.crop} ${styles.cropTL}`} aria-hidden="true" />
          <span className={`${styles.crop} ${styles.cropTR}`} aria-hidden="true" />
          <span className={`${styles.crop} ${styles.cropBL}`} aria-hidden="true" />
          <span className={`${styles.crop} ${styles.cropBR}`} aria-hidden="true" />

          {savedSession && (
            <div className={styles.rejoinBox}>
              <p className={styles.rejoinText}>
                Active session found: <strong>{savedSession.roomCode}</strong> as <em>{savedSession.playerName}</em>
              </p>
              <button
                className={`${styles.submit} ${styles.rejoinBtn}`}
                onClick={() => router.push(`/room/${savedSession.roomCode}?name=${encodeURIComponent(savedSession.playerName)}`)}
              >
                REJOIN SESSION <span aria-hidden="true">→</span>
              </button>
            </div>
          )}

          <p className={styles.panelLabel}>FORM A-1 · SESSION CONTROL</p>

          <div className={styles.tabs} role="tablist">
            <button
              id="tab-create"
              role="tab"
              aria-selected={activeTab === 'create'}
              className={`${styles.tab} ${activeTab === 'create' ? styles.tabActive : ''}`}
              onClick={() => setActiveTab('create')}
            >
              <i>01</i> NEW SESSION
            </button>
            <button
              id="tab-join"
              role="tab"
              aria-selected={activeTab === 'join'}
              className={`${styles.tab} ${activeTab === 'join' ? styles.tabActive : ''}`}
              onClick={() => setActiveTab('join')}
            >
              <i>02</i> JOIN SESSION
            </button>
          </div>

          {activeTab === 'create' && (
            <form onSubmit={handleCreate} className={styles.form}>
              <div className={styles.field}>
                <label htmlFor="create-name" className={styles.label}>
                  ARCHITECT NAME
                </label>
                <input
                  id="create-name"
                  type="text"
                  className={styles.input}
                  placeholder={createPlaceholder}
                  value={createName}
                  onChange={(e) => setCreateName(e.target.value)}
                  maxLength={20}
                  autoFocus={typeof window !== 'undefined' && window.matchMedia('(pointer: fine)').matches}
                />
              </div>

              {/* Game mode selector */}
              <div className={styles.field}>
                <p className={styles.label}>GAME MODE</p>
                <div className={styles.modeTiles}>
                  <button
                    type="button"
                    className={`${styles.modeTile} ${gameMode === 'classic' ? styles.modeTileActive : ''}`}
                    onClick={() => setGameMode('classic')}
                    id="mode-classic"
                  >
                    <span className={styles.modeTileName}>Classic</span>
                    <span className={styles.modeTileDesc}>Architecture<br />QA Trade-offs</span>
                  </button>
                  <button
                    type="button"
                    className={`${styles.modeTile} ${gameMode === 'ethics' ? styles.modeTileActive : ''}`}
                    onClick={() => setGameMode('ethics')}
                    id="mode-ethics"
                  >
                    <span className={styles.modeTileName}>Ethics-Aware</span>
                    <span className={styles.modeTileDesc}>Ethical Values<br />in Software</span>
                  </button>
                </div>
              </div>
              <button
                type="submit"
                id="btn-create-room"
                className={styles.submit}
                disabled={!createName.trim()}
              >
                ISSUE NEW ROOM <span aria-hidden="true">→</span>
              </button>
              <p className={styles.hint}>
                {"// you'll receive a 6-char room code to share"}
              </p>
            </form>
          )}

          {activeTab === 'join' && (
            <div className={styles.formContainer}>
              <form onSubmit={handleJoin} className={styles.form}>
                <div className={styles.field}>
                  <label htmlFor="join-code" className={styles.label}>
                    ROOM CODE
                  </label>
                  <input
                    id="join-code"
                    type="text"
                    className={`${styles.input} ${styles.inputCode}`}
                    placeholder="ABC123"
                    value={joinCode}
                    onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                    maxLength={6}
                    autoFocus={typeof window !== 'undefined' && window.matchMedia('(pointer: fine)').matches}
                  />
                </div>
                <div className={styles.field}>
                  <label htmlFor="join-name" className={styles.label}>
                    ARCHITECT NAME
                  </label>
                  <input
                    id="join-name"
                    type="text"
                    className={styles.input}
                    placeholder={joinPlaceholder}
                    value={joinName}
                    onChange={(e) => setJoinName(e.target.value)}
                    maxLength={20}
                  />
                </div>
                <button
                  type="submit"
                  id="btn-join-room"
                  className={styles.submit}
                  disabled={!joinName.trim() || !joinCode.trim()}
                >
                  ENTER DRAWING ROOM <span aria-hidden="true">→</span>
                </button>
              </form>
            </div>
          )}

          <ol className={styles.steps}>
            <li>Draw a concern card &amp; prepare individually</li>
            <li>Reveal positions, then decide as a group</li>
            <li>Survive events. Satisfy stakeholders. Score.</li>
          </ol>
        </aside>
      </main>

      {/* Quality attribute ticker */}
      <div className={styles.ticker} aria-hidden="true">
        <div className={styles.tickerTrack}>
          {[0, 1].map((dup) => (
            <span key={dup} className={styles.tickerGroup}>
              {QUALITY_ATTRIBUTES.map((qa, i) => (
                <span key={qa} className={styles.tickerItem}>
                  <em>QA-{String(i + 1).padStart(2, '0')}</em> {qa}
                </span>
              ))}
            </span>
          ))}
        </div>
      </div>

      {/* Blueprint title block */}
      <footer className={styles.titleBlock}>
        <div className={styles.tbCell}>
          <span>DEVELOPED BY</span>
          <Link href="https://arihant25.github.io/" className={styles.authorLink}>
            <span className={styles.authorName}>
              {'ARIHANT TRIPATHY'.split('').map((ch, i, arr) => (
                <span
                  key={i}
                  className={styles.authorChar}
                  style={{ transitionDelay: `${(arr.length - 1 - i) * 15}ms` }}
                >
                  {ch === ' ' ? '\u00A0' : ch}
                </span>
              ))}
            </span>
          </Link>
        </div>
        <div className={styles.tbCell}>
          <span>ORIGIN</span>
          <p>
            {(['S2 GROUP', ' · ', 'VRIJE UNIVERSITEIT AMSTERDAM', ' · ', 'ARCHIXL'] as const).map((seg, si) => {
              const hrefs: Record<string, string> = {
                'S2 GROUP': 'https://s2.group/',
                'VRIJE UNIVERSITEIT AMSTERDAM': 'https://vu.nl/en',
                'ARCHIXL': 'https://www.archixl.nl/en/',
              };
              const href = hrefs[seg];
              if (!href) return <span key={si} className={styles.originSep}>{seg}</span>;
              const chars = seg.split('');
              return (
                <Link key={si} href={href} className={styles.authorLink} target="_blank" rel="noopener noreferrer">
                  <span className={styles.authorName} style={{ display: 'inline' }}>
                    {chars.map((ch, i) => (
                      <span
                        key={i}
                        className={styles.authorChar}
                        style={{ transitionDelay: `${(chars.length - 1 - i) * 15}ms` }}
                      >
                        {ch}
                      </span>
                    ))}
                  </span>
                </Link>
              );
            })}
          </p>
        </div>
        <div className={styles.tbCell}>
          <span>SHEET</span>
          <p>A-101</p>
        </div>
        <div className={styles.tbCell}>
          <span>SCALE</span>
          <p>NTS</p>
        </div>
        <div className={`${styles.tbCell} ${styles.tbCellAccent}`}>
          <span>REV</span>
          <p>2.0</p>
        </div>
      </footer>
    </div>
  );
}
