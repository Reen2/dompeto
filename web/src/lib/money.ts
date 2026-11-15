export const DEFAULT_CURRENCY = 'IDR';

export function parseAmountInput(raw: string): number {
  const digits = raw.replace(/[^\d]/g, '');
  if (!digits) return 0;
  const n = Number.parseInt(digits, 10);
  return Number.isFinite(n) ? n : 0;
}

export function formatAmount(n: number): string {
  const abs = Math.abs(Math.trunc(n));
  const str = abs.toString();
  let out = '';
  for (let i = 0; i < str.length; i++) {
    if (i > 0 && (str.length - i) % 3 === 0) out += '.';
    out += str[i];
  }
  return out;
}

export type MoneyFormatOptions = { currency?: string; sign?: boolean; compact?: boolean; masked?: boolean };

export function formatMoney(n: number, opts: MoneyFormatOptions = {}): string {
  const { sign = false, compact = false, masked = false } = opts;
  if (masked) return 'Rp••••••';
  const neg = n < 0;
  const abs = Math.abs(n);
  const body = compact ? formatCompact(abs) : formatAmount(abs);
  const prefix = 'Rp';
  const signStr = neg ? '−' : sign ? '+' : '';
  return `${signStr}${prefix}${body}`;
}

export function formatCompact(n: number): string {
  const abs = Math.abs(n);
  if (abs >= 1_000_000_000_000) return trim(abs / 1_000_000_000_000) + ' T';
  if (abs >= 1_000_000_000) return trim(abs / 1_000_000_000) + ' M';
  if (abs >= 1_000_000) return trim(abs / 1_000_000) + ' jt';
  if (abs >= 1_000) return trim(abs / 1_000) + ' rb';
  return formatAmount(abs);
}

function trim(n: number): string {
  const rounded = Math.round(n * 100) / 100;
  return rounded.toFixed(Number.isInteger(rounded) ? 0 : rounded < 10 ? 2 : 1).replace('.', ',');
}

export function percent(part: number, total: number): number {
  if (!total) return 0;
  return Math.max(0, Math.min(1, part / total));
}

export function clamp(n: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, n));
}

export function sum(values: number[]): number {
  let total = 0;
  for (const v of values) total += v;
  return total;
}
