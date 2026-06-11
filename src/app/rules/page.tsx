import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import styles from './rules.module.css';

export const metadata: Metadata = {
  title: 'How to Play — DecidArch',
  description:
    'Learn the rules of DecidArch: a multiplayer card game for software architects. Understand the phases, cards, and scoring system.',
  openGraph: {
    title: 'How to Play — DecidArch',
    description:
      'Learn the rules of DecidArch: a multiplayer card game for software architects.',
  },
  robots: { index: true, follow: true },
};

export default function RulesPage() {
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
        <span className={styles.topbarCellAccent}>REV 2.0</span>
      </header>

      <main className={styles.main}>
        <div className={styles.header}>
          <h1 className={styles.title}>HOW TO PLAY</h1>
          <p className={styles.subtitle}>
            A Multiplayer Card Game for Software Architects.
            Learn the rules of engagement.
          </p>
        </div>

        {/* Phase 1 */}
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

        <div className={styles.footerActions}>
          <Link href="/" className="btn btn-primary btn-lg">
            I&apos;M READY TO BUILD →
          </Link>
        </div>
      </main>
    </div>
  );
}
