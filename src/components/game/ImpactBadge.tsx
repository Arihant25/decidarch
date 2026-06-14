'use client';

import { Impact } from '@/lib/types';

const CLASS_MAP: Record<string, string> = {
    '++': 'impact impact-very-positive',
    '+': 'impact impact-positive',
    '=': 'impact impact-neutral',
    '-': 'impact impact-negative',
    '--': 'impact impact-very-negative',
};

export function ImpactBadge({ impact }: { impact: Impact }) {
    return <span className={CLASS_MAP[impact] || 'impact impact-neutral'}>{impact}</span>;
}
