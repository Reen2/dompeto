import { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { listCategories, saveCategory, deleteCategory, archiveCategory } from '../db/queries';
import Icon from '../components/Icon';
import PageHeader from '../components/PageHeader';

const COLORS = ['#A8813C', '#2F7A5A', '#A84A3C', '#3C6FA8', '#B8862E', '#6B6358'];

export default function Categories() {
  const [type, setType] = useState<'expense' | 'income'>('expense');
  const cats = useLiveQuery(() => listCategories(type, true), [type]);
  const ICONS = ['tag','food','car','cart','home','heart','book','gift','coffee','phone','wifi','game','plane','music','shirt','bank','briefcase','graduation','dumbbell','baby','pet','tool','stethoscope','sun','star','smile','camera','film','bike','leaf','moon','chart','wallet','calendar','flag','sparkles','repeat','person','grid'];
  const [name, setName] = useState('');
  const [color, setColor] = useState(COLORS[0]);
  const [icon, setIcon] = useState('tag');
  const [adding, setAdding] = useState(false);

  async function add() {
    if (!name.trim()) return;
    await saveCategory({ name: name.trim(), type, color, icon });
    setName('');
    setIcon('tag');
    setAdding(false);
  }

  return (
    <div className="screen">
      <PageHeader title="Kategori" subtitle="Rapikan jenis pemasukan & pengeluaran" />
      <div style={{ display: 'flex', gap: 6, marginTop: 12 }}>
        {(['expense', 'income'] as const).map((t) => (
          <button key={t} onClick={() => setType(t)} style={{
            flex: 1, padding: '8px', borderRadius: 10, border: '1px solid var(--border)',
            background: type === t ? 'var(--accent)' : 'var(--surface)',
            color: type === t ? 'var(--on-accent)' : 'var(--text-muted)',
            fontWeight: 600, fontSize: 13, cursor: 'pointer',
          }}>{t === 'expense' ? 'Pengeluaran' : 'Pemasukan'}</button>
        ))}
      </div>

      <div className="stack" style={{ marginTop: 14 }}>
        {(cats ?? []).map((c) => (
          <div key={c.id} className="card" style={{ padding: 12, display: 'flex', alignItems: 'center', gap: 10, opacity: c.archived_at ? 0.5 : 1 }}>
            <div style={{ width: 32, height: 32, borderRadius: 10, background: `${c.color}22`, color: c.color, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Icon name={c.icon} size={16} color={c.color} />
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 14, fontWeight: 500 }}>{c.name}</div>
              <div className="txt-caption" style={{ fontSize: 11 }}>{c.archived_at ? 'Arsip' : 'Aktif'}</div>
            </div>
            <button className="btn btn-ghost" style={{ padding: '4px 8px', fontSize: 11 }} onClick={() => archiveCategory(c.id, !c.archived_at)}>
              {c.archived_at ? 'Aktifkan' : 'Arsipkan'}
            </button>
            <button className="btn btn-ghost" style={{ padding: '4px 8px', fontSize: 11, color: 'var(--expense)' }} onClick={async () => { const r = await deleteCategory(c.id); if (!r.ok) alert(r.reason); }}>
              Hapus
            </button>
          </div>
        ))}
      </div>

      {!adding ? (
        <button className="btn btn-secondary" style={{ marginTop: 16, width: '100%' }} onClick={() => setAdding(true)}>
          <Icon name="plus" size={16} /> Tambah kategori
        </button>
      ) : (
        <div className="card" style={{ padding: 14, marginTop: 16 }}>
          <input className="input" placeholder="Nama kategori" value={name} onChange={(e) => setName(e.target.value)} enterKeyHint="done" />
          <div style={{ display: 'flex', gap: 6, marginTop: 10, flexWrap: 'wrap' }}>
            {COLORS.map((col) => (
              <button key={col} onClick={() => setColor(col)} style={{ width: 26, height: 26, borderRadius: 13, background: col, border: color === col ? '2.5px solid var(--text)' : 'none', cursor: 'pointer' }} />
            ))}
          </div>
          <div className="txt-caption" style={{ marginTop: 10, marginBottom: 6 }}>Ikon</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, maxHeight: 120, overflowY: 'auto' }}>
            {ICONS.map((ic) => (
              <button key={ic} onClick={() => setIcon(ic)} style={{
                width: 36, height: 36, borderRadius: 10, border: '1.5px solid',
                borderColor: icon === ic ? color : 'var(--border)',
                background: icon === ic ? `${color}22` : 'var(--surface-alt)',
                color: icon === ic ? color : 'var(--text-muted)',
                display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer',
              }}>
                <Icon name={ic} size={17} />
              </button>
            ))}
          </div>
          <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
            <button className="btn btn-primary" onClick={add}>Simpan</button>
            <button className="btn btn-ghost" onClick={() => { setAdding(false); setName(''); }}>Batal</button>
          </div>
        </div>
      )}
    </div>
  );
}
