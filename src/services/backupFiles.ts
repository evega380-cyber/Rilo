import * as DocumentPicker from 'expo-document-picker';
import { File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { MAX_BACKUP_SIZE } from '../core/backup';
export async function exportBackupFile(raw: string, filename: string): Promise<string> {
  if (!await Sharing.isAvailableAsync()) throw new Error('File sharing is unavailable on this device.');
  const file = new File(Paths.cache, filename);
  file.create({ overwrite: true });
  try {
    file.write(raw);
    await Sharing.shareAsync(file.uri, { mimeType: 'application/json', UTI: 'public.json', dialogTitle: 'Save your Rilo backup' });
    return 'Backup opened in the save/share sheet. Choose Save to Files or another safe location to keep it.';
  } finally { if (file.exists) file.delete(); }
}
export async function pickBackupFile(): Promise<{ name: string; text: string } | null> {
  const result = await DocumentPicker.getDocumentAsync({ type: '*/*', multiple: false, copyToCacheDirectory: true });
  if (result.canceled) return null;
  const asset = result.assets[0];
  const file = new File(asset.uri);
  try {
    if ((asset.size ?? file.size) > MAX_BACKUP_SIZE) throw new Error('Choose a Rilo backup smaller than 5 MB.');
    return { name: asset.name, text: await file.text() };
  } finally { if (file.exists) file.delete(); }
}
