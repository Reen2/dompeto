import * as DocumentPicker from 'expo-document-picker';
import { File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';

import { exportSnapshot, exportTransactionsCsv, importSnapshot, type Snapshot } from '@/db/queries';
import { todayISO } from '@/lib/dates';

export type BackupResult = {
  ok: boolean;
  canceled?: boolean;
  /** Human readable message, safe to show in an alert. */
  message?: string;
};

function fileName(extension: string) {
  const stamp = new Date()
    .toISOString()
    .replace(/[:.]/g, '-')
    .slice(0, 19);
  return `dompet-${todayISO()}-${stamp.slice(11)}.${extension}`;
}

async function writeTempFile(name: string, contents: string) {
  const file = new File(Paths.cache, name);
  if (file.exists) file.delete();
  file.create({ intermediates: true, overwrite: true });
  await file.write(contents);
  return file;
}

async function shareFile(file: File, mimeType: string, title: string) {
  if (!(await Sharing.isAvailableAsync())) {
    return { ok: false, message: 'Berbagi file tidak tersedia di perangkat ini.' } satisfies BackupResult;
  }
  await Sharing.shareAsync(file.uri, {
    mimeType,
    dialogTitle: title,
    UTI: mimeType === 'text/csv' ? 'public.comma-separated-values-text' : 'public.json',
  });
  return { ok: true } satisfies BackupResult;
}

/** Writes the full database snapshot to a temp JSON file and opens the share sheet. */
export async function shareBackup(): Promise<BackupResult> {
  try {
    const snapshot = await exportSnapshot();
    const file = await writeTempFile(fileName('json'), JSON.stringify(snapshot, null, 2));
    return await shareFile(file, 'application/json', 'Simpan backup Dompet');
  } catch (error) {
    return { ok: false, message: errorMessage(error) };
  }
}

/** Writes every transaction as CSV (Excel friendly: UTF-8 BOM) and opens the share sheet. */
export async function shareTransactionsCsv(): Promise<BackupResult> {
  try {
    const csv = await exportTransactionsCsv();
    const file = await writeTempFile(fileName('csv'), `\uFEFF${csv}`);
    return await shareFile(file, 'text/csv', 'Ekspor transaksi');
  } catch (error) {
    return { ok: false, message: errorMessage(error) };
  }
}

/**
 * Lets the user pick a Dompet JSON backup and restores it, replacing all
 * existing data. Callers should confirm with the user before calling this.
 */
export async function restoreBackup(): Promise<BackupResult> {
  try {
    const picked = await DocumentPicker.getDocumentAsync({
      type: ['public.json', 'application/json', 'text/plain'],
      copyToCacheDirectory: true,
      multiple: false,
    });
    if (picked.canceled || !picked.assets?.length) {
      return { ok: false, canceled: true };
    }

    const asset = picked.assets[0];
    const raw = await new File(asset.uri).text();
    let parsed: unknown;
    try {
      parsed = JSON.parse(raw);
    } catch {
      return { ok: false, message: 'File yang dipilih bukan backup Dompet yang valid.' };
    }

    await importSnapshot(parsed as Snapshot, true);
    return { ok: true, message: 'Data berhasil dipulihkan dari backup.' };
  } catch (error) {
    return { ok: false, message: errorMessage(error) };
  }
}

/** Rough record count per table, for the "what will be replaced" copy. */
export async function snapshotStats(): Promise<{ transactions: number; wallets: number; categories: number }> {
  try {
    const snapshot = await exportSnapshot();
    return {
      transactions: snapshot.data.transactions?.length ?? 0,
      wallets: snapshot.data.wallets?.length ?? 0,
      categories: snapshot.data.categories?.length ?? 0,
    };
  } catch {
    return { transactions: 0, wallets: 0, categories: 0 };
  }
}

function errorMessage(error: unknown): string {
  if (error instanceof Error && error.message) return error.message;
  return 'Terjadi kesalahan. Coba lagi.';
}
