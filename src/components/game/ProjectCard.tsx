'use client';

import { ProjectCard as ProjectCardType, EthicsProjectCard } from '@/lib/types';
import styles from './ProjectCard.module.css';

interface Props {
  project: ProjectCardType | EthicsProjectCard;
}

export function ProjectCard({ project }: Props) {
  const isEthics = 'purpose' in project;

  return (
    <div className={styles.card}>
      <div className={styles.header}>
        <span className={styles.tag}>PRJ</span>
        <span className={styles.kind}>{isEthics ? 'Ethics Project' : 'Project'}</span>
      </div>
      <h3 className={styles.title}>{project.title}</h3>
      <p className={styles.description}>{project.description}</p>
      {isEthics && (
        <p className={styles.description} style={{ marginTop: '0.5rem', fontStyle: 'italic', opacity: 0.85 }}>
          {(project as EthicsProjectCard).purpose}
        </p>
      )}
    </div>
  );
}
