import { useState, useEffect } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { listWallets, saveWallet, deleteWallet, archiveWallet, walletBalance } from '../db/queries';
import { formatMoney, parseAmountInput, formatAmount } from '../lib/money';
import Icon from '../components/Icon';
import PageHeader from '../components/PageHeader';

export default function Wallets() {
  const wallets = useLiveQuery(() => listWallets(true), []);
  const [name, setName] = useState('');
  const [opening, setOpening] = useState('');
  const [adding, setAdding] = useState(false);

  async function add() {
    const n = name.trim();
    if (!n) return;
    await saveWallet({ name: n, type: 'cash', color: '#A8813C', icon: 'wallet', opening_balance: parseAmountInput(opening) });
    setName('');
    setOpening('');
    setAdding(false);
  }

  return (
    <div className="screen">
      <PageHeader title="Dompet" subtitle="Kas, bank, e-wallet, kartu kredit" />
      <p className="txt-caption" style={{ marginTop: -6, marginBottom: 8 }}>Kelola dompet dan saldo awal.</p>

      <div className="stack" style={{ marginTop: 16 }}>
        {(wallets ?? []).map((w) => (
          <WalletCard key={w.id} wallet={w} />
        ))}
      </div>

      {!adding ? (
        <button className="btn btn-secondary" style={{ marginTop: 16, width: '100%' }} onClick={() => setAdding(true)}>
          <Icon name="plus" size={16} /> Tambah dompet
        </button>
      ) : (
        <div className="card" style={{ padding: 14, marginTop: 16 }}>
          <div className="txt-caption" style={{ marginBottom: 6 }}>Nama dompet</div>
          <input className="input" placeholder="mis. BCA, GoPay" value={name} onChange={(e) => setName(e.target.value)} enterKeyHint="next" />
          <div className="txt-caption" style={{ marginTop: 10, marginBottom: 6 }}>Saldo awal</div>
          <input inputMode="numeric" className="input" placeholder="0" value={opening ? formatAmount(parseAmountInput(opening)) : ''} onChange={(e) => setOpening(e.target.value.replace(/[^\\d]/g, '').slice(0, 13))} />
          <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
            <button className="btn btn-primary" onClick={add}>Simpan</button>
            <button className="btn btn-ghost" onClick={() => { setAdding(false); setName(''); setOpening(''); }}>Batal</button>
          </div>
        </div>
      )}

      <div style={{ textAlign: 'center', marginTop: 12, color: 'var(--text-faint)', fontSize: 12 }}>
        Data tersimpan lokal (IndexedDB). Tutup & buka lagi — data tetap ada.
      </div>
    </div>
  );
}

function WalletCard({ wallet }: { wallet: any }) {
  const [bal, setBal] = useState<number | null>(null);
  useEffect(() => { walletBalance(wallet).then(setBal); }, [wallet.id]);
  return (
    <div className="card" style={{ padding: 14 }}>
      <div className="row between">
        <div className="row" style={{ gap: 10 }}>
          <div style={{ width: 40, height: 40, borderRadius: 13, background: `${wallet.color}22`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: wallet.color }}>
            <Icon name={wallet.icon || 'wallet'} size={18} color={wallet.color} />
          </div>
          <div>
            <div className="txt-label" style={{ fontWeight: 600 }}>{wallet.name}</div>
            <div className="txt-caption">{wallet.type} · {wallet.archived_at ? 'Arsip' : 'Aktif'}</div>
          </div>
        </div>
        <div className="txt-amount" style={{ fontSize: 16, color: (bal ?? 0) < 0 ? 'var(--expense)' : 'var(--text)' }}>
          {bal === null ? '…' : formatMoney(bal)}
        </div>
      </div>
      <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
        <button className="btn btn-ghost" style={{ padding: '6px 10px', fontSize: 12 }} onClick={async () => { await archiveWallet(wallet.id, !wallet.archived_at); }}>
          {wallet.archived_at ? 'Keluarkan' : 'Arsipkan'}
        </button>
        <button className="btn btn-ghost" style={{ padding: '6px 10px', fontSize: 12, color: 'var(--expense)' }} onClick={async () => { const r = await deleteWallet(wallet.id); if (!r.ok) alert(r.reason); }}>
          Hapus
        </button>
      </div>
    </div>
  );
}
