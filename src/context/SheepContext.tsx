// src/context/SheepContext.tsx
// Single source of truth for the flock, health, weights, breeding,
// lambing, tasks, money, and settings. Persists to AsyncStorage.

import AsyncStorage from '@react-native-async-storage/async-storage';
import React, {
    createContext,
    useCallback,
    useContext,
    useEffect,
    useMemo,
    useRef,
    useState,
} from 'react';

import type {
    AgeBreakdown,
    AgeGroup,
    BreedingEvent,
    FlockStats,
    HealthEvent,
    HealthEventType,
    LambingRecord,
    MoneyCategory,
    MoneyCategoryBreakdown,
    MoneyKind,
    MoneyRecord,
    MoneyTotals,
    ReproductiveStats,
    Settings,
    Sheep,
    SheepSex,
    SheepStatus,
    Task,
    TaskRecurrence,
    TimeRange,
    WeightRecord,
} from '../types';
import { DEFAULT_SETTINGS } from '../types';
import {
    addDays,
    advanceFrequency,
    fromISODate,
    isWithin,
    rangeForDay,
    rangeForMonth,
    rangeForWeek,
    rangeForYear,
    today,
    todayISO,
    toISODate,
} from '../utils/date';
import { makeId } from '../utils/id';
import {
    ageGroupFromDob,
    expectedLambingDate,
    isWithdrawalActive,
} from '../utils/sheep';

// ─────────────────────────────────────────────────────────────
// Storage keys
// ─────────────────────────────────────────────────────────────

const K = {
  sheep: '@msm/sheep',
  health: '@msm/health',
  weights: '@msm/weights',
  breeding: '@msm/breeding',
  lambing: '@msm/lambing',
  tasks: '@msm/tasks',
  money: '@msm/money',
  moneyCategories: '@msm/money_categories',
  settings: '@msm/settings',
  seeded: '@msm/seeded_v1',
} as const;

// ─────────────────────────────────────────────────────────────
// Default money categories
// ─────────────────────────────────────────────────────────────

const DEFAULT_MONEY_CATEGORIES: MoneyCategory[] = [
  // Income
  { id: 'mc_sale_lamb',   name: 'Lamb sale',        group: 'income',  emoji: '🐑', color: '#66BB6A', builtin: true },
  { id: 'mc_sale_ewe',    name: 'Ewe sale',         group: 'income',  emoji: '🐏', color: '#43A047', builtin: true },
  { id: 'mc_sale_ram',    name: 'Ram sale',         group: 'income',  emoji: '🐏', color: '#2E7D32', builtin: true },
  { id: 'mc_wool',        name: 'Wool',             group: 'income',  emoji: '🧶', color: '#8D6E63', builtin: true },
  { id: 'mc_milk',        name: 'Milk',             group: 'income',  emoji: '🥛', color: '#B0BEC5', builtin: true },
  { id: 'mc_manure',      name: 'Manure',           group: 'income',  emoji: '💩', color: '#795548', builtin: true },
  { id: 'mc_other_in',    name: 'Other income',     group: 'income',  emoji: '💰', color: '#9CCC65', builtin: true },
  // Expenses
  { id: 'mc_feed',        name: 'Feed',             group: 'expense', emoji: '🌾', color: '#FFB74D', builtin: true },
  { id: 'mc_meds',        name: 'Medicine',         group: 'expense', emoji: '💊', color: '#E57373', builtin: true },
  { id: 'mc_vet',         name: 'Vet',              group: 'expense', emoji: '🩺', color: '#BA68C8', builtin: true },
  { id: 'mc_shearing',    name: 'Shearing',         group: 'expense', emoji: '✂️', color: '#7986CB', builtin: true },
  { id: 'mc_labour',      name: 'Labour',           group: 'expense', emoji: '👷', color: '#A1887F', builtin: true },
  { id: 'mc_transport',   name: 'Transport',        group: 'expense', emoji: '🚚', color: '#64B5F6', builtin: true },
  { id: 'mc_purchase',    name: 'Stock purchase',   group: 'expense', emoji: '🐑', color: '#4DB6AC', builtin: true },
  { id: 'mc_water',       name: 'Water',            group: 'expense', emoji: '💧', color: '#4FC3F7', builtin: true },
  { id: 'mc_other_ex',    name: 'Other expense',    group: 'expense', emoji: '📦', color: '#90A4AE', builtin: true },
];

// ─────────────────────────────────────────────────────────────
// Context shape
// ─────────────────────────────────────────────────────────────

