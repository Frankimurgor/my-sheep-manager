// src/utils/csv.ts
// CSV export for My Sheep Manager — flock, health, weights, breeding,
// lambing, and money, all concatenated into one file.

import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';

import type {
    BreedingEvent,
    HealthEvent,
    LambingRecord,
    MoneyCategory,
    MoneyRecord,
    Sheep,
    WeightRecord,
} from '../types';

// ─── CSV helpers ────────────────────────────────────────────

function escapeCsv(value: string): string {
  const needsQuotes = /[",\n\r]/.test(value);
  const escaped = value.replace(/"/g, '""');
  return needsQuotes ? `"${escaped}"` : escaped;
}

function cell(v: string | number | undefined | null): string {
  if (v === undefined || v === null) return '';
  return escapeCsv(String(v));
}

function row(cells: (string | number | undefined)[]): string {
  return cells.map(cell).join(',');
}

function section(title: string, header: string[], rows: string[]): string {
  return [
    `### ${title}`,
    header.join(','),
    ...rows,
    '',
  ].join('\r\n');
}

// ─── Builder ────────────────────────────────────────────────

export function buildFlockCsv(
  sheep: Sheep[],
  health: HealthEvent[],
  weights: WeightRecord[],
  breeding: BreedingEvent[],
  lambing: LambingRecord[],
  money: MoneyRecord[],
  categories: MoneyCategory[]
): string {
  const sheepById = new Map(sheep.map((s) => [s.id, s]));
  const catById = new Map(categories.map((c) => [c.id, c]));
  const sheepTag = (id?: string) => {
    if (!id) return '';
    const s = sheepById.get(id);
    return s ? `#${s.tag}` : '';
  };

  // ─── Sheep ──────────────────────────────────────────────
  const sheepRows = [...sheep]
    .sort((a, b) => a.tag.localeCompare(b.tag))
    .map((s) =>
      row([
        s.tag,
        s.name ?? '',
        s.breed,
        s.sex,
        s.dob,
        s.group ?? '',
        sheepTag(s.sireId),
        sheepTag(s.damId),
        s.status,
        s.purchaseSource ?? '',
        s.acquisitionDate ?? '',
        s.exitDate ?? '',
        s.notes ?? '',
      ])
    );

  // ─── Health ─────────────────────────────────────────────
  const healthRows = [...health]
    .sort((a, b) => (a.date < b.date ? 1 : -1))
    .map((h) =>
      row([
        h.date,
        sheepTag(h.sheepId),
        h.type,
        h.product ?? '',
        h.dose ?? '',
        h.withdrawalDays ?? '',
        h.administeredBy ?? '',
        h.cost ?? '',
        h.note ?? '',
      ])
    );

  // ─── Weights ────────────────────────────────────────────
  const weightRows = [...weights]
    .sort((a, b) => (a.date < b.date ? 1 : -1))
    .map((w) => row([w.date, sheepTag(w.sheepId), w.weightKg.toFixed(2), w.note ?? '']));

  // ─── Breeding ───────────────────────────────────────────
  const breedingRows = [...breeding]
    .sort((a, b) => (a.matingDate < b.matingDate ? 1 : -1))
    .map((b) =>
      row([
        b.matingDate,
        sheepTag(b.damId),
        sheepTag(b.sireId),
        b.expectedLambingDate,
        b.scanDate ?? '',
        b.scanResult ?? '',
        b.confirmed ? 'yes' : 'no',
        b.note ?? '',
      ])
    );

  // ─── Lambing ────────────────────────────────────────────
  const lambingRows: string[] = [];
  for (const l of lambing) {
    for (const lamb of l.lambs) {
      lambingRows.push(
        row([
          l.lambingDate,
          sheepTag(l.damId),
          sheepTag(l.sireId),
          l.birthType,
          lamb.sex,
          lamb.birthWeightKg ?? '',
          lamb.bornAlive ? 'yes' : 'no',
          lamb.survived === undefined ? '' : lamb.survived ? 'yes' : 'no',
          sheepTag(lamb.sheepId),
          l.ease ?? '',
          l.mothering ?? '',
          l.milkiness ?? '',
          l.note ?? '',
        ])
      );
    }
  }

  // ─── Money ──────────────────────────────────────────────
  const moneyRows = [...money]
    .sort((a, b) => (a.date < b.date ? 1 : -1))
    .map((m) =>
      row([
        m.date,
        m.kind,
        m.amount.toFixed(2),
        catById.get(m.categoryId)?.name ?? 'Unknown',
        sheepTag(m.sheepId),
        m.note ?? '',
        m.source,
      ])
    );

  // ─── Assemble ───────────────────────────────────────────
  return [
    'My Sheep Manager — Data Export',
    `Generated: ${new Date().toISOString()}`,
    '',
    section(
      'SHEEP',
      [
        'Tag',
        'Name',
        'Breed',
        'Sex',
        'DOB',
        'Group',
        'Sire',
        'Dam',
        'Status',
        'Purchased from',
        'Acquired',
        'Exited',
        'Notes',
      ],
      sheepRows
    ),
    section(
      'HEALTH',
      [
        'Date',
        'Sheep',
        'Type',
        'Product',
        'Dose',
        'Withdrawal days',
        'Administered by',
        'Cost',
        'Note',
      ],
      healthRows
    ),
    section(
      'WEIGHTS',
      ['Date', 'Sheep', 'Weight kg', 'Note'],
      weightRows
    ),
    section(
      'BREEDING',
      [
        'Mating date',
        'Dam',
        'Sire',
        'Expected lambing',
        'Scan date',
        'Scan result',
        'Confirmed',
        'Note',
      ],
      breedingRows
    ),
    section(
      'LAMBING',
      [
        'Lambing date',
        'Dam',
        'Sire',
        'Birth type',
        'Lamb sex',
        'Birth weight kg',
        'Born alive',
        'Survived 24h',
        'Lamb tag',
        'Ease',
        'Mothering',
        'Milkiness',
        'Note',
      ],
      lambingRows
    ),
    section(
      'MONEY',
      ['Date', 'Kind', 'Amount', 'Category', 'Sheep', 'Note', 'Source'],
      moneyRows
    ),
  ].join('\r\n');
}

// ─── File + share ───────────────────────────────────────────

export async function exportFlockCsvAndShare(
  sheep: Sheep[],
  health: HealthEvent[],
  weights: WeightRecord[],
  breeding: BreedingEvent[],
  lambing: LambingRecord[],
  money: MoneyRecord[],
  categories: MoneyCategory[],
  filenameBase = 'my-sheep-manager'
): Promise<string | null> {
  if (sheep.length === 0) {
    throw new Error('No data to export — add at least one sheep first.');
  }

  const csv = buildFlockCsv(
    sheep,
    health,
    weights,
    breeding,
    lambing,
    money,
    categories
  );
  const BOM = '\uFEFF';

  const filename = `${filenameBase}-${timestampForFilename()}.csv`;
  const uri = `${FileSystem.cacheDirectory}${filename}`;

  await FileSystem.writeAsStringAsync(uri, BOM + csv, {
    encoding: FileSystem.EncodingType.UTF8,
  });

  const available = await Sharing.isAvailableAsync();
  if (!available) {
    throw new Error('Sharing is not available on this device');
  }

  await Sharing.shareAsync(uri, {
    mimeType: 'text/csv',
    dialogTitle: 'Export My Sheep Manager',
    UTI: 'public.comma-separated-values-text',
  });

  return uri;
}

function timestampForFilename(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  const hh = String(d.getHours()).padStart(2, '0');
  const mm = String(d.getMinutes()).padStart(2, '0');
  return `${y}${m}${day}-${hh}${mm}`;
}