import { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { listGoals, saveGoal, contributeToGoal, deleteGoal } from '../db/queries';
import { formatMoney, formatAmount, parseAmountInput } from '../lib/money';
import Icon from '../components/Icon';
import PageHeader from '../components/PageHeader';

const COLORS = ['#A8813C', '#2F7A5A', '#3C6FA8', '#A84A3C', '#B8862E'];

export default function Goals() {
  const goals = useLiveQuery(() => listGoals(true), []);
  const [adding, setAdding] = useState(false);
  const [name, setName] = useState('');
  const [target, setTarget] = useState('');
  const [color, setColor] = useState(COLORS[0]);
  const [contributing, setContributing] = useState<string | null>(null);
  const [contribAmount, setContribAmount] = useState('');

  async function add() {
    const v = parseAmountInput(target);
    if (!name.trim() || v <= 0) return;
    await saveGoal({ name: name.trim(), target_amount: v, color, icon: 'flag', saved_amount: 0 });
    setName(''); setTarget(''); setAdding(false);
  }

  async function contribute(id: string) {
    const v = parseAmountInput(contribAmount);
    if (v <= 0) return;
    await contributeToGoal(id, v);
    setContribAmount('');
    setContributing(null);
  }

  return (
    <div className="screen">
      <PageHeader title="Tujuan" subtitle="Dana darurat, liburan, barang impian" />

      <div className="stack" style={{ marginTop: 16 }}>
        {(goals ?? []).map((g) => {
          const ratio = g.target_amount ? g.saved_amount / g.target_amount : 0;
          const done = ratio >= 1;
          const remaining = Math.max(0, g.target_amount - g.saved_amount);
          return (
            <div key={g.id} className="card" style={{ padding: 14 }}>
              <div className="row between" style={{ marginBottom: 8 }}>
                <div className="row" style={{ gap: 10 }}>
                  <div style={{ width: 36, height: 36, borderRadius: 12, background: `${g.color}22`, color: g.color, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Icon name={g.icon || 'flag'} size={16} color={g.color} />
                  </div>
                  <div>
                    <div className="txt-label" style={{ fontWeight: 600 }}>{g.name}</div>
                    <div className="txt-caption" style={{ fontSize: 11 }}>{formatMoney(g.saved_amount)} dari {formatMoney(g.target_amount)}{done ? ' · Tercapai' : ''}</div>
                  </div>
                </div>
                <button className="btn btn-ghost" style={{ padding: '4px 8px', fontSize: 11 }} onClick={() => setContributing(g.id)}>+ Dana</button>
              </div>
              <div style={{ height: 6, borderRadius: 3, background: 'var(--surface-alt)', overflow: 'hidden' }}>
                <div style={{ height: '100%', width: `${Math.min(100, ratio * 100)}%`, background: done ? 'var(--income)' : g.color, borderRadius: 3 }} />
              </div>
              {contributing === g.id && (
                <div style={{ marginTop: 10, display: 'flex', gap: 8 }}>
                  <input inputMode="numeric" className="input" placeholder="Jumlah" value={contribAmount ? formatAmount(parseAmountInput(contribAmount)) : ''} onChange={(e) => setContribAmount(e.target.value.replace(/[^\d]/g, '').slice(0, 12))} />
                  <button className="btn btn-primary" style={{ padding: '8px 12px' }} onClick={() => contribute(g.id)}>Tambah</button>
                  <button className="btn btn-ghost" style={{ padding: '8px 12px' }} onClick={() => { setContributing(null); setContribAmount(''); }}>Batal</button>
                </div>
              )}
              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 8 }}>
                <button className="btn btn-ghost" style={{ padding: '4px 8px', fontSize: 11, color: 'var(--expense)' }} onClick={() => { if (confirm('Hapus tujuan?')) deleteGoal(g.id); }}>Hapus</button>
                <span className="txt-caption" style={{ fontSize: 11 }}>Kurang {formatMoney(remaining)}</span>
              </div>
            </div>
          );
        })}
      </div>

      {!adding ? (
        <button className="btn btn-secondary" style={{ marginTop: 16, width: '100%' }} onClick={() => setAdding(true)}>
          <Icon name="plus" size={16} /> Tambah tujuan
        </button>
      ) : (
        <div className="card" style={{ padding: 14, marginTop: 16 }}>
          <input className="input" placeholder="Nama tujuan" value={name} onChange={(e) => setName(e.target.value)} />
          <input inputMode="numeric" className="input" style={{ marginTop: 8 }} placeholder="Target dana" value={target ? formatAmount(parseAmountInput(target)) : ''} onChange={(e) => setTarget(e.target.value.replace(/[^\d]/g, '').slice(0, 13))} />
          <div style={{ display: 'flex', gap: 6, marginTop: 10, flexWrap: 'wrap' }}>
            {COLORS.map((col) => (
              <button key={col} onClick={() => setColor(col)} style={{ width: 26, height: 26, borderRadius: 13, background: col, border: color === col ? '2.5px solid var(--text)' : 'none', cursor: 'pointer' }} />
            ))}
          </div>
          <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
            <button className="btn btn-primary" onClick={add}>Simpan</button>
            <button className="btn btn-ghost" onClick={() => { setAdding(false); setName(''); setTarget(''); }}>Batal</button>
          </div>
        </div>
      )}
    </div>
  );
}
