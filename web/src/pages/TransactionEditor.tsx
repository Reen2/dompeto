import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { listWallets, listCategories, saveTransaction, getTransaction, deleteTransaction } from '../db/queries';
import { parseAmountInput, formatAmount } from '../lib/money';
import { todayISO } from '../lib/dates';
import Icon from '../components/Icon';
import PageHeader from '../components/PageHeader';

type Mode = 'new' | 'edit';
type TxnType = 'income' | 'expense' | 'transfer';

const TYPE_OPTIONS: { value: TxnType; label: string; icon: string; color: string }[] = [
  { value: 'expense', label: 'Pengeluaran', icon: 'arrow-up-right', color: 'var(--expense)' },
  { value: 'income', label: 'Pemasukan', icon: 'arrow-down-left', color: 'var(--income)' },
  { value: 'transfer', label: 'Transfer', icon: 'transfer', color: 'var(--info)' },
];

export default function TransactionEditor({ mode }: { mode: Mode }) {
  const navigate = useNavigate();
  const params = useParams();
  const id = params.id;

  const wallets = useLiveQuery(() => listWallets(), []);
  const [type, setType] = useState<TxnType>('expense');
  const [amount, setAmount] = useState('');
  const [walletId, setWalletId] = useState<string | null>(null);
  const [toWalletId, setToWalletId] = useState<string | null>(null);
  const [categoryId, setCategoryId] = useState<string | null>(null);
  const [date, setDate] = useState(todayISO());
  const [payee, setPayee] = useState('');
  const [note, setNote] = useState('');
  const [fee, setFee] = useState('');
  const [saving, setSaving] = useState(false);
  const [loaded, setLoaded] = useState(mode === 'new');

  const categories = useLiveQuery(() => listCategories(type === 'income' ? 'income' : 'expense'), [type]);

  // hydrate on edit
  useEffect(() => {
    if (mode !== 'edit' || !id || loaded) return;
    getTransaction(id).then((t) => {
      if (!t) return;
      setType(t.type as TxnType);
      setAmount(String(t.amount));
      setWalletId(t.wallet_id);
      setToWalletId(t.to_wallet_id);
      setCategoryId(t.category_id);
      setDate(t.date);
      setPayee(t.payee ?? '');
      setNote(t.note ?? '');
      setFee(t.fee ? String(t.fee) : '');
      setLoaded(true);
    });
  }, [mode, id, loaded]);

  // defaults
  useEffect(() => {
    if (mode === 'new' && wallets && wallets.length && !walletId) {
      setWalletId(wallets[0].id);
    }
  }, [mode, wallets, walletId]);

  useEffect(() => {
    if (mode === 'new' && type === 'transfer' && wallets && wallets.length && !toWalletId) {
      const other = wallets.find((w) => w.id !== walletId);
      if (other) setToWalletId(other.id);
    }
  }, [mode, type, wallets, walletId, toWalletId]);

  const amountValue = parseAmountInput(amount);
  const feeValue = parseAmountInput(fee);
  const catList = categories ?? [];
  const walList = wallets ?? [];

  const canSave = amountValue > 0 && !!walletId && (type !== 'transfer' || (toWalletId && toWalletId !== walletId)) && (type === 'transfer' || !!categoryId);

  async function save() {
    if (!canSave || saving) return;
    setSaving(true);
    try {
      await saveTransaction({
        id: mode === 'edit' ? id ?? undefined : undefined,
        type,
        wallet_id: walletId!,
        to_wallet_id: type === 'transfer' ? toWalletId : null,
        category_id: type === 'transfer' ? null : categoryId,
        amount: amountValue,
        fee: type === 'transfer' ? feeValue : 0,
        date,
        payee: payee.trim() || null,
        note: note.trim() || null,
      });
      navigate(-1);
    } catch (e) {
      alert('Gagal menyimpan transaksi.');
    } finally {
      setSaving(false);
    }
  }

  async function remove() {
    if (mode !== 'edit' || !id) return;
    if (!confirm('Hapus transaksi ini?')) return;
    await deleteTransaction(id);
    navigate(-1);
  }

  return (
    <div className="screen">
      <PageHeader title={mode === 'new' ? 'Transaksi baru' : 'Ubah transaksi'} right={
        <button className="btn btn-ghost" onClick={save} disabled={!canSave || saving} style={{ padding: '6px 10px', color: canSave ? 'var(--accent)' : 'var(--text-faint)' }}>
          {saving ? 'Menyimpan…' : 'Simpan'}
        </button>
      } />

      {/* type switch */}
      <div style={{ display: 'flex', gap: 4, background: 'var(--surface-alt)', borderRadius: 12, padding: 3, marginBottom: 16 }}>
        {TYPE_OPTIONS.map((o) => (
          <button key={o.value} onClick={() => { setType(o.value); setCategoryId(null); }} style={{
            flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
            padding: '9px 4px', borderRadius: 9, border: 'none', cursor: 'pointer',
            background: type === o.value ? 'var(--surface)' : 'transparent',
            color: type === o.value ? o.color : 'var(--text-muted)',
            fontWeight: type === o.value ? 600 : 500, fontSize: 13,
          }}>
            <Icon name={o.icon} size={14} color={type === o.value ? o.color : 'var(--text-muted)'} />
            {o.label}
          </button>
        ))}
      </div>

      {/* amount */}
      <div style={{ textAlign: 'center', padding: '10px 0 16px' }}>
        <div className="txt-caption" style={{ letterSpacing: 1, textTransform: 'uppercase' }}>Jumlah</div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4, marginTop: 6 }}>
          <span style={{ fontSize: 22, fontWeight: 600, color: 'var(--text-muted)' }}>Rp</span>
          <input
            inputMode="numeric"
            value={amount ? formatAmount(amountValue) : ''}
            onChange={(e) => setAmount(e.target.value.replace(/[^\d]/g, '').slice(0, 12))}
            placeholder="0"
            enterKeyHint="done"
            style={{
              fontSize: 42, fontWeight: 700, letterSpacing: -1.2,
              color: amountValue > 0 ? 'var(--text)' : 'var(--text-faint)',
              fontVariantNumeric: 'tabular-nums', border: 'none', background: 'transparent',
              outline: 'none', textAlign: 'center', width: 220,
            }}
          />
        </div>
        <div style={{ display: 'flex', gap: 8, justifyContent: 'center', marginTop: 10 }}>
          {[10000, 50000, 100000].map((v) => (
            <button key={v} className="btn btn-secondary" style={{ padding: '6px 10px', fontSize: 12 }} onClick={() => setAmount(String(amountValue + v))}>
              +{formatAmount(v / 1000)}rb
            </button>
          ))}
        </div>
      </div>

      {/* wallet */}
      <div className="card" style={{ padding: 0, overflow: 'hidden', marginBottom: 12 }}>
        <div style={{ padding: '12px 14px', borderBottom: '1px solid var(--border)' }}>
          <div className="txt-caption" style={{ marginBottom: 6 }}>{type === 'transfer' ? 'Dari dompet' : 'Dompet'}</div>
          <select className="input" value={walletId ?? ''} onChange={(e) => setWalletId(e.target.value || null)}>
            <option value="">Pilih dompet</option>
            {walList.map((w) => <option key={w.id} value={w.id}>{w.name}</option>)}
          </select>
        </div>
        {type === 'transfer' && (
          <div style={{ padding: '12px 14px' }}>
            <div className="txt-caption" style={{ marginBottom: 6 }}>Ke dompet</div>
            <select className="input" value={toWalletId ?? ''} onChange={(e) => setToWalletId(e.target.value || null)}>
              <option value="">Pilih dompet tujuan</option>
              {walList.filter((w) => w.id !== walletId).map((w) => <option key={w.id} value={w.id}>{w.name}</option>)}
            </select>
          </div>
        )}
      </div>

      {/* category */}
      {type !== 'transfer' && (
        <div className="card" style={{ padding: 14, marginBottom: 12 }}>
          <div className="txt-caption" style={{ marginBottom: 8 }}>Kategori</div>
          {catList.length === 0 ? (
            <div className="txt-caption">Belum ada kategori. Tambah di menu Lainnya → Kategori.</div>
          ) : (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {catList.map((c) => (
                <button key={c.id} onClick={() => setCategoryId(c.id)} style={{
                  padding: '8px 12px', borderRadius: 10, border: '1.5px solid',
                  borderColor: categoryId === c.id ? c.color : 'var(--border)',
                  background: categoryId === c.id ? `${c.color}22` : 'var(--surface-alt)',
                  color: categoryId === c.id ? c.color : 'var(--text-muted)',
                  fontSize: 13, fontWeight: 500, cursor: 'pointer',
                  display: 'flex', alignItems: 'center', gap: 6,
                }}>
                  <span style={{ width: 8, height: 8, borderRadius: 4, background: c.color }} />
                  {c.name}
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* date, payee, note */}
      <div className="card" style={{ padding: 0, overflow: 'hidden', marginBottom: 12 }}>
        <div style={{ padding: '12px 14px', borderBottom: '1px solid var(--border)' }}>
          <div className="txt-caption" style={{ marginBottom: 6 }}>Tanggal</div>
          <input type="date" className="input" value={date} onChange={(e) => setDate(e.target.value)} />
        </div>
        <div style={{ padding: '12px 14px', borderBottom: '1px solid var(--border)' }}>
          <div className="txt-caption" style={{ marginBottom: 6 }}>Merchant / penerima</div>
          <input className="input" value={payee} onChange={(e) => setPayee(e.target.value)} placeholder="mis. Indomaret" />
        </div>
        <div style={{ padding: '12px 14px' }}>
          <div className="txt-caption" style={{ marginBottom: 6 }}>Catatan</div>
          <textarea className="input" value={note} onChange={(e) => setNote(e.target.value)} placeholder="Catatan (opsional)" rows={2} style={{ resize: 'vertical' }} />
        </div>
        {type === 'transfer' && (
          <div style={{ padding: '12px 14px', borderTop: '1px solid var(--border)' }}>
            <div className="txt-caption" style={{ marginBottom: 6 }}>Biaya transfer</div>
            <input inputMode="numeric" className="input" value={fee ? formatAmount(feeValue) : ''} onChange={(e) => setFee(e.target.value.replace(/[^\d]/g, '').slice(0, 9))} placeholder="0" />
          </div>
        )}
      </div>

      {!canSave && (
        <div className="txt-caption" style={{ textAlign: 'center', marginBottom: 12 }}>
          {amountValue <= 0 ? 'Masukkan jumlah lebih dari nol.' : type === 'transfer' ? 'Pilih dompet tujuan yang berbeda.' : 'Pilih kategori dulu.'}
        </div>
      )}

      <button className="btn btn-primary" style={{ width: '100%', padding: '14px' }} onClick={save} disabled={!canSave || saving}>
        {saving ? 'Menyimpan…' : 'Simpan transaksi'}
      </button>

      {mode === 'edit' && (
        <button className="btn btn-danger" style={{ width: '100%', marginTop: 10 }} onClick={remove}>
          Hapus transaksi
        </button>
      )}
    </div>
  );
}
