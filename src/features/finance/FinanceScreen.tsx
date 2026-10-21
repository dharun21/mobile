import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, KeyboardAvoidingView, Modal, Platform, Pressable, RefreshControl, ScrollView, Text, View } from 'react-native';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import { Ionicons } from '@expo/vector-icons';
import { api, errorMessage, secureSession } from '../../services/api';
import { Alert } from '../../services/appAlert';
import { sessionStorage } from '../../services/sessionStorage';
import { Card, Copy, EmptyState, Eyebrow, Field, Heading, PrimaryButton, SectionTitle } from '../../components/ui';
import { API_BASE_URL, colors } from '../../config';
import type { FinanceDocument, FinanceOverview, FinanceRecord, FinanceStatement, FinanceWorkspace } from '../../types/api';

type Section = 'Overview' | 'Files' | 'Records' | 'Statements';
type FinanceProfile = {
  business_name: string; industry: string; country: string; currency: string; size: string;
  financial_year: string; workflows: string[]; sources: string[]; payment_terms: string;
  approval_limit: string; reviewer: string; categories: string;
};
type RecordDraft = {
  record_type: 'invoice' | 'expense'; counterparty: string; reference_number: string;
  issue_date: string; due_date: string; currency: string; subtotal: string; tax_total: string; total_amount: string;
};
const tabs: Section[] = ['Overview', 'Files', 'Records', 'Statements'];
const workflows = [
  'Customer invoices and payments received',
  'Supplier invoices and bills to pay',
  'Employee expenses and reimbursements',
  'Bank transactions and reconciliation',
  'Tax records and financial reports',
];
const sources = [
  'Excel or Google Sheets',
  'PDFs, scanned bills, or email attachments',
  'Accounting software',
  'Bank exports',
  'Multiple disconnected systems',
];

