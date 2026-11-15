import { useState, useMemo } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { listTransactions, periodSummary } from '../db/queries';
import { formatMoney } from '../lib/money';
import { startOfMonth, endOfMonth, addMonths, todayISO } from '../lib/dates';
import Icon from '../components/Icon';

export default function Reports() {
  const [month, setMonth] = useState(startOfMonth(todayISO()));
  const from = startOfMonth(month);
  const to = endOfMonth(month);
  const summary = useLiveQuery(() => periodSummary(from, to), [from, to]);
  const txns = useLiveQuery(() => listTransactions({ from, to, limit: 5000 }), [from, to]);

  const byCategory = useMemo(() => {
    const map = new Map<string, { name: string; color: string; total: number }>();
    for (const t of txns ?? []) {
      if (t.type !== 'expense') continue;
      const key = t.category_id ?? 'none';
      const name = t.category_name ?? 'Tanpa kategori';
      const color = t.category_color ?? '#9C9386';
      const cur = map.get(key) ?? { name, color, total: 0 };
      cur.total += t.amount + (t.fee || 0);
      map.set(key, cur);
    }
    return [...map.values()].sort((a, b) => b.total - a.total);
  }, [txns]);

  const totalExpense = byCategory.reduce((s, c) => s + c.total, 0);

  const topExpenses = useMemo(() => (txns ?? []).filter((t) => t.type === 'expense').sort((a, b) => b.amount - a.amount).slice(0, 5), [txns]);

  const isCurrentMonth = month === startOfMonth(todayISO());

  return (
    <div className="screen">
      <h1 className="txt-h1">Laporan</h1>
      <p className="txt-caption">Ke mana uangmu pergi.</p>

      {/* month nav */}
      <div className="row between" style={{ marginTop: 14, marginBottom: 14 }}>
        <button className="btn btn-ghost" style={{ padding: '6px 10px' }} onClick={() => setMonth(addMonths(month, -1))}><Icon name="chevron-left" size={16} /></button>
        <span style={{ fontWeight: 600, fontSize: 15 }}>{new Date(month + 'T12:00:00').toLocaleDateString('id-ID', { month: 'long', year: 'numeric' })}</span>
        <button className="btn btn-ghost" style={{ padding: '6px 10px', opacity: isCurrentMonth ? 0.4 : 1 }} disabled={isCurrentMonth} onClick={() => setMonth(addMonths(month, 1))}><Icon name="chevron-right" size={16} /></button>
      </div>

      {/* summary cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
        <div className="card" style={{ padding: 12 }}>
          <div className="txt-caption" style={{ fontSize: 11 }}>Masuk</div>
          <div className="txt-amount" style={{ fontSize: 14, color: 'var(--income)', marginTop: 2 }}>{formatMoney(summary?.income ?? 0, { compact: true })}</div>
        </div>
        <div className="card" style={{ padding: 12 }}>
          <div className="txt-caption" style={{ fontSize: 11 }}>Keluar</div>
          <div className="txt-amount" style={{ fontSize: 14, color: 'var(--expense)', marginTop: 2 }}>{formatMoney(summary?.expense ?? 0, { compact: true })}</div>
        </div>
        <div className="card" style={{ padding: 12 }}>
          <div className="txt-caption" style={{ fontSize: 11 }}>Sisa</div>
          <div className="txt-amount" style={{ fontSize: 14, color: 'var(--accent)', marginTop: 2 }}>{formatMoney(summary?.net ?? 0, { compact: true })}</div>
        </div>
      </div>

      {/* donut-ish by category */}
      {byCategory.length > 0 && (
        <div className="card" style={{ padding: 14, marginTop: 16 }}>
          <div className="txt-label" style={{ fontWeight: 600, marginBottom: 10 }}>Pengeluaran per kategori</div>
          {byCategory.map((c) => {
            const pct = totalExpense ? Math.round((c.total / totalExpense) * 100) : 0;
            return (
              <div key={c.name} style={{ marginBottom: 8 }}>
                <div className="row between" style={{ marginBottom: 3 }}>
                  <div className="row" style={{ gap: 6 }}>
                    <span style={{ width: 8, height: 8, borderRadius: 4, background: c.color }} />
                    <span style={{ fontSize: 13 }}>{c.name}</span>
                  </div>
                  <span className="txt-caption" style={{ fontSize: 11 }}>{formatMoney(c.total, { compact: true })} · {pct}%</span>
                </div>
                <div style={{ height: 4, borderRadius: 2, background: 'var(--surface-alt)', overflow: 'hidden' }}>
                  <div style={{ height: '100%', width: `${pct}%`, background: c.color, borderRadius: 2 }} />
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* top expenses */}
      {topExpenses.length > 0 && (
        <div className="card" style={{ padding: 0, overflow: 'hidden', marginTop: 16 }}>
          <div style={{ padding: '12px 14px', borderBottom: '1px solid var(--border)', fontWeight: 600, fontSize: 14 }}>Pengeluaran terbesar</div>
          {topExpenses.map((t, i) => (
            <div key={t.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', borderTop: i > 0 ? '1px solid var(--border)' : 'none' }}>
              <span style={{ fontSize: 12, color: 'var(--text-faint)', width: 14 }}>{i + 1}</span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13, fontWeight: 500, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{t.payee || t.note || t.category_name || 'Pengeluaran'}</div>
                <div className="txt-caption" style={{ fontSize: 11 }}>{t.category_name ?? 'Tanpa kategori'}</div>
              </div>
              <span className="txt-amount" style={{ fontSize: 13, color: 'var(--expense)' }}>{formatMoney(t.amount)}</span>
            </div>
          ))}
        </div>
      )}

      {(!txns || txns.length === 0) && (
        <div className="empty" style={{ marginTop: 24 }}>Belum ada transaksi bulan ini.</div>
      )}
    </div>
  );
}
