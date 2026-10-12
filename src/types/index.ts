// src/types/index.ts
// My Sheep Manager — the whole data model in one place.
// Nothing in the app writes to storage without one of these shapes.

// ─────────────────────────────────────────────────────────────
// Sheep
// ─────────────────────────────────────────────────────────────

export type SheepSex = 'ram' | 'ewe' | 'wether' | 'lamb';

export type SheepStatus = 'active' | 'sold' | 'dead' | 'culled' | 'lost';

/** Broad age/life-stage grouping used for filtering and reports. */
export type AgeGroup =
  | 'lamb'      // 0–6 months
  | 'weaner'    // 6–12 months (hogget)
  | 'yearling'  // 1–2 years
  | 'adult'     // 2+ years
  | 'aged';     // 6+ years

export type Sheep = {
  /** Stable unique id (generated on device). */
  id: string;
  /** Ear tag / eID / scrapie tag — what the farmer actually uses to identify. */
  tag: string;
  /** Optional friendly name (e.g., "Bella"). */
  name?: string;
  /** Breed — free text so farmers can type "Dorper", "Merino", "Sahiwal", etc. */
  breed: string;
  /** Sex / class. */
  sex: SheepSex;
  /** ISO date string YYYY-MM-DD. */
  dob: string;
  /** Sire (father) — reference to another Sheep.id. */
  sireId?: string;
  /** Dam (mother) — reference to another Sheep.id. */
  damId?: string;
  /** Group / mob / paddock name (e.g., "Ewe mob A", "Ram pen"). */
  group?: string;
  /** Local file URI to a photo, if any. */
  photoUri?: string;
  /** Current status. */
  status: SheepStatus;
  /** Where purchased from, if bought. */
  purchaseSource?: string;
  /** Date of purchase or birth into the flock. */
  acquisitionDate?: string;
  /** Date of exit (sale, death) — set when status changes away from 'active'. */
  exitDate?: string;
  /** Optional exit reason detail (buyer name, cause of death, etc.). */
  exitNote?: string;
  /** Free-text notes. */
  notes?: string;
  /** Epoch ms. */
  createdAt: number;
  updatedAt: number;
};

// ─────────────────────────────────────────────────────────────
// Health
// ─────────────────────────────────────────────────────────────

export type HealthEventType =
  | 'vaccine'
  | 'deworm'
  | 'treatment'
  | 'vet'
  | 'hoof'
  | 'shear'
  | 'other';

export type HealthEvent = {
  id: string;
  sheepId: string;
  /** ISO date YYYY-MM-DD. */
  date: string;
  type: HealthEventType;
  /** Product / medicine name. */
  product?: string;
  /** Dosage (free text — "5 ml", "1 tablet", etc.). */
  dose?: string;
  /**
   * Withdrawal period in days — critical for meat/wool sales.
   * If set, the app can warn before selling the animal.
   */
  withdrawalDays?: number;
  /** Person who administered (vet name, self, farmhand). */
  administeredBy?: string;
  /** Cost of the treatment. */
  cost?: number;
  /** Free-text note. */
  note?: string;
  createdAt: number;
  updatedAt: number;
};

// ─────────────────────────────────────────────────────────────
// Weight
// ─────────────────────────────────────────────────────────────

export type WeightRecord = {
  id: string;
  sheepId: string;
  /** ISO date YYYY-MM-DD. */
  date: string;
  /** Weight in kilograms. */
  weightKg: number;
  /** Optional note (e.g., "after shearing", "pre-sale"). */
  note?: string;
  createdAt: number;
};

// ─────────────────────────────────────────────────────────────
// Breeding
// ─────────────────────────────────────────────────────────────

export type BreedingScanResult = 'single' | 'multiple' | 'dry' | 'unknown';

export type BreedingEvent = {
  id: string;
  /** The ewe (mother). */
  damId: string;
  /** The ram (father). Optional — some farmers use a ram on the whole mob. */
  sireId?: string;
  /** ISO date of mating / joining. */
  matingDate: string;
  /** ISO date of ultrasound scan, if any. */
  scanDate?: string;
  scanResult?: BreedingScanResult;
  /**
   * Expected lambing date — auto-computed from matingDate
   * (sheep gestation = ~147 days). Stored so the user can override.
   */
  expectedLambingDate: string;
  /** If the ewe was successfully mated / held to the ram. */
  confirmed: boolean;
  /** Free-text note. */
  note?: string;
  createdAt: number;
  updatedAt: number;
};

// ─────────────────────────────────────────────────────────────
// Lambing
// ─────────────────────────────────────────────────────────────

export type BirthType = 'single' | 'double' | 'triple' | 'quad' | 'more';

export type LambingEase = 1 | 2 | 3 | 4 | 5; // 1 = unassisted, 5 = cesarean

