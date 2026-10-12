// src/utils/sheep.ts
// Sheep-specific helpers: gestation math, age grouping, withdrawal tracking.

import type {
    AgeGroup,
    HealthEvent,
    Sheep,
    SheepSex,
    WeightUnit,
} from '../types';
import { addDays, fromISODate, today, toISODate } from './date';

// ─────────────────────────────────────────────────────────────
// Gestation
// ─────────────────────────────────────────────────────────────

/**
 * Average sheep gestation in days. Varies slightly by breed
 * (Merino ~150, Dorper ~145, Suffolk ~144) — 147 is the standard
 * cross-breed figure and matches most farm record apps.
 */
export const SHEEP_GESTATION_DAYS = 147;

/** Given a mating date (ISO), return the expected lambing date (ISO). */
export function expectedLambingDate(matingDate: string): string {
  return toISODate(addDays(fromISODate(matingDate), SHEEP_GESTATION_DAYS));
}

// ─────────────────────────────────────────────────────────────
// Age
// ─────────────────────────────────────────────────────────────

/**
 * Human-readable age from DOB.
 * Examples: "3 days", "2 weeks", "5 months", "1.5 years", "6 years"
 */
export function ageFromDob(dob: string): string {
  const birth = fromISODate(dob);
  const now = today();
  const diffDays = Math.floor(
    (now.getTime() - birth.getTime()) / (1000 * 60 * 60 * 24)
  );

  if (diffDays < 0) return 'Not born yet';
  if (diffDays === 0) return 'Born today';
  if (diffDays === 1) return '1 day';
  if (diffDays < 14) return `${diffDays} days`;
  if (diffDays < 60) {
    const weeks = Math.round(diffDays / 7);
    return `${weeks} week${weeks === 1 ? '' : 's'}`;
  }
  if (diffDays < 365) {
    const months = Math.round(diffDays / 30.44);
    return `${months} month${months === 1 ? '' : 's'}`;
  }

  const years = diffDays / 365.25;
  if (years < 2) {
    return `${years.toFixed(1)} years`;
  }
  return `${Math.floor(years)} years`;
}

/**
 * Broad life-stage grouping for filtering and reports.
 * Boundaries are common commercial sheep conventions.
 */
export function ageGroupFromDob(dob: string): AgeGroup {
  const birth = fromISODate(dob);
  const now = today();
  const days = Math.floor(
    (now.getTime() - birth.getTime()) / (1000 * 60 * 60 * 24)
  );

  if (days < 0) return 'lamb';           // unborn — treat as lamb for now
  if (days < 180) return 'lamb';          // 0–6 months
  if (days < 365) return 'weaner';        // 6–12 months (hogget)
  if (days < 730) return 'yearling';      // 1–2 years
  if (days < 2190) return 'adult';        // 2–6 years
  return 'aged';                          // 6+
}

/** Pretty label for age groups. */
export function ageGroupLabel(group: AgeGroup): string {
  switch (group) {
    case 'lamb':
      return 'Lambs';
    case 'weaner':
      return 'Weaners';
    case 'yearling':
      return 'Yearlings';
    case 'adult':
      return 'Adults';
    case 'aged':
      return 'Aged';
  }
}

// ─────────────────────────────────────────────────────────────
// Sex / class
// ─────────────────────────────────────────────────────────────

export function sexLabel(sex: SheepSex): string {
  switch (sex) {
    case 'ram':
      return 'Ram';
    case 'ewe':
      return 'Ewe';
    case 'wether':
      return 'Wether';
    case 'lamb':
      return 'Lamb';
  }
}

export function sexLabelPlural(sex: SheepSex): string {
  switch (sex) {
    case 'ram':
      return 'Rams';
    case 'ewe':
      return 'Ewes';
    case 'wether':
      return 'Wethers';
    case 'lamb':
      return 'Lambs';
  }
}

export function sexEmoji(sex: SheepSex): string {
  return sex === 'ram' ? '♂' : sex === 'ewe' ? '♀' : '·';
}

// ─────────────────────────────────────────────────────────────
// Weight
// ─────────────────────────────────────────────────────────────

const KG_TO_LB = 2.20462;

/** Format a weight for display, respecting the user's unit preference. */
export function formatWeight(kg: number, unit: WeightUnit = 'kg'): string {
  if (unit === 'lb') {
    return `${(kg * KG_TO_LB).toFixed(1)} lb`;
  }
  return `${kg.toFixed(1)} kg`;
}

/** Convert a value entered in the user's unit into kg for storage. */
export function toKg(value: number, unit: WeightUnit): number {
  return unit === 'lb' ? value / KG_TO_LB : value;
}

/** Convert a stored kg value into the user's unit for display/editing. */
export function fromKg(kg: number, unit: WeightUnit): number {
  return unit === 'lb' ? kg * KG_TO_LB : kg;
}

// ─────────────────────────────────────────────────────────────
// Withdrawal periods (health events)
// ─────────────────────────────────────────────────────────────

/**
 * If the event has a withdrawal period, return the ISO date on which
 * the withdrawal ends. Otherwise returns undefined.
 */
export function withdrawalEndDate(event: HealthEvent): string | undefined {
  if (!event.withdrawalDays || event.withdrawalDays <= 0) return undefined;
  return toISODate(addDays(fromISODate(event.date), event.withdrawalDays));
}

/** Is a treatment's withdrawal period still active as of today? */
export function isWithdrawalActive(event: HealthEvent): boolean {
  const end = withdrawalEndDate(event);
  if (!end) return false;
  return today() <= fromISODate(end);
}

/**
 * Given all health events for a sheep, is there ANY active withdrawal
 * period right now? Useful for gating sales — you shouldn't sell an
 * animal whose meat still has drug residue.
 */
export function hasActiveWithdrawal(events: HealthEvent[]): boolean {
  return events.some(isWithdrawalActive);
}

/** Number of days remaining in the longest active withdrawal period. */
export function daysUntilWithdrawalClears(events: HealthEvent[]): number {
  let maxDays = 0;
  const now = today();
  for (const e of events) {
    const end = withdrawalEndDate(e);
    if (!end) continue;
    const endDate = fromISODate(end);
    if (endDate < now) continue;
    const diff = Math.ceil(
      (endDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
    );
    if (diff > maxDays) maxDays = diff;
  }
  return maxDays;
}

// ─────────────────────────────────────────────────────────────
// Search / display helpers
// ─────────────────────────────────────────────────────────────

/** Build a searchable string for a sheep (tag + name + breed + group). */
export function sheepSearchKey(sheep: Sheep): string {
  return [sheep.tag, sheep.name, sheep.breed, sheep.group]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();
}

/** Display name: prefer `name`, fall back to `tag`. */
export function sheepDisplayName(sheep: Sheep): string {
  return sheep.name?.trim() || sheep.tag;
}

/** Display label with both tag and name if name exists: "Bella (#A042)". */
export function sheepFullLabel(sheep: Sheep): string {
  if (sheep.name?.trim()) {
    return `${sheep.name} (#${sheep.tag})`;
  }
  return `#${sheep.tag}`;
}