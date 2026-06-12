import Link from 'next/link';
import styles from './not-found.module.css';

export default function NotFound() {
    return (
        <div className={styles.page}>
            <div className={styles.grid} aria-hidden="true" />
            <div className={styles.vignette} aria-hidden="true" />

            <main className={styles.content}>
                <div className={styles.stamp}>404</div>

                <div className={styles.divider} aria-hidden="true" />

                <h1 className={styles.heading}>Blueprint Not Found</h1>
                <p className={styles.subheading}>
                    This page was never drafted, or it got lost in the archive.
                </p>

                <Link href="/" className={styles.homeBtn}>
                    Back to the Drafting Table
                </Link>
            </main>
        </div>
    );
}
