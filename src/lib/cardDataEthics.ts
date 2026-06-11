// ============================================================
// DecidArch — Ethics-Aware Card Data (V3)
// ============================================================
//
// Source: "Ethics-Aware DecidArch Game Materials" (ICSA2023 / HCII2023)
// Project: Library Management System — "Modesty" Parameter
// Published by: Alidoosti, Lago, Poort, Razavian (VU Amsterdam)
//
// Impact key: '++' very positive, '+' positive, '-' negative, '--' very negative
// (Neutral '=' is not used — every safeguard choice must take a stance)

import { EthicsCardData } from './types';

export const ETHICS_CARD_DATA: EthicsCardData = {
    // --------------- Project Card ---------------

    project: {
        title: 'Library Management System',
        description:
            'A digital system for managing library book loans and member access across multiple book categories.',
        context:
            'This system allows libraries to keep track of books by providing a database to record borrowed books and add new ones. It also provides members access to different categories of books in the library.',
        purpose:
            'A sponsor has requested a new configuration parameter named "Modesty" that would refuse loans of certain book categories to female members, citing cultural differences. Your team must design the system while navigating the serious ethical implications of this request.',
    },

    // --------------- Stakeholder Cards ---------------

    stakeholders: [
        {
            id: 'sth-female-members',
            category: 'System users (female library members)',
            name: 'Noora',
            description:
                'She is a social science researcher aiming to conduct research about feminism and women\'s movements. She lives in a society where women do not have the same rights as men.',
            goal:
                'As a library member, she wants access to all categories of books — especially feminism books — to accomplish her research. The library management system denies her access to these books.',
            values: [
                { name: 'Fairness', importance: 2 },
                { name: 'Freedom', importance: 1 },
            ],
        },
        {
            id: 'sth-product-managers',
            category: 'System development organization (product managers)',
            description:
                'A group of Dutch individuals focused on the technical aspects of the product, responsible for gathering requirements and overseeing product strategy. They adhere to the code of conduct and EU GDPR principles as guiding rules for ethical decision making.',
            goal:
                'At the request of the sponsor, they must design the "Modesty" configuration parameter, while trying to balance the sponsor\'s request against ethical principles.',
            values: [
                { name: 'Cultural autonomy', importance: 2 },
                { name: 'Privacy', importance: 1 },
            ],
        },
        {
            id: 'sth-sponsor',
            category: 'System development organization (sponsor/product owner)',
            description:
                'A company (similar to Oracle) looking for new ways to survive and expand into strategic markets.',
            goal:
                'Aims to open up new strategic markets to compete with rivals and provide better service for societies with respect to cultural differences.',
            values: [
                { name: 'Social power', importance: 2 },
                { name: 'Wealth', importance: 1 },
            ],
        },
        {
            id: 'sth-society-x',
            category: 'Indirect stakeholders (Society X)',
            description:
                'A society with specific features, such as not respecting gender equality, women\'s rights, and women\'s empowerment.',
            goal:
                'No direct interaction with the system, but can be indirectly affected by it through its cultural and social consequences.',
            values: [{ name: 'Cultural autonomy', importance: 2 }],
        },
        {
            id: 'sth-nooraparents',
            category: "Indirect stakeholders (Noora's parents)",
            description:
                'They live in a society where women do not have the same rights as men.',
            goal:
                'No direct interaction with the system, but the system can indirectly affect them through its impacts on their daughter.',
            values: [
                { name: 'Hope', importance: 1 },
                { name: 'Welfare', importance: 2 },
            ],
        },
    ],

    // --------------- Ethical Value Cards ---------------

    ethicalValues: [
        {
            id: 'val-informed-consent',
            valueName: 'Informed consent',
            definition:
                'Permission and agreement of individuals before conducting actions towards them in the context of systems, to protect the safety of data and individuals.',
        },
        {
            id: 'val-dignity',
            valueName: 'Dignity',
            definition:
                'The rights of individuals to be respected and treated ethically in interaction with systems.',
        },
        {
            id: 'val-ownership',
            valueName: 'Ownership and property',
            definition:
                'The right to a property including the right to possess it, use it, manage it, and derive income from it.',
        },
        {
            id: 'val-anonymity',
            valueName: 'Anonymity',
            definition:
                "Protecting stakeholders' identity in a system and assurance of privacy.",
        },
        {
            id: 'val-trust',
            valueName: 'Trust',
            definition:
                'Having faith in systems to demonstrate honesty and predictable behavior, keeping loyalty and trueness.',
        },
    ],

    // --------------- Ethical Concern Cards ---------------

    concerns: [
        {
            id: 'ec-1',
            title: 'Gender Discrimination',
            description:
                'The "Modesty" parameter discriminates against female members by refusing access to certain book categories based solely on gender.',
            safeguardHint:
                'Suggest open-access resources with similar content in other places, like the internet or social media.',
            affectedValues: ['Fairness', 'Freedom', 'Cultural autonomy', 'Hope', 'Social power'],
        },
        {
            id: 'ec-2',
            title: 'Privacy Violation',
            description:
                "The system logs female members' attempts to check out restricted book categories, violating their privacy.",
            safeguardHint:
                'Store only necessary information — not sensitive personal information — in the database.',
            affectedValues: ['Privacy', 'Welfare', 'Cultural autonomy'],
        },
        {
            id: 'ec-3',
            title: 'Identity Misrepresentation',
            description:
                'Female members may attempt to access restricted books by misrepresenting their identity.',
            safeguardHint: 'Require identification to pick up books.',
            affectedValues: ['Privacy', 'Cultural autonomy'],
        },
        {
            id: 'ec-4',
            title: 'Company Market Risk',
            description:
                "Adding the Modesty parameter may endanger the company's market value and profit by alienating international markets that value gender equality.",
            safeguardHint:
                'Add a notification module that creates and displays a culturally-sensitive explanation for access restrictions.',
            affectedValues: ['Social power', 'Hope', 'Wealth'],
        },
        {
            id: 'ec-5',
            title: 'Project Deadline Pressure',
            description:
                'The team faces significant pressure from an approaching project deadline while navigating complex ethical decisions.',
            safeguardHint:
                'Accomplish all necessary changes through careful prioritization and transparent communication with the sponsor.',
            affectedValues: ['Wealth', 'Privacy'],
        },
        {
            id: 'ec-6',
            title: "Undermining Members' Well-being",
            description:
                "The system undermines the psychological and social well-being of female members by restricting their access to knowledge.",
            safeguardHint:
                'Use a machine-learning algorithm to improve the Modesty parameter, e.g., giving female members access to some of the restricted books based on context.',
            affectedValues: ['Welfare', 'Cultural autonomy', 'Hope', 'Social power'],
        },
    ],

    // --------------- Ethics Event Cards ---------------

    events: [
        {
            id: 'ee-campaign',
            title: 'Social Campaign Against the System',
            description:
                'Mass media has raised campaigns against the system. The campaigns received strong support from women around the world, putting public pressure on all parties.',
            consequence: "Noora's parents' V-importance for Hope is raised to 2.",
            stakeholderId: 'sth-nooraparents',
            affectedValue: 'Hope',
            newImportance: 2,
        },
        {
            id: 'ee-hackers',
            title: "Hackers' Attack",
            description:
                'Hackers attacked the library management system to discover members\' personal data and grant all members access to all book categories.',
            consequence: "Product managers' V-importance for Privacy is raised to 2.",
            stakeholderId: 'sth-product-managers',
            affectedValue: 'Privacy',
            newImportance: 2,
        },
    ],
};
