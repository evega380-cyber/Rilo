import React, { useState } from 'react';
import { Text, View } from 'react-native';
import { Screen, Button } from '../components/ui';
import { styles as s } from '../components/styles';
import { backupFilename, createBackup, readBackup } from '../core/backup';
import type { Backup } from '../core/backup';
import { useBudget } from '../state/BudgetProvider';
import { exportBackupFile, pickBackupFile } from '../services/backupFiles';

export default function BackupScreen() {
  const { budget, restore, canUndoRestore, undoRestore } = useBudget();
  const [preview, setPreview] = useState<{ name: string; data: Backup } | null>(null);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [exporting, setExporting] = useState(false);
  const [undoConfirm, setUndoConfirm] = useState(false);
  async function exportFile() {
    if (exporting) return;
    setExporting(true); setError(''); setMessage('');
    try { setMessage(await exportBackupFile(createBackup(budget), backupFilename())); }
    catch (e) { setError((e as Error).message || 'Could not export your backup.'); }
    finally { setExporting(false); }
  }
  async function importFile() {
    setError(''); setMessage(''); setPreview(null); setUndoConfirm(false);
    try {
      const file = await pickBackupFile();
      if (file) setPreview({ name: file.name, data: readBackup(file.text) });
    } catch (e) { setError((e as Error).message || 'Could not read that backup. Your budget has not changed.'); }
  }
  async function confirmRestore() {
    if (!preview) return;
    try { await restore(preview.data.budget); setPreview(null); setMessage('Backup restored. You can undo this restore below.'); setError(''); }
    catch { setError('Restore could not be saved. Your current budget has not been replaced. Free some device space and try again.'); }
  }
  async function confirmUndo() {
    try { setMessage(await undoRestore()); setUndoConfirm(false); setPreview(null); setError(''); }
    catch (e) { setError((e as Error).message || 'Could not undo the restore. Try again.'); }
  }
  return <Screen><Text style={s.greetingText}>Backup & restore</Text>
    <Text style={s.subText}>Keep a copy of your budget that you can restore on this device or another one.</Text>
    {!!message && <Text accessibilityRole="alert" style={[s.green, { marginVertical: 16 }]}>{message}</Text>}
    {!!error && <Text accessibilityRole="alert" style={[s.red, { marginVertical: 16 }]}>{error}</Text>}
    <View style={[s.section, { marginTop: 20 }]}>
      <Text style={s.sectionTitle}>Save a backup</Text>
      <Text style={s.goalText}>Includes your paychecks, income, bills, repeating schedules, payment status, and income goal. Save the file in Files, Downloads, or a location you can access later.</Text>
      <Text style={s.itemSubtitle}>The backup contains your budget details and is not encrypted. Keep it somewhere private.</Text>
      <Button title={exporting ? 'Preparing backup…' : 'Export budget backup'} onPress={exportFile} />
    </View>
    <View style={s.section}>
      <Text style={s.sectionTitle}>Restore a backup</Text>
      <Text style={s.goalText}>Choose a Rilo backup file to preview. Nothing changes until you confirm. Restoring replaces your current budget rather than adding duplicate entries.</Text>
      <Button title="Choose backup file" secondary onPress={importFile} />
      {preview && <View style={{ marginTop: 20 }}>
        <Text style={s.itemTitle}>{preview.name}</Text>
        <Text style={s.itemSubtitle}>Exported {new Date(preview.data.exportedAt).toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' })}</Text>
        <Text style={s.goalText}>{preview.data.budget.paychecks.length} paychecks · {preview.data.budget.income.length} extra income entries · {preview.data.budget.bills.length} bills · {(preview.data.budget.schedules ?? []).length} repeating schedules</Text>
        <Text style={s.goalText}>Saved payment statuses stay intact. Active schedules also catch up to the next 90 days.</Text>
        <Text style={[s.red, { marginTop: 16 }]}>Replace your current budget with this backup? A recovery copy of your current budget will be saved first.</Text>
        <Button title="Confirm replace and restore" onPress={confirmRestore} />
        <Button title="Cancel restore" secondary onPress={() => setPreview(null)} />
      </View>}
    </View>
    {canUndoRestore && <View style={s.section}>
      <Text style={s.sectionTitle}>Undo last restore</Text>
      <Text style={s.goalText}>Return to the budget saved immediately before your last restore. This replaces any changes made since that restore.</Text>
      {undoConfirm ? <><Button title="Confirm undo restore" onPress={confirmUndo} /><Button title="Keep current budget" secondary onPress={() => setUndoConfirm(false)} /></> : <Button title="Undo last restore" secondary onPress={() => { setUndoConfirm(true); setPreview(null); }} />}
    </View>}
  </Screen>;
}
