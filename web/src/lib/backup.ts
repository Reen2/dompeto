import { db } from '../db/db';

const BACKUP_TABLES = [
  'settings', 'wallets', 'categories', 'transactions', 'budgets',
  'recurring_rules', 'goals', 'goal_contributions', 'debts', 'debt_payments', 'wishlist',
];

export async function exportSnapshot() {
  const data: Record<string, any[]> = {};
  for (const t of BACKUP_TABLES) {
    data[t] = await (db as any)[t].toArray();
  }
  return { app: 'dompet', version: 1, exported_at: new Date().toISOString(), data };
}

export async function exportTransactionsCsv(): Promise<string> {
  const txns = await db.transactions.toArray();
  const cats = await db.categories.toArray();
  const wallets = await db.wallets.toArray();
  const catMap = new Map(cats.map((c) => [c.id, c]));
  const walMap = new Map(wallets.map((w) => [w.id, w]));
  const header = ['Tanggal', 'Tipe', 'Dompet', 'Kategori', 'Jumlah', 'Biaya', 'Payee', 'Catatan', 'Tag'];
  const rows = txns.filter((t) => !t.deleted_at).map((t) => [
    t.date,
    t.type,
    walMap.get(t.wallet_id)?.name ?? '',
    t.category_id ? catMap.get(t.category_id)?.name ?? '' : '',
    t.amount,
    t.fee,
    t.payee ?? '',
    t.note ?? '',
    t.tags ?? '',
  ]);
  return [header, ...rows].map((r) => r.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(',')).join('\n');
}
