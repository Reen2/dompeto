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
  const [profileAvatar, setProfileAvatar] = useState(settings.profile_avatar || '');
  const wallets = useLiveQuery(() => listWallets(true), []);

  // Handle avatar upload
  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    // Only allow images
    if (!file.type.startsWith('image/')) {
      alert('Pilih file gambar');
      return;
    }
    // Read as data URL
    const reader = new FileReader();
    reader.onload = (e: any) => {
      const dataUrl = e.target.result;
      // Set immediately
      setProfileAvatar(dataUrl);
      update({ profile_avatar: dataUrl });
    };
    reader.readAsDataURL(file);
  };

  return (
    <div className="screen">
      <PageHeader title="Pengaturan" />

      {/* Profile avatar section */}
      <div className="card" style={{ padding: 14, marginTop: 12, textAlign: 'center' }}>
        <div>
          {profileAvatar ? (
            <img
              src={profileAvatar}
              alt="Avatar"
              style={{ width: 100, height: 100, borderRadius: '50%', objectFit: 'cover' }}
            />
          ) : (
            <div
              style={{
                width: 100,
                height: 100,
                borderRadius: '50%',
                background: '#E8E4DC',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#6B6358',
                fontWeight: 500,
                margin: 'auto',
              }}>
              {settings.name?.[0]?.toUpperCase() || 'U'}
            </div>
          )}
          <input
            type="file"
            accept="image/*"
            onChange={handleAvatarChange}
            style={{ display: 'none' }}
            aria-label="Ubah foto profil"
            ref={(el) => {
              if (el) el.id = 'avatar-input';
            }}
          />
          <button className="btn btn-ghost" style={{ marginTop: 8, width: '100%' }} onClick={() => document.getElementById('avatar-input')?.click()}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M21 15a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V3a2 2 0 0 1 2-2h11l5 5v5a2 2 0 0 1-2 2z" />
            </svg>
            Ganti
          </button>
        </div>
      </div>

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
