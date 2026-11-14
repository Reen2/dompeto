/** Versioned SQL migrations. Never edit a shipped migration; append a new one. */

export const MIGRATIONS: string[] = [
  // ---- v1 ----
  `
CREATE TABLE settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE wallets (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'cash',
  icon TEXT NOT NULL DEFAULT 'wallet.pass.fill',
  color TEXT NOT NULL DEFAULT '#A8813C',
  currency TEXT NOT NULL DEFAULT 'IDR',
  opening_balance INTEGER NOT NULL DEFAULT 0,
  credit_limit INTEGER,
  statement_day INTEGER,
  due_day INTEGER,
  include_in_total INTEGER NOT NULL DEFAULT 1,
  sort_order INTEGER NOT NULL DEFAULT 0,
  archived_at TEXT,
  deleted_at TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE categories (
  id TEXT PRIMARY KEY,
  parent_id TEXT REFERENCES categories(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('income','expense')),
  icon TEXT NOT NULL DEFAULT 'tag.fill',
  color TEXT NOT NULL DEFAULT '#8C7B62',
  is_system INTEGER NOT NULL DEFAULT 0,
  sort_order INTEGER NOT NULL DEFAULT 0,
  archived_at TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
CREATE INDEX idx_categories_type ON categories(type, archived_at);

CREATE TABLE transactions (
  id TEXT PRIMARY KEY,
  type TEXT NOT NULL CHECK (type IN ('income','expense','transfer','adjustment')),
  wallet_id TEXT NOT NULL REFERENCES wallets(id) ON DELETE RESTRICT,
  to_wallet_id TEXT REFERENCES wallets(id) ON DELETE RESTRICT,
  category_id TEXT REFERENCES categories(id) ON DELETE SET NULL,
  amount INTEGER NOT NULL CHECK (amount <> 0),
  fee INTEGER NOT NULL DEFAULT 0,
  date TEXT NOT NULL,
  time TEXT,
  payee TEXT,
  note TEXT,
  tags TEXT,
  attachment_uri TEXT,
  recurring_id TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  deleted_at TEXT,
  CHECK (type <> 'transfer' OR to_wallet_id IS NOT NULL)
);
CREATE INDEX idx_tx_date ON transactions(date DESC);
CREATE INDEX idx_tx_wallet ON transactions(wallet_id, date DESC);
CREATE INDEX idx_tx_to_wallet ON transactions(to_wallet_id);
CREATE INDEX idx_tx_category ON transactions(category_id, date DESC);
CREATE INDEX idx_tx_type_date ON transactions(type, date DESC);

CREATE TABLE budgets (
  id TEXT PRIMARY KEY,
  category_id TEXT REFERENCES categories(id) ON DELETE CASCADE,
  name TEXT,
  amount INTEGER NOT NULL CHECK (amount > 0),
  period TEXT NOT NULL DEFAULT 'monthly' CHECK (period IN ('monthly','weekly','yearly')),
  start_date TEXT NOT NULL,
  rollover INTEGER NOT NULL DEFAULT 0,
  alert_pct INTEGER NOT NULL DEFAULT 80,
  archived_at TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE recurring_rules (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('income','expense','transfer')),
  wallet_id TEXT NOT NULL REFERENCES wallets(id) ON DELETE CASCADE,
  to_wallet_id TEXT REFERENCES wallets(id) ON DELETE SET NULL,
  category_id TEXT REFERENCES categories(id) ON DELETE SET NULL,
  amount INTEGER NOT NULL CHECK (amount > 0),
  note TEXT,
  freq TEXT NOT NULL CHECK (freq IN ('daily','weekly','monthly','yearly')),
  interval_n INTEGER NOT NULL DEFAULT 1,
  start_date TEXT NOT NULL,
  next_run TEXT NOT NULL,
  end_date TEXT,
  auto_post INTEGER NOT NULL DEFAULT 0,
  is_bill INTEGER NOT NULL DEFAULT 0,
  reminder_days TEXT NOT NULL DEFAULT '[3,1,0]',
  last_posted_at TEXT,
  archived_at TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
CREATE INDEX idx_recurring_next ON recurring_rules(next_run);

CREATE TABLE goals (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  icon TEXT NOT NULL DEFAULT 'flag.fill',
  color TEXT NOT NULL DEFAULT '#7A8C6B',
  target_amount INTEGER NOT NULL CHECK (target_amount > 0),
  saved_amount INTEGER NOT NULL DEFAULT 0,
  target_date TEXT,
  note TEXT,
  achieved_at TEXT,
  archived_at TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE goal_contributions (
  id TEXT PRIMARY KEY,
  goal_id TEXT NOT NULL REFERENCES goals(id) ON DELETE CASCADE,
  amount INTEGER NOT NULL,
  date TEXT NOT NULL,
  note TEXT
);
CREATE INDEX idx_goal_contrib ON goal_contributions(goal_id, date DESC);

CREATE TABLE debts (
  id TEXT PRIMARY KEY,
  type TEXT NOT NULL CHECK (type IN ('payable','receivable')),
  counterparty TEXT NOT NULL,
  principal INTEGER NOT NULL CHECK (principal > 0),
  remaining INTEGER NOT NULL,
  due_date TEXT,
  wallet_id TEXT REFERENCES wallets(id) ON DELETE SET NULL,
  note TEXT,
  settled_at TEXT,
  archived_at TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE debt_payments (
  id TEXT PRIMARY KEY,
  debt_id TEXT NOT NULL REFERENCES debts(id) ON DELETE CASCADE,
  amount INTEGER NOT NULL CHECK (amount > 0),
  paid_at TEXT NOT NULL,
  transaction_id TEXT,
  note TEXT
);
CREATE INDEX idx_debt_payments ON debt_payments(debt_id, paid_at DESC);

CREATE TABLE wishlist (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  amount INTEGER NOT NULL DEFAULT 0,
  note TEXT,
  priority INTEGER NOT NULL DEFAULT 1,
  purchased_at TEXT,
  created_at TEXT NOT NULL
);
`,
];

