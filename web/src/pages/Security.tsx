import PageHeader from '../components/PageHeader';

export default function Security() {
  return (
    <div className="screen">
      <PageHeader title="Keamanan" />
      <div className="card" style={{ padding: 14, marginTop: 16 }}>
        <div className="txt-label" style={{ fontWeight: 600, marginBottom: 6 }}>Kunci aplikasi</div>
        <p className="txt-caption" style={{ fontSize: 13, lineHeight: 1.5 }}>
          Versi web (PWA) tidak mendukung PIN & Face ID seperti aplikasi native. Keamanan data bergantung pada keamanan perangkatmu (kunci layar iPhone/Android) dan browser.
        </p>
        <p className="txt-caption" style={{ fontSize: 13, lineHeight: 1.5, marginTop: 8 }}>
          Tips: aktifkan kunci layar HP, jangan bagikan file backup (JSON) ke orang lain, dan cadangkan data secara rutin.
        </p>
      </div>
    </div>
  );
}
