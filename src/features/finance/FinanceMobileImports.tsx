import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, Text, TextInput, View } from 'react-native';
import { api, errorMessage } from '../../services/api';
import { Card } from '../../components/ui';
import { colors } from '../../config';

type ImportSource = { id: string; name: string; kind: string; active: boolean; sheet_tab?: string | null; status: string; headers: string[]; mapping: Record<string, string>; last_success_at?: string | null; last_error?: string | null; counts: Record<string, number> };
type ImportRow = { id: string; row_number: number; row_key: string; status: string; normalized?: Record<string, string | null>; error?: string | null };
type ImportPreview = ImportSource & { rows: ImportRow[]; preview_limit: number };
const mappingFields = [
  ['row_id', 'Stable row ID'], ['record_type', 'Invoice or bill type'], ['counterparty', 'Customer or supplier'],
  ['reference_number', 'Invoice / bill number'], ['issue_date', 'Issue date'], ['due_date', 'Due date'],
  ['currency', 'Currency'], ['total_amount', 'Total amount (required)'],
];

export function FinanceMobileImports({ initialSourceId, onUpload, onApplied }: { initialSourceId: string | null; onUpload: () => void; onApplied: () => Promise<void> }) {
  const [sources, setSources] = useState<ImportSource[]>([]);
  const [email, setEmail] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState(initialSourceId);
  const [preview, setPreview] = useState<ImportPreview | null>(null);
  const [mapping, setMapping] = useState<Record<string, string>>({});
  const [openField, setOpenField] = useState<string | null>(null);
  const [selectedRows, setSelectedRows] = useState<string[]>([]);
  const [name, setName] = useState('');
  const [url, setUrl] = useState('');
  const [tab, setTab] = useState('');
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState('');

  async function load(id: string | null = selectedId) {
    try {
      const [all, config] = await Promise.all([api.get<ImportSource[]>('/finance/imports'), api.get<{ google_service_email: string | null }>('/finance/imports/config')]);
      setSources(all.data); setEmail(config.data.google_service_email);
      if (id) {
        const response = await api.get<ImportPreview>(`/finance/imports/${id}`);
        setPreview(response.data); setMapping(response.data.mapping || {});
        setSelectedRows(response.data.rows.filter((row) => row.status === 'new' || row.status === 'changed').map((row) => row.id));
      }
      setNotice('');
    } catch (e) { setNotice(errorMessage(e)); }
  }
  useEffect(() => { setSelectedId(initialSourceId); void load(initialSourceId); }, [initialSourceId]); // eslint-disable-line react-hooks/exhaustive-deps

  async function connect() {
    setBusy(true);
    try {
      const { data } = await api.post<ImportSource>('/finance/imports/google-sheets', { name: name.trim(), url: url.trim(), tab: tab.trim() || null }, { timeout: 60_000 });
      setSelectedId(data.id); await load(data.id); setNotice('Sheet connected. Map the columns before importing.');
    } catch (e) { setNotice(errorMessage(e)); }
    finally { setBusy(false); }
  }
  async function saveMapping() {
    if (!preview) return;
    setBusy(true);
    try { await api.put(`/finance/imports/${preview.id}/mapping`, { mapping }); await load(preview.id); setNotice('Mapping saved. Review the staged rows.'); }
    catch (e) { setNotice(errorMessage(e)); }
    finally { setBusy(false); }
  }
  async function sync() {
    if (!preview) return;
    setBusy(true);
    try {
      const { data } = await api.post<ImportSource>(`/finance/imports/${preview.id}/sync`, null, { timeout: 60_000 });
      await load(preview.id);
      setNotice(data.status === 'failed' ? data.last_error || 'Sync failed.' : 'Source checked. Preview updated.');
    } catch (e) { setNotice(errorMessage(e)); }
    finally { setBusy(false); }
  }
  async function toggleConnection() {
    if (!preview || preview.kind !== 'google_sheets') return;
    setBusy(true);
    try {
      const wasActive = preview.active;
      await api.post(`/finance/imports/${preview.id}/${wasActive ? 'disconnect' : 'reconnect'}`, null, { timeout: 60_000 });
      await load(preview.id);
      setNotice(wasActive ? 'Automatic sync stopped. Saved records remain.' : 'Sheet reconnected and checked.');
    } catch (e) { setNotice(errorMessage(e)); }
    finally { setBusy(false); }
  }
  async function apply(all: boolean) {
    if (!preview) return;
    setBusy(true);
    try {
      const { data } = await api.post<{ applied: number }>(`/finance/imports/${preview.id}/apply`, { row_ids: all ? [] : selectedRows, all_pending: all });
      await onApplied(); await load(preview.id); setNotice(`${data.applied} row(s) sent to finance review.`);
    } catch (e) { setNotice(errorMessage(e)); }
    finally { setBusy(false); }
  }
  const eligible = (preview?.counts?.new || 0) + (preview?.counts?.changed || 0);

  return <View className="gap-4">
    <Card className="p-4"><Text className="font-semibold text-[17px] text-white">Finance imports</Text><Text className="mt-2 font-sans text-[12px] leading-[18px] text-muted">Map columns once, preview changes and duplicates, then send selected rows to review. Only confirmed records enter totals.</Text><Pressable accessibilityRole="button" onPress={onUpload} className="mt-4 items-center rounded-xl bg-lilac p-3"><Text className="font-semibold text-[12px] text-[#21182d]">Upload Excel or CSV</Text></Pressable></Card>
    <Card className="p-4"><Text className="font-semibold text-[14px] text-white">Google Sheets · private live source</Text>{email ? <Text className="mt-2 font-sans text-[11px] leading-[17px] text-muted">Share the sheet with {email} as Viewer. Changes are checked every 15 minutes while the backend runs.</Text> : <Text className="mt-2 font-sans text-[11px] text-amber">Server setup needed: configure ZENGENAI_GOOGLE_SERVICE_ACCOUNT_FILE.</Text>}
      <TextInput accessibilityLabel="Source name" placeholder="Source name" placeholderTextColor={colors.muted} value={name} onChangeText={setName} className="mt-3 rounded-xl border border-line bg-raised px-3 py-3 text-[12px] text-white" />
      <TextInput accessibilityLabel="Google Sheets URL" placeholder="Google Sheets URL" placeholderTextColor={colors.muted} autoCapitalize="none" value={url} onChangeText={setUrl} className="mt-2 rounded-xl border border-line bg-raised px-3 py-3 text-[12px] text-white" />
      <TextInput accessibilityLabel="Tab name" placeholder="Tab name (optional)" placeholderTextColor={colors.muted} value={tab} onChangeText={setTab} className="mt-2 rounded-xl border border-line bg-raised px-3 py-3 text-[12px] text-white" />
      <Pressable accessibilityRole="button" disabled={!email || !name.trim() || !url.trim() || busy} onPress={() => void connect()} className="mt-3 items-center rounded-xl border border-lilac/30 p-3 disabled:opacity-40"><Text className="font-semibold text-[12px] text-lilac">Connect sheet</Text></Pressable>
    </Card>
    {notice ? <Text accessibilityRole="alert" className="rounded-xl border border-lilac/20 bg-lilac/5 p-3 text-[12px] text-lilac">{notice}</Text> : null}
    {busy ? <ActivityIndicator color={colors.lilac} /> : null}
    <Card className="p-4"><Text className="font-semibold text-[14px] text-white">Your sources</Text>{sources.map((source) => <Pressable key={source.id} accessibilityRole="button" onPress={() => { setSelectedId(source.id); void load(source.id); }} className={`mt-2 rounded-xl border p-3 ${source.id === selectedId ? 'border-lilac bg-lilac/10' : 'border-line bg-raised'}`}><Text className="font-semibold text-[12px] text-white">{source.name}</Text><Text className="mt-1 font-sans text-[11px] text-muted">{source.kind === 'google_sheets' ? 'Google Sheets' : 'Uploaded file'} · {source.status.replaceAll('_', ' ')}</Text><Text className="mt-1 font-sans text-[10px] text-lilac">Last successful sync: {source.last_success_at ? new Date(source.last_success_at).toLocaleString() : 'Never'}</Text></Pressable>)}{!sources.length ? <Text className="mt-3 text-[12px] text-muted">No sources yet.</Text> : null}</Card>
    {preview ? <Card className="p-4"><View className="flex-row items-start justify-between gap-2"><View className="flex-1"><Text className="font-semibold text-[15px] text-white">{preview.name}</Text><Text className="mt-1 text-[11px] text-muted">{preview.status.replaceAll('_', ' ')} · {preview.sheet_tab || 'file'}</Text></View><Pressable accessibilityRole="button" disabled={busy || (preview.kind === 'google_sheets' && !preview.active)} onPress={() => void sync()} className="rounded-lg border border-lilac/30 px-3 py-2"><Text className="text-[11px] text-lilac">Check changes</Text></Pressable></View>{preview.kind === 'google_sheets' ? <Pressable accessibilityRole="button" disabled={busy} onPress={() => void toggleConnection()} className="mt-3 self-start rounded-lg border border-lilac/30 px-3 py-2"><Text className="text-[11px] text-lilac">{preview.active ? 'Disconnect sheet' : 'Reconnect sheet'}</Text></Pressable> : null}{preview.last_error ? <Text className="mt-2 text-[11px] text-rose">{preview.last_error}</Text> : null}
      <Text className="mb-2 mt-4 font-semibold text-[13px] text-white">Column mapping</Text>{mappingFields.map(([field, label]) => <View key={field} className="mb-2"><Pressable accessibilityRole="button" onPress={() => setOpenField(openField === field ? null : field)} className="rounded-lg border border-line bg-raised p-3"><Text className="text-[11px] text-muted">{label}</Text><Text className="mt-1 font-semibold text-[12px] text-white">{mapping[field] || 'Not mapped'} ▾</Text></Pressable>{openField === field ? <View className="rounded-b-lg border border-line p-2">{['', ...(field === 'record_type' ? ['__invoice', '__expense'] : []), ...preview.headers].map((option) => <Pressable key={option || 'none'} accessibilityRole="button" onPress={() => { setMapping({ ...mapping, [field]: option }); setOpenField(null); }} className="p-2"><Text className="text-[12px] text-lilac">{option === '__invoice' ? 'All customer invoices' : option === '__expense' ? 'All supplier bills' : option || 'Not mapped'}</Text></Pressable>)}</View> : null}</View>)}
      <Pressable accessibilityRole="button" disabled={!mapping.total_amount || busy} onPress={() => void saveMapping()} className="mt-2 items-center rounded-xl bg-lilac p-3 disabled:opacity-40"><Text className="font-semibold text-[12px] text-[#21182d]">Save mapping & preview</Text></Pressable>
      {preview.status === 'ready' ? <><View className="mt-4 flex-row flex-wrap gap-2">{Object.entries(preview.counts).map(([status, count]) => <Text key={status} className="rounded-full border border-line px-2 py-1 text-[10px] text-muted">{count} {status}</Text>)}</View><Text className="mt-3 font-sans text-[11px] leading-[17px] text-amber">Changed rows return existing records to review when applied. Duplicates and invalid rows are skipped. Missing rows never delete records.</Text>
        {preview.rows.map((row) => <Pressable key={row.id} accessibilityRole="checkbox" accessibilityState={{ checked: selectedRows.includes(row.id), disabled: !['new', 'changed'].includes(row.status) }} disabled={!['new', 'changed'].includes(row.status)} onPress={() => setSelectedRows((current) => current.includes(row.id) ? current.filter((id) => id !== row.id) : [...current, row.id])} className="mt-2 rounded-xl border border-line bg-raised p-3"><Text className="font-semibold text-[11px] text-white">{selectedRows.includes(row.id) ? '☑ ' : '□ '}Row {row.row_number} · {row.status}</Text><Text className="mt-1 font-sans text-[11px] text-muted">{row.normalized?.counterparty || row.row_key} · {row.normalized?.currency || ''} {row.normalized?.total_amount || ''}</Text>{row.error ? <Text className="mt-1 text-[10px] text-rose">{row.error}</Text> : null}</Pressable>)}
        {eligible > preview.rows.length ? <Text className="mt-2 text-[11px] text-muted">Showing the first {preview.preview_limit} rows. Use Send all for the remaining eligible rows.</Text> : null}
        <View className="mt-4 gap-2"><Pressable accessibilityRole="button" disabled={!selectedRows.length || busy} onPress={() => void apply(false)} className="items-center rounded-xl bg-lilac p-3 disabled:opacity-40"><Text className="font-semibold text-[12px] text-[#21182d]">Send selected to review ({selectedRows.length})</Text></Pressable><Pressable accessibilityRole="button" disabled={!eligible || busy} onPress={() => void apply(true)} className="items-center rounded-xl border border-lilac/30 p-3 disabled:opacity-40"><Text className="font-semibold text-[12px] text-lilac">Send all eligible to review ({eligible})</Text></Pressable></View>
      </> : null}
    </Card> : null}
  </View>;
}
