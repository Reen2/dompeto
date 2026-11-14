/**
 * Money handling. All amounts are integers in the smallest currency unit
 * (IDR = 1 rupiah). Never use floats for money.
 */

export const DEFAULT_CURRENCY = 'IDR';

export function parseAmountInput(raw: string): number {
  const digits = raw.replace(/[^\d]/g, '');
  if (!digits) return 0;
  const n = Number.parseInt(digits, 10);
  return Number.isFinite(n) ? n : 0;
}

/**
 * Same as `parseAmountInput`, but keeps a single leading minus so a credit
 * card can start with an existing balance owed.
 */
export function parseSignedAmountInput(raw: string): number {
  const value = parseAmountInput(raw);
  return raw.trim().startsWith('-') ? -value : value;
}

/** 1234567 -> "1.234.567" */
export function formatAmount(n: number, decimals = 0): string {
  const abs = Math.abs(Math.trunc(n));
  const str = abs.toString();
  let out = '';
  for (let i = 0; i < str.length; i++) {
    if (i > 0 && (str.length - i) % 3 === 0) out += '.';
    out += str[i];
  }
  if (decimals > 0) {
    const frac = Math.abs(n) % 1;
    out += ',' + frac.toFixed(decimals).slice(2);
  }
  return out;
}

export type MoneyFormatOptions = {
  currency?: string;
  sign?: boolean;
  compact?: boolean;
  masked?: boolean;
};

/** formatMoney(1250000) -> "Rp1.250.000" */
export function formatMoney(n: number, opts: MoneyFormatOptions = {}): string {
  const { currency = DEFAULT_CURRENCY, sign = false, compact = false, masked = false } = opts;
  if (masked) return `${symbolFor(currency)}••••••`;
  const neg = n < 0;
  const abs = Math.abs(n);
  const body = compact ? formatCompact(abs) : formatAmount(abs);
  const prefix = currencyPrefix(currency);
  const signStr = neg ? '−' : sign ? '+' : '';
  return `${signStr}${prefix}${body}${currencySuffix(currency)}`;
}

function symbolFor(currency: string): string {
  return currency === 'IDR' ? 'Rp' : currency + ' ';
}

function currencyPrefix(currency: string): string {
  return symbolFor(currency);
}

function currencySuffix(_currency: string): string {
  return '';
}

/** 1250000 -> "1,25 jt" */
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
