import { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { listDebts, saveDebt, payDebt, deleteDebt } from '../db/queries';
import { formatMoney, formatAmount, parseAmountInput } from '../lib/money';
import { formatDateID } from '../lib/dates';
import Icon from '../components/Icon';
import PageHeader from '../components/PageHeader';

export default function Debts() {
  const [tab, setTab] = useState<'payable' | 'receivable'>('payable');
  const debts = useLiveQuery(() => listDebts(false), []);
  const list = (debts ?? []).filter((d) => d.type === tab);
  const totalPayable = (debts ?? []).filter((d) => d.type === 'payable').reduce((s, d) => s + d.remaining, 0);
  const totalReceivable = (debts ?? []).filter((d) => d.type === 'receivable').reduce((s, d) => s + d.remaining, 0);

  const [adding, setAdding] = useState(false);
  const [cp, setCp] = useState('');
  const [principal, setPrincipal] = useState('');
  const [due, setDue] = useState('');
  const [paying, setPaying] = useState<string | null>(null);
  const [payAmount, setPayAmount] = useState('');

  async function add() {
    const v = parseAmountInput(principal);
    if (!cp.trim() || v <= 0) return;
    await saveDebt({ type: tab, counterparty: cp.trim(), principal: v, remaining: v, due_date: due || null });
    setCp(''); setPrincipal(''); setDue(''); setAdding(false);
  }

  async function pay(id: string) {
    const debt = (debts ?? []).find((d) => d.id === id);
    if (!debt) return;
    const v = parseAmountInput(payAmount) || debt.remaining;
    await payDebt(debt, v, null);
    setPayAmount('');
    setPaying(null);
  }

  return (
    <div className="screen">
      <PageHeader title="Utang & Piutang" />
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginTop: 14 }}>
        <div className="card" style={{ padding: 14 }}>
          <div className="txt-caption">Utangku</div>
          <div className="txt-amount" style={{ fontSize: 17, color: 'var(--expense)', marginTop: 2 }}>{formatMoney(totalPayable)}</div>
        </div>
        <div className="card" style={{ padding: 14 }}>
          <div className="txt-caption">Piutangku</div>
          <div className="txt-amount" style={{ fontSize: 17, color: 'var(--income)', marginTop: 2 }}>{formatMoney(totalReceivable)}</div>
        </div>
      </div>

      <div style={{ display: 'flex', gap: 6, marginTop: 14 }}>
        {(['payable', 'receivable'] as const).map((t) => (
          <button key={t} onClick={() => setTab(t)} style={{
            flex: 1, padding: '8px', borderRadius: 10, border: '1px solid var(--border)',
            background: tab === t ? 'var(--accent)' : 'var(--surface)',
            color: tab === t ? 'var(--on-accent)' : 'var(--text-muted)',
            fontWeight: 600, fontSize: 13, cursor: 'pointer',
          }}>{t === 'payable' ? 'Utang' : 'Piutang'}</button>
        ))}
      </div>

      <div className="stack" style={{ marginTop: 14 }}>
        {list.map((d) => {
          const paid = Math.max(0, d.principal - d.remaining);
          const ratio = d.principal ? paid / d.principal : 0;
          return (
            <div key={d.id} className="card" style={{ padding: 14 }}>
              <div className="row between" style={{ marginBottom: 8 }}>
                <div>
                  <div className="txt-label" style={{ fontWeight: 600 }}>{d.counterparty}</div>
                  <div className="txt-caption" style={{ fontSize: 11 }}>{d.due_date ? `Jatuh tempo ${formatDateID(d.due_date, false)}` : 'Tanpa tenggat'}</div>
                </div>
                <div className="txt-amount" style={{ fontSize: 16 }}>{formatMoney(d.remaining)}</div>
              </div>
              <div style={{ height: 5, borderRadius: 3, background: 'var(--surface-alt)', overflow: 'hidden', marginBottom: 6 }}>
                <div style={{ height: '100%', width: `${Math.min(100, ratio * 100)}%`, background: tab === 'payable' ? 'var(--expense)' : 'var(--income)', borderRadius: 3 }} />
              </div>
              <div className="row between" style={{ fontSize: 11, color: 'var(--text-faint)' }}>
                <span>Dibayar {formatMoney(paid, { compact: true })}</span>
                <span>Dari {formatMoney(d.principal, { compact: true })}</span>
              </div>
              {paying === d.id ? (
                <div style={{ marginTop: 10, display: 'flex', gap: 8 }}>
                  <input inputMode="numeric" className="input" placeholder="Jumlah" value={payAmount ? formatAmount(parseAmountInput(payAmount)) : ''} onChange={(e) => setPayAmount(e.target.value.replace(/[^\d]/g, '').slice(0, 12))} />
                  <button className="btn btn-primary" style={{ padding: '8px 12px' }} onClick={() => pay(d.id)}>Simpan</button>
                  <button className="btn btn-ghost" style={{ padding: '8px 12px' }} onClick={() => { setPaying(null); setPayAmount(''); }}>Batal</button>
                </div>
              ) : (
                <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
                  <button className="btn btn-secondary" style={{ flex: 1, padding: '8px' }} onClick={() => setPaying(d.id)}>{tab === 'payable' ? 'Bayar' : 'Terima'}</button>
                  <button className="btn btn-ghost" style={{ padding: '8px 12px', color: 'var(--expense)' }} onClick={() => { if (confirm('Hapus?')) deleteDebt(d.id); }}>Hapus</button>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {!adding ? (
        <button className="btn btn-secondary" style={{ marginTop: 16, width: '100%' }} onClick={() => setAdding(true)}>
          <Icon name="plus" size={16} /> {tab === 'payable' ? 'Catat utang' : 'Catat piutang'}
        </button>
      ) : (
        <div className="card" style={{ padding: 14, marginTop: 16 }}>
          <input className="input" placeholder={tab === 'payable' ? 'Kepada siapa?' : 'Siapa yang meminjam?'} value={cp} onChange={(e) => setCp(e.target.value)} />
          <input inputMode="numeric" className="input" style={{ marginTop: 8 }} placeholder="Jumlah" value={principal ? formatAmount(parseAmountInput(principal)) : ''} onChange={(e) => setPrincipal(e.target.value.replace(/[^\d]/g, '').slice(0, 13))} />
          <input type="date" className="input" style={{ marginTop: 8 }} value={due} onChange={(e) => setDue(e.target.value)} />
          <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
            <button className="btn btn-primary" onClick={add}>Simpan</button>
            <button className="btn btn-ghost" onClick={() => { setAdding(false); setCp(''); setPrincipal(''); setDue(''); }}>Batal</button>
          </div>
        </div>
      )}
    </div>
  );
}
