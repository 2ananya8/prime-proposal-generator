import {
  filterPositiveNumericText,
  formatPositiveNumericField,
  parsePositiveNumericText,
} from "@/lib/positive-numeric-input";

export type Milestone = { label: string; percent: number };

export const MILESTONE_PERCENT_MAX = 100;

export function clampMilestonePercent(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.min(MILESTONE_PERCENT_MAX, Math.max(0, value));
}

export function parseMilestonePercentText(value: string): number {
  return clampMilestonePercent(parsePositiveNumericText(filterPositiveNumericText(value)));
}

export function formatMilestonePercentField(value: unknown): string {
  return formatPositiveNumericField(clampMilestonePercent(Number(value)));
}

export function milestonePercentTotal(milestones: Milestone[]): number {
  const total = milestones.reduce((sum, m) => sum + clampMilestonePercent(m.percent), 0);
  return Math.round(total * 100) / 100;
}

export function isMilestonePercentTotalOverMax(milestones: Milestone[]): boolean {
  return milestonePercentTotal(milestones) > MILESTONE_PERCENT_MAX;
}

export function isMilestonePercentTotalValid(milestones: Milestone[]): boolean {
  return milestonePercentTotal(milestones) === MILESTONE_PERCENT_MAX;
}

export function updateMilestonePercent(
  milestones: Milestone[],
  index: number,
  raw: string,
): Milestone[] {
  const percent = parseMilestonePercentText(raw);
  return milestones.map((m, i) => (i === index ? { ...m, percent } : m));
}

export function appendMilestone(milestones: Milestone[]): Milestone[] {
  const remaining = Math.max(0, MILESTONE_PERCENT_MAX - milestonePercentTotal(milestones));
  return [...milestones, { label: "", percent: remaining }];
}