export const SEED_CATEGORIES: {
  name: string;
  type: 'income' | 'expense';
  icon: string;
  color: string;
}[] = [
  // Income
  { name: 'Gaji', type: 'income', icon: 'banknote.fill', color: '#1F7A4D' },
  { name: 'Bonus', type: 'income', icon: 'gift.fill', color: '#2F7F63' },
  { name: 'Freelance', type: 'income', icon: 'laptopcomputer', color: '#3A6482' },
  { name: 'Investasi', type: 'income', icon: 'chart.line.uptrend.xyaxis', color: '#4E7A72' },
  { name: 'Hadiah', type: 'income', icon: 'sparkles', color: '#7A8C6B' },
  { name: 'Pemasukan Lain', type: 'income', icon: 'plus.circle.fill', color: '#8C7B62' },
  // Expense
  { name: 'Makan & Minum', type: 'expense', icon: 'fork.knife', color: '#C4864A' },
  { name: 'Kopi & Nongkrong', type: 'expense', icon: 'cup.and.saucer.fill', color: '#A98A63' },
  { name: 'Transportasi', type: 'expense', icon: 'car.fill', color: '#3A6482' },
  { name: 'Belanja', type: 'expense', icon: 'bag.fill', color: '#9E6B6B' },
  { name: 'Fashion', type: 'expense', icon: 'tshirt.fill', color: '#8A6A9E' },
  { name: 'Perawatan Diri', type: 'expense', icon: 'sparkles', color: '#B27F8E' },
  { name: 'Tagihan', type: 'expense', icon: 'doc.text.fill', color: '#6B5B95' },
  { name: 'Langganan', type: 'expense', icon: 'repeat', color: '#5A7D9A' },
  { name: 'Kesehatan', type: 'expense', icon: 'heart.fill', color: '#B03A2E' },
  { name: 'Hiburan', type: 'expense', icon: 'popcorn.fill', color: '#C4864A' },
  { name: 'Travel', type: 'expense', icon: 'airplane', color: '#4E7A72' },
  { name: 'Hobi', type: 'expense', icon: 'paintpalette.fill', color: '#6E7E5A' },
  { name: 'Rumah', type: 'expense', icon: 'house.fill', color: '#8C7B62' },
  { name: 'Pendidikan', type: 'expense', icon: 'book.fill', color: '#5A7D9A' },
  { name: 'Donasi', type: 'expense', icon: 'hands.sparkles.fill', color: '#7A8C6B' },
  { name: 'Keluarga', type: 'expense', icon: 'figure.2.and.child.holdinghands', color: '#A8813C' },
  { name: 'Pengeluaran Lain', type: 'expense', icon: 'ellipsis.circle.fill', color: '#8C7B62' },
];

export const WALLET_TYPES: {
  value: string;
  label: string;
  icon: string;
}[] = [
  { value: 'cash', label: 'Tunai', icon: 'banknote.fill' },
  { value: 'bank', label: 'Bank', icon: 'building.columns.fill' },
  { value: 'ewallet', label: 'E-Wallet', icon: 'wave.3.right.circle.fill' },
  { value: 'credit_card', label: 'Kartu Kredit', icon: 'creditcard.fill' },
  { value: 'investment', label: 'Investasi', icon: 'chart.pie.fill' },
  { value: 'other', label: 'Lainnya', icon: 'wallet.pass.fill' },
];
