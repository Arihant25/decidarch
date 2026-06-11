// ============================================================
// DecidArch V2 — Card Data
// ============================================================
//
// Source: "DecidArch Cards - v2.pdf" from the DecidArch V2 game.
// Project: Social News Platform
// Quality Attributes: Usability, Security, Performance, Availability, Maintainability
//
// Impact key: '++' very positive, '+' positive, '=' neutral, '-' negative, '--' very negative
// Some cards have <?> slots for advanced play — represented as open-ended options.

import { ConcernCard, EventCard, StakeholderCard, ProjectCard } from './types';

// --------------- Project Card ---------------

export const PROJECT_CARD: ProjectCard = {
  title: 'Social News Platform',
  description:
    'The Social News Platform is a digital system that allows users to write, share and read news articles.',
  context:
    'Design a software system for this platform, balancing the quality requirements of the User and Owner stakeholders. Make architectural decisions that satisfy their priorities while keeping the overall system viable.',
};

// --------------- Stakeholder Cards ---------------

export const STAKEHOLDER_CARDS: StakeholderCard[] = [
  {
    id: 'stakeholder-user',
    name: 'User',
    role: 'End User',
    description:
      'The User reads news articles written or shared by other users. Those who write and share articles are often journalists or activists.',
    priorities: [
      { attribute: 'Usability', importance: 2 },
      { attribute: 'Security', importance: 1 },
      { attribute: 'Performance', importance: 2 },
    ],
  },
  {
    id: 'stakeholder-owner',
    name: 'Owner',
    role: 'System Owner',
    description: 'The Owner will maintain the system during its lifetime.',
    priorities: [
      { attribute: 'Availability', importance: 2 },
      { attribute: 'Security', importance: 0 },
      { attribute: 'Maintainability', importance: 1 },
    ],
  },
];

// --------------- Concern Cards ---------------