export function FinanceScreen() {
  const [section, setSection] = useState<Section>('Overview');
  const [workspace, setWorkspace] = useState<FinanceWorkspace | null>(null);
  const [overview, setOverview] = useState<FinanceOverview | null>(null);
  const [records, setRecords] = useState<FinanceRecord[]>([]);
  const [documents, setDocuments] = useState<FinanceDocument[]>([]);
  const [statements, setStatements] = useState<FinanceStatement[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [setupRequired, setSetupRequired] = useState(false);
  const [editingSetup, setEditingSetup] = useState(false);
  const [reviewTarget, setReviewTarget] = useState<FinanceRecord | null>(null);
  const [recordDraft, setRecordDraft] = useState<RecordDraft | null>(null);
  const [savingReview, setSavingReview] = useState(false);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setError('');
    try {
      const [w, d, r, o, s] = await Promise.all([
        api.get<FinanceWorkspace>('/finance/workspace'),
        api.get<FinanceDocument[]>('/finance/documents'),
        api.get<FinanceRecord[]>('/finance/records'),
        api.get<FinanceOverview>('/intelligence/overview'),
        api.get<FinanceStatement[]>('/finance/statements'),
      ]);
      setWorkspace(w.data); setDocuments(d.data); setRecords(r.data); setOverview(o.data); setStatements(s.data); setSetupRequired(false);
    } catch (e) {
      const isMissing = (e as { response?: { status?: number } })?.response?.status === 404;
      if (isMissing) setSetupRequired(true);
      else setError(errorMessage(e));
    } finally { setLoading(false); setRefreshing(false); }
  }, []);

  useEffect(() => { void load(); }, [load]);

  async function saveWorkspace(profile: FinanceProfile, files: DocumentPicker.DocumentPickerAsset[]) {
    try {
      const { data } = await api.put<FinanceWorkspace>('/finance/workspace', {
        business_name: profile.business_name.trim(), industry: profile.industry.trim() || null,
        country: profile.country.trim() || null, currency: profile.currency.trim().toUpperCase(),
        size: profile.size, financial_year: profile.financial_year, workflows: profile.workflows,
        sources: profile.sources, payment_terms: profile.payment_terms,
        approval_limit: profile.approval_limit || null, reviewer: profile.reviewer.trim() || null,
        categories: profile.categories.trim() || null, completed: true,
      });
      setWorkspace(data);
      setSetupRequired(false); setEditingSetup(false);
      for (const file of files) await uploadFile(file, false);
      setLoading(true); await load();
    } catch (e) { setError(errorMessage(e)); }
  }

  async function upload() {
    try {
      const result = await DocumentPicker.getDocumentAsync({ type: ['application/pdf', 'image/png', 'image/jpeg', 'text/csv', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'], copyToCacheDirectory: true });
      if (result.canceled || !result.assets.length) return;
      setUploading(true);
      await uploadFile(result.assets[0], true);
    } catch (e) { Alert.alert('Could not open files', errorMessage(e)); }
    finally { setUploading(false); }
  }

  async function uploadFile(file: DocumentPicker.DocumentPickerAsset, refreshAfter: boolean) {
    const body = new FormData();
    if (Platform.OS === 'web') {
      if (!file.file) throw new Error('The selected file is not available to the browser. Please choose it again.');
      body.append('file', file.file, file.name);
    } else {
      body.append('file', { uri: file.uri, name: file.name, type: file.mimeType ?? 'application/octet-stream' } as unknown as Blob);
    }
    try {
      const { data } = await api.post<FinanceDocument>('/finance/documents', body, {
        headers: Platform.OS === 'web' ? {} : { 'Content-Type': 'multipart/form-data' },
      });
      if (file.name.toLowerCase().endsWith('.pdf')) {
        try {
          const processed = await api.post(`/finance/documents/${data.id}/process`);
          const warnings = processed.data?.warnings as string[] | undefined;
          if (warnings?.length) Alert.alert('Document uploaded', warnings[0]);
        } catch (e) { Alert.alert('Uploaded for review', errorMessage(e, 'Automatic processing could not read this PDF.')); }
      } else Alert.alert('Document uploaded', 'Automatic processing currently supports text-based PDF invoices.');
      if (refreshAfter) await load();
    } catch (e) { Alert.alert('Upload failed', errorMessage(e)); }
  }

  async function process(document: FinanceDocument) {
    try {
      const { data } = await api.post(`/finance/documents/${document.id}/process`);
      const warnings = data?.warnings as string[] | undefined;
      if (warnings?.length) Alert.alert('Processing complete', warnings[0]);
      await load();
    } catch (e) { Alert.alert('Could not process document', errorMessage(e)); }
  }

  async function downloadDocument(document: FinanceDocument) {
    setDownloadingId(document.id);
    try {
      const safeName = document.original_name.replace(/[^\w.\-]/g, '_');
      const downloadPath = `/finance/documents/${encodeURIComponent(document.id)}/download`;
      if (Platform.OS === 'web') {
        const response = await api.get<Blob>(downloadPath, { responseType: 'blob' });
        const url = URL.createObjectURL(response.data);
        const link = window.document.createElement('a');
        link.href = url;
        link.download = safeName;
        link.click();
        window.setTimeout(() => URL.revokeObjectURL(url), 1000);
        return;
      }
      const directory = FileSystem.cacheDirectory;
      if (!directory) { Alert.alert('Download unavailable', 'This device could not open its temporary file storage.'); return; }
      const token = await sessionStorage.getItem(secureSession.tokenKey);
      const destination = `${directory}${Date.now()}-${safeName}`;
      const result = await FileSystem.downloadAsync(`${API_BASE_URL}${downloadPath}`, destination, { headers: token ? { Authorization: `Bearer ${token}` } : {} });
      if (result.status < 200 || result.status >= 300) throw new Error('The server did not allow this download. Check your sign-in and try again.');
      if (await Sharing.isAvailableAsync()) await Sharing.shareAsync(result.uri, { dialogTitle: `Save ${document.original_name}`, mimeType: document.content_type ?? undefined });
      else Alert.alert('Downloaded', `Saved a temporary copy of ${document.original_name}.`);
    } catch (e) { Alert.alert('Download failed', errorMessage(e, 'Could not download this document.')); }
    finally { setDownloadingId(null); }
  }

  function deleteDocument(document: FinanceDocument) {
    Alert.alert('Delete this document?', `${document.original_name} and its extracted records will be removed.`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: async () => { try { await api.delete(`/finance/documents/${document.id}`); await load(); } catch (e) { Alert.alert('Delete failed', errorMessage(e)); } } },
    ]);
  }

  async function setPayment(record: FinanceRecord) {
    const next = record.payment_status === 'paid' ? 'unpaid' : 'paid';
    try { await api.patch(`/finance/records/${record.id}/payment`, { payment_status: next }); await load(); }
    catch (e) { Alert.alert('Could not update payment', errorMessage(e)); }
  }

  async function reviewRecord(record: FinanceRecord) {
    setReviewTarget(record);
    setRecordDraft({
      record_type: record.record_type === 'expense' ? 'expense' : 'invoice',
      counterparty: record.counterparty ?? '', reference_number: record.reference_number ?? '',
      issue_date: record.issue_date ?? '', due_date: record.due_date ?? '',
      currency: record.currency ?? workspace?.currency ?? 'USD', subtotal: String(record.subtotal ?? ''),
      tax_total: String(record.tax_total ?? ''), total_amount: String(record.total_amount ?? ''),
    });
  }

  async function confirmRecord(record: FinanceRecord, draft: RecordDraft) {
    const corrections = {
      record_type: draft.record_type, counterparty: draft.counterparty.trim() || null,
      reference_number: draft.reference_number.trim() || null, issue_date: draft.issue_date.trim() || null,
      due_date: draft.due_date.trim() || null, currency: draft.currency.trim().toUpperCase() || null,
      subtotal: draft.subtotal.trim() || null, tax_total: draft.tax_total.trim() || null,
      total_amount: draft.total_amount.trim() || null,
    };
    setSavingReview(true);
    try { await api.patch(`/finance/records/${record.id}/confirm`, corrections); setReviewTarget(null); setRecordDraft(null); await load(); }
    catch (e) { Alert.alert('Could not confirm record', errorMessage(e)); }
    finally { setSavingReview(false); }
  }
  async function markUnsupported(record: FinanceRecord) {
    try { await api.patch(`/finance/records/${record.id}/mark-unsupported`); setReviewTarget(null); setRecordDraft(null); await load(); }
    catch (e) { Alert.alert('Could not update record', errorMessage(e)); }
  }

  async function setReminder(record: FinanceRecord) {
    const base = new Date(`${record.due_date ?? new Date().toISOString().slice(0, 10)}T00:00:00`);
    const options = [7, 3, 1, 0].map((days) => {
      const date = new Date(base); date.setDate(date.getDate() - days);
      return { days, date: date.toISOString().slice(0, 10) };
    }).filter(({ date }) => date >= new Date().toISOString().slice(0, 10));
    Alert.alert('Set payment reminder', 'Choose when you want to be reminded.', [
      ...options.map(({ days, date }) => ({ text: days ? `${days} days before · ${date}` : `On due date · ${date}`, onPress: () => saveReminder(record, date) })),
      ...(record.reminder_date ? [{ text: 'Clear reminder', style: 'destructive' as const, onPress: () => saveReminder(record, null) }] : []),
      { text: 'Cancel', style: 'cancel' },
    ]);
  }
  async function saveReminder(record: FinanceRecord, date: string | null) {
    try { await api.patch(`/finance/records/${record.id}/reminder`, { reminder_date: date }); await load(); }
    catch (e) { Alert.alert('Could not save reminder', errorMessage(e)); }
  }

  const money = (value: number | string | null | undefined, currency = workspace?.currency ?? 'USD') => {
    const amount = Number(value ?? 0);
    try { return new Intl.NumberFormat(undefined, { style: 'currency', currency }).format(amount); }
    catch { return `${currency} ${amount.toFixed(2)}`; }
  };

  if (loading) return <View className="flex-1 items-center justify-center"><ActivityIndicator color={colors.lilac} /><Text className="mt-3 text-xs text-muted">Gathering your finance workspace…</Text></View>;
  if (setupRequired || editingSetup) return <FinanceSetup initial={workspace} onCancel={editingSetup ? () => setEditingSetup(false) : undefined} onSave={saveWorkspace} error={error} />;
  if (error && !workspace) return <ScrollView contentContainerClassName="px-5 py-6"><EmptyState icon="⌁" title="Finance is unavailable" body={error} /><PrimaryButton title="Try again" onPress={() => { setLoading(true); void load(); }} className="mt-4" /></ScrollView>;

  return <View className="flex-1">
    <ScrollView horizontal showsHorizontalScrollIndicator={false} className="max-h-14 flex-grow-0 px-3" contentContainerClassName="items-center gap-1">
      {tabs.map((tab) => <Pressable key={tab} onPress={() => setSection(tab)} className={`rounded-xl px-3 py-2.5 ${section === tab ? 'bg-raised' : ''}`}><Text className={`text-[11px] font-semibold ${section === tab ? 'text-lilac-bright' : 'text-muted'}`}>{tab}</Text></Pressable>)}
    </ScrollView>
    <ScrollView className="flex-1" contentContainerClassName="px-5 pb-9 pt-3" refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); void load(); }} tintColor={colors.lilac} />} showsVerticalScrollIndicator={false}>
      {section === 'Overview' ? <>
        <Eyebrow>{workspace?.business_name ?? 'Business overview'}</Eyebrow><Heading className="mt-2">Your business,{'\n'}in clear focus.</Heading>
        <Pressable onPress={() => setEditingSetup(true)} className="mt-3 self-start rounded-xl border border-line px-3 py-2"><Text className="text-[10px] font-semibold text-lilac-bright">Edit workspace setup</Text></Pressable>
        <View className="mt-5 flex-row gap-2"><Metric title="Income" value={money(overview?.total_income)} icon="arrow-down" tone="mint" /><Metric title="Expenses" value={money(overview?.total_expenses)} icon="arrow-up" tone="rose" /></View>
        <Metric title="Net profit" value={money(overview?.net_profit)} icon="wallet-outline" tone="lilac" className="mt-2" />
        <SectionTitle title="Needs your attention" />
        {overview?.records_needing_attention?.slice(0, 5).map((record) => <RecordCard key={record.id} record={record} currency={workspace?.currency ?? 'USD'} onPayment={() => void setPayment(record)} onReview={() => void reviewRecord(record)} onReminder={() => void setReminder(record)} />)}
        {!overview?.records_needing_attention?.length ? <EmptyState icon="✓" title="You’re all caught up" body="Invoices and bills that need attention will appear here." /> : null}
        {overview?.basis_note ? <Copy className="mt-4 text-[11px]">{overview.basis_note}</Copy> : null}
      </> : null}

      {section === 'Files' ? <>
        <View className="flex-row items-end justify-between"><View><Eyebrow>Your source files</Eyebrow><Heading className="mt-1">Documents</Heading></View><Pressable onPress={() => void upload()} disabled={uploading} className="flex-row items-center rounded-xl bg-lilac px-3 py-2.5"><Ionicons name="add" size={17} color={colors.ink} /><Text className="ml-1 text-[11px] font-bold text-ink">{uploading ? 'Uploading' : 'Upload'}</Text></Pressable></View>
        <Copy className="mt-2">PDF, PNG, JPG, CSV, or XLSX. Automatic review is currently available for text based PDF invoices.</Copy>
        <View className="mt-5 gap-2">{documents.map((document) => <DocumentCard key={document.id} document={document} downloading={downloadingId === document.id} onDownload={() => void downloadDocument(document)} onProcess={() => void process(document)} onDelete={() => deleteDocument(document)} />)}</View>
        {!documents.length ? <View className="mt-4"><EmptyState icon="▤" title="No documents yet" body="Upload invoices, bills, or statements to start building your finance workspace." /></View> : null}
      </> : null}

      {section === 'Records' ? <><Eyebrow>Income & outgoings</Eyebrow><Heading className="mt-2">Your records</Heading><View className="mt-5 gap-2">{records.map((record) => <RecordCard key={record.id} record={record} currency={workspace?.currency ?? 'USD'} onPayment={() => void setPayment(record)} onReview={() => void reviewRecord(record)} onReminder={() => void setReminder(record)} />)}</View>{!records.length ? <View className="mt-4"><EmptyState icon="▣" title="Your ledger starts here" body="Reviewed finance documents and their records appear here." /></View> : null}</> : null}

      {section === 'Statements' ? <><Eyebrow>Saved source material</Eyebrow><Heading className="mt-2">Statements</Heading><View className="mt-5 gap-2">{statements.map((item) => <Card key={item.id} className="flex-row items-center p-4"><View className="h-11 w-11 items-center justify-center rounded-2xl bg-blue-300/10"><Ionicons name="business-outline" size={20} color="#91C8FF" /></View><View className="ml-3 flex-1"><Text className="text-[13px] font-semibold text-white">{item.institution_name ?? item.document_name}</Text><Text className="mt-1 text-[11px] text-muted">{item.transaction_count} transactions · {item.status.replaceAll('_', ' ')}</Text></View></Card>)}</View>{!statements.length ? <View className="mt-4"><EmptyState icon="⌂" title="No statements saved" body="Supported PDF statements are kept here for reference and excluded from finance totals." /></View> : null}</> : null}
    </ScrollView>
    <Modal transparent animationType="slide" visible={!!reviewTarget && !!recordDraft} statusBarTranslucent onRequestClose={() => { setReviewTarget(null); setRecordDraft(null); }}>
      <View className="flex-1 justify-end bg-black/70">
        <Pressable accessibilityLabel="Close record review" onPress={() => { setReviewTarget(null); setRecordDraft(null); }} className="absolute inset-0" />
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          {reviewTarget && recordDraft ? <View className="max-h-[88%] rounded-t-[28px] border border-line bg-panel px-5 pb-8 pt-5">
            <View className="mb-4 flex-row items-start"><View className="flex-1"><Eyebrow>CHECK BEFORE SAVING</Eyebrow><Text className="mt-2 text-[20px] font-bold text-white">Review this record</Text><Copy className="mt-1">Correct extracted values before they affect your finance totals.</Copy></View><Pressable accessibilityLabel="Close" onPress={() => { setReviewTarget(null); setRecordDraft(null); }} className="p-2"><Ionicons name="close" size={20} color={colors.muted} /></Pressable></View>
            <ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false} contentContainerClassName="pb-4">
              <Text className="mb-2 text-[11px] font-semibold text-white">This document is</Text>
              <ChoiceChips items={['Customer invoice', 'Supplier bill / expense']} selected={recordDraft.record_type === 'invoice' ? 'Customer invoice' : 'Supplier bill / expense'} onSelect={(value) => setRecordDraft((draft) => draft ? { ...draft, record_type: value === 'Customer invoice' ? 'invoice' : 'expense' } : draft)} />
              <ReviewField label="Customer or supplier" value={recordDraft.counterparty} placeholder="Name" onChange={(v) => setRecordDraft((d) => d ? { ...d, counterparty: v } : d)} />
              <ReviewField label="Invoice / bill reference" value={recordDraft.reference_number} placeholder="Reference number" onChange={(v) => setRecordDraft((d) => d ? { ...d, reference_number: v } : d)} />
              <View className="mt-3 flex-row gap-2"><View className="flex-1"><ReviewField label="Issue date" value={recordDraft.issue_date} placeholder="YYYY-MM-DD" onChange={(v) => setRecordDraft((d) => d ? { ...d, issue_date: v } : d)} /></View><View className="flex-1"><ReviewField label="Due date" value={recordDraft.due_date} placeholder="YYYY-MM-DD" onChange={(v) => setRecordDraft((d) => d ? { ...d, due_date: v } : d)} /></View></View>
              <View className="mt-3 flex-row gap-2"><View className="flex-1"><ReviewField label="Currency" value={recordDraft.currency} placeholder="USD" onChange={(v) => setRecordDraft((d) => d ? { ...d, currency: v } : d)} /></View><View className="flex-1"><ReviewField label="Subtotal" value={recordDraft.subtotal} placeholder="0.00" keyboardType="decimal-pad" onChange={(v) => setRecordDraft((d) => d ? { ...d, subtotal: v } : d)} /></View></View>
              <View className="mt-3 flex-row gap-2"><View className="flex-1"><ReviewField label="Tax" value={recordDraft.tax_total} placeholder="0.00" keyboardType="decimal-pad" onChange={(v) => setRecordDraft((d) => d ? { ...d, tax_total: v } : d)} /></View><View className="flex-1"><ReviewField label="Total amount" value={recordDraft.total_amount} placeholder="0.00" keyboardType="decimal-pad" onChange={(v) => setRecordDraft((d) => d ? { ...d, total_amount: v } : d)} /></View></View>
              <Pressable onPress={() => void markUnsupported(reviewTarget)} className="mt-4 self-start rounded-xl border border-line px-3 py-2"><Text className="text-[10px] font-semibold text-muted">Mark as statement / reference</Text></Pressable>
            </ScrollView>
            <PrimaryButton title="Confirm and save" loading={savingReview} onPress={() => void confirmRecord(reviewTarget, recordDraft)} className="mt-2" />
          </View> : null}
        </KeyboardAvoidingView>
      </View>
    </Modal>
  </View>;
}

