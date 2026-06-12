// ============================================================
// DecidArch V2 — Score Calculation (Official Rules)
// ============================================================
//
// Scoring from the official rulebook:
// 1. Calculate QA-Score per attribute (sum of all + minus all -)
//    If any QA-Score < 0 → LOSE
// 2. Compare QA-Score against each Stakeholder's QA-Priority
//    If any QA-Score < QA-Priority → LOSE (stakeholder unsatisfied)
// 3. Stakeholder Satisfaction Level = sum of (QA-Score - QA-Priority) per attribute
// 4. Final Score = sum of all Stakeholder Satisfaction Levels
//
// Final Score ranges:
//   < 0:      Lost
//   0-9:      Sufficient
//   10-19:    Good
//   20-29:    Very Good
//   30+:      Excellent

import { GameState, QualityAttribute, IMPACT_VALUES, Impact } from './types';
import { CARD_DATA } from './cardData';
import { ETHICS_CARD_DATA } from './cardDataEthics';

export interface QAScoreEntry {
  attribute: QualityAttribute;
  plusCount: number;
  minusCount: number;
  score: number;
}

export interface StakeholderSatisfaction {
  stakeholderName: string;
  attributeDetails: {
    attribute: QualityAttribute;
    qaPriority: number;
    qaScore: number;
    satisfaction: number; // qaScore - qaPriority
    satisfied: boolean;
  }[];
  totalSatisfaction: number;
  allSatisfied: boolean;
}

export interface LossDetail {
  stakeholderName?: string; // absent for QA-negative losses
  attribute: QualityAttribute;
  qaScore: number;
  required: number; // 0 for QA-negative, the stakeholder's priority otherwise
}

export interface LossInfo {
  kind: 'qa-negative' | 'stakeholder-unsatisfied';
  summary: string;
  details: LossDetail[];
}

export interface GameScore {
  qaScores: QAScoreEntry[];
  anyQANegative: boolean;
  stakeholderSatisfactions: StakeholderSatisfaction[];
  anyStakeholderUnsatisfied: boolean;
  totalStakeholderSatisfaction: number;
  finalScore: number;
  lost: boolean;
  loss?: LossInfo;
  grade: string;
}

export function calculateScores(state: GameState): GameScore {
  const concerns = CARD_DATA.concerns;
  const stakeholders = CARD_DATA.stakeholders;
  const allAttributes = new Set<QualityAttribute>();

  // Collect all quality attributes from stakeholder priorities
  for (const s of stakeholders) {
    for (const p of s.priorities) {
      allAttributes.add(p.attribute);
    }
  }

  // Step 1: Calculate QA-Scores
  const qaScoreMap: Record<string, { plus: number; minus: number }> = {};
  for (const attr of allAttributes) {
    qaScoreMap[attr] = { plus: 0, minus: 0 };
  }

  for (const decision of state.groupDecisions) {
    const concern = concerns.find((c) => c.id === decision.concernId);
    if (!concern) continue;

    const option = concern.designOptions.find((o) => o.id === decision.optionId);
    if (!option) continue;

    for (const attr of allAttributes) {
      const impact = option.impacts[attr] as Impact | undefined;
      if (!impact || impact === '=') continue;

      const value = IMPACT_VALUES[impact];
      if (value > 0) {
        qaScoreMap[attr].plus += value; // + counts as 1, ++ counts as 2
      } else if (value < 0) {
        qaScoreMap[attr].minus += Math.abs(value); // - counts as 1, -- counts as 2
      }
    }
  }

  const qaScores: QAScoreEntry[] = Array.from(allAttributes).map((attr) => ({
    attribute: attr,
    plusCount: qaScoreMap[attr].plus,
    minusCount: qaScoreMap[attr].minus,
    score: qaScoreMap[attr].plus - qaScoreMap[attr].minus,
  }));

  const anyQANegative = qaScores.some((q) => q.score < 0);

  // Step 2: Check Stakeholder Satisfaction
  const stakeholderSatisfactions: StakeholderSatisfaction[] = stakeholders.map((stakeholder) => {
    const priorityOverrides = state.stakeholderPriorityOverrides?.[stakeholder.id] ?? {};
    const attributeDetails = stakeholder.priorities.map((priority) => {
      const effectivePriority = priorityOverrides[priority.attribute] ?? priority.importance;
      const qaEntry = qaScores.find((q) => q.attribute === priority.attribute);
      const qaScore = qaEntry ? qaEntry.score : 0;
      return {
        attribute: priority.attribute,
        qaPriority: effectivePriority,
        qaScore,
        satisfaction: qaScore - effectivePriority,
        satisfied: qaScore >= effectivePriority,
      };
    });

    const allSatisfied = attributeDetails.every((d) => d.satisfied);
    const totalSatisfaction = attributeDetails.reduce((sum, d) => sum + d.satisfaction, 0);

    return {
      stakeholderName: stakeholder.name,
      attributeDetails,
      totalSatisfaction,
      allSatisfied,
    };
  });

  const anyStakeholderUnsatisfied = stakeholderSatisfactions.some((s) => !s.allSatisfied);

  // Step 3 & 4: Calculate Final Score
  const totalStakeholderSatisfaction = stakeholderSatisfactions.reduce(
    (sum, s) => sum + s.totalSatisfaction,
    0
  );
  const finalScore = totalStakeholderSatisfaction;

  // Determine if the game is lost
  let lost = false;
  let loss: LossInfo | undefined;

  if (anyQANegative) {
    lost = true;
    loss = {
      kind: 'qa-negative',
      summary: 'One or more quality attributes scored below zero.',
      details: qaScores
        .filter((q) => q.score < 0)
        .map((q) => ({ attribute: q.attribute, qaScore: q.score, required: 0 })),
    };
  } else if (anyStakeholderUnsatisfied) {
    lost = true;
    loss = {
      kind: 'stakeholder-unsatisfied',
      summary: 'The design fell short of a quality attribute that a stakeholder prioritized.',
      details: stakeholderSatisfactions.flatMap((s) =>
        s.attributeDetails
          .filter((d) => !d.satisfied)
          .map((d) => ({
            stakeholderName: s.stakeholderName,
            attribute: d.attribute,
            qaScore: d.qaScore,
            required: d.qaPriority,
          }))
      ),
    };
  }

  // Grade
  let grade: string;
  if (lost || finalScore < 0) {
    grade = 'Lost';
  } else if (finalScore >= 30) {
    grade = 'Excellent';
  } else if (finalScore >= 20) {
    grade = 'Very Good';
  } else if (finalScore >= 10) {
    grade = 'Good';
  } else {
    grade = 'Sufficient';
  }

  return {
    qaScores,
    anyQANegative,
    stakeholderSatisfactions,
    anyStakeholderUnsatisfied,
    totalStakeholderSatisfaction,
    finalScore,
    lost,
    loss,
    grade,
  };
}

