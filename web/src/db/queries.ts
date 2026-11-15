import { db } from './db';
import { uid, nowISO } from '../lib/id';
import type { Budget, Category, Debt, Goal, RecurringRule, Transaction, Wallet, WishItem } from './types';

/* ---------- Wallets ---------- */
export async function listWallets(includeArchived = false): Promise<Wallet[]> {
  const all = await db.wallets.toArray();
  const filtered = includeArchived ? all : all.filter((w) => !w.archived_at);
  return filtered.sort((a, b) => a.sort_order - b.sort_order || a.name.localeCompare(b.name));
}

export async function saveWallet(input: Partial<Wallet> & { name: string; type: Wallet['type'] }): Promise<string> {
  const ts = nowISO();
  const id = input.id ?? uid();
  const existing = input.id ? await db.wallets.get(input.id) : undefined;
  const row: Wallet = {
    id,
    name: input.name,
    type: input.type,
    icon: input.icon ?? existing?.icon ?? 'wallet',
    color: input.color ?? existing?.color ?? '#A8813C',
    currency: input.currency ?? existing?.currency ?? 'IDR',
    opening_balance: input.opening_balance ?? existing?.opening_balance ?? 0,
    credit_limit: input.credit_limit ?? existing?.credit_limit ?? null,
    statement_day: input.statement_day ?? existing?.statement_day ?? null,
    due_day: input.due_day ?? existing?.due_day ?? null,
    include_in_total: input.include_in_total ?? existing?.include_in_total ?? 1,
    sort_order: input.sort_order ?? existing?.sort_order ?? 0,
    archived_at: input.archived_at ?? existing?.archived_at ?? null,
    created_at: existing?.created_at ?? ts,
    updated_at: ts,
  };
  await db.wallets.put(row);
  return id;
}

export async function archiveWallet(id: string, archived: boolean): Promise<void> {
  const w = await db.wallets.get(id);
  if (!w) return;
  await db.wallets.put({ ...w, archived_at: archived ? nowISO() : null, updated_at: nowISO() });
}

export async function deleteWallet(id: string): Promise<{ ok: boolean; reason?: string }> {
  const txnCount = await db.transactions.where('wallet_id').equals(id).or('to_wallet_id').equals(id).count();
  if (txnCount > 0) return { ok: false, reason: 'Dompet yang punya transaksi tidak bisa dihapus — arsipkan saja.' };
  await db.wallets.delete(id);
  return { ok: true };
}

export async function walletBalance(wallet: Wallet): Promise<number> {
  // Dexie doesn't index null well; filter in memory
  const all = await db.transactions.toArray();
  const active = all.filter((t) => !t.deleted_at);
  let bal = wallet.opening_balance;
  for (const t of active) {
    if (t.wallet_id === wallet.id) {
      if (t.type === 'income') bal += t.amount;
      else if (t.type === 'expense' || t.type === 'transfer') bal -= t.amount + (t.fee || 0);
    }
    if (t.to_wallet_id === wallet.id && t.type === 'transfer') {
      bal += t.amount;
    }
  }
  return bal;
}

/* ---------- Categories ---------- */
export async function listCategories(type?: 'income' | 'expense', includeArchived = false): Promise<Category[]> {
  let all = await db.categories.toArray();
  if (type) all = all.filter((c) => c.type === type);
  if (!includeArchived) all = all.filter((c) => !c.archived_at);
  return all.sort((a, b) => a.sort_order - b.sort_order || a.name.localeCompare(b.name));
}

export async function saveCategory(input: Partial<Category> & { name: string; type: Category['type'] }): Promise<string> {
  const ts = nowISO();
  const id = input.id ?? uid();
  const existing = input.id ? await db.categories.get(input.id) : undefined;
  const row: Category = {
    id,
    name: input.name,
    type: input.type,
    icon: input.icon ?? existing?.icon ?? 'tag',
    color: input.color ?? existing?.color ?? '#A8813C',
    parent_id: input.parent_id ?? existing?.parent_id ?? null,
    is_system: input.is_system ?? existing?.is_system ?? 0,
    sort_order: input.sort_order ?? existing?.sort_order ?? 0,
    archived_at: input.archived_at ?? existing?.archived_at ?? null,
    created_at: existing?.created_at ?? ts,
    updated_at: ts,
  };
  await db.categories.put(row);
  return id;
}

