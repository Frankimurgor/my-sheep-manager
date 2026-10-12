// src/utils/date.ts
// All date math for My Sheep Manager. Local-timezone YYYY-MM-DD strings only.

export function toISODate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function fromISODate(s: string): Date {
  const [y, m, d] = s.split('-').map(Number);
  return new Date(y, (m ?? 1) - 1, d ?? 1, 0, 0, 0, 0);
}

export function today(): Date {
  const n = new Date();
  return new Date(n.getFullYear(), n.getMonth(), n.getDate());
}

export function todayISO(): string {
  return toISODate(today());
}

export function addDays(d: Date, n: number): Date {
  const copy = new Date(d);
  copy.setDate(copy.getDate() + n);
  return copy;
}

export function addMonths(d: Date, n: number): Date {
  const copy = new Date(d);
  const day = copy.getDate();
  copy.setDate(1);
  copy.setMonth(copy.getMonth() + n);
  const lastDay = new Date(copy.getFullYear(), copy.getMonth() + 1, 0).getDate();
  copy.setDate(Math.min(day, lastDay));
  return copy;
}

export type DateRange = { start: Date; end: Date };

export function startOfWeek(d: Date): Date {
  const copy = new Date(d);
  const day = copy.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  copy.setDate(copy.getDate() + diff);
  copy.setHours(0, 0, 0, 0);
  return copy;
}

export function startOfMonth(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), 1, 0, 0, 0, 0);
}

export function endOfMonth(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59, 999);
}

export function rangeForDay(d: Date): DateRange {
  const start = new Date(d.getFullYear(), d.getMonth(), d.getDate(), 0, 0, 0, 0);
  const end = new Date(d.getFullYear(), d.getMonth(), d.getDate(), 23, 59, 59, 999);
  return { start, end };
}

export function rangeForWeek(d: Date): DateRange {
  const start = startOfWeek(d);
  const end = addDays(start, 6);
  end.setHours(23, 59, 59, 999);
  return { start, end };
}

export function rangeForMonth(d: Date): DateRange {
  return { start: startOfMonth(d), end: endOfMonth(d) };
}

export function rangeForYear(d: Date): DateRange {
  const start = new Date(d.getFullYear(), 0, 1, 0, 0, 0, 0);
  const end = new Date(d.getFullYear(), 11, 31, 23, 59, 59, 999);
  return { start, end };
}

export function isWithin(isoDate: string, range: DateRange): boolean {
  const t = fromISODate(isoDate).getTime();
  return t >= range.start.getTime() && t <= range.end.getTime();
}

export type Frequency = 'daily' | 'weekly' | 'monthly' | 'yearly';

export function advanceFrequency(iso: string, freq: Frequency): string {
  const d = fromISODate(iso);
  if (freq === 'daily') return toISODate(addDays(d, 1));
  if (freq === 'weekly') return toISODate(addDays(d, 7));
  if (freq === 'monthly') return toISODate(addMonths(d, 1));
  return toISODate(addMonths(d, 12));
}

const MONTHS_SHORT = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
];

const DAYS_SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export function formatShort(iso: string): string {
  const d = fromISODate(iso);
  return `${MONTHS_SHORT[d.getMonth()]} ${d.getDate()}`;
}

export function formatMedium(iso: string): string {
  const d = fromISODate(iso);
  return `${DAYS_SHORT[d.getDay()]}, ${MONTHS_SHORT[d.getMonth()]} ${d.getDate()}`;
}

export function formatLong(iso: string): string {
  const d = fromISODate(iso);
  return d.toLocaleDateString(undefined, {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

export function formatRelativeDay(iso: string): string {
  const t = today();
  const target = fromISODate(iso);
  const diffDays = Math.round(
    (target.getTime() - t.getTime()) / (1000 * 60 * 60 * 24)
  );
  if (diffDays === 0) return 'Today';
  if (diffDays === -1) return 'Yesterday';
  if (diffDays === 1) return 'Tomorrow';
  if (diffDays > 1 && diffDays <= 7) return `In ${diffDays} days`;
  if (diffDays < -1 && diffDays >= -7) return `${Math.abs(diffDays)} days ago`;
  return formatMedium(iso);
}

export function rangeLabel(range: DateRange, kind: 'day' | 'week' | 'month' | 'year'): string {
  if (kind === 'day') return formatLong(toISODate(range.start));
  if (kind === 'week') {
    const a = range.start;
    const b = range.end;
    if (a.getMonth() === b.getMonth()) {
      return `${MONTHS_SHORT[a.getMonth()]} ${a.getDate()} – ${b.getDate()}`;
    }
    return `${MONTHS_SHORT[a.getMonth()]} ${a.getDate()} – ${MONTHS_SHORT[b.getMonth()]} ${b.getDate()}`;
  }
  if (kind === 'year') return `${range.start.getFullYear()}`;
  return `${MONTHS_SHORT[range.start.getMonth()]} ${range.start.getFullYear()}`;
}