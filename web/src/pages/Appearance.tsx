import { useSettings } from '../store/settings';
import PageHeader from '../components/PageHeader';

export default function Appearance() {
  const { settings, update } = useSettings();
  return (
    <div className="screen">
      <PageHeader title="Tampilan" />
      <div className="card" style={{ padding: 14, marginTop: 16 }}>
        <div className="txt-caption" style={{ marginBottom: 8 }}>Tema</div>
        <div style={{ display: 'flex', gap: 8 }}>
          {(['system', 'light', 'dark'] as const).map((t) => (
            <button key={t} className={settings.theme === t ? 'btn btn-primary' : 'btn btn-secondary'} style={{ flex: 1, padding: '10px 6px', fontSize: 13 }} onClick={() => update({ theme: t })}>
              {t === 'system' ? 'Sistem' : t === 'light' ? 'Terang' : 'Gelap'}
            </button>
          ))}
        </div>
        <p className="txt-caption" style={{ marginTop: 8, fontSize: 11 }}>Mode gelap aktif otomatis bila memilih "Sistem".</p>
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
    </div>
  );
}
