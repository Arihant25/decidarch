'use client';

import { ProjectCard as ProjectCardType } from '@/lib/types';
import styles from './ProjectCard.module.css';

interface Props {
  project: ProjectCardType;
}

export function ProjectCard({ project }: Props) {
  return (
    <div className={styles.card}>
      <div className={styles.header}>
        <span className={styles.tag}>PRJ</span>
        <span className={styles.kind}>Project</span>
      </div>
      <h3 className={styles.title}>{project.title}</h3>
      <p className={styles.description}>{project.description}</p>
    </div>
  );
}
