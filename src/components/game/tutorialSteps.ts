import { GameVersion } from '@/lib/types';

/** Board sections the tutorial reveals and points at, in tour order */
export type TourKey =
  | 'topbar'
  | 'project'
  | 'stakeholders'
  | 'players'
  | 'center'
  | 'stats'
  | 'log'
  | 'chat';

export interface TutorialStep {
  /** Section highlighted and revealed at this step; null = welcome card, blank board */
  key: TourKey | null;
  /** Mono kicker label, drafting-annotation style */
  label: string;
  title: string;
  body: string;
}

export function getTutorialSteps(version: GameVersion): TutorialStep[] {
  const isEthics = version === 'ethics';
  return [
    {
      key: null,
      label: 'SITE ORIENTATION',
      title: 'Welcome to the drafting table',
      body: 'You and your team are about to make architecture decisions under pressure. Before the first concern card is dealt, take a quick tour of the workspace; each station will appear as we go. Or skip straight to the table.',
    },
    {
      key: 'topbar',
      label: 'CONTROL STRIP',
      title: 'Session, phase & clock',
      body: 'Your session code lives up here next to the current phase of play. The clock on the right counts down each round, and the thin bar underneath tracks your progress through the concern deck.',
    },
    {
      key: 'project',
      label: 'PROJECT BRIEF',
      title: 'What you are building',
      body: 'This is the commission. Its context, constraints and goals are all here. Every decision you file should serve this project. Refer back to it whenever a choice feels close.',
    },
    {
      key: 'stakeholders',
      label: 'STAKEHOLDERS',
      title: 'Who you answer to',
      body: isEthics
        ? 'Each stakeholder is affected differently by your choices. Their values and importance determine your ethics score, so keep them close while you deliberate.'
        : 'Each stakeholder cares about different quality attributes. Their priorities decide how your decisions are scored, so keep them close while you deliberate.',
    },
    {
      key: 'players',
      label: 'DESIGN TEAM',
      title: 'Your fellow architects',
      body: 'Everyone in the session shows up here. During individual prep you can see who has already submitted a decision and who is still thinking.',
    },
    {
      key: 'center',
      label: 'DRAFTING AREA',
      title: 'Where the work happens',
      body: 'Concern cards land here, one per round. First you weigh in on your own, then everyone reveals, debates, and files one group decision. Watch out: events can strike between rounds and force revisions.',
    },
    {
      key: 'stats',
      label: 'LIVE SCORES',
      title: isEthics ? 'Stakeholder totals' : 'Quality attributes',
      body: isEthics
        ? 'Running ethics totals per stakeholder. Every filed decision moves these numbers; keep an eye on who your design is serving and who it is hurting.'
        : 'Running totals for each quality attribute. Every filed decision moves these numbers; watch the deltas to see what your last choice cost.',
    },
    {
      key: 'log',
      label: 'DECISION LOG',
      title: 'The paper trail',
      body: 'Every decision your team files is recorded here. Review past choices at any time, especially when an event forces you to revisit one.',
    },
    {
      key: 'chat',
      label: 'SITE CHAT',
      title: 'Talk it out',
      body: 'Coordinate with your team during and between rounds; good architecture is argued into existence. That is the whole site. Ready to draw?',
    },
  ];
}