export const CONCERN_CARDS: ConcernCard[] = [
  {
    id: 'concern-1',
    title: 'Article Storage',
    description:
      'The users need to be able to upload articles on the platform. How will the system store these articles?',
    designOptions: [
      {
        id: 'c1-opt1',
        name: 'Multiple Distributed Databases',
        description: 'Store the articles in multiple distributed databases owned by the Owner.',
        impacts: {
          Security: '+',
          Performance: '+',
          Availability: '+',
          Maintainability: '-',
          Usability: '=',
        },
      },
      {
        id: 'c1-opt2',
        name: 'Cloud Storage',
        description: 'Upload the articles in the cloud owned by an external cloud provider.',
        impacts: {
          Security: '-',
          Performance: '+',
          Availability: '+',
          Maintainability: '++',
          Usability: '=',
        },
      },
      {
        id: 'c1-opt3',
        name: 'Single Local Database',
        description: 'Store the articles in a single local database owned by the Owner.',
        impacts: {
          Security: '+',
          Performance: '-',
          Availability: '-',
          Maintainability: '+',
          Usability: '=',
        },
      },
    ],
  },
  {
    id: 'concern-2',
    title: 'Operational Data Storage',
    description:
      'The system needs to store user information and other information necessary for system operation, including ratings, reviews, comments. How will the system store this information?',
    designOptions: [
      {
        id: 'c2-opt1',
        name: 'Multiple Distributed Databases',
        description: 'Store the information in multiple distributed databases owned by the Owner.',
        impacts: {
          Security: '+',
          Performance: '+',
          Availability: '+',
          Maintainability: '-',
          Usability: '=',
        },
      },
      {
        id: 'c2-opt2',
        name: 'Cloud Storage',
        description: 'Upload the information in the cloud owned by an external cloud provider.',
        impacts: {
          Security: '-',
          Performance: '+',
          Availability: '+',
          Maintainability: '++',
          Usability: '=',
        },
      },
      {
        id: 'c2-opt3',
        name: 'Single Local Database',
        description: 'Store the information in a single local database owned by the Owner.',
        impacts: {
          Security: '+',
          Performance: '-',
          Availability: '-',
          Maintainability: '+',
          Usability: '=',
        },
      },
    ],
  },
  {
    id: 'concern-3',
    title: 'Sensitive Data Storage',
    description:
      'The system needs to store sensitive user credentials and personal information (e.g. payment data, login credentials, name). How will the system store this information?',
    designOptions: [
      {
        id: 'c3-opt1',
        name: 'Multiple Distributed Databases',
        description: 'Store the sensitive data in multiple distributed databases owned by the Owner.',
        impacts: {
          Security: '-',
          Performance: '+',
          Availability: '+',
          Maintainability: '-',
          Usability: '=',
        },
      },
      {
        id: 'c3-opt2',
        name: 'Cloud Storage',
        description: 'Store the sensitive data in the cloud owned by an external cloud provider.',
        impacts: {
          Security: '--',
          Performance: '+',
          Availability: '+',
          Maintainability: '++',
          Usability: '=',
        },
      },
      {
        id: 'c3-opt3',
        name: 'Single Local Database',
        description: 'Store the sensitive data in a single local database owned by the Owner.',
        impacts: {
          Security: '=',
          Performance: '-',
          Availability: '-',
          Maintainability: '+',
          Usability: '=',
        },
      },
    ],
  },
  {
    id: 'concern-4',
    title: 'E-Payment System',
    description:
      'Users want to transfer payments to other users to compensate for their effort in writing or sharing articles.',
    designOptions: [
      {
        id: 'c4-opt1',
        name: 'Outsource E-Payment',
        description: 'Outsource E-payment to an E-Payment service.',
        impacts: {
          Usability: '=',
          Maintainability: '+',
          Security: '-',
          Performance: '=',
          Availability: '=',
        },
      },
      {
        id: 'c4-opt2',
        name: 'Integrate Open Source E-Payment',
        description:
          'Integrate open source E-payment software solutions in the system (requires handling payment information / credentials internally by the system).',
        impacts: {
          Usability: '+',
          Maintainability: '--',
          Security: '++',
          Performance: '=',
          Availability: '=',
        },
      },
      {
        id: 'c4-opt3',
        name: 'Bank Website Transfer',
        description:
          "Users log in their bank's website, enter the platform's payment information and authorize their bank to electronically transfer money.",
        impacts: {
          Usability: '--',
          Maintainability: '++',
          Security: '+',
          Performance: '=',
          Availability: '=',
        },
      },
    ],
  },
  {
    id: 'concern-5',
    title: 'Anonymous Usage',
    description:
      'Users want to be able to use the platform anonymously. How can the system let the user connect anonymously?',
    designOptions: [
      {
        id: 'c5-opt1',
        name: 'Onion Routing (TOR)',
        description:
          'Implement onion routing in the network (TOR). Onion routing effectively hides information by using multiple layers of encryption.',
        impacts: {
          Performance: '-',
          Security: '++',
          Usability: '=',
          Availability: '=',
          Maintainability: '=',
        },
      },
      {
        id: 'c5-opt2',
        name: 'VPN Service Integration',
        description:
          'Integrate a VPN service that allows users to mask their identity and location while using the platform.',
        impacts: {
          Performance: '-',
          Security: '+',
          Usability: '+',
          Availability: '=',
          Maintainability: '-',
        },
      },
      {
        id: 'c5-opt3',
        name: 'Anonymous Guest Accounts',
        description:
          'Allow users to create temporary anonymous guest accounts that do not require personal information.',
        impacts: {
          Performance: '=',
          Security: '+',
          Usability: '++',
          Availability: '=',
          Maintainability: '+',
        },
      },
    ],
  },
  {
    id: 'concern-6',
    title: 'Static Content Delivery',
    description:
      "Users need to retrieve the system's web content. Where will the system store its static content?",
    designOptions: [
      {
        id: 'c6-opt1',
        name: 'Self-Owned CDN',
        description: 'Deploy self-owned content delivery network services.',
        impacts: {
          Maintainability: '--',
          Performance: '+',
          Security: '+',
          Usability: '=',
          Availability: '=',
        },
      },
      {
        id: 'c6-opt2',
        name: '3rd Party CDN',
        description: 'Use 3rd party Content Delivery Network services.',
        impacts: {
          Maintainability: '-',
          Performance: '+',
          Security: '=',
          Usability: '=',
          Availability: '=',
        },
      },
      {
        id: 'c6-opt3',
        name: 'Same Web Server',
        description: 'Use the same web server as the non-static content.',
        impacts: {
          Maintainability: '++',
          Performance: '-',
          Security: '++',
          Usability: '=',
          Availability: '=',
        },
      },
    ],
  },
  {
    id: 'concern-8',
    title: 'Account Data Protection',
    description:
      'The Users need to be able to protect their data when their account credentials are stolen. How can the system protect their data?',
    designOptions: [
      {
        id: 'c8-opt1',
        name: 'Account Recovery via SMS',
        description: 'Implement Account Recovery using SMS.',
        impacts: {
          Usability: '+',
          Security: '-',
          Maintainability: '-',
          Performance: '=',
          Availability: '=',
        },
      },
      {
        id: 'c8-opt2',
        name: 'Two-Factor Authentication',
        description: 'Use a PIN number that is sent through SMS to support 2 Factor Authentication.',
        impacts: {
          Usability: '-',
          Security: '++',
          Maintainability: '--',
          Performance: '=',
          Availability: '=',
        },
      },
      {
        id: 'c8-opt3',
        name: 'Email-Based Recovery',
        description:
          'Implement email-based account recovery with a time-limited secure token sent to the registered email address.',
        impacts: {
          Usability: '+',
          Security: '+',
          Maintainability: '+',
          Performance: '=',
          Availability: '=',
        },
      },
    ],
  },
  {
    id: 'concern-9',
    title: 'Advertisement Hosting',
    description:
      'The system needs to be able to display advertisements to the Users to generate income. Where will the system host these advertisements?',
    designOptions: [
      {
        id: 'c9-opt1',
        name: 'Host Internally',
        description: 'Host the advertisements internally in the system.',
        impacts: {
          Maintainability: '-',
          Performance: '+',
          Security: '+',
          Usability: '=',
          Availability: '=',
        },
      },
      {
        id: 'c9-opt2',
        name: '3rd Party Ad Platform',
        description: 'Make use of a 3rd party advertisement platform.',
        impacts: {
          Maintainability: '+',
          Performance: '-',
          Security: '=',
          Usability: '=',
          Availability: '=',
        },
      },
      {
        id: 'c9-opt3',
        name: 'Hybrid Approach',
        description:
          'Use a combination of internal ad hosting for premium advertisers and a 3rd party platform for standard ads.',
        impacts: {
          Maintainability: '=',
          Performance: '=',
          Security: '+',
          Usability: '+',
          Availability: '=',
        },
      },
    ],
  },
  {
    id: 'concern-10',
    title: 'User Interface',
    description:
      'The users need to have an interface to interact with the platform. What interfaces should be provided to the user?',
    designOptions: [
      {
        id: 'c10-opt1',
        name: 'PC Web Pages',
        description: 'Provide web pages, tailored for PCs.',
        impacts: {
          Usability: '=',
          Maintainability: '=',
          Performance: '+',
          Security: '=',
          Availability: '=',
        },
      },
      {
        id: 'c10-opt2',
        name: 'Responsive Web App',
        description:
          'Provide a responsive web application that adapts to both desktop and mobile devices.',
        impacts: {
          Usability: '++',
          Maintainability: '-',
          Performance: '=',
          Security: '=',
          Availability: '+',
        },
      },
      {
        id: 'c10-opt3',
        name: 'Native Mobile + Web',
        description:
          'Provide native mobile applications (iOS/Android) alongside the web application.',
        impacts: {
          Usability: '++',
          Maintainability: '--',
          Performance: '++',
          Security: '+',
          Availability: '++',
        },
      },
    ],
  },
  {
    id: 'concern-21',
    title: 'Data Encryption',
    description:
      'The system needs to store and transmit sensitive information between remote components (e.g. between databases). In what form will this information be handled?',
    designOptions: [
      {
        id: 'c21-opt1',
        name: 'No Encryption',
        description: 'The system stores and transmits information without encryption.',
        impacts: {
          Performance: '++',
          Security: '--',
          Usability: '=',
          Availability: '=',
          Maintainability: '=',
        },
      },
      {
        id: 'c21-opt2',
        name: 'Full Encryption',
        description: 'The system transmits and stores information with use of encryption.',
        impacts: {
          Performance: '--',
          Security: '++',
          Usability: '=',
          Availability: '=',
          Maintainability: '=',
        },
      },
      {
        id: 'c21-opt3',
        name: 'Encryption for Transmission Only',
        description:
          'The system stores information without encryption, but uses encryption for transmission.',
        impacts: {
          Performance: '-',
          Security: '+',
          Usability: '=',
          Availability: '=',
          Maintainability: '=',
        },
      },
    ],
  },
];

