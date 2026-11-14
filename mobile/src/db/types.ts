export type TxnType = 'income' | 'expense' | 'transfer' | 'adjustment';
export type WalletType = 'cash' | 'bank' | 'ewallet' | 'credit_card' | 'investment' | 'other';
export type CategoryType = 'income' | 'expense';
export type BudgetPeriod = 'monthly' | 'weekly' | 'yearly';
export type Freq = 'daily' | 'weekly' | 'monthly' | 'yearly';
export type DebtType = 'payable' | 'receivable';

export type Wallet = {
  id: string;
  name: string;
  type: WalletType;
  icon: string;
  color: string;
  currency: string;
  opening_balance: number;
  credit_limit: number | null;
  statement_day: number | null;
  due_day: number | null;
  include_in_total: number;
  sort_order: number;
  archived_at: string | null;
  created_at: string;
  updated_at: string;
};

export type WalletWithBalance = Wallet & { balance: number; txn_count: number };

export type Category = {
  id: string;
  parent_id: string | null;
  name: string;
  type: CategoryType;
  icon: string;
  color: string;
  is_system: number;
  sort_order: number;
  archived_at: string | null;
  created_at: string;
  updated_at: string;
};

export type Transaction = {
  id: string;
  type: TxnType;
  wallet_id: string;
  to_wallet_id: string | null;
  category_id: string | null;
  amount: number;
  fee: number;
  date: string;
  time: string | null;
  payee: string | null;
  note: string | null;
  tags: string | null;
  attachment_uri: string | null;
  recurring_id: string | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
};

export type TransactionRow = Transaction & {
  category_name: string | null;
  category_color: string | null;
  category_icon: string | null;
  wallet_name: string;
  wallet_color: string;
  to_wallet_name: string | null;
};

export type Budget = {
  id: string;
  category_id: string | null;
  name: string | null;
  amount: number;
  period: BudgetPeriod;
  start_date: string;
  rollover: number;
  alert_pct: number;
  archived_at: string | null;
  created_at: string;
  updated_at: string;
};

export type BudgetProgress = Budget & {
  category_name: string | null;
  category_color: string | null;
  category_icon: string | null;
  spent: number;
  period_start: string;
  period_end: string;
};

export type RecurringRule = {
  id: string;
  name: string;
  type: TxnType;
  wallet_id: string;
  to_wallet_id: string | null;
  category_id: string | null;
  amount: number;
  note: string | null;
  freq: Freq;
  interval_n: number;
  start_date: string;
  next_run: string;
  end_date: string | null;
  auto_post: number;
  is_bill: number;
  reminder_days: string;
  last_posted_at: string | null;
  archived_at: string | null;
  created_at: string;
  updated_at: string;
};

export type Goal = {
  id: string;
  name: string;
  icon: string;
  color: string;
  target_amount: number;
  saved_amount: number;
  target_date: string | null;
  note: string | null;
  achieved_at: string | null;
  archived_at: string | null;
  created_at: string;
  updated_at: string;
};

export type Debt = {
  id: string;
  type: DebtType;
  counterparty: string;
  principal: number;
  remaining: number;
  due_date: string | null;
  wallet_id: string | null;
  note: string | null;
  settled_at: string | null;
  archived_at: string | null;
  created_at: string;
  updated_at: string;
};

export type WishItem = {
  id: string;
  title: string;
  amount: number;
  note: string | null;
  priority: number;
  purchased_at: string | null;
  created_at: string;
};

export type SettingsMap = Record<string, string>;
