import { useNavigate } from 'react-router-dom';
import Icon from './Icon';

export default function PageHeader({ title, subtitle, right }: { title: string; subtitle?: string; right?: React.ReactNode }) {
  const navigate = useNavigate();
  return (
    <div className="row between" style={{ paddingTop: 4, paddingBottom: 14 }}>
      <button
        onClick={() => navigate(-1)}
        aria-label="Kembali"
        style={{
          display: 'flex', alignItems: 'center', gap: 6,
          background: 'none', border: 'none', cursor: 'pointer',
          color: 'var(--text-muted)', padding: '6px 8px 6px 0', marginLeft: -4,
          fontSize: 14, fontWeight: 500,
        }}
      >
        <Icon name="chevron-left" size={20} color="var(--text-muted)" />
        <span>Kembali</span>
      </button>
      <div style={{ textAlign: 'right' }}>
        <h1 className="txt-h1" style={{ margin: 0, fontSize: 20 }}>{title}</h1>
        {subtitle && <div className="txt-caption" style={{ fontSize: 11, marginTop: 2 }}>{subtitle}</div>}
      </div>
      {right ? <div>{right}</div> : <div style={{ width: 70 }} />}
    </div>
  );
}
