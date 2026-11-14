/** Local-date helpers. Transaction dates are stored as 'YYYY-MM-DD' (local). */

const DAY_MS = 86_400_000;

export function toISODate(d: Date): string {
  const y = d.getFullYear();
  const m = `${d.getMonth() + 1}`.padStart(2, '0');
  const day = `${d.getDate()}`.padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function todayISO(): string {
  return toISODate(new Date());
}

/** Parses 'YYYY-MM-DD' as local noon to avoid DST/timezone drift. */
export function fromISODate(iso: string): Date {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y, (m || 1) - 1, d || 1, 12, 0, 0, 0);
}

export function addDays(iso: string, days: number): string {
  const d = fromISODate(iso);
  d.setDate(d.getDate() + days);
  return toISODate(d);
}

export function addMonths(iso: string, months: number): string {
  const d = fromISODate(iso);
  const day = d.getDate();
  d.setDate(1);
  d.setMonth(d.getMonth() + months);
  const maxDay = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
  d.setDate(Math.min(day, maxDay));
  return toISODate(d);
}

export function startOfMonth(iso: string): string {
  const d = fromISODate(iso);
  return toISODate(new Date(d.getFullYear(), d.getMonth(), 1, 12));
}

export function endOfMonth(iso: string): string {
  const d = fromISODate(iso);
  return toISODate(new Date(d.getFullYear(), d.getMonth() + 1, 0, 12));
}

export function monthKey(iso: string): string {
  return iso.slice(0, 7);
}

export function daysInMonth(iso: string): number {
  const d = fromISODate(iso);
  return new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
}

export function daysBetween(a: string, b: string): number {
  return Math.round((fromISODate(b).getTime() - fromISODate(a).getTime()) / DAY_MS);
}

export function eachDay(startISO: string, endISO: string): string[] {
  const out: string[] = [];
  let cursor = startISO;
  let guard = 0;
  while (cursor <= endISO && guard < 400) {
    out.push(cursor);
    cursor = addDays(cursor, 1);
    guard++;
  }
  return out;
}

export function lastNDays(n: number, from = todayISO()): string[] {
  const out: string[] = [];
  for (let i = n - 1; i >= 0; i--) out.push(addDays(from, -i));
  return out;
}

export function lastNMonths(n: number, from = todayISO()): string[] {
  const out: string[] = [];
  for (let i = n - 1; i >= 0; i--) out.push(startOfMonth(addMonths(from, -i)));
  return out;
}

const MONTHS_SHORT = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'Mei',
  'Jun',
  'Jul',
  'Agu',
  'Sep',
  'Okt',
  'Nov',
  'Des',
];
const MONTHS_LONG = [
  'Januari',
  'Februari',
  'Maret',
  'April',
  'Mei',
  'Juni',
  'Juli',
  'Agustus',
  'September',
  'Oktober',
  'November',
  'Desember',
];
const DAYS_SHORT = ['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab'];

/** "15 Nov 2026" */
export function formatDateID(iso: string, withYear = true): string {
  const d = fromISODate(iso);
  const base = `${d.getDate()} ${MONTHS_SHORT[d.getMonth()]}`;
  return withYear ? `${base} ${d.getFullYear()}` : base;
}

/** "November 2026" */
export function formatMonthYear(iso: string): string {
  const d = fromISODate(iso);
  return `${MONTHS_LONG[d.getMonth()]} ${d.getFullYear()}`;
}

export function monthShort(iso: string): string {
  return MONTHS_SHORT[fromISODate(iso).getMonth()];
}

export function weekdayShort(iso: string): string {
  return DAYS_SHORT[fromISODate(iso).getDay()];
}

export function weekdayIndex(iso: string): number {
  return fromISODate(iso).getDay();
}

/** "Hari ini" / "Kemarin" / "15 Nov" */
export function relativeDateLabel(iso: string): string {
  const today = todayISO();
  if (iso === today) return 'Hari ini';
  if (iso === addDays(today, -1)) return 'Kemarin';
  if (iso === addDays(today, 1)) return 'Besok';
  return formatDateID(iso, fromISODate(iso).getFullYear() !== fromISODate(today).getFullYear());
}

export function isFuture(iso: string): boolean {
  return iso > todayISO();
}

export function nowTime(): string {
  const d = new Date();
  return `${`${d.getHours()}`.padStart(2, '0')}:${`${d.getMinutes()}`.padStart(2, '0')}`;
}
