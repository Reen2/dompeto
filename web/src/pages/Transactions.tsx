import { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { Link } from 'react-router-dom';
import { listTransactions } from '../db/queries';
import { formatMoney } from '../lib/money';
import { relativeDateLabel } from '../lib/dates';
import Icon from '../components/Icon';

export default function Transactions() {
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<'all' | 'income' | 'expense' | 'transfer'>('all');
  const rows = useLiveQuery(
    () => listTransactions({ search: search || undefined, type: filter === 'all' ? undefined : filter, limit: 200 }),
    [search, filter],
  );

  // group by date
  const groups: { date: string; items: any[] }[] = [];
  const map = new Map<string, any[]>();
  for (const r of rows ?? []) {
    if (!map.has(r.date)) { map.set(r.date, []); groups.push({ date: r.date, items: map.get(r.date)! }); }
    map.get(r.date)!.push(r);
  }

  return (
    <div className="screen">
      <h1 className="txt-h1">Transaksi</h1>
      <input className="input" style={{ marginTop: 12 }} placeholder="Cari catatan, merchant, tag…" value={search} onChange={(e) => setSearch(e.target.value)} />

      <div style={{ display: 'flex', gap: 6, marginTop: 10, overflowX: 'auto' }}>
        {(['all', 'expense', 'income', 'transfer'] as const).map((f) => (
          <button key={f} onClick={() => setFilter(f)} style={{
            padding: '6px 12px', borderRadius: 999, border: '1px solid var(--border)',
            background: filter === f ? 'var(--accent)' : 'var(--surface)',
            color: filter === f ? 'var(--on-accent)' : 'var(--text-muted)',
            fontSize: 12, fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap',
          }}>
            {f === 'all' ? 'Semua' : f === 'expense' ? 'Keluar' : f === 'income' ? 'Masuk' : 'Transfer'}
          </button>
        ))}
      </div>

      <div style={{ marginTop: 14 }}>
        {groups.length === 0 ? (
          <div className="empty">Belum ada transaksi. Ketuk + untuk mulai.</div>
        ) : groups.map((g) => (
          <div key={g.date} style={{ marginBottom: 14 }}>
            <div className="row between" style={{ marginBottom: 6 }}>
              <div className="txt-caption" style={{ fontWeight: 600 }}>{relativeDateLabel(g.date)}</div>
              <div className="txt-caption">{formatDate(g.date)}</div>
            </div>
            <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
              {g.items.map((t, i) => (
                <Link key={t.id} to={`/transaction/${t.id}`} style={{ textDecoration: 'none', color: 'inherit' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', borderTop: i > 0 ? '1px solid var(--border)' : 'none' }}>
                    <div style={{
                      width: 34, height: 34, borderRadius: 11,
                      background: t.type === 'income' ? 'rgba(47,122,90,0.12)' : t.type === 'transfer' ? 'rgba(60,111,168,0.12)' : 'rgba(168,74,60,0.12)',
                      color: t.type === 'income' ? 'var(--income)' : t.type === 'transfer' ? 'var(--info)' : 'var(--expense)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}>
                      <Icon name={t.type === 'income' ? 'arrow-down-left' : t.type === 'transfer' ? 'transfer' : 'arrow-up-right'} size={16} />
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 14, fontWeight: 500, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {t.payee || t.note || t.category_name || (t.type === 'transfer' ? 'Transfer' : 'Transaksi')}
                      </div>
                      <div className="txt-caption" style={{ fontSize: 11 }}>{t.category_name ?? 'Tanpa kategori'} · {t.wallet_name}</div>
                    </div>
                    <div className="txt-amount" style={{ fontSize: 14, color: t.type === 'income' ? 'var(--income)' : t.type === 'transfer' ? 'var(--info)' : 'var(--expense)' }}>
                      {t.type === 'income' ? '+' : t.type === 'expense' ? '−' : ''}{formatMoney(t.amount)}
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        ))}
      </div>

      <Link to="/transaction/new" style={{ textDecoration: 'none' }}>
        <button style={{
          position: 'fixed', right: 20, bottom: 90, width: 56, height: 56, borderRadius: 28,
          background: 'var(--accent)', color: 'var(--on-accent)', border: 'none',
          boxShadow: '0 6px 16px rgba(168,129,60,0.4)', cursor: 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 40,
        }} aria-label="Catat transaksi">
          <Icon name="plus" size={24} color="var(--on-accent)" />
        </button>
      </Link>
    </div>
  );
}

function formatDate(iso: string): string {
  const d = new Date(iso + 'T12:00:00');
  return `${d.getDate()}/${d.getMonth() + 1}`;
}
