import { Link } from 'react-router-dom';
import Icon from '../components/Icon';

const items = [
  { to: '/wallets', label: 'Dompet', desc: 'Kas, bank, e-wallet, kartu kredit', icon: 'wallet', color: 'var(--accent)' },
  { to: '/categories', label: 'Kategori', desc: 'Rapikan jenis pemasukan & pengeluaran', icon: 'grid', color: 'var(--info)' },
  { to: '/recurring', label: 'Transaksi berulang', desc: 'Langganan, gaji, tagihan rutin', icon: 'repeat', color: 'var(--text-muted)' },
  { to: '/goals', label: 'Tujuan', desc: 'Dana darurat, liburan, barang impian', icon: 'flag', color: 'var(--income)' },
  { to: '/debts', label: 'Utang & Piutang', desc: 'Catat yang dipinjam dan dipinjamkan', icon: 'person', color: 'var(--expense)' },
  { to: '/wishlist', label: 'Daftar impian', desc: 'Tunda belanja impulsif, tinjau nanti', icon: 'sparkles', color: 'var(--accent)' },
  { to: '/settings', label: 'Pengaturan', desc: 'Tampilan, keamanan, mata uang', icon: 'gear', color: 'var(--text-muted)' },
  { to: '/settings/backup', label: 'Backup & data', desc: 'Ekspor, impor, CSV', icon: 'download', color: 'var(--text-muted)' },
];

export default function More() {
  return (
    <div className="screen">
      <div className="row between" style={{ paddingTop: 4, paddingBottom: 16 }}>
        <h1 className="txt-h1">Lainnya</h1>
        <div style={{
          width: 38, height: 38, borderRadius: 19,
          background: 'var(--accent-soft)', color: 'var(--accent)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontWeight: 700, fontSize: 15,
        }}>D</div>
      </div>

      <div className="card" style={{ padding: 12, marginBottom: 14, background: 'var(--accent-soft)', border: '1px solid var(--accent)' }}>
        <div className="row" style={{ gap: 8, alignItems: 'flex-start' }}>
          <span style={{ fontSize: 16 }}>⚠️</span>
          <div>
            <div className="txt-label" style={{ fontWeight: 600, color: 'var(--accent)', fontSize: 13 }}>Penting</div>
            <div className="txt-caption" style={{ fontSize: 11, lineHeight: 1.5, marginTop: 2 }}>
              Selalu buka dari <strong>ikon di layar utama</strong>, bukan dari tab Safari biasa — penyimpanan data terpisah.
              Rajin cadangkan data (Backup & data → Ekspor JSON), minimal seminggu sekali, simpan di iCloud Drive atau kirim ke diri sendiri.
            </div>
          </div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 10 }}>
        {items.map((it) => (
          <Link key={it.to} to={it.to} style={{ textDecoration: 'none', color: 'inherit' }}>
            <div className="card" style={{ padding: 14, height: '100%' }}>
              <div style={{
                width: 36, height: 36, borderRadius: 12,
                background: 'var(--surface-alt)', color: it.color,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                marginBottom: 8,
              }}>
                <Icon name={it.icon} size={18} color={it.color} />
              </div>
              <div className="txt-label" style={{ fontWeight: 600, fontSize: 14 }}>{it.label}</div>
              <div className="txt-caption" style={{ marginTop: 2, fontSize: 11 }}>{it.desc}</div>
            </div>
          </Link>
        ))}
      </div>

      <div style={{ textAlign: 'center', marginTop: 24, color: 'var(--text-faint)', fontSize: 12 }}>
        Dompet · 1.0.0 · Semua data tersimpan di perangkatmu.
      </div>
    </div>
  );
}