type SheepContextValue = {
  // Raw state
  sheep: Sheep[];
  healthEvents: HealthEvent[];
  weights: WeightRecord[];
  breedingEvents: BreedingEvent[];
  lambingRecords: LambingRecord[];
  tasks: Task[];
  moneyRecords: MoneyRecord[];
  moneyCategories: MoneyCategory[];
  settings: Settings;
  ready: boolean;

  // ─── Sheep ────────────────────────────────────────────────
  addSheep: (input: {
    tag: string;
    name?: string;
    breed: string;
    sex: SheepSex;
    dob: string;
    sireId?: string;
    damId?: string;
    group?: string;
    photoUri?: string;
    purchaseSource?: string;
    acquisitionDate?: string;
    notes?: string;
  }) => Promise<Sheep>;
  updateSheep: (id: string, patch: Partial<Sheep>) => Promise<void>;
  deleteSheep: (id: string) => Promise<void>;
  getSheep: (id: string) => Sheep | undefined;
  /** Active sheep only (status === 'active'). */
  activeSheep: Sheep[];
  /** Search across tag, name, breed, group. */
  searchSheep: (query: string) => Sheep[];
  /** Filter by sex, age group, or status. */
  filterSheep: (opts: {
    sex?: SheepSex;
    ageGroup?: AgeGroup;
    status?: SheepStatus;
    group?: string;
  }) => Sheep[];
  /** Distinct group names in use. */
  flockGroups: string[];
  /** Aggregate flock stats. */
  flockStats: FlockStats;
  /** Age breakdown for reports. */
  ageBreakdown: AgeBreakdown[];

  // ─── Health ───────────────────────────────────────────────
  addHealthEvent: (input: {
    sheepId: string;
    date: string;
    type: HealthEventType;
    product?: string;
    dose?: string;
    withdrawalDays?: number;
    administeredBy?: string;
    cost?: number;
    note?: string;
  }) => Promise<HealthEvent>;
  updateHealthEvent: (id: string, patch: Partial<HealthEvent>) => Promise<void>;
  deleteHealthEvent: (id: string) => Promise<void>;
  healthForSheep: (sheepId: string) => HealthEvent[];
  /** Sheep whose withdrawal period is still active right now. */
  sheepOnWithdrawal: Sheep[];

  // ─── Weights ──────────────────────────────────────────────
  addWeight: (input: {
    sheepId: string;
    date: string;
    weightKg: number;
    note?: string;
  }) => Promise<WeightRecord>;
  updateWeight: (id: string, patch: Partial<WeightRecord>) => Promise<void>;
  deleteWeight: (id: string) => Promise<void>;
  weightsForSheep: (sheepId: string) => WeightRecord[];
  /** Ordered by date ascending — for the growth chart. */
  weightSeriesForSheep: (
    sheepId: string
  ) => { date: string; weightKg: number }[];

  // ─── Breeding ─────────────────────────────────────────────
  addBreedingEvent: (input: {
    damId: string;
    sireId?: string;
    matingDate: string;
    scanDate?: string;
    scanResult?: BreedingEvent['scanResult'];
    expectedLambingDateOverride?: string;
    confirmed?: boolean;
    note?: string;
  }) => Promise<BreedingEvent>;
  updateBreedingEvent: (
    id: string,
    patch: Partial<BreedingEvent>
  ) => Promise<void>;
  deleteBreedingEvent: (id: string) => Promise<void>;
  breedingForDam: (damId: string) => BreedingEvent[];
  /** Breeding events whose expected lambing is within the next N days. */
  upcomingLambings: (withinDays?: number) => BreedingEvent[];

  // ─── Lambing ──────────────────────────────────────────────
  addLambing: (input: {
    damId: string;
    sireId?: string;
    lambingDate: string;
    birthType: LambingRecord['birthType'];
    lambs: LambingRecord['lambs'];
    ease?: LambingRecord['ease'];
    mothering?: LambingRecord['mothering'];
    milkiness?: LambingRecord['milkiness'];
    note?: string;
  }) => Promise<LambingRecord>;
  updateLambing: (id: string, patch: Partial<LambingRecord>) => Promise<void>;
  deleteLambing: (id: string) => Promise<void>;
  lambingsForDam: (damId: string) => LambingRecord[];
  /** Reproductive stats over a period. */
  reproductiveStats: (range: TimeRange) => ReproductiveStats;

  // ─── Tasks ────────────────────────────────────────────────
  addTask: (input: {
    title: string;
    dueDate: string;
    sheepId?: string;
    group?: string;
    recurrence?: TaskRecurrence;
    recurrenceEndDate?: string;
    note?: string;
  }) => Promise<Task>;
  updateTask: (id: string, patch: Partial<Task>) => Promise<void>;
  deleteTask: (id: string) => Promise<void>;
  toggleTaskComplete: (id: string) => Promise<void>;
  /** Tasks due today or overdue, not completed. */
  dueTasks: Task[];
  /** Tasks due within the next N days, not completed. */
  tasksDueWithin: (days: number) => Task[];
  /** Materialize due recurring tasks (called on boot). */
  runDueTaskRecurrence: () => Promise<number>;

  // ─── Money ────────────────────────────────────────────────
  addMoneyRecord: (input: {
    kind: MoneyKind;
    amount: number;
    categoryId: string;
    date: string;
    sheepId?: string;
    note?: string;
  }) => Promise<MoneyRecord>;
  updateMoneyRecord: (
    id: string,
    patch: Partial<MoneyRecord>
  ) => Promise<void>;
  deleteMoneyRecord: (id: string) => Promise<void>;
  addMoneyCategory: (input: {
    name: string;
    group: MoneyKind;
    emoji: string;
    color: string;
  }) => Promise<MoneyCategory>;
  updateMoneyCategory: (
    id: string,
    patch: Partial<MoneyCategory>
  ) => Promise<void>;
  deleteMoneyCategory: (id: string) => Promise<void>;
  getMoneyCategory: (id: string) => MoneyCategory | undefined;
  moneyTotalsForRange: (range: TimeRange) => MoneyTotals;
  moneyInRange: (range: TimeRange) => MoneyRecord[];
  moneyBreakdownForRange: (
    range: TimeRange,
    group: MoneyKind
  ) => MoneyCategoryBreakdown[];

  // ─── Settings ─────────────────────────────────────────────
  updateSettings: (patch: Partial<Settings>) => Promise<void>;

  // ─── Danger zone ──────────────────────────────────────────
  wipeAllData: () => Promise<void>;
};