export async function archiveCategory(id: string, archived: boolean): Promise<void> {
  const c = await db.categories.get(id);
  if (!c) return;
  await db.categories.put({ ...c, archived_at: archived ? nowISO() : null, updated_at: nowISO() });
}

export async function deleteCategory(id: string): Promise<{ ok: boolean; reason?: string }> {
  const usage = (await db.transactions.toArray()).filter((t) => t.category_id === id && !t.deleted_at).length;
  if (usage > 0) return { ok: false, reason: 'Kategori yang sudah dipakai transaksi tidak bisa dihapus — arsipkan saja.' };
  await db.categories.delete(id);
  return { ok: true };
}

/* ---------- Transactions ---------- */
export async function listTransactions(filters: {
  from?: string; to?: string; type?: string; walletId?: string; categoryId?: string;
  search?: string; limit?: number; offset?: number;
} = {}): Promise<(Transaction & { category_name: string | null; category_color: string | null; category_icon: string | null; wallet_name: string; wallet_color: string; to_wallet_name: string | null })[]> {
  let all = await db.transactions.toArray();
  all = all.filter((t) => !t.deleted_at);
  if (filters.from) all = all.filter((t) => t.date >= filters.from!);
  if (filters.to) all = all.filter((t) => t.date <= filters.to!);
  if (filters.type) all = all.filter((t) => t.type === filters.type);
  if (filters.walletId) all = all.filter((t) => t.wallet_id === filters.walletId || t.to_wallet_id === filters.walletId);
  if (filters.categoryId) all = all.filter((t) => t.category_id === filters.categoryId);
  if (filters.search?.trim()) {
    const q = filters.search.trim().toLowerCase();
    all = all.filter((t) =>
      (t.note ?? '').toLowerCase().includes(q) ||
      (t.payee ?? '').toLowerCase().includes(q) ||
      (t.tags ?? '').toLowerCase().includes(q),
    );
  }
  all.sort((a, b) => (b.date > a.date ? 1 : b.date < a.date ? -1 : b.created_at.localeCompare(a.created_at)));
  const offset = filters.offset ?? 0;
  const limit = filters.limit ?? 200;
  const sliced = all.slice(offset, offset + limit);

  const cats = await db.categories.toArray();
  const wallets = await db.wallets.toArray();
  const catMap = new Map(cats.map((c) => [c.id, c]));
  const walMap = new Map(wallets.map((w) => [w.id, w]));

  return sliced.map((t) => {
    const c = t.category_id ? catMap.get(t.category_id) : undefined;
    const w = walMap.get(t.wallet_id);
    const tw = t.to_wallet_id ? walMap.get(t.to_wallet_id) : undefined;
    return {
      ...t,
      category_name: c?.name ?? null,
      category_color: c?.color ?? null,
      category_icon: c?.icon ?? null,
      wallet_name: w?.name ?? '',
      wallet_color: w?.color ?? '',
      to_wallet_name: tw?.name ?? null,
    };
  });
}

export async function saveTransaction(input: Partial<Transaction> & { type: Transaction['type']; wallet_id: string; amount: number; date: string }): Promise<string> {
  const ts = nowISO();
  const id = input.id ?? uid();
  const existing = input.id ? await db.transactions.get(input.id) : undefined;
  const row: Transaction = {
    id,
    type: input.type,
    wallet_id: input.wallet_id,
    to_wallet_id: input.to_wallet_id ?? existing?.to_wallet_id ?? null,
    category_id: input.category_id ?? existing?.category_id ?? null,
    amount: input.amount,
    fee: input.fee ?? existing?.fee ?? 0,
    date: input.date,
    time: input.time ?? existing?.time ?? null,
    payee: input.payee ?? existing?.payee ?? null,
    note: input.note ?? existing?.note ?? null,
    tags: input.tags ?? existing?.tags ?? null,
    attachment_uri: input.attachment_uri ?? existing?.attachment_uri ?? null,
    recurring_id: input.recurring_id ?? existing?.recurring_id ?? null,
    created_at: existing?.created_at ?? ts,
    updated_at: ts,
    deleted_at: null,
  };
  await db.transactions.put(row);
  return id;
}

export async function deleteTransaction(id: string): Promise<void> {
  const t = await db.transactions.get(id);
  if (!t) return;
  await db.transactions.put({ ...t, deleted_at: nowISO(), updated_at: nowISO() });
}

export async function getTransaction(id: string): Promise<Transaction | undefined> {
  return db.transactions.get(id);
}

