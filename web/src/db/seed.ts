import { db } from './db';
import { uid, nowISO } from '../lib/id';
import type { Category, Wallet } from './types';

const SEED_CATEGORIES: { name: string; type: 'income' | 'expense'; icon: string; color: string }[] = [
  { name: 'Gaji', type: 'income', icon: 'wallet', color: '#2F7A5A' },
  { name: 'Bonus', type: 'income', icon: 'sparkles', color: '#2F7A5A' },
  { name: 'Investasi', type: 'income', icon: 'chart', color: '#3C6FA8' },
  { name: 'Lainnya', type: 'income', icon: 'tag', color: '#6B6358' },
  { name: 'Makanan', type: 'expense', icon: 'tag', color: '#A84A3C' },
  { name: 'Transport', type: 'expense', icon: 'tag', color: '#A84A3C' },
  { name: 'Belanja', type: 'expense', icon: 'tag', color: '#B8862E' },
  { name: 'Hiburan', type: 'expense', icon: 'sparkles', color: '#3C6FA8' },
  { name: 'Tagihan', type: 'expense', icon: 'calendar', color: '#A84A3C' },
  { name: 'Kesehatan', type: 'expense', icon: 'tag', color: '#2F7A5A' },
];

export async function seedIfEmpty(): Promise<void> {
  const count = await db.categories.count();
  if (count > 0) return;
  const ts = nowISO();
  await db.transaction('rw', db.categories, db.wallets, async () => {
    for (let i = 0; i < SEED_CATEGORIES.length; i++) {
      const c = SEED_CATEGORIES[i];
      const cat: Category = {
        id: uid(), name: c.name, type: c.type, icon: c.icon, color: c.color,
        parent_id: null, is_system: 1, sort_order: i, archived_at: null,
        created_at: ts, updated_at: ts,
      };
      await db.categories.add(cat);
    }
    const wallet: Wallet = {
      id: uid(), name: 'Dompet Utama', type: 'cash', icon: 'wallet', color: '#A8813C',
      currency: 'IDR', opening_balance: 0, credit_limit: null, statement_day: null,
      due_day: null, include_in_total: 1, sort_order: 0, archived_at: null,
      created_at: ts, updated_at: ts,
    };
    await db.wallets.add(wallet);
  });
}
