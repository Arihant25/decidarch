'use client';

import { useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import styles from './rules.module.css';

type RulesVersion = 'classic' | 'ethics';

export default function RulesPage() {
  const [version, setVersion] = useState<RulesVersion>('classic');

  return (
    <div className={styles.page}>
      <div className={styles.grid} aria-hidden="true" />
      <div className={styles.vignette} aria-hidden="true" />

      {/* Top drafting strip */}
      <header className={styles.topbar}>
        <span className={styles.topbarCell}>DWG NO. A-102</span>
        <span className={styles.topbarCell}>DECIDARCH — RULEBOOK</span>
        <span className={styles.topbarCellWide} aria-hidden="true" />
        <Link href="/" className={styles.topbarLink}>
          ← BACK TO DRAFTING TABLE
        </Link>
        <span className={styles.topbarCellAccent}>{version === 'ethics' ? 'ETHICS' : 'CLASSIC'}</span>
      </header>

      <main className={styles.main}>
        <div className={styles.header}>
          <h1 className={styles.title}>HOW TO PLAY</h1>
          <p className={styles.subtitle}>
            {version === 'ethics'
              ? 'Ethics-Aware DecidArch — Reflect on Ethical Considerations in Software Architecture.'
              : 'A Multiplayer Card Game for Software Architects. Learn the rules of engagement.'}
          </p>

          {/* Version toggle */}
          <div style={{ display: 'flex', gap: '0.5rem', marginTop: '1.25rem', justifyContent: 'center' }}>
            {(['classic', 'ethics'] as RulesVersion[]).map((v) => (
              <button
                key={v}
                onClick={() => setVersion(v)}
                style={{
                  padding: '0.4rem 1rem',
                  fontFamily: 'var(--font-tech, monospace)',
                  fontSize: '0.75rem',
                  letterSpacing: '0.12em',
                  fontWeight: 700,
                  background: version === v ? 'var(--accent, #54c8ff)' : 'transparent',
                  color: version === v ? '#07111f' : 'var(--accent, #54c8ff)',
                  border: '1px solid var(--accent, #54c8ff)',
                  cursor: 'pointer',
                  transition: 'background 0.15s, color 0.15s',
                }}
              >
                {v === 'classic' ? 'CLASSIC' : 'ETHICS-AWARE'}
              </button>
            ))}
          </div>
        </div>

        {version === 'classic' ? (
          <>
            {/* Classic Phase 1 */}
            <section className={styles.ruleSection}>
              <div className={styles.ruleContent}>
                <span className={styles.stepNumber}>PHASE 01</span>
                <h2 className={styles.ruleTitle}>The Setup</h2>
                <div className={styles.ruleText}>
                  <p>
                    Gather your team of 2 to 8 architects. Every project starts with a grand vision,
                    but soon reality sets in.
                  </p>
                  <ul>
                    <li>The system will deal a series of <strong>Concern Cards</strong>.</li>
                    <li>Each Concern introduces a technical challenge or architectural decision that must be resolved.</li>
                    <li>You&apos;ll also have to satisfy <strong>Stakeholders</strong>, whose priorities dictate how you score.</li>
                  </ul>
                </div>
              </div>
              <div className={styles.imageContainer}>
                <Image
                  src="/images/rules/architect_blueprint.png"
                  alt="Architects looking at a holographic blueprint"
                  fill
                  className={styles.ruleImage}
                  priority
                />
              </div>
            </section>

            {/* Phase 2 */}
            <section className={styles.ruleSection}>
              <div className={styles.ruleContent}>
                <span className={styles.stepNumber}>PHASE 02</span>
                <h2 className={styles.ruleTitle}>Individual Preparation</h2>
                <div className={styles.ruleText}>
                  <p>
                    When a new Concern is drawn, every architect must independently analyze the available
                    <strong> Design Options</strong> and select their preferred approach.
                  </p>
                  <ul>
                    <li>Review the impact of each option on Quality Attributes (Performance, Security, etc.).</li>
                    <li>Select the option you believe is best for the project.</li>
                    <li>Write a brief rationale to justify your choice. You will need to defend it!</li>
                  </ul>
                </div>
              </div>
              <div className={styles.imageContainer}>
                <Image
                  src="/images/rules/individual_prep.png"
                  alt="Single architect analyzing a card"
                  fill
                  className={styles.ruleImage}
                />
              </div>
            </section>

            {/* Phase 3 */}
            <section className={styles.ruleSection}>
              <div className={styles.ruleContent}>
                <span className={styles.stepNumber}>PHASE 03</span>
                <h2 className={styles.ruleTitle}>Group Decision</h2>
                <div className={styles.ruleText}>
                  <p>
                    Once all individual choices are locked in, they are revealed to the team.
                    Now, the real work begins.
                  </p>
                  <ul>
                    <li>Discuss the different options and rationales presented.</li>
                    <li>Debate the trade-offs. Remember your Stakeholders&apos; priorities!</li>
                    <li>Come to a consensus and submit the final <strong>Group Decision</strong>.</li>
                  </ul>
                </div>
              </div>
              <div className={styles.imageContainer}>
                <Image
                  src="/images/rules/group_decision.png"
                  alt="Group of architects discussing options"
                  fill
                  className={styles.ruleImage}
                />
              </div>
            </section>

            {/* Phase 4 */}
            <section className={styles.ruleSection}>
              <div className={styles.ruleContent}>
                <span className={styles.stepNumber}>PHASE 04</span>
                <h2 className={styles.ruleTitle}>Sudden Events</h2>
                <div className={styles.ruleText}>
                  <p>
                    Architecture is never static. Periodically, an <strong>Event Card</strong> will be drawn,
                    representing shifting requirements, budget cuts, or new technology trends.
                  </p>
                  <ul>
                    <li>Events may force you to reconsider past decisions.</li>
                    <li>You might have to revise a previous Group Decision to adapt to the new reality.</li>
                    <li>Adapt quickly or watch your architecture crumble.</li>
                  </ul>
                </div>
              </div>
              <div className={styles.imageContainer}>
                <Image
                  src="/images/rules/sudden_event.png"
                  alt="Red warning alert indicating requirement change"
                  fill
                  className={styles.ruleImage}
                />
              </div>
            </section>
          </>
        ) : (
          <>
            {/* Ethics Phase 1 */}
            <section className={styles.ruleSection}>
              <div className={styles.ruleContent}>
                <span className={styles.stepNumber}>PHASE 01</span>
                <h2 className={styles.ruleTitle}>The Setup</h2>
                <div className={styles.ruleText}>
                  <p>Each player draws a <strong>Stakeholder Card</strong> to take on a role (e.g. female library member, product manager, sponsor).</p>
                  <ul>
                    <li>Read the <strong>Project Card</strong> — the Library Management System with the &ldquo;Modesty&rdquo; parameter.</li>
                    <li>Review the <strong>Ethical Value Cards</strong> placed face-up in the center.</li>
                    <li>Shuffle the <strong>Ethical Concern + Wild Cards</strong> and <strong>Event Cards</strong> into separate face-down stacks.</li>
                  </ul>
                </div>
              </div>
              <div className={styles.imageContainer}>
                <Image src="/images/rules/architect_blueprint.png" alt="Game setup" fill className={styles.ruleImage} priority />
              </div>
            </section>

            {/* Ethics Phase 2 */}
            <section className={styles.ruleSection}>
              <div className={styles.ruleContent}>
                <span className={styles.stepNumber}>PHASE 02</span>
                <h2 className={styles.ruleTitle}>Individual Turn</h2>
                <div className={styles.ruleText}>
                  <p>When an <strong>Ethical Concern Card</strong> is drawn, each player proposes a safeguard independently from their stakeholder&apos;s perspective.</p>
                  <ul>
                    <li>Read the concern, the safeguard hint, and the affected ethical values.</li>
                    <li>Write a safeguard proposal — how should this concern be addressed?</li>
                    <li>Consider the ethical values that matter most to your stakeholder role.</li>
                  </ul>
                </div>
              </div>
              <div className={styles.imageContainer}>
                <Image src="/images/rules/individual_prep.png" alt="Individual safeguard proposal" fill className={styles.ruleImage} />
              </div>
            </section>

            {/* Ethics Phase 3 */}
            <section className={styles.ruleSection}>
              <div className={styles.ruleContent}>
                <span className={styles.stepNumber}>PHASE 03</span>
                <h2 className={styles.ruleTitle}>Group Discussion</h2>
                <div className={styles.ruleText}>
                  <p>All proposals are revealed. The host leads discussion to reach a group safeguard.</p>
                  <ul>
                    <li>Discuss each proposal from each stakeholder&apos;s perspective.</li>
                    <li>Agree on a group safeguard — the host writes it and rates its impact on each affected value using <strong>++ / + / − / −−</strong>.</li>
                    <li>There are no &ldquo;wrong&rdquo; answers — the goal is reflection and awareness.</li>
                  </ul>
                </div>
              </div>
              <div className={styles.imageContainer}>
                <Image src="/images/rules/group_decision.png" alt="Group discussion" fill className={styles.ruleImage} />
              </div>
            </section>

            {/* Ethics Phase 4 */}
            <section className={styles.ruleSection}>
              <div className={styles.ruleContent}>
                <span className={styles.stepNumber}>PHASE 04</span>
                <h2 className={styles.ruleTitle}>Event Cards</h2>
                <div className={styles.ruleText}>
                  <p>After every 4 ethical concerns, an <strong>Event Card</strong> is drawn. Events change stakeholder V-importance for a specific ethical value.</p>
                  <ul>
                    <li>Example: a social media campaign raises Noora&apos;s parents&apos; V-importance for Hope to 2.</li>
                    <li>V-importance changes are applied immediately and affect future scoring.</li>
                    <li>Reflect on how external forces shape ethical priorities.</li>
                  </ul>
                </div>
              </div>
              <div className={styles.imageContainer}>
                <Image src="/images/rules/sudden_event.png" alt="Event card" fill className={styles.ruleImage} />
              </div>
            </section>
          </>
        )}

        <div className={styles.footerActions}>
          <Link href="/" className="btn btn-primary btn-lg">
            I&apos;M READY TO BUILD →
          </Link>
        </div>
      </main>
    </div>
  );
}