export async function periodSummary(from: string, to: string) {
  const txns = (await db.transactions.toArray()).filter((t) => !t.deleted_at && t.date >= from && t.date <= to);
  let income = 0, expense = 0, count = 0;
  for (const t of txns) {
    if (t.type === 'income') income += t.amount;
    else if (t.type === 'expense') expense += t.amount + (t.fee || 0);
    else if (t.type === 'transfer') expense += t.fee || 0;
    count++;
  }
  return { income, expense, net: income - expense, count };
}

/* ---------- Budgets ---------- */
export async function listBudgets(): Promise<Budget[]> {
  const all = await db.budgets.toArray();
  return all.filter((b) => !b.archived_at).sort((a, b) => a.created_at.localeCompare(b.created_at));
}

export async function saveBudget(input: Partial<Budget> & { amount: number; period: Budget['period'] }): Promise<string> {
  const ts = nowISO();
  const id = input.id ?? uid();
  const existing = input.id ? await db.budgets.get(input.id) : undefined;
  const row: Budget = {
    id,
    category_id: input.category_id ?? existing?.category_id ?? null,
    name: input.name ?? existing?.name ?? null,
    amount: input.amount,
    period: input.period,
    start_date: input.start_date ?? existing?.start_date ?? today(),
    rollover: input.rollover ?? existing?.rollover ?? 0,
    alert_pct: input.alert_pct ?? existing?.alert_pct ?? 80,
    archived_at: input.archived_at ?? existing?.archived_at ?? null,
    created_at: existing?.created_at ?? ts,
    updated_at: ts,
  };
  await db.budgets.put(row);
  return id;
}

function today(): string { return new Date().toISOString().slice(0, 10); }

export async function deleteBudget(id: string): Promise<void> {
  await db.budgets.delete(id);
}

/* ---------- Recurring ---------- */
export async function listRecurring(includeArchived = false): Promise<RecurringRule[]> {
  const all = await db.recurring_rules.toArray();
  const filtered = includeArchived ? all : all.filter((r) => !r.archived_at);
  return filtered.sort((a, b) => a.next_run.localeCompare(b.next_run));
}

export async function saveRecurring(input: Partial<RecurringRule> & { name: string; type: RecurringRule['type']; wallet_id: string; amount: number; freq: RecurringRule['freq']; interval_n: number; start_date: string }): Promise<string> {
  const ts = nowISO();
  const id = input.id ?? uid();
  const existing = input.id ? await db.recurring_rules.get(input.id) : undefined;
  const row: RecurringRule = {
    id,
    name: input.name,
    type: input.type,
    wallet_id: input.wallet_id,
    to_wallet_id: input.to_wallet_id ?? existing?.to_wallet_id ?? null,
    category_id: input.category_id ?? existing?.category_id ?? null,
    amount: input.amount,
    note: input.note ?? existing?.note ?? null,
    freq: input.freq,
    interval_n: input.interval_n,
    start_date: input.start_date,
    next_run: input.next_run ?? existing?.next_run ?? input.start_date,
    end_date: input.end_date ?? existing?.end_date ?? null,
    auto_post: input.auto_post ?? existing?.auto_post ?? 1,
    is_bill: input.is_bill ?? existing?.is_bill ?? 0,
    reminder_days: input.reminder_days ?? existing?.reminder_days ?? JSON.stringify([3, 1, 0]),
    last_posted_at: input.last_posted_at ?? existing?.last_posted_at ?? null,
    archived_at: input.archived_at ?? existing?.archived_at ?? null,
    created_at: existing?.created_at ?? ts,
    updated_at: ts,
  };
  await db.recurring_rules.put(row);
  return id;
}

export async function deleteRecurring(id: string): Promise<void> {
  await db.recurring_rules.delete(id);
}

/* ---------- Goals ---------- */
export async function listGoals(includeAchieved = false): Promise<Goal[]> {
  const all = await db.goals.toArray();
  const filtered = includeAchieved ? all : all.filter((g) => !g.archived_at);
  return filtered.sort((a, b) => a.created_at.localeCompare(b.created_at));
}

