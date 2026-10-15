import * as DocumentPicker from 'expo-document-picker';
import { MAX_BACKUP_SIZE } from '../core/backup';
export async function exportBackupFile(raw: string, filename: string): Promise<string> {
  const blob = new Blob([raw], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url; link.download = filename;
  document.body.appendChild(link); link.click(); link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 60000);
  return 'Download requested. Check your browser’s downloads and save the backup somewhere you can find it.';
}
export async function pickBackupFile(): Promise<{ name: string; text: string } | null> {
  const result = await DocumentPicker.getDocumentAsync({ type: '*/*', multiple: false, base64: false });
  if (result.canceled) return null;
  const asset = result.assets[0];
  if (!asset.file) throw new Error('This browser could not read the selected file.');
  if (asset.file.size > MAX_BACKUP_SIZE) throw new Error('Choose a Rilo backup smaller than 5 MB.');
  return { name: asset.name, text: await asset.file.text() };
}
