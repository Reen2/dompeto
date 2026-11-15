import { useState, useMemo } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { listBudgets, saveBudget, deleteBudget, listTransactions, listCategories } from '../db/queries';
import { formatMoney, formatAmount, parseAmountInput } from '../lib/money';
import { todayISO, startOfMonth, endOfMonth } from '../lib/dates';
import Icon from '../components/Icon';

const PERIODS = [
  { value: 'monthly', label: 'Bulanan' },
  { value: 'weekly', label: 'Mingguan' },
  { value: 'yearly', label: 'Tahunan' },
] as const;

export default function Budgets() {
  const budgets = useLiveQuery(() => listBudgets(), []);
  const cats = useLiveQuery(() => listCategories('expense'), []);
  const txns = useLiveQuery(() => listTransactions({ limit: 5000 }), []);

  function periodWindow(period: string, today: string): { start: string; end: string } {
    if (period === 'weekly') {
      const d = new Date(today + 'T12:00:00');
      const day = d.getDay();
      const offset = (day + 6) % 7;
      const start = new Date(d); start.setDate(start.getDate() - offset);
      const end = new Date(start); end.setDate(end.getDate() + 6);
      return { start: start.toISOString().slice(0, 10), end: end.toISOString().slice(0, 10) };
    }
    if (period === 'yearly') {
      const y = today.slice(0, 4);
      return { start: `${y}-01-01`, end: `${y}-12-31` };
    }
    return { start: startOfMonth(today), end: endOfMonth(today) };
  }

  const spentMap = useMemo(() => {
    const map = new Map<string, number>();
    const today = todayISO();
    for (const b of budgets ?? []) {
      const { start, end } = periodWindow(b.period, today);
      let spent = 0;
      for (const t of txns ?? []) {
        if (t.deleted_at) continue;
        if (t.type !== 'expense') continue;
        if (t.date < start || t.date > end) continue;
        if (b.category_id && t.category_id !== b.category_id) continue;
        spent += t.amount + (t.fee || 0);
      }
      map.set(b.id, spent);
    }
    return map;
  }, [budgets, txns]);
  const [adding, setAdding] = useState(false);
  const [amount, setAmount] = useState('');
  const [categoryId, setCategoryId] = useState<string | null>(null);
  const [period, setPeriod] = useState<'monthly' | 'weekly' | 'yearly'>('monthly');
  const [rollover, setRollover] = useState(false);

  async function add() {
    const v = parseAmountInput(amount);
    if (v <= 0) return;
    await saveBudget({ amount: v, period, category_id: categoryId, rollover: rollover ? 1 : 0, start_date: todayISO(), alert_pct: 80 });
    setAmount('');
    setCategoryId(null);
    setAdding(false);
  }

  return (
    <div className="screen">
      <h1 className="txt-h1">Anggaran</h1>
      <p className="txt-caption">Batas pengeluaran per kategori.</p>

      <div className="stack" style={{ marginTop: 16 }}>
        {(budgets ?? []).map((b) => {
          const cat = (cats ?? []).find((c) => c.id === b.category_id);
          const spent = spentMap.get(b.id) ?? 0;
          const ratio = b.amount ? spent / b.amount : 0;
          return (
            <div key={b.id} className="card" style={{ padding: 14 }}>
              <div className="row between" style={{ marginBottom: 8 }}>
                <div className="row" style={{ gap: 8 }}>
                  {cat && <div style={{ width: 28, height: 28, borderRadius: 9, background: `${cat.color}22`, color: cat.color, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Icon name={cat.icon} size={14} color={cat.color} /></div>}
                  <div>
                    <div className="txt-label" style={{ fontWeight: 600 }}>{cat?.name ?? 'Semua pengeluaran'}</div>
                    <div className="txt-caption" style={{ fontSize: 11 }}>{PERIODS.find((p) => p.value === b.period)?.label}{b.rollover ? ' · rollover' : ''}</div>
                  </div>
                </div>
                <button className="btn btn-ghost" style={{ padding: '4px 8px', fontSize: 11, color: 'var(--expense)' }} onClick={() => deleteBudget(b.id)}>Hapus</button>
              </div>
              <div className="row between" style={{ marginBottom: 6 }}>
                <span className="txt-amount" style={{ fontSize: 15 }}>{formatMoney(spent)}</span>
                <span className="txt-caption">{formatMoney(b.amount)}</span>
              </div>
              <div style={{ height: 6, borderRadius: 3, background: 'var(--surface-alt)', overflow: 'hidden' }}>
                <div style={{ height: '100%', width: `${Math.min(100, ratio * 100)}%`, background: ratio > 1 ? 'var(--expense)' : ratio > 0.85 ? 'var(--warning)' : 'var(--accent)', borderRadius: 3 }} />
              </div>
              <div className="txt-caption" style={{ marginTop: 6, fontSize: 11 }}>{Math.round(ratio * 100)}% terpakai</div>
            </div>
          );
        })}
      </div>

      {!adding ? (
        <button className="btn btn-secondary" style={{ marginTop: 16, width: '100%' }} onClick={() => setAdding(true)}>
          <Icon name="plus" size={16} /> Tambah anggaran
        </button>
      ) : (
        <div className="card" style={{ padding: 14, marginTop: 16 }}>
          <div className="txt-caption" style={{ marginBottom: 6 }}>Kategori</div>
          <select className="input" value={categoryId ?? ''} onChange={(e) => setCategoryId(e.target.value || null)}>
            <option value="">Semua pengeluaran</option>
            {(cats ?? []).map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
          <div className="txt-caption" style={{ marginTop: 10, marginBottom: 6 }}>Batas anggaran</div>
          <input inputMode="numeric" className="input" placeholder="0" value={amount ? formatAmount(parseAmountInput(amount)) : ''} onChange={(e) => setAmount(e.target.value.replace(/[^\d]/g, '').slice(0, 12))} />
          <div className="txt-caption" style={{ marginTop: 10, marginBottom: 6 }}>Periode</div>
          <div style={{ display: 'flex', gap: 6 }}>
            {PERIODS.map((p) => (
              <button key={p.value} onClick={() => setPeriod(p.value)} style={{
                flex: 1, padding: '8px', borderRadius: 10, border: '1px solid var(--border)',
                background: period === p.value ? 'var(--accent)' : 'var(--surface)',
                color: period === p.value ? 'var(--on-accent)' : 'var(--text-muted)',
                fontWeight: 600, fontSize: 12, cursor: 'pointer',
              }}>{p.label}</button>
            ))}
          </div>
          <div className="row between" style={{ marginTop: 10, padding: '8px 0' }}>
            <div className="txt-label" style={{ fontSize: 13 }}>Rollover sisa</div>
            <button className="btn btn-ghost" style={{ padding: '4px 10px', fontSize: 12 }} onClick={() => setRollover(!rollover)}>
              {rollover ? 'Aktif' : 'Nonaktif'}
            </button>
          </div>
          <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
            <button className="btn btn-primary" onClick={add}>Simpan</button>
            <button className="btn btn-ghost" onClick={() => { setAdding(false); setAmount(''); setCategoryId(null); }}>Batal</button>
          </div>
        </div>
      )}
    </div>
  );
}
