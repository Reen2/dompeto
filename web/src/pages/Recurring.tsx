import { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { listRecurring, saveRecurring, deleteRecurring } from '../db/queries';
import { listWallets } from '../db/queries';
import { formatMoney, formatAmount, parseAmountInput } from '../lib/money';
import { todayISO } from '../lib/dates';
import Icon from '../components/Icon';
import PageHeader from '../components/PageHeader';

const FREQS = [
  { value: 'daily', label: 'Harian' },
  { value: 'weekly', label: 'Mingguan' },
  { value: 'monthly', label: 'Bulanan' },
  { value: 'yearly', label: 'Tahunan' },
] as const;

export default function Recurring() {
  const rules = useLiveQuery(() => listRecurring(true), []);
  const wallets = useLiveQuery(() => listWallets(), []);
  const [adding, setAdding] = useState(false);
  const [name, setName] = useState('');
  const [amount, setAmount] = useState('');
  const [freq, setFreq] = useState<'daily' | 'weekly' | 'monthly' | 'yearly'>('monthly');
  const [walletId, setWalletId] = useState<string | null>(null);
  const [isBill, setIsBill] = useState(false);
  const [autoPost, setAutoPost] = useState(true);

  async function add() {
    const v = parseAmountInput(amount);
    if (!name.trim() || v <= 0 || !walletId) return;
    await saveRecurring({
      name: name.trim(), type: 'expense', wallet_id: walletId, amount: v,
      freq, interval_n: 1, start_date: todayISO(),
      next_run: todayISO(), auto_post: autoPost ? 1 : 0, is_bill: isBill ? 1 : 0,
      reminder_days: JSON.stringify([3, 1, 0]),
    });
    setName(''); setAmount(''); setAdding(false);
  }

  return (
    <div className="screen">
      <PageHeader title="Transaksi berulang" subtitle="Langganan, gaji, tagihan rutin" />

      <div className="stack" style={{ marginTop: 16 }}>
        {(rules ?? []).map((r) => (
          <div key={r.id} className="card" style={{ padding: 14 }}>
            <div className="row between">
              <div>
                <div className="txt-label" style={{ fontWeight: 600 }}>{r.name}</div>
                <div className="txt-caption" style={{ fontSize: 11 }}>{FREQS.find((f) => f.value === r.freq)?.label} · tiap {r.interval_n} · {r.is_bill ? 'Tagihan' : 'Rutin'}{r.auto_post ? '' : ' · manual'}</div>
                <div className="txt-caption" style={{ fontSize: 11 }}>Berikutnya: {r.next_run}</div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div className="txt-amount" style={{ fontSize: 15 }}>{formatMoney(r.amount)}</div>
                <button className="btn btn-ghost" style={{ padding: '4px 8px', fontSize: 11, color: 'var(--expense)' }} onClick={() => { if (confirm('Hapus?')) deleteRecurring(r.id); }}>Hapus</button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {!adding ? (
        <button className="btn btn-secondary" style={{ marginTop: 16, width: '100%' }} onClick={() => { setAdding(true); if (wallets && wallets.length && !walletId) setWalletId(wallets[0].id); }}>
          <Icon name="plus" size={16} /> Tambah aturan
        </button>
      ) : (
        <div className="card" style={{ padding: 14, marginTop: 16 }}>
          <input className="input" placeholder="Nama (mis. Netflix)" value={name} onChange={(e) => setName(e.target.value)} />
          <input inputMode="numeric" className="input" style={{ marginTop: 8 }} placeholder="Jumlah" value={amount ? formatAmount(parseAmountInput(amount)) : ''} onChange={(e) => setAmount(e.target.value.replace(/[^\d]/g, '').slice(0, 13))} />
          <div className="txt-caption" style={{ marginTop: 8, marginBottom: 6 }}>Frekuensi</div>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {FREQS.map((f) => (
              <button key={f.value} onClick={() => setFreq(f.value)} style={{
                flex: 1, padding: '8px', borderRadius: 10, border: '1px solid var(--border)', minWidth: 70,
                background: freq === f.value ? 'var(--accent)' : 'var(--surface)',
                color: freq === f.value ? 'var(--on-accent)' : 'var(--text-muted)',
                fontWeight: 600, fontSize: 12, cursor: 'pointer',
              }}>{f.label}</button>
            ))}
          </div>
          <div className="txt-caption" style={{ marginTop: 8, marginBottom: 6 }}>Dompet</div>
          <select className="input" value={walletId ?? ''} onChange={(e) => setWalletId(e.target.value || null)}>
            <option value="">Pilih dompet</option>
            {(wallets ?? []).map((w) => <option key={w.id} value={w.id}>{w.name}</option>)}
          </select>
          <div className="row between" style={{ marginTop: 10, padding: '4px 0' }}>
            <div className="txt-label" style={{ fontSize: 13 }}>Tagihan (is_bill)</div>
            <button className="btn btn-ghost" style={{ padding: '4px 10px', fontSize: 12 }} onClick={() => setIsBill(!isBill)}>{isBill ? 'Ya' : 'Tidak'}</button>
          </div>
          <div className="row between" style={{ padding: '4px 0' }}>
            <div className="txt-label" style={{ fontSize: 13 }}>Auto-post</div>
            <button className="btn btn-ghost" style={{ padding: '4px 10px', fontSize: 12 }} onClick={() => setAutoPost(!autoPost)}>{autoPost ? 'Ya' : 'Manual'}</button>
          </div>
          <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
            <button className="btn btn-primary" onClick={add}>Simpan</button>
            <button className="btn btn-ghost" onClick={() => { setAdding(false); setName(''); setAmount(''); }}>Batal</button>
          </div>
        </div>
      )}
    </div>
  );
}