function FinanceSetup({ initial, onCancel, onSave, error }: { initial: FinanceWorkspace | null; onCancel?: () => void; onSave: (profile: FinanceProfile, files: DocumentPicker.DocumentPickerAsset[]) => Promise<void>; error: string }) {
  const [step, setStep] = useState(0);
  const [saving, setSaving] = useState(false);
  const [validation, setValidation] = useState('');
  const [files, setFiles] = useState<DocumentPicker.DocumentPickerAsset[]>([]);
  const [profile, setProfile] = useState<FinanceProfile>({
    business_name: initial?.business_name ?? '', industry: initial?.industry ?? '', country: initial?.country ?? '',
    currency: initial?.currency ?? 'USD', size: initial?.size ?? '1–10 people',
    financial_year: initial?.financial_year ?? 'January–December', workflows: initial?.workflows ?? [],
    sources: initial?.sources ?? [], payment_terms: initial?.payment_terms ?? 'Net 30',
    approval_limit: initial?.approval_limit ?? '', reviewer: initial?.reviewer ?? '',
    categories: initial?.categories ?? 'Software, Travel, Supplies, Payroll, Other',
  });
  const steps = ['Business', 'Workflows', 'Sources', 'Rules', 'Import'];
  const update = (key: keyof FinanceProfile, value: string) => setProfile((current) => ({ ...current, [key]: value }));
  const toggle = (key: 'workflows' | 'sources', value: string) => setProfile((current) => ({ ...current, [key]: current[key].includes(value) ? current[key].filter((item) => item !== value) : [...current[key], value] }));

  async function chooseFiles() {
    try {
      const result = await DocumentPicker.getDocumentAsync({ multiple: true, copyToCacheDirectory: true, type: ['application/pdf', 'image/png', 'image/jpeg', 'text/csv', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'] });
      if (!result.canceled) setFiles((current) => [...current, ...result.assets.filter((asset) => !current.some((picked) => picked.uri === asset.uri))]);
    } catch (e) { setValidation(errorMessage(e, 'Could not open your files.')); }
  }

  async function continueSetup() {
    setValidation('');
    if (step === 0 && !profile.business_name.trim()) { setValidation('Add your business name to continue.'); return; }
    if (step < 4) { setStep((value) => value + 1); return; }
    setSaving(true);
    try { await onSave(profile, files); } finally { setSaving(false); }
  }

  return <ScrollView className="flex-1" contentContainerClassName="flex-grow justify-center px-5 py-6" keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
    <Card className="p-5">
      <Eyebrow>YOUR FINANCE ANALYST</Eyebrow>
      <Heading className="mt-2">{initial ? 'Refine your workspace.' : 'Let’s get to know your business.'}</Heading>
      <Copy className="mt-2">A few details help shape useful finance workflows. You can change these preferences anytime.</Copy>
      <View className="mt-5 flex-row gap-1.5">{steps.map((label, index) => <View key={label} className="flex-1"><View className={`h-1 rounded-full ${index <= step ? 'bg-lilac' : 'bg-raised'}`} /><Text numberOfLines={1} className={`mt-2 text-[9px] ${index === step ? 'text-lilac-bright' : 'text-muted'}`}>{label}</Text></View>)}</View>
      <Text className="mt-4 text-[10px] font-semibold uppercase tracking-[1.3px] text-muted">Step {step + 1} of 5</Text>
      {step === 0 ? <View className="mt-4 gap-3">
        <Text className="text-[18px] font-semibold text-white">Tell us about your business</Text><Copy>We’ll use this to tailor categories, reporting, and financial periods.</Copy>
        <Field autoCapitalize="words" placeholder="Business name" value={profile.business_name} onChangeText={(v) => update('business_name', v)} />
        <Field autoCapitalize="words" placeholder="Industry" value={profile.industry} onChangeText={(v) => update('industry', v)} />
        <Field autoCapitalize="words" placeholder="Country or region" value={profile.country} onChangeText={(v) => update('country', v)} />
        <Text className="mt-1 text-[11px] font-medium text-white">Operating currency</Text><ChoiceChips items={['USD', 'INR', 'EUR', 'GBP', 'CAD', 'AUD', 'Other']} selected={profile.currency} onSelect={(v) => update('currency', v)} />
        <Text className="mt-1 text-[11px] font-medium text-white">Business size</Text><ChoiceChips items={['Just me', '1–10 people', '11–50 people', '51–200 people', '201+ people']} selected={profile.size} onSelect={(v) => update('size', v)} />
        <Text className="mt-1 text-[11px] font-medium text-white">Financial year</Text><ChoiceChips items={['January–December', 'April–March', 'July–June', 'October–September', 'Custom']} selected={profile.financial_year} onSelect={(v) => update('financial_year', v)} />
      </View> : null}
      {step === 1 ? <SetupChoiceStep title="What does your finance team handle?" subtitle="Choose all the activities you want to organize in this workspace." items={workflows} selected={profile.workflows} onToggle={(v) => toggle('workflows', v)} /> : null}
      {step === 2 ? <SetupChoiceStep title="Where does your finance information live?" subtitle="Select the sources you use today. You can bring files in later, too." items={sources} selected={profile.sources} onToggle={(v) => toggle('sources', v)} /> : null}
      {step === 3 ? <View className="mt-5 gap-3">
        <Text className="text-[18px] font-semibold text-white">Set a few starter rules</Text><Copy>These are editable defaults. Nothing here authorizes payments or sends messages.</Copy>
        <Text className="mt-2 text-[11px] font-medium text-white">Typical customer payment terms</Text><ChoiceChips items={['Due on receipt', 'Net 7', 'Net 14', 'Net 30', 'Net 60', 'Other']} selected={profile.payment_terms} onSelect={(v) => update('payment_terms', v)} />
        <Field keyboardType="decimal-pad" placeholder={`Flag bills above · ${profile.currency}`} value={profile.approval_limit} onChangeText={(v) => update('approval_limit', v)} />
        <Field autoCapitalize="words" placeholder="Who reviews flagged items? (optional)" value={profile.reviewer} onChangeText={(v) => update('reviewer', v)} />
        <Field placeholder="Starter expense categories" value={profile.categories} onChangeText={(v) => update('categories', v)} />
      </View> : null}
      {step === 4 ? <View className="mt-5">
        <Text className="text-[18px] font-semibold text-white">Bring in existing records</Text><Copy className="mt-2">Upload invoices, bills, or bank exports now, or skip this step. Text-based PDFs get basic field suggestions to review; other accepted file types are stored for now.</Copy>
        <Pressable onPress={() => void chooseFiles()} className="mt-5 min-h-36 items-center justify-center rounded-2xl border border-dashed border-lilac/40 bg-lilac/5 px-5 py-6"><Ionicons name="cloud-upload-outline" size={30} color={colors.lilac} /><Text className="mt-3 text-[13px] font-semibold text-white">{files.length ? `${files.length} file${files.length === 1 ? '' : 's'} selected` : 'Choose files to add'}</Text><Text className="mt-1 text-center text-[10px] text-muted">PDF, PNG, JPG, CSV, or XLSX · up to 20 MB each</Text></Pressable>
        {files.map((file) => <View key={file.uri} className="mt-2 flex-row items-center rounded-xl bg-raised px-3 py-2.5"><Ionicons name="document-text-outline" size={16} color={colors.lilac} /><Text numberOfLines={1} className="ml-2 flex-1 text-[11px] text-white">{file.name}</Text><Pressable accessibilityLabel={`Remove ${file.name}`} onPress={() => setFiles((current) => current.filter((item) => item.uri !== file.uri))}><Ionicons name="close-circle" size={18} color={colors.muted} /></Pressable></View>)}
      </View> : null}
      <Text className="mt-3 text-[12px] text-rose">{validation || error}</Text>
      <View className="mt-5 flex-row items-center justify-between border-t border-line pt-4">
        {step > 0 ? <Pressable onPress={() => { setValidation(''); setStep((value) => value - 1); }} className="min-h-12 justify-center px-2"><Text className="text-[12px] font-semibold text-muted">‹  Back</Text></Pressable> : onCancel ? <Pressable onPress={onCancel} className="min-h-12 justify-center px-2"><Text className="text-[12px] font-semibold text-muted">Cancel</Text></Pressable> : <Text className="text-[9px] text-muted">About 5 minutes · edit anytime</Text>}
        <PrimaryButton title={step === 4 ? 'Finish setup' : 'Continue'} onPress={() => void continueSetup()} loading={saving} className="min-h-12 px-5" />
      </View>
    </Card>
    <Copy className="mt-4 text-center text-[10px]">Your records stay under your control. Payment actions always need your authorization.</Copy>
  </ScrollView>;
}

function SetupChoiceStep({ title, subtitle, items, selected, onToggle }: { title: string; subtitle: string; items: string[]; selected: string[]; onToggle: (item: string) => void }) {
  return <View className="mt-5"><Text className="text-[18px] font-semibold text-white">{title}</Text><Copy className="mt-2">{subtitle}</Copy><View className="mt-4 gap-2">{items.map((item) => {
    const active = selected.includes(item);
    return <Pressable key={item} accessibilityRole="checkbox" accessibilityState={{ checked: active }} onPress={() => onToggle(item)} className={`min-h-14 flex-row items-center rounded-2xl border px-3.5 ${active ? 'border-lilac/50 bg-lilac/10' : 'border-line bg-base'}`}><View className={`mr-3 h-5 w-5 items-center justify-center rounded-md border ${active ? 'border-lilac bg-lilac' : 'border-muted/50'}`}>{active ? <Ionicons name="checkmark" size={13} color={colors.ink} /> : null}</View><Text className="flex-1 text-[11px] leading-[16px] text-white">{item}</Text></Pressable>;
  })}</View></View>;
}

function ChoiceChips({ items, selected, onSelect }: { items: string[]; selected: string; onSelect: (item: string) => void }) {
  return <View className="flex-row flex-wrap gap-2">{items.map((item) => <Pressable key={item} onPress={() => onSelect(item)} className={`rounded-xl border px-3 py-2 ${selected === item ? 'border-lilac/50 bg-lilac/10' : 'border-line bg-base'}`}><Text className={`text-[10px] font-semibold ${selected === item ? 'text-lilac-bright' : 'text-muted'}`}>{item}</Text></Pressable>)}</View>;
}

function ReviewField({ label, value, placeholder, onChange, keyboardType }: { label: string; value: string; placeholder: string; onChange: (value: string) => void; keyboardType?: 'default' | 'decimal-pad' }) {
  return <View className="mt-3"><Text className="mb-1.5 text-[10px] font-medium text-muted">{label}</Text><Field value={value} placeholder={placeholder} onChangeText={onChange} keyboardType={keyboardType} autoCapitalize={keyboardType ? 'none' : 'words'} /></View>;
}

function Metric({ title, value, icon, tone, className = '' }: { title: string; value: string; icon: keyof typeof Ionicons.glyphMap; tone: 'mint' | 'rose' | 'lilac'; className?: string }) {
  const color = tone === 'mint' ? colors.mint : tone === 'rose' ? colors.rose : colors.lilac;
  return <Card className={`flex-1 p-3.5 ${className}`}><View className="flex-row items-center"><View className="h-9 w-9 items-center justify-center rounded-xl" style={{ backgroundColor: `${color}20` }}><Ionicons name={icon} size={17} color={color} /></View><Text className="ml-2 text-[11px] text-muted">{title}</Text></View><Text numberOfLines={1} adjustsFontSizeToFit className="mt-3 text-[20px] font-bold text-white">{value}</Text></Card>;
}

function DocumentCard({ document, onDownload, onProcess, onDelete, downloading }: { document: FinanceDocument; onDownload: () => void; onProcess: () => void; onDelete: () => void; downloading: boolean }) {
  return <Card className="flex-row items-center p-3.5"><View className="h-11 w-11 items-center justify-center rounded-2xl bg-lilac/10"><Ionicons name="document-text-outline" size={21} color={colors.lilac} /></View><View className="ml-3 flex-1"><Text numberOfLines={1} className="text-[13px] font-semibold text-white">{document.original_name}</Text><Text className="mt-1 text-[10px] text-muted">{document.status.replaceAll('_', ' ')} · {new Date(document.created_at).toLocaleDateString()}</Text></View><Pressable accessibilityLabel="Download document" disabled={downloading} onPress={onDownload} className="p-2"><Ionicons name={downloading ? 'hourglass-outline' : 'download-outline'} size={18} color={downloading ? colors.muted : colors.lilac} /></Pressable><Pressable accessibilityLabel="Process document" onPress={onProcess} className="p-2"><Ionicons name="sparkles-outline" size={18} color={colors.lilac} /></Pressable><Pressable accessibilityLabel="Delete document" onPress={onDelete} className="p-2"><Ionicons name="trash-outline" size={17} color={colors.muted} /></Pressable></Card>;
}

function RecordCard({ record, currency, onPayment, onReview, onReminder }: { record: FinanceRecord; currency: string; onPayment: () => void; onReview: () => void; onReminder: () => void }) {
  const isReview = record.status === 'needs_review'; const isPaid = record.payment_status === 'paid';
  const value = Number(record.total_amount ?? 0);
  let amount = `${record.currency ?? currency} ${value.toFixed(2)}`;
  try { amount = new Intl.NumberFormat(undefined, { style: 'currency', currency: record.currency ?? currency }).format(value); } catch { /* use fallback currency string */ }
  return <Card className="mb-2 p-3.5"><View className="flex-row items-start"><View className="flex-1"><Text className="text-[14px] font-semibold text-white">{record.counterparty ?? 'Name not identified'}</Text><Text className="mt-1 text-[10px] text-muted">{record.record_type === 'expense' ? 'Supplier bill' : 'Customer invoice'}{record.reference_number ? ` · ${record.reference_number}` : ''}</Text></View><Text className="ml-2 text-[14px] font-bold text-white">{amount}</Text></View><View className="mt-3 flex-row items-center"><Text className={`rounded-full px-2.5 py-1 text-[10px] font-semibold ${isReview ? 'bg-amber/10 text-amber' : isPaid ? 'bg-mint/10 text-mint' : 'bg-lilac/10 text-lilac'}`}>{isReview ? 'Needs review' : record.status === 'unsupported' ? 'Reference' : isPaid ? 'Paid' : 'Unpaid'}</Text><View className="flex-1" />{isReview ? <SmallAction title="Review" onPress={onReview} /> : null}{record.status === 'confirmed' && record.record_type === 'expense' && !isPaid ? <SmallAction title={record.reminder_date ? 'Reminder set' : 'Remind me'} onPress={onReminder} /> : null}{record.status === 'confirmed' && !(record.record_type === 'expense' && !isPaid) ? <SmallAction title={isPaid ? 'Mark unpaid' : record.record_type === 'expense' ? 'Mark paid' : 'Mark received'} onPress={onPayment} /> : null}</View></Card>;
}

function SmallAction({ title, onPress }: { title: string; onPress: () => void }) {
  return <Pressable onPress={onPress} className="ml-2 rounded-xl border border-line px-2.5 py-1.5"><Text className="text-[10px] font-semibold text-lilac-bright">{title}</Text></Pressable>;
}