export type LambRecord = {
  /** Optional — if the farmer tags the lamb immediately, we create a Sheep record. */
  sheepId?: string;
  sex: 'ram' | 'ewe' | 'unknown';
  /** Birth weight in kg. */
  birthWeightKg?: number;
  /** Was the lamb alive at birth? */
  bornAlive: boolean;
  /** Was the lamb still alive 24h later? */
  survived?: boolean;
  note?: string;
};

export type LambingRecord = {
  id: string;
  /** Ewe that gave birth. */
  damId: string;
  sireId?: string;
  /** ISO date. */
  lambingDate: string;
  birthType: BirthType;
  lambs: LambRecord[];
  /** 1–5 scale: how easily the ewe lambed. */
  ease?: LambingEase;
  /** 1–5 scale: mothering instinct. */
  mothering?: LambingEase;
  /** 1–5 scale: milk production. */
  milkiness?: LambingEase;
  /** Free-text note. */
  note?: string;
  createdAt: number;
  updatedAt: number;
};

// ─────────────────────────────────────────────────────────────
// Money (ported from Lumo Expense)
// ─────────────────────────────────────────────────────────────

export type MoneyKind = 'income' | 'expense';

export type MoneyCategory = {
  id: string;
  name: string;
  group: MoneyKind;
  emoji: string;
  color: string;
  builtin?: boolean;
};

export type MoneyRecord = {
  id: string;
  kind: MoneyKind;
  amount: number;
  categoryId: string;
  /** Optional — link a money record to a specific sheep (e.g., a sale). */
  sheepId?: string;
  note?: string;
  /** ISO date YYYY-MM-DD. */
  date: string;
  source: 'manual' | 'auto';
  createdAt: number;
  updatedAt: number;
};

// ─────────────────────────────────────────────────────────────
// Tasks / Reminders
// ─────────────────────────────────────────────────────────────

export type TaskRecurrence = 'none' | 'daily' | 'weekly' | 'monthly' | 'yearly';

export type Task = {
  id: string;
  title: string;
  /** ISO date YYYY-MM-DD. */
  dueDate: string;
  /** Optional — link to a specific sheep. */
  sheepId?: string;
  /** Optional — link to a group / mob. */
  group?: string;
  recurrence: TaskRecurrence;
  /** If recurrence !== 'none', when does it stop? Undefined = forever. */
  recurrenceEndDate?: string;
  completed: boolean;
  completedAt?: number;
  note?: string;
  createdAt: number;
  updatedAt: number;
};

// ─────────────────────────────────────────────────────────────
// Settings
// ─────────────────────────────────────────────────────────────

export type DarkModePreference = 'system' | 'light' | 'dark';

export type CurrencyCode = 'KES' | 'USD' | 'EUR' | 'GBP' | 'NGN' | 'ZAR' | 'AUD' | 'INR';

export type WeightUnit = 'kg' | 'lb';

export type Settings = {
  /** PIN lock. */
  pinHash?: string;
  pinSalt?: string;
  pinLockAfterSeconds: number;

  /** Appearance. */
  darkMode: DarkModePreference;

  /** Money. */
  currency: CurrencyCode;
  monthlyBudget?: number;
  showBalance: boolean;

  /** Farm units. */
  weightUnit: WeightUnit;

  /** Farm defaults. */
  farmName?: string;
  /** Default sire for the whole flock when logging breeding events. */
  defaultSireId?: string;

  /** Epoch ms of last recurring task check. */
  lastTaskCheck?: number;
};

export const DEFAULT_SETTINGS: Settings = {
  pinLockAfterSeconds: 0,
  darkMode: 'system',
  currency: 'KES',
  showBalance: true,
  weightUnit: 'kg',
};

// ─────────────────────────────────────────────────────────────
// UI-level derived types (not persisted)
// ─────────────────────────────────────────────────────────────

export type FlockStats = {
  total: number;
  rams: number;
  ewes: number;
  wethers: number;
  lambs: number;
  /** Animals currently active (status === 'active'). */
  active: number;
  /** Animals sold in the last 12 months. */
  soldLastYear: number;
  /** Animals that died in the last 12 months. */
  deathsLastYear: number;
};

export type MoneyTotals = {
  income: number;
  expense: number;
  net: number;
};

export type MoneyCategoryBreakdown = {
  categoryId: string;
  name: string;
  emoji: string;
  color: string;
  amount: number;
  share: number;
};

export type TimeRange = 'day' | 'week' | 'month' | 'year';

export type AgeBreakdown = {
  group: AgeGroup;
  count: number;
};

/** Pup mortality rate — key welfare metric for any sheep farm. */
export type ReproductiveStats = {
  /** Number of lambing events in the period. */
  lambings: number;
  /** Total lambs born. */
  lambsBorn: number;
  /** Lambs that survived past 24h. */
  lambsSurvived: number;
  /** Survival rate 0–1. */
  survivalRate: number;
  /** Average lambs per lambing (litter size). */
  avgLitterSize: number;
};