// --------------- Event Cards ---------------

export const EVENT_CARDS: EventCard[] = [
  {
    id: 'event-fire',
    title: 'Fire!',
    description:
      "There has been a small fire in one of the Owner's office buildings. Luckily, the fire could be contained and the data center was not jeopardized. However, because of this incident a new policy is now in effect that prohibits the use of single local databases.",
    effect:
      'If you selected a "single local database" as design option for any of the concerns, those decisions need to be revised. For future decisions, this option is no longer available.',
    imageUrl: '/images/events/event_fire.png',
  },
  {
    id: 'event-malware',
    title: 'Malware in Advertisements',
    description:
      'It has been found that many commercial advertisement platforms are at risk of serving malicious content.',
    effect: 'Use of 3rd party advertisement platforms impacts Security with (-).',
    imageUrl: '/images/events/event_malware.png',
  },
  {
    id: 'event-new-cto',
    title: 'New CTO',
    description:
      'The owner hires a new CTO, who is not amused by the amount of money that is spent on code maintenance. She decides that maintenance is now the top priority for all projects, including yours.',
    effect: "The Owner's QA-Priority for Maintainability is set to 3.",
    imageUrl: '/images/events/event_new_cto.png',
  },
  {
    id: 'event-data-protection',
    title: 'Change in Data Protection Regulation',
    description:
      "Data protection regulations are becoming more stringent, and companies that don't consider data security aspects are now liable, with huge potential consequences.",
    effect:
      "The Owner's QA-Priority for Security is set to 2. It is no longer allowed to use 3rd party cloud storage providers to store sensitive data.",
    imageUrl: '/images/events/event_data_protection.png',
  },
  {
    id: 'event-user-survey',
    title: 'User Survey',
    description:
      'A user survey shows that users are mostly concerned with the performance of the system, and that they are willing to trade in usability for better performance.',
    effect:
      "The User's QA-Priority for Performance is set to 3. The User's QA-Priority for Usability is set to 0.",
    imageUrl: '/images/events/event_user_survey.png',
  },
];

// --------------- Combined export ---------------

export const CARD_DATA = {
  project: PROJECT_CARD,
  stakeholders: STAKEHOLDER_CARDS,
  concerns: CONCERN_CARDS,
  events: EVENT_CARDS,
};
