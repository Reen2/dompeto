import { useState, useRef, useEffect } from 'react';
import { db } from '../db/db';
import { exportSnapshot, exportTransactionsCsv } from '../lib/backup';
import PageHeader from '../components/PageHeader';
// (removed unused import)

export default function Backup() {
  const [msg, setMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [lastBackup, setLastBackup] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    db.settings.get('lastBackup').then((r) => { if (r) setLastBackup(r.value); });
  }, []);

  const daysSince = lastBackup ? Math.floor((Date.now() - new Date(lastBackup).getTime()) / 86400000) : null;
  const needReminder = daysSince === null || daysSince >= 7;

  async function markBacked() {
    const now = new Date().toISOString();
    await db.settings.put({ key: 'lastBackup', value: now });
    setLastBackup(now);
  }

  async function handleExportJson() {
    setBusy(true);
    try {
      const snap = await exportSnapshot();
      const blob = new Blob([JSON.stringify(snap, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `dompet-${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(url);
      await markBacked();
      setMsg('Backup JSON berhasil diunduh. Cadangan terakhir diperbarui.');
    } catch (e) {
      setMsg('Gagal mengekspor: ' + (e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function handleExportCsv() {
    setBusy(true);
    try {
      const csv = await exportTransactionsCsv();
      const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `dompet-transaksi-${new Date().toISOString().slice(0, 10)}.csv`;
      a.click();
      URL.revokeObjectURL(url);
      setMsg('Ekspor CSV berhasil diunduh.');
    } catch (e) {
      setMsg('Gagal mengekspor CSV: ' + (e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function handleImport(file: File) {
    if (!confirm('Impor akan menimpa data yang ada. Lanjutkan?')) return;
    setBusy(true);
    try {
      const text = await file.text();
      const snap = JSON.parse(text);
      if (!snap || snap.app !== 'dompet' || typeof snap.data !== 'object' || snap.data === null) {
        throw new Error('File backup tidak dikenali (app bukan "dompet").');
      }
      await db.transaction('rw', db.tables, async () => {
        for (const t of db.tables) await t.clear();
        for (const name of Object.keys(snap.data)) {
          const table = (db as any)[name];
          if (table && Array.isArray(snap.data[name])) {
            const rows = snap.data[name].filter((r: any) => r && typeof r === 'object');
            if (rows.length) await table.bulkAdd(rows);
          }
        }
      });
      setMsg('Restore berhasil. Memuat ulang…');
      setTimeout(() => window.location.reload(), 1200);
    } catch (e) {
      setMsg('Gagal impor: ' + (e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="screen">
      <PageHeader title="Backup & data" subtitle="Cadangkan & pulihkan data" />

      {needReminder && (
        <div className="card" style={{ padding: 12, marginBottom: 12, background: 'var(--accent-soft)', border: '1px solid var(--accent)' }}>
          <div className="row" style={{ gap: 8 }}>
            <span style={{ fontSize: 18 }}>⚠️</span>
            <div>
              <div className="txt-label" style={{ fontWeight: 600, color: 'var(--accent)' }}>Saatnya cadangkan data</div>
              <div className="txt-caption" style={{ fontSize: 11 }}>
                {lastBackup ? `Cadangan terakhir ${daysSince} hari lalu.` : 'Belum pernah mencadangkan.'} Cadangkan minimal seminggu sekali.
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="card" style={{ padding: 14, marginTop: 4 }}>
        <div className="txt-label" style={{ fontWeight: 600, marginBottom: 6 }}>Ekspor</div>
        <div className="txt-caption" style={{ marginBottom: 10 }}>Unduh seluruh data sebagai file JSON (semua tabel) atau CSV (transaksi).</div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <button className="btn btn-primary" onClick={handleExportJson} disabled={busy}>Ekspor JSON</button>
          <button className="btn btn-secondary" onClick={handleExportCsv} disabled={busy}>Ekspor CSV</button>
        </div>
        {lastBackup && (
          <div className="txt-caption" style={{ marginTop: 8, fontSize: 11 }}>Cadangan terakhir: {new Date(lastBackup).toLocaleString('id-ID')}</div>
        )}
      </div>

      <div className="card" style={{ padding: 14, marginTop: 12 }}>
        <div className="txt-label" style={{ fontWeight: 600, marginBottom: 6 }}>Impor</div>
        <div className="txt-caption" style={{ marginBottom: 10 }}>Pulihkan dari file backup JSON. Data yang ada akan ditimpa.</div>
        <input ref={fileRef} type="file" accept="application/json,.json" style={{ display: 'none' }} onChange={(e) => { const f = e.target.files?.[0]; if (f) handleImport(f); e.target.value = ''; }} />
        <button className="btn btn-secondary" onClick={() => fileRef.current?.click()} disabled={busy}>Pilih file backup</button>
      </div>

      {msg && (
        <div className="card" style={{ padding: 12, marginTop: 12, background: 'var(--accent-soft)', color: 'var(--accent)' }}>
          {msg}
        </div>
      )}

      <div className="txt-caption" style={{ marginTop: 16, fontSize: 12, textAlign: 'center' }}>
        Ingat: cadangkan data minimal seminggu sekali. Simpan file di iCloud Drive atau kirim ke diri sendiri.
      </div>
    </div>
  );
}