export async function saveGoal(input: Partial<Goal> & { name: string; target_amount: number }): Promise<string> {
  const ts = nowISO();
  const id = input.id ?? uid();
  const existing = input.id ? await db.goals.get(input.id) : undefined;
  const row: Goal = {
    id,
    name: input.name,
    icon: input.icon ?? existing?.icon ?? 'flag',
    color: input.color ?? existing?.color ?? '#A8813C',
    target_amount: input.target_amount,
    saved_amount: input.saved_amount ?? existing?.saved_amount ?? 0,
    target_date: input.target_date ?? existing?.target_date ?? null,
    note: input.note ?? existing?.note ?? null,
    achieved_at: input.achieved_at ?? existing?.achieved_at ?? null,
    archived_at: input.archived_at ?? existing?.archived_at ?? null,
    created_at: existing?.created_at ?? ts,
    updated_at: ts,
  };
  await db.goals.put(row);
  return id;
}

export async function contributeToGoal(goalId: string, amount: number, note?: string): Promise<void> {
  const g = await db.goals.get(goalId);
  if (!g) return;
  const ts = nowISO();
  await db.goal_contributions.add({ id: uid(), goal_id: goalId, amount, note: note ?? null, contributed_at: ts });
  const newSaved = g.saved_amount + amount;
  await db.goals.put({ ...g, saved_amount: newSaved, achieved_at: newSaved >= g.target_amount ? ts : g.achieved_at, updated_at: ts });
}

export async function deleteGoal(id: string): Promise<void> {
  await db.goal_contributions.where('goal_id').equals(id).delete();
  await db.goals.delete(id);
}

/* ---------- Debts ---------- */
export async function listDebts(includeSettled = false): Promise<Debt[]> {
  const all = await db.debts.toArray();
  const filtered = includeSettled ? all : all.filter((d) => !d.settled_at && !d.archived_at);
  return filtered.sort((a, b) => (a.due_date ?? '9999').localeCompare(b.due_date ?? '9999'));
}

export async function saveDebt(input: Partial<Debt> & { type: Debt['type']; counterparty: string; principal: number }): Promise<string> {
  const ts = nowISO();
  const id = input.id ?? uid();
  const existing = input.id ? await db.debts.get(input.id) : undefined;
  const row: Debt = {
    id,
    type: input.type,
    counterparty: input.counterparty,
    principal: input.principal,
    remaining: input.remaining ?? existing?.remaining ?? input.principal,
    due_date: input.due_date ?? existing?.due_date ?? null,
    wallet_id: input.wallet_id ?? existing?.wallet_id ?? null,
    note: input.note ?? existing?.note ?? null,
    settled_at: input.settled_at ?? existing?.settled_at ?? null,
    archived_at: input.archived_at ?? existing?.archived_at ?? null,
    created_at: existing?.created_at ?? ts,
    updated_at: ts,
  };
  await db.debts.put(row);
  return id;
}

export async function payDebt(debt: Debt, amount: number, _walletId: string | null): Promise<void> {
  const applied = Math.max(0, Math.min(amount, debt.remaining));
  if (applied <= 0) return;
  const ts = nowISO();
  await db.debt_payments.add({ id: uid(), debt_id: debt.id, amount: applied, paid_at: ts, transaction_id: null, note: null });
  const remaining = debt.remaining - applied;
  await db.debts.put({ ...debt, remaining, settled_at: remaining === 0 ? ts : debt.settled_at, updated_at: ts });
}

export async function deleteDebt(id: string): Promise<void> {
  await db.debt_payments.where('debt_id').equals(id).delete();
  await db.debts.delete(id);
}

/* ---------- Wishlist ---------- */
export async function listWishlist(includePurchased = false): Promise<WishItem[]> {
  const all = await db.wishlist.toArray();
  const filtered = includePurchased ? all : all.filter((w) => !w.purchased_at);
  return filtered.sort((a, b) => b.priority - a.priority || b.created_at.localeCompare(a.created_at));
}

export async function saveWish(input: Partial<WishItem> & { title: string; amount: number }): Promise<string> {
  const ts = nowISO();
  const id = input.id ?? uid();
  const existing = input.id ? await db.wishlist.get(input.id) : undefined;
  const row: WishItem = {
    id,
    title: input.title,
    amount: input.amount,
    note: input.note ?? existing?.note ?? null,
    priority: input.priority ?? existing?.priority ?? 0,
    purchased_at: input.purchased_at ?? existing?.purchased_at ?? null,
    created_at: existing?.created_at ?? ts,
  };
  await db.wishlist.put(row);
  return id;
}

export async function markWishPurchased(id: string): Promise<void> {
  const w = await db.wishlist.get(id);
  if (!w) return;
  await db.wishlist.put({ ...w, purchased_at: nowISO() });
}

export async function deleteWish(id: string): Promise<void> {
  await db.wishlist.delete(id);
}