const SheepContext = createContext<SheepContextValue | undefined>(undefined);

// ─────────────────────────────────────────────────────────────
// Provider
// ─────────────────────────────────────────────────────────────

export const SheepProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [sheep, setSheep] = useState<Sheep[]>([]);
  const [healthEvents, setHealthEvents] = useState<HealthEvent[]>([]);
  const [weights, setWeights] = useState<WeightRecord[]>([]);
  const [breedingEvents, setBreedingEvents] = useState<BreedingEvent[]>([]);
  const [lambingRecords, setLambingRecords] = useState<LambingRecord[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [moneyRecords, setMoneyRecords] = useState<MoneyRecord[]>([]);
  const [moneyCategories, setMoneyCategories] = useState<MoneyCategory[]>([]);
  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS);
  const [ready, setReady] = useState(false);

  const hydrated = useRef(false);

  // ─── Boot ──────────────────────────────────────────────────
  useEffect(() => {
    (async () => {
      try {
        const [
          rawSheep,
          rawHealth,
          rawWeights,
          rawBreeding,
          rawLambing,
          rawTasks,
          rawMoney,
          rawMoneyCats,
          rawSettings,
          rawSeeded,
        ] = await Promise.all([
          AsyncStorage.getItem(K.sheep),
          AsyncStorage.getItem(K.health),
          AsyncStorage.getItem(K.weights),
          AsyncStorage.getItem(K.breeding),
          AsyncStorage.getItem(K.lambing),
          AsyncStorage.getItem(K.tasks),
          AsyncStorage.getItem(K.money),
          AsyncStorage.getItem(K.moneyCategories),
          AsyncStorage.getItem(K.settings),
          AsyncStorage.getItem(K.seeded),
        ]);

        const parsedSheep: Sheep[] = rawSheep ? JSON.parse(rawSheep) : [];
        const parsedHealth: HealthEvent[] = rawHealth
          ? JSON.parse(rawHealth)
          : [];
        const parsedWeights: WeightRecord[] = rawWeights
          ? JSON.parse(rawWeights)
          : [];
        const parsedBreeding: BreedingEvent[] = rawBreeding
          ? JSON.parse(rawBreeding)
          : [];
        const parsedLambing: LambingRecord[] = rawLambing
          ? JSON.parse(rawLambing)
          : [];
        const parsedTasks: Task[] = rawTasks ? JSON.parse(rawTasks) : [];
        const parsedMoney: MoneyRecord[] = rawMoney ? JSON.parse(rawMoney) : [];
        const parsedMoneyCats: MoneyCategory[] = rawMoneyCats
          ? JSON.parse(rawMoneyCats)
          : [];
        const parsedSettings: Settings = rawSettings
          ? { ...DEFAULT_SETTINGS, ...JSON.parse(rawSettings) }
          : DEFAULT_SETTINGS;

        let cats = parsedMoneyCats;
        if (!rawSeeded) {
          cats = DEFAULT_MONEY_CATEGORIES;
          await AsyncStorage.setItem(
            K.moneyCategories,
            JSON.stringify(cats)
          );
          await AsyncStorage.setItem(K.seeded, '1');
        }

        setSheep(parsedSheep);
        setHealthEvents(parsedHealth);
        setWeights(parsedWeights);
        setBreedingEvents(parsedBreeding);
        setLambingRecords(parsedLambing);
        setTasks(parsedTasks);
        setMoneyRecords(parsedMoney);
        setMoneyCategories(cats);
        setSettings(parsedSettings);
      } catch (e) {
        console.warn('[My Sheep Manager] load failed, resetting', e);
        setMoneyCategories(DEFAULT_MONEY_CATEGORIES);
        await AsyncStorage.setItem(
          K.moneyCategories,
          JSON.stringify(DEFAULT_MONEY_CATEGORIES)
        );
      } finally {
        hydrated.current = true;
        setReady(true);
      }
    })();
  }, []);

  // ─── Persistence helpers ───────────────────────────────────
  const persist = useCallback(async (key: string, value: unknown) => {
    if (!hydrated.current) return;
    try {
      await AsyncStorage.setItem(key, JSON.stringify(value));
    } catch (e) {
      console.warn(`[My Sheep Manager] persist ${key} failed`, e);
    }
  }, []);

  // ─── Sheep ─────────────────────────────────────────────────
  const addSheep = useCallback<SheepContextValue['addSheep']>(
    async (input) => {
      const now = Date.now();
      const s: Sheep = {
        id: makeId('sheep'),
        tag: input.tag.trim(),
        name: input.name?.trim() || undefined,
        breed: input.breed.trim(),
        sex: input.sex,
        dob: input.dob,
        sireId: input.sireId,
        damId: input.damId,
        group: input.group?.trim() || undefined,
        photoUri: input.photoUri,
        status: 'active',
        purchaseSource: input.purchaseSource?.trim() || undefined,
        acquisitionDate: input.acquisitionDate,
        notes: input.notes?.trim() || undefined,
        createdAt: now,
        updatedAt: now,
      };
      setSheep((prev) => {
        const next = [s, ...prev];
        persist(K.sheep, next);
        return next;
      });
      return s;
    },
    [persist]
  );

  const updateSheep = useCallback<SheepContextValue['updateSheep']>(
    async (id, patch) => {
      setSheep((prev) => {
        const next = prev.map((s) =>
          s.id === id ? { ...s, ...patch, updatedAt: Date.now() } : s
        );
        persist(K.sheep, next);
        return next;
      });
    },
    [persist]
  );

  const deleteSheep = useCallback<SheepContextValue['deleteSheep']>(
    async (id) => {
      // Cascade: remove all related records
      setSheep((prev) => {
        const next = prev.filter((s) => s.id !== id);
        persist(K.sheep, next);
        return next;
      });
      setHealthEvents((prev) => {
        const next = prev.filter((h) => h.sheepId !== id);
        persist(K.health, next);
        return next;
      });
      setWeights((prev) => {
        const next = prev.filter((w) => w.sheepId !== id);
        persist(K.weights, next);
        return next;
      });
      setBreedingEvents((prev) => {
        const next = prev.filter(
          (b) => b.damId !== id && b.sireId !== id
        );
        persist(K.breeding, next);
        return next;
      });
      setLambingRecords((prev) => {
        const next = prev.filter(
          (l) => l.damId !== id && l.sireId !== id
        );
        persist(K.lambing, next);
        return next;
      });
    },
    [persist]
  );

  const getSheep = useCallback<SheepContextValue['getSheep']>(
    (id) => sheep.find((s) => s.id === id),
    [sheep]
  );

  const activeSheep = useMemo(
    () => sheep.filter((s) => s.status === 'active'),
    [sheep]
  );

  const searchSheep = useCallback<SheepContextValue['searchSheep']>(
    (query) => {
      const q = query.trim().toLowerCase();
      if (!q) return activeSheep;
      return activeSheep.filter((s) =>
        [s.tag, s.name, s.breed, s.group]
          .filter(Boolean)
          .join(' ')
          .toLowerCase()
          .includes(q)
      );
    },
    [activeSheep]
  );

  const filterSheep = useCallback<SheepContextValue['filterSheep']>(
    (opts) => {
      const base = opts.status
        ? sheep.filter((s) => s.status === opts.status)
        : activeSheep;
      return base.filter((s) => {
        if (opts.sex && s.sex !== opts.sex) return false;
        if (opts.group && s.group !== opts.group) return false;
        if (opts.ageGroup && ageGroupFromDob(s.dob) !== opts.ageGroup)
          return false;
        return true;
      });
    },
    [sheep, activeSheep]
  );

  const flockGroups = useMemo(() => {
    const set = new Set<string>();
    for (const s of activeSheep) {
      if (s.group) set.add(s.group);
    }
    return Array.from(set).sort();
  }, [activeSheep]);

  const flockStats = useMemo<FlockStats>(() => {
    let rams = 0;
    let ewes = 0;
    let wethers = 0;
    let lambs = 0;
    for (const s of activeSheep) {
      if (s.sex === 'ram') rams++;
      else if (s.sex === 'ewe') ewes++;
      else if (s.sex === 'wether') wethers++;
      else lambs++;
    }
    const oneYearAgo = addDays(today(), -365);
    const soldLastYear = sheep.filter(
      (s) =>
        s.status === 'sold' &&
        s.exitDate &&
        fromISODate(s.exitDate) >= oneYearAgo
    ).length;
    const deathsLastYear = sheep.filter(
      (s) =>
        s.status === 'dead' &&
        s.exitDate &&
        fromISODate(s.exitDate) >= oneYearAgo
    ).length;

    return {
      total: activeSheep.length,
      rams,
      ewes,
      wethers,
      lambs,
      active: activeSheep.length,
      soldLastYear,
      deathsLastYear,
    };
  }, [activeSheep, sheep]);

  const ageBreakdown = useMemo<AgeBreakdown[]>(() => {
    const map: Record<AgeGroup, number> = {
      lamb: 0,
      weaner: 0,
      yearling: 0,
      adult: 0,
      aged: 0,
    };
    for (const s of activeSheep) {
      map[ageGroupFromDob(s.dob)] += 1;
    }
    return (Object.keys(map) as AgeGroup[]).map((group) => ({
      group,
      count: map[group],
    }));
  }, [activeSheep]);

  // ─── Health ────────────────────────────────────────────────
  const addHealthEvent = useCallback<SheepContextValue['addHealthEvent']>(
    async (input) => {
      const now = Date.now();
      const h: HealthEvent = {
        id: makeId('health'),
        sheepId: input.sheepId,
        date: input.date,
        type: input.type,
        product: input.product?.trim() || undefined,
        dose: input.dose?.trim() || undefined,
        withdrawalDays: input.withdrawalDays,
        administeredBy: input.administeredBy?.trim() || undefined,
        cost: input.cost,
        note: input.note?.trim() || undefined,
        createdAt: now,
        updatedAt: now,
      };
      setHealthEvents((prev) => {
        const next = [h, ...prev];
        persist(K.health, next);
        return next;
      });
      return h;
    },
    [persist]
  );

  const updateHealthEvent = useCallback<
    SheepContextValue['updateHealthEvent']
  >(
    async (id, patch) => {
      setHealthEvents((prev) => {
        const next = prev.map((h) =>
          h.id === id ? { ...h, ...patch, updatedAt: Date.now() } : h
        );
        persist(K.health, next);
        return next;
      });
    },
    [persist]
  );

  const deleteHealthEvent = useCallback<
    SheepContextValue['deleteHealthEvent']
  >(
    async (id) => {
      setHealthEvents((prev) => {
        const next = prev.filter((h) => h.id !== id);
        persist(K.health, next);
        return next;
      });
    },
    [persist]
  );

  const healthForSheep = useCallback<SheepContextValue['healthForSheep']>(
    (sheepId) =>
      healthEvents
        .filter((h) => h.sheepId === sheepId)
        .sort((a, b) => (a.date < b.date ? 1 : -1)),
    [healthEvents]
  );

  const sheepOnWithdrawal = useMemo(() => {
    return activeSheep.filter((s) =>
      healthEvents.some((h) => h.sheepId === s.id && isWithdrawalActive(h))
    );
  }, [activeSheep, healthEvents]);

  // ─── Weights ───────────────────────────────────────────────
  const addWeight = useCallback<SheepContextValue['addWeight']>(
    async (input) => {
      const w: WeightRecord = {
        id: makeId('weight'),
        sheepId: input.sheepId,
        date: input.date,
        weightKg: input.weightKg,
        note: input.note?.trim() || undefined,
        createdAt: Date.now(),
      };
      setWeights((prev) => {
        const next = [w, ...prev];
        persist(K.weights, next);
        return next;
      });
      return w;
    },
    [persist]
  );

  const updateWeight = useCallback<SheepContextValue['updateWeight']>(
    async (id, patch) => {
      setWeights((prev) => {
        const next = prev.map((w) => (w.id === id ? { ...w, ...patch } : w));
        persist(K.weights, next);
        return next;
      });
    },
    [persist]
  );

  const deleteWeight = useCallback<SheepContextValue['deleteWeight']>(
    async (id) => {
      setWeights((prev) => {
        const next = prev.filter((w) => w.id !== id);
        persist(K.weights, next);
        return next;
      });
    },
    [persist]
  );

  const weightsForSheep = useCallback<SheepContextValue['weightsForSheep']>(
    (sheepId) =>
      weights
        .filter((w) => w.sheepId === sheepId)
        .sort((a, b) => (a.date < b.date ? 1 : -1)),
    [weights]
  );

  const weightSeriesForSheep = useCallback<
    SheepContextValue['weightSeriesForSheep']
  >(
    (sheepId) =>
      weights
        .filter((w) => w.sheepId === sheepId)
        .sort((a, b) => (a.date < b.date ? -1 : 1))
        .map((w) => ({ date: w.date, weightKg: w.weightKg })),
    [weights]
  );

  // ─── Breeding ──────────────────────────────────────────────
  const addBreedingEvent = useCallback<
    SheepContextValue['addBreedingEvent']
  >(
    async (input) => {
      const now = Date.now();
      const b: BreedingEvent = {
        id: makeId('breed'),
        damId: input.damId,
        sireId: input.sireId,
        matingDate: input.matingDate,
        scanDate: input.scanDate,
        scanResult: input.scanResult ?? 'unknown',
        expectedLambingDate:
          input.expectedLambingDateOverride ??
          expectedLambingDate(input.matingDate),
        confirmed: input.confirmed ?? false,
        note: input.note?.trim() || undefined,
        createdAt: now,
        updatedAt: now,
      };
      setBreedingEvents((prev) => {
        const next = [b, ...prev];
        persist(K.breeding, next);
        return next;
      });
      return b;
    },
    [persist]
  );

  const updateBreedingEvent = useCallback<
    SheepContextValue['updateBreedingEvent']
  >(
    async (id, patch) => {
      setBreedingEvents((prev) => {
        const next = prev.map((b) => {
          if (b.id !== id) return b;
          const merged = { ...b, ...patch, updatedAt: Date.now() };
          // If matingDate changed and expectedLambingDate wasn't explicitly
          // patched, recompute it.
          if (patch.matingDate && !patch.expectedLambingDate) {
            merged.expectedLambingDate = expectedLambingDate(
              patch.matingDate
            );
          }
          return merged;
        });
        persist(K.breeding, next);
        return next;
      });
    },
    [persist]
  );

  const deleteBreedingEvent = useCallback<
    SheepContextValue['deleteBreedingEvent']
  >(
    async (id) => {
      setBreedingEvents((prev) => {
        const next = prev.filter((b) => b.id !== id);
        persist(K.breeding, next);
        return next;
      });
    },
    [persist]
  );

  const breedingForDam = useCallback<SheepContextValue['breedingForDam']>(
    (damId) =>
      breedingEvents
        .filter((b) => b.damId === damId)
        .sort((a, b) => (a.matingDate < b.matingDate ? 1 : -1)),
    [breedingEvents]
  );

  const upcomingLambings = useCallback<
    SheepContextValue['upcomingLambings']
  >(
    (withinDays = 60) => {
      const now = today();
      const cutoff = addDays(now, withinDays);
      return breedingEvents
        .filter((b) => {
          const due = fromISODate(b.expectedLambingDate);
          return due >= now && due <= cutoff;
        })
        .sort((a, b) =>
          a.expectedLambingDate < b.expectedLambingDate ? -1 : 1
        );
    },
    [breedingEvents]
  );

  // ─── Lambing ───────────────────────────────────────────────
  const addLambing = useCallback<SheepContextValue['addLambing']>(
    async (input) => {
      const now = Date.now();
      const l: LambingRecord = {
        id: makeId('lambing'),
        damId: input.damId,
        sireId: input.sireId,
        lambingDate: input.lambingDate,
        birthType: input.birthType,
        lambs: input.lambs,
        ease: input.ease,
        mothering: input.mothering,
        milkiness: input.milkiness,
        note: input.note?.trim() || undefined,
        createdAt: now,
        updatedAt: now,
      };
      setLambingRecords((prev) => {
        const next = [l, ...prev];
        persist(K.lambing, next);
        return next;
      });
      return l;
    },
    [persist]
  );

  const updateLambing = useCallback<SheepContextValue['updateLambing']>(
    async (id, patch) => {
      setLambingRecords((prev) => {
        const next = prev.map((l) =>
          l.id === id ? { ...l, ...patch, updatedAt: Date.now() } : l
        );
        persist(K.lambing, next);
        return next;
      });
    },
    [persist]
  );

  const deleteLambing = useCallback<SheepContextValue['deleteLambing']>(
    async (id) => {
      setLambingRecords((prev) => {
        const next = prev.filter((l) => l.id !== id);
        persist(K.lambing, next);
        return next;
      });
    },
    [persist]
  );

  const lambingsForDam = useCallback<SheepContextValue['lambingsForDam']>(
    (damId) =>
      lambingRecords
        .filter((l) => l.damId === damId)
        .sort((a, b) => (a.lambingDate < b.lambingDate ? 1 : -1)),
    [lambingRecords]
  );

  const reproductiveStats = useCallback<
    SheepContextValue['reproductiveStats']
  >(
    (range) => {
      const r = rangeFor(range);
      const inRange = lambingRecords.filter((l) =>
        isWithin(l.lambingDate, r)
      );
      let lambsBorn = 0;
      let lambsSurvived = 0;
      for (const l of inRange) {
        for (const lamb of l.lambs) {
          if (lamb.bornAlive) lambsBorn += 1;
          if (lamb.bornAlive && lamb.survived !== false) lambsSurvived += 1;
        }
      }
      const lambings = inRange.length;
      return {
        lambings,
        lambsBorn,
        lambsSurvived,
        survivalRate: lambsBorn > 0 ? lambsSurvived / lambsBorn : 0,
        avgLitterSize: lambings > 0 ? lambsBorn / lambings : 0,
      };
    },
    [lambingRecords]
  );

  // ─── Tasks ─────────────────────────────────────────────────
  const addTask = useCallback<SheepContextValue['addTask']>(
    async (input) => {
      const now = Date.now();
      const t: Task = {
        id: makeId('task'),
        title: input.title.trim(),
        dueDate: input.dueDate,
        sheepId: input.sheepId,
        group: input.group?.trim() || undefined,
        recurrence: input.recurrence ?? 'none',
        recurrenceEndDate: input.recurrenceEndDate,
        completed: false,
        note: input.note?.trim() || undefined,
        createdAt: now,
        updatedAt: now,
      };
      setTasks((prev) => {
        const next = [t, ...prev];
        persist(K.tasks, next);
        return next;
      });
      return t;
    },
    [persist]
  );

  const updateTask = useCallback<SheepContextValue['updateTask']>(
    async (id, patch) => {
      setTasks((prev) => {
        const next = prev.map((t) =>
          t.id === id ? { ...t, ...patch, updatedAt: Date.now() } : t
        );
        persist(K.tasks, next);
        return next;
      });
    },
    [persist]
  );

  const deleteTask = useCallback<SheepContextValue['deleteTask']>(
    async (id) => {
      setTasks((prev) => {
        const next = prev.filter((t) => t.id !== id);
        persist(K.tasks, next);
        return next;
      });
    },
    [persist]
  );

  const toggleTaskComplete = useCallback<
    SheepContextValue['toggleTaskComplete']
  >(
    async (id) => {
      setTasks((prev) => {
        const next = prev.map((t) =>
          t.id === id
            ? {
                ...t,
                completed: !t.completed,
                completedAt: !t.completed ? Date.now() : undefined,
                updatedAt: Date.now(),
              }
            : t
        );
        persist(K.tasks, next);
        return next;
      });
    },
    [persist]
  );

  const dueTasks = useMemo(() => {
    const todayStr = todayISO();
    return tasks
      .filter((t) => !t.completed && t.dueDate <= todayStr)
      .sort((a, b) => (a.dueDate < b.dueDate ? -1 : 1));
  }, [tasks]);

  const tasksDueWithin = useCallback<SheepContextValue['tasksDueWithin']>(
    (days) => {
      const todayStr = todayISO();
      const cutoff = toISODate(addDays(today(), days));
      return tasks
        .filter(
          (t) => !t.completed && t.dueDate >= todayStr && t.dueDate <= cutoff
        )
        .sort((a, b) => (a.dueDate < b.dueDate ? -1 : 1));
    },
    [tasks]
  );

  /**
   * For each recurring task whose due date has passed, advance its
   * dueDate forward one interval at a time until it's in the future.
   * Called on app boot.
   */
  const runDueTaskRecurrence = useCallback<
    SheepContextValue['runDueTaskRecurrence']
  >(async () => {
    const todayStr = todayISO();
    let changed = 0;
    const updated = tasks.map((t) => {
      if (t.recurrence === 'none') return t;
      if (t.completed) return t;
      if (t.dueDate >= todayStr) return t;
      let cursor = t.dueDate;
      let safety = 0;
      while (cursor < todayStr && safety < 400) {
        cursor = advanceFrequency(cursor, t.recurrence);
        safety += 1;
      }
      if (t.recurrenceEndDate && cursor > t.recurrenceEndDate) {
        return { ...t, completed: true, completedAt: Date.now() };
      }
      changed += 1;
      return { ...t, dueDate: cursor, updatedAt: Date.now() };
    });
    if (changed > 0) {
      setTasks(updated);
      persist(K.tasks, updated);
    }
    setSettings((prev) => {
      const next = { ...prev, lastTaskCheck: Date.now() };
      persist(K.settings, next);
      return next;
    });
    return changed;
  }, [tasks, persist]);

  // ─── Money ─────────────────────────────────────────────────
  const addMoneyRecord = useCallback<SheepContextValue['addMoneyRecord']>(
    async (input) => {
      const now = Date.now();
      const m: MoneyRecord = {
        id: makeId('money'),
        kind: input.kind,
        amount: input.amount,
        categoryId: input.categoryId,
        sheepId: input.sheepId,
        note: input.note?.trim() || undefined,
        date: input.date,
        source: 'manual',
        createdAt: now,
        updatedAt: now,
      };
      setMoneyRecords((prev) => {
        const next = [m, ...prev];
        persist(K.money, next);
        return next;
      });
      return m;
    },
    [persist]
  );

  const updateMoneyRecord = useCallback<
    SheepContextValue['updateMoneyRecord']
  >(
    async (id, patch) => {
      setMoneyRecords((prev) => {
        const next = prev.map((m) =>
          m.id === id ? { ...m, ...patch, updatedAt: Date.now() } : m
        );
        persist(K.money, next);
        return next;
      });
    },
    [persist]
  );

  const deleteMoneyRecord = useCallback<
    SheepContextValue['deleteMoneyRecord']
  >(
    async (id) => {
      setMoneyRecords((prev) => {
        const next = prev.filter((m) => m.id !== id);
        persist(K.money, next);
        return next;
      });
    },
    [persist]
  );

  const addMoneyCategory = useCallback<
    SheepContextValue['addMoneyCategory']
  >(
    async (input) => {
      const c: MoneyCategory = {
        id: makeId('mc'),
        name: input.name.trim(),
        group: input.group,
        emoji: input.emoji || '🏷️',
        color: input.color || '#90A4AE',
      };
      setMoneyCategories((prev) => {
        const next = [...prev, c];
        persist(K.moneyCategories, next);
        return next;
      });
      return c;
    },
    [persist]
  );

  const updateMoneyCategory = useCallback<
    SheepContextValue['updateMoneyCategory']
  >(
    async (id, patch) => {
      setMoneyCategories((prev) => {
        const next = prev.map((c) => (c.id === id ? { ...c, ...patch } : c));
        persist(K.moneyCategories, next);
        return next;
      });
    },
    [persist]
  );

  const deleteMoneyCategory = useCallback<
    SheepContextValue['deleteMoneyCategory']
  >(
    async (id) => {
      setMoneyCategories((prev) => {
        const next = prev.filter((c) => c.id !== id);
        persist(K.moneyCategories, next);
        return next;
      });
    },
    [persist]
  );

  const getMoneyCategory = useCallback<
    SheepContextValue['getMoneyCategory']
  >((id) => moneyCategories.find((c) => c.id === id), [moneyCategories]);

  const rangeFor = useCallback((kind: TimeRange) => {
    const t = today();
    if (kind === 'day') return rangeForDay(t);
    if (kind === 'week') return rangeForWeek(t);
    if (kind === 'month') return rangeForMonth(t);
    return rangeForYear(t);
  }, []);

  const moneyInRange = useCallback<SheepContextValue['moneyInRange']>(
    (range) => {
      const r = rangeFor(range);
      return moneyRecords.filter((m) => isWithin(m.date, r));
    },
    [moneyRecords, rangeFor]
  );

  const moneyTotalsForRange = useCallback<
    SheepContextValue['moneyTotalsForRange']
  >(
    (range) => {
      const list = moneyInRange(range);
      let income = 0;
      let expense = 0;
      for (const m of list) {
        if (m.kind === 'income') income += m.amount;
        else expense += m.amount;
      }
      return { income, expense, net: income - expense };
    },
    [moneyInRange]
  );

  const moneyBreakdownForRange = useCallback<
    SheepContextValue['moneyBreakdownForRange']
  >(
    (range, group) => {
      const list = moneyInRange(range).filter((m) => m.kind === group);
      const byCat = new Map<string, number>();
      for (const m of list) {
        byCat.set(m.categoryId, (byCat.get(m.categoryId) ?? 0) + m.amount);
      }
      const total = Array.from(byCat.values()).reduce((a, b) => a + b, 0);
      const items: MoneyCategoryBreakdown[] = [];
      for (const [categoryId, amount] of byCat) {
        const cat = moneyCategories.find((c) => c.id === categoryId);
        items.push({
          categoryId,
          name: cat?.name ?? 'Unknown',
          emoji: cat?.emoji ?? '❓',
          color: cat?.color ?? '#90A4AE',
          amount,
          share: total > 0 ? amount / total : 0,
        });
      }
      items.sort((a, b) => b.amount - a.amount);
      return items;
    },
    [moneyInRange, moneyCategories]
  );

  // ─── Settings ──────────────────────────────────────────────
  const updateSettings = useCallback<SheepContextValue['updateSettings']>(
    async (patch) => {
      setSettings((prev) => {
        const next = { ...prev, ...patch };
        persist(K.settings, next);
        return next;
      });
    },
    [persist]
  );

  // ─── Danger zone ───────────────────────────────────────────
  const wipeAllData = useCallback(async () => {
    await AsyncStorage.multiRemove([
      K.sheep,
      K.health,
      K.weights,
      K.breeding,
      K.lambing,
      K.tasks,
      K.money,
      K.moneyCategories,
      K.settings,
      K.seeded,
    ]);
    setSheep([]);
    setHealthEvents([]);
    setWeights([]);
    setBreedingEvents([]);
    setLambingRecords([]);
    setTasks([]);
    setMoneyRecords([]);
    setMoneyCategories(DEFAULT_MONEY_CATEGORIES);
    setSettings(DEFAULT_SETTINGS);
    await AsyncStorage.setItem(
      K.moneyCategories,
      JSON.stringify(DEFAULT_MONEY_CATEGORIES)
    );
    await AsyncStorage.setItem(K.seeded, '1');
  }, []);

  // ─── Value ─────────────────────────────────────────────────
  const value = useMemo<SheepContextValue>(
    () => ({
      sheep,
      healthEvents,
      weights,
      breedingEvents,
      lambingRecords,
      tasks,
      moneyRecords,
      moneyCategories,
      settings,
      ready,

      addSheep,
      updateSheep,
      deleteSheep,
      getSheep,
      activeSheep,
      searchSheep,
      filterSheep,
      flockGroups,
      flockStats,
      ageBreakdown,

      addHealthEvent,
      updateHealthEvent,
      deleteHealthEvent,
      healthForSheep,
      sheepOnWithdrawal,

      addWeight,
      updateWeight,
      deleteWeight,
      weightsForSheep,
      weightSeriesForSheep,

      addBreedingEvent,
      updateBreedingEvent,
      deleteBreedingEvent,
      breedingForDam,
      upcomingLambings,

      addLambing,
      updateLambing,
      deleteLambing,
      lambingsForDam,
      reproductiveStats,

      addTask,
      updateTask,
      deleteTask,
      toggleTaskComplete,
      dueTasks,
      tasksDueWithin,
      runDueTaskRecurrence,

      addMoneyRecord,
      updateMoneyRecord,
      deleteMoneyRecord,
      addMoneyCategory,
      updateMoneyCategory,
      deleteMoneyCategory,
      getMoneyCategory,
      moneyTotalsForRange,
      moneyInRange,
      moneyBreakdownForRange,

      updateSettings,

      wipeAllData,
    }),
    [
      sheep,
      healthEvents,
      weights,
      breedingEvents,
      lambingRecords,
      tasks,
      moneyRecords,
      moneyCategories,
      settings,
      ready,
      addSheep,
      updateSheep,
      deleteSheep,
      getSheep,
      activeSheep,
      searchSheep,
      filterSheep,
      flockGroups,
      flockStats,
      ageBreakdown,
      addHealthEvent,
      updateHealthEvent,
      deleteHealthEvent,
      healthForSheep,
      sheepOnWithdrawal,
      addWeight,
      updateWeight,
      deleteWeight,
      weightsForSheep,
      weightSeriesForSheep,
      addBreedingEvent,
      updateBreedingEvent,
      deleteBreedingEvent,
      breedingForDam,
      upcomingLambings,
      addLambing,
      updateLambing,
      deleteLambing,
      lambingsForDam,
      reproductiveStats,
      addTask,
      updateTask,
      deleteTask,
      toggleTaskComplete,
      dueTasks,
      tasksDueWithin,
      runDueTaskRecurrence,
      addMoneyRecord,
      updateMoneyRecord,
      deleteMoneyRecord,
      addMoneyCategory,
      updateMoneyCategory,
      deleteMoneyCategory,
      getMoneyCategory,
      moneyTotalsForRange,
      moneyInRange,
      moneyBreakdownForRange,
      updateSettings,
      wipeAllData,
    ]
  );

  return (
    <SheepContext.Provider value={value}>{children}</SheepContext.Provider>
  );
};

// ─────────────────────────────────────────────────────────────
// Hook
// ─────────────────────────────────────────────────────────────

export const useSheep = (): SheepContextValue => {
  const ctx = useContext(SheepContext);
  if (!ctx) {
    throw new Error('useSheep must be used inside <SheepProvider>');
  }
  return ctx;
};