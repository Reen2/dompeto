import { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { Link } from 'react-router-dom';
import { useSettings } from '../store/settings';
import { listWallets } from '../db/queries';
import { requestNotificationPermission, scheduleDailyReminder } from '../lib/reminders';
import PageHeader from '../components/PageHeader';

export default function Settings() {
  const { settings, update } = useSettings();
  const [name, setName] = useState(settings.name);
  const wallets = useLiveQuery(() => listWallets(true), []);

  return (
    <div className="screen">
      <PageHeader title="Pengaturan" />

      <div className="card" style={{ padding: 14, marginTop: 16 }}>
        <div className="txt-caption" style={{ marginBottom: 6 }}>Nama panggilan</div>
        <div style={{ display: 'flex', gap: 8 }}>
          <input className="input" value={name} onChange={(e) => setName(e.target.value)} placeholder="Nama kamu" />
          <button className="btn btn-primary" onClick={() => update({ name })}>Simpan</button>
        </div>
      </div>

      <div className="card" style={{ padding: 14, marginTop: 12 }}>
        <div className="txt-caption" style={{ marginBottom: 8 }}>Tema</div>
        <div style={{ display: 'flex', gap: 8 }}>
          {(['system', 'light', 'dark'] as const).map((t) => (
            <button key={t} className={settings.theme === t ? 'btn btn-primary' : 'btn btn-secondary'} style={{ flex: 1, padding: '8px 6px', fontSize: 13 }} onClick={() => update({ theme: t })}>
              {t === 'system' ? 'Sistem' : t === 'light' ? 'Terang' : 'Gelap'}
            </button>
          ))}
        </div>
      </div>

      <div className="card" style={{ padding: 14, marginTop: 12 }}>
        <div className="row between">
          <div>
            <div className="txt-label" style={{ fontWeight: 500 }}>Sembunyikan saldo</div>
            <div className="txt-caption">Nominal diganti ••••••</div>
          </div>
          <button className="btn btn-ghost" onClick={() => update({ hideBalances: !settings.hideBalances })}>
            {settings.hideBalances ? 'Aktif' : 'Nonaktif'}
          </button>
        </div>
      </div>

      <div className="card" style={{ padding: 14, marginTop: 12 }}>
        <div className="row between">
          <div>
            <div className="txt-label" style={{ fontWeight: 500 }}>Pengingat harian</div>
            <div className="txt-caption">Notifikasi "Sudah catat hari ini?" jam 20:00</div>
          </div>
          <button className="btn btn-ghost" onClick={async () => {
            if (!settings.dailyReminder) {
              const perm = await requestNotificationPermission();
              if (perm !== 'granted') {
                alert('Izin notifikasi ditolak. Aktifkan di pengaturan browser/HP.');
                return;
              }
              scheduleDailyReminder();
            }
            update({ dailyReminder: !settings.dailyReminder });
          }}>
            {settings.dailyReminder ? 'Aktif' : 'Nonaktif'}
          </button>
        </div>
      </div>

      <div className="stack" style={{ marginTop: 16 }}>
        <Link to="/settings/appearance" style={{ textDecoration: 'none', color: 'inherit' }}><div className="card" style={{ padding: 14 }}><div className="txt-label" style={{ fontWeight: 600 }}>Tampilan</div><div className="txt-caption">Tema, sembunyikan saldo</div></div></Link>
        <Link to="/settings/security" style={{ textDecoration: 'none', color: 'inherit' }}><div className="card" style={{ padding: 14 }}><div className="txt-label" style={{ fontWeight: 600 }}>Keamanan</div><div className="txt-caption">PIN, Face ID</div></div></Link>
        <Link to="/settings/backup" style={{ textDecoration: 'none', color: 'inherit' }}><div className="card" style={{ padding: 14 }}><div className="txt-label" style={{ fontWeight: 600 }}>Backup & data</div><div className="txt-caption">Ekspor, impor, CSV</div></div></Link>
      </div>

      <div style={{ textAlign: 'center', marginTop: 24, color: 'var(--text-faint)', fontSize: 12 }}>
        {wallets?.length ?? 0} dompet tersimpan · Dompet 1.0.0
      </div>
    </div>
  );
}