// ============================================================
// Ethics-Aware Score Calculation (V3)
// ============================================================
//
// For each group decision the host rated value impacts (++/+/-/--).
// Score = Σ over all decisions of: Σ over affected values of:
//   V-importance (possibly overridden by event) × impact_value
//
// Grades (digital approximation — the physical game is qualitative):
//   < 0:   Reflection Needed
//   0–14:  Sufficient
//   15–29: Good
//   30–44: Very Good
//   45+:   Excellent
// ============================================================

export interface EthicsValueScore {
  valueName: string;
  importance: number;
  totalImpact: number;
  contribution: number;
}

export interface EthicsStakeholderScore {
  stakeholderId: string;
  category: string;
  name?: string;
  valueScores: EthicsValueScore[];
  totalContribution: number;
}

export interface EthicsScore {
  stakeholderScores: EthicsStakeholderScore[];
  finalScore: number;
  grade: string;
}

export function calculateEthicsScore(state: GameState): EthicsScore {
  const { stakeholders, concerns } = ETHICS_CARD_DATA;

  const getVImportance = (stakeholderId: string, valueName: string, baseImportance: number): number =>
    state.stakeholderVImportanceOverrides[stakeholderId]?.[valueName] ?? baseImportance;

  const stakeholderScores: EthicsStakeholderScore[] = stakeholders.map((stakeholder) => {
    const valueScores: EthicsValueScore[] = stakeholder.values.map(({ name: valueName, importance: baseImportance }) => {
      const importance = getVImportance(stakeholder.id, valueName, baseImportance);

      let totalImpact = 0;
      for (const decision of state.groupDecisions) {
        const impact = decision.valueImpacts?.[valueName] as Impact | undefined;
        if (impact) {
          totalImpact += IMPACT_VALUES[impact];
        }
      }

      return { valueName, importance, totalImpact, contribution: importance * totalImpact };
    });

    const totalContribution = valueScores.reduce((sum, v) => sum + v.contribution, 0);
    return {
      stakeholderId: stakeholder.id,
      category: stakeholder.category,
      name: stakeholder.name,
      valueScores,
      totalContribution,
    };
  });

  const finalScore = stakeholderScores.reduce((sum, s) => sum + s.totalContribution, 0);

  let grade: string;
  if (finalScore < 0) grade = 'Reflection Needed';
  else if (finalScore >= 45) grade = 'Excellent';
  else if (finalScore >= 30) grade = 'Very Good';
  else if (finalScore >= 15) grade = 'Good';
  else grade = 'Sufficient';

  return {
    stakeholderScores,
    finalScore,
    grade,
  };
}
