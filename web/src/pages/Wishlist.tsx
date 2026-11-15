import { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { listWishlist, saveWish, markWishPurchased, deleteWish } from '../db/queries';
import { formatMoney, formatAmount, parseAmountInput } from '../lib/money';
import Icon from '../components/Icon';
import PageHeader from '../components/PageHeader';

export default function Wishlist() {
  const items = useLiveQuery(() => listWishlist(false), []);
  const [adding, setAdding] = useState(false);
  const [title, setTitle] = useState('');
  const [amount, setAmount] = useState('');
  const [priority, setPriority] = useState(0);

  async function add() {
    if (!title.trim()) return;
    await saveWish({ title: title.trim(), amount: parseAmountInput(amount), priority });
    setTitle(''); setAmount(''); setPriority(0); setAdding(false);
  }

  return (
    <div className="screen">
      <PageHeader title="Daftar impian" subtitle="Tunda belanja impulsif, tinjau nanti" />

      <div className="stack" style={{ marginTop: 16 }}>
        {(items ?? []).map((w) => (
          <div key={w.id} className="card" style={{ padding: 14 }}>
            <div className="row between">
              <div style={{ flex: 1 }}>
                <div className="txt-label" style={{ fontWeight: 600 }}>{w.title}</div>
                <div className="txt-caption" style={{ fontSize: 11 }}>Prioritas {w.priority} · {formatMoney(w.amount)}</div>
              </div>
              <div style={{ display: 'flex', gap: 6 }}>
                <button className="btn btn-secondary" style={{ padding: '6px 10px', fontSize: 12 }} onClick={() => { if (confirm('Tandai sudah dibeli?')) markWishPurchased(w.id); }}>
                  Sudah dibeli
                </button>
                <button className="btn btn-ghost" style={{ padding: '6px 10px', fontSize: 12, color: 'var(--expense)' }} onClick={() => { if (confirm('Hapus?')) deleteWish(w.id); }}>
                  Hapus
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {!adding ? (
        <button className="btn btn-secondary" style={{ marginTop: 16, width: '100%' }} onClick={() => setAdding(true)}>
          <Icon name="plus" size={16} /> Tambah impian
        </button>
      ) : (
        <div className="card" style={{ padding: 14, marginTop: 16 }}>
          <input className="input" placeholder="Nama barang" value={title} onChange={(e) => setTitle(e.target.value)} />
          <input inputMode="numeric" className="input" style={{ marginTop: 8 }} placeholder="Harga" value={amount ? formatAmount(parseAmountInput(amount)) : ''} onChange={(e) => setAmount(e.target.value.replace(/[^\d]/g, '').slice(0, 13))} />
          <div className="txt-caption" style={{ marginTop: 8, marginBottom: 6 }}>Prioritas</div>
          <div style={{ display: 'flex', gap: 6 }}>
            {[0, 1, 2, 3].map((p) => (
              <button key={p} onClick={() => setPriority(p)} style={{
                flex: 1, padding: '8px', borderRadius: 10, border: '1px solid var(--border)',
                background: priority === p ? 'var(--accent)' : 'var(--surface)',
                color: priority === p ? 'var(--on-accent)' : 'var(--text-muted)',
                fontWeight: 600, fontSize: 12, cursor: 'pointer',
              }}>{p}</button>
            ))}
          </div>
          <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
            <button className="btn btn-primary" onClick={add}>Simpan</button>
            <button className="btn btn-ghost" onClick={() => { setAdding(false); setTitle(''); setAmount(''); setPriority(0); }}>Batal</button>
          </div>
        </div>
      )}
    </div>
  );
}
