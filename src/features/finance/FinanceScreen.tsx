import React, { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Platform, Pressable, RefreshControl, ScrollView, Share, Text, TextInput, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import { Ionicons } from '@expo/vector-icons';
import { api, errorMessage, secureSession } from '../../services/api';
import { Alert } from '../../services/appAlert';
import { sessionStorage } from '../../services/sessionStorage';
import { Card, Copy, Eyebrow, Field, Heading, PrimaryButton, SectionTitle } from '../../components/ui';
import { BottomSheet } from '../../components/BottomSheet';
import { KeyboardScrollView } from '../../components/KeyboardLayout';
import { BrandWordmark } from '../../components/BrandWordmark';
import { API_BASE_URL, colors } from '../../config';
import { useTheme } from '../../context/ThemeContext';
import type { FinanceDocument, FinanceOverview, FinanceRecord, FinanceStatement, FinanceWorkspace, PayrollOverview, PayrollPayslip } from '../../types/api';
import { BusinessFocus } from './BusinessFocus';
import { FinanceMobileAttention } from './FinanceMobileAttention';
import { FinanceMobileImports } from './FinanceMobileImports';
import { syncLocalFinanceReminders } from '../../services/pushNotifications';
import { syncDeviceCalendar } from '../../services/deviceCalendar';
import { useAuth } from '../../context/AuthContext';

type Section = 'Overview' | 'Attention' | 'Files' | 'Imports' | 'Records' | 'Statements' | 'Insights';
type RecordFilter = 'All' | 'Invoices' | 'Bills' | 'Needs review' | 'Open invoices' | 'Unpaid' | 'Partial' | 'Paid';
type IconName = keyof typeof Ionicons.glyphMap;
type FinanceProfile = {
  business_name: string; business_type: 'Retail' | 'Corporate' | ''; industry: string; country: string; currency: string; size: string;
  financial_year: string; workflows: string[]; sources: string[]; payment_terms: string;
  approval_limit: string; reviewer: string; categories: string;
};
type RecordDraft = {
  record_type: 'invoice' | 'expense'; counterparty: string; reference_number: string;
  issue_date: string; due_date: string; currency: string; subtotal: string; tax_total: string; total_amount: string;
};
type FinanceReminder = { source_id: string; scheduled_at: string; priority: 'low' | 'high'; calendar_enabled: boolean };
const tabs: { id: Section; label: string; icon: IconName }[] = [
  { id: 'Overview', label: 'Overview', icon: 'grid-outline' },
  { id: 'Attention', label: 'Needs attention', icon: 'notifications-outline' },
  { id: 'Files', label: 'Documents', icon: 'documents-outline' },
  { id: 'Imports', label: 'Imports', icon: 'cloud-download-outline' },
  { id: 'Records', label: 'Records', icon: 'receipt-outline' },
  { id: 'Statements', label: 'Statements', icon: 'business-outline' },
  { id: 'Insights', label: 'Insights', icon: 'sparkles-outline' },
];
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
  const { user } = useAuth();
  const { isDark } = useTheme();
  const [section, setSection] = useState<Section>('Overview');
  const [workspace, setWorkspace] = useState<FinanceWorkspace | null>(null);
  const [overview, setOverview] = useState<FinanceOverview | null>(null);
  const [records, setRecords] = useState<FinanceRecord[]>([]);
  const [documents, setDocuments] = useState<FinanceDocument[]>([]);
  const [selectedImportSource, setSelectedImportSource] = useState<string | null>(null);
  const [statements, setStatements] = useState<FinanceStatement[]>([]);
  const [payrollSummary, setPayrollSummary] = useState<PayrollOverview | null>(null);
  const [recentPayslips, setRecentPayslips] = useState<PayrollPayslip[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [setupRequired, setSetupRequired] = useState(false);
  const [editingSetup, setEditingSetup] = useState(false);
  const [reviewTarget, setReviewTarget] = useState<FinanceRecord | null>(null);
  const [recordDraft, setRecordDraft] = useState<RecordDraft | null>(null);
  const [savingReview, setSavingReview] = useState(false);
  const [recordFilter, setRecordFilter] = useState<RecordFilter>('All');
  const [search, setSearch] = useState('');
  const [detailId, setDetailId] = useState<string | null>(null);
  const [reminderTarget, setReminderTarget] = useState<FinanceRecord | null>(null);
  const [followUpTarget, setFollowUpTarget] = useState<FinanceRecord | null>(null);
  const [followUpDraft, setFollowUpDraft] = useState('');
  const [reminderDraft, setReminderDraft] = useState('');
  const [reminderTime, setReminderTime] = useState('09:00');
  const [reminderPriority, setReminderPriority] = useState<'low' | 'high'>('low');
  const [reminderCalendar, setReminderCalendar] = useState(true);
  const [reminders, setReminders] = useState<FinanceReminder[]>([]);
  const [savingReminder, setSavingReminder] = useState(false);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [paymentId, setPaymentId] = useState<string | null>(null);
  const [paymentTarget, setPaymentTarget] = useState<FinanceRecord | null>(null);
  const [paymentDraft, setPaymentDraft] = useState('');
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setError('');
    try {
      const [w, d, r, o, s, payroll, slips, reminderRows] = await Promise.all([
        api.get<FinanceWorkspace>('/finance/workspace'),
        api.get<FinanceDocument[]>('/finance/documents'),
        api.get<FinanceRecord[]>('/finance/records'),
        api.get<FinanceOverview>('/intelligence/overview'),
        api.get<FinanceStatement[]>('/finance/statements'),
        api.get<PayrollOverview>('/finance/payroll/overview').catch(() => null),
        api.get<PayrollPayslip[]>('/finance/payroll/payslips').catch(() => null),
        api.get<FinanceReminder[]>('/reminders').catch(() => null),
      ]);
      setWorkspace(w.data); setDocuments(d.data); setRecords(r.data); setOverview(o.data); setStatements(s.data); setSetupRequired(false);
      setPayrollSummary(payroll?.data ?? null); setRecentPayslips((slips?.data ?? []).filter((slip) => slip.status !== 'draft').slice(0, 2));
      setReminders(reminderRows?.data ?? []);
    } catch (e) {
      const isMissing = (e as { response?: { status?: number } })?.response?.status === 404;
      if (isMissing) { setSetupRequired(true); setPayrollSummary(null); setRecentPayslips([]); }
      else setError(errorMessage(e));
    } finally { setLoading(false); setRefreshing(false); }
  }, []);

  useEffect(() => { void load(); }, [load]);

  async function saveWorkspace(profile: FinanceProfile, files: DocumentPicker.DocumentPickerAsset[]) {
    try {
      const { data } = await api.put<FinanceWorkspace>('/finance/workspace', {
        business_name: profile.business_name.trim(), business_type: profile.business_type || null, industry: profile.industry.trim() || null,
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
      } else if (/\.(csv|xlsx)$/i.test(file.name)) {
        try {
          const prepared = await api.post<{ id: string; status: string }>(`/finance/imports/files/${data.id}`);
          setSelectedImportSource(prepared.data.id);
          setSection('Imports');
          Alert.alert('Spreadsheet ready', prepared.data.status === 'ready' ? 'A saved mapping was reused. Preview rows before sending them to review.' : 'Map its columns and preview rows before sending them to review.');
        } catch (e) { Alert.alert('File uploaded', errorMessage(e, 'Open Imports to prepare this spreadsheet.')); }
      } else Alert.alert('Document uploaded', 'Automatic processing currently supports text-based PDF invoices.');
      if (refreshAfter) await load();
    } catch (e) { Alert.alert('Upload failed', errorMessage(e)); }
  }

  async function process(document: FinanceDocument) {
    setProcessingId(document.id);
    try {
      const { data } = await api.post(`/finance/documents/${document.id}/process`);
      const warnings = data?.warnings as string[] | undefined;
      if (warnings?.length) Alert.alert('Processing complete', warnings[0]);
      await load();
    } catch (e) { Alert.alert('Could not process document', errorMessage(e)); }
    finally { setProcessingId(null); }
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

  async function downloadPayslip(slip: PayrollPayslip) {
    setDownloadingId(slip.id);
    const name = `payslip-${slip.employee_code.replace(/[^a-zA-Z0-9_-]/g, '_')}-${slip.period_end}.pdf`;
    const path = `/finance/payroll/payslips/${encodeURIComponent(slip.id)}/pdf`;
    try {
      if (Platform.OS === 'web') {
        const response = await api.get<Blob>(path, { responseType: 'blob' });
        const url = URL.createObjectURL(response.data);
        const link = window.document.createElement('a');
        link.href = url; link.download = name; link.click();
        window.setTimeout(() => URL.revokeObjectURL(url), 1000);
        return;
      }
      const directory = FileSystem.cacheDirectory;
      if (!directory) throw new Error('Temporary file storage is unavailable.');
      const token = await sessionStorage.getItem(secureSession.tokenKey);
      const result = await FileSystem.downloadAsync(`${API_BASE_URL}${path}`, `${directory}${Date.now()}-${name}`, { headers: token ? { Authorization: `Bearer ${token}` } : {} });
      if (result.status < 200 || result.status >= 300) throw new Error('Could not download this payslip.');
      if (await Sharing.isAvailableAsync()) await Sharing.shareAsync(result.uri, { dialogTitle: `Save ${name}`, mimeType: 'application/pdf' });
      else Alert.alert('Downloaded', 'A temporary copy of the payslip was saved.');
    } catch (e) { Alert.alert('Download failed', errorMessage(e, 'Could not download this payslip.')); }
    finally { setDownloadingId(null); }
  }

  function deleteDocument(document: FinanceDocument) {
    Alert.alert('Delete this document?', `${document.original_name} and its extracted records will be removed.`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: async () => { try { await api.delete(`/finance/documents/${document.id}`); await load(); } catch (e) { Alert.alert('Delete failed', errorMessage(e)); } } },
    ]);
  }

  async function savePayment() {
    if (!paymentTarget) return;
    const amount = Number(paymentDraft);
    const total = Number(paymentTarget.total_amount);
    if (!/^\d+(?:\.\d{1,2})?$/.test(paymentDraft.trim()) || !Number.isFinite(amount) || amount > total) {
      Alert.alert('Check amount', `Enter a total paid amount between 0 and ${formatMoney(total, paymentTarget.currency ?? workspace?.currency ?? 'USD')}, with up to two decimal places.`);
      return;
    }
    setPaymentId(paymentTarget.id);
    try { await api.patch(`/finance/records/${paymentTarget.id}/payment`, { amount_paid: amount }); setPaymentTarget(null); await load(); }
    catch (e) { Alert.alert('Could not update payment', errorMessage(e)); }
    finally { setPaymentId(null); }
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

  function setReminder(record: FinanceRecord) {
    setDetailId(null);
    setReminderTarget(record);
    setReminderDraft(record.reminder_date ?? record.due_date ?? localDate());
    const current = reminders.find((item) => item.source_id === record.id);
    setReminderTime(current ? new Date(current.scheduled_at).toTimeString().slice(0, 5) : '09:00');
    setReminderPriority(current?.priority ?? 'low');
    setReminderCalendar(current?.calendar_enabled ?? true);
  }

  async function saveReminder(record: FinanceRecord, date: string | null) {
    if (date && (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !isValidDate(date) || date < localDate())) {
      Alert.alert('Check the date', 'Use YYYY-MM-DD and choose today or a future date.');
      return;
    }
    setSavingReminder(true);
    try {
      const scheduled = date ? new Date(`${date}T${reminderTime}:00`) : null;
      if (scheduled && (Number.isNaN(scheduled.getTime()) || scheduled <= new Date())) {
        Alert.alert('Check reminder time', 'Choose a future date and time.');
        return;
      }
      await api.patch(`/finance/records/${record.id}/reminder`, { reminder_date: date, scheduled_at: scheduled?.toISOString() ?? null, timezone: Intl.DateTimeFormat().resolvedOptions().timeZone, priority: reminderPriority, calendar_enabled: reminderCalendar });
      await syncLocalFinanceReminders();
      if (user) await syncDeviceCalendar(user.id).catch(() => Alert.alert('Reminder saved', 'Calendar sync could not finish. Open Notifications to retry.'));
      setReminderTarget(null);
      await load();
    } catch (e) { Alert.alert('Could not save reminder', errorMessage(e)); }
    finally { setSavingReminder(false); }
  }

  const currency = workspace?.currency ?? 'USD';
  const money = (value: number | string | null | undefined) => formatMoney(value, currency);
  const detail = records.find((record) => record.id === detailId);
  const sourceDocument = detail ? documents.find((document) => document.id === detail.document_id) : undefined;
  const filteredRecords = records.filter((record) => {
    const queryMatches = `${record.counterparty ?? ''} ${record.reference_number ?? ''}`.toLowerCase().includes(search.trim().toLowerCase());
    const filterMatches = recordFilter === 'All'
      || (recordFilter === 'Invoices' && record.record_type === 'invoice')
      || (recordFilter === 'Bills' && record.record_type === 'expense')
      || (recordFilter === 'Needs review' && record.status === 'needs_review')
      || (recordFilter === 'Open invoices' && record.status === 'confirmed' && record.record_type === 'invoice' && remainingBalance(record) > 0)
      || (recordFilter === 'Unpaid' && record.status === 'confirmed' && record.payment_status === 'unpaid')
      || (recordFilter === 'Partial' && record.status === 'confirmed' && record.payment_status === 'partial')
      || (recordFilter === 'Paid' && record.status === 'confirmed' && record.payment_status === 'paid');
    return queryMatches && filterMatches;
  });
  const attention = overview?.records_needing_attention ?? [];
  const income = Number(overview?.total_income ?? 0);
  const expenses = Number(overview?.total_expenses ?? 0);
  const totalActivity = Math.abs(income) + Math.abs(expenses);
  const overviewType = overview?.focus?.business_type ?? 'general';
  const heroRows = overviewType === 'retail' ? overview?.focus?.balances.invoices : overviewType === 'corporate' ? overview?.focus?.balances.bills : null;
  const heroValue = heroRows?.find((row) => row.currency.toUpperCase() === currency.toUpperCase())?.amount ?? 0;
  const closeReview = () => { if (!savingReview) { setReviewTarget(null); setRecordDraft(null); } };
  const showRecords = (filter: RecordFilter = 'All') => { setRecordFilter(filter); setSearch(''); setSection('Records'); };
  const openAttentionRecord = (id: string) => {
    const record = records.find((item) => item.id === id);
    if (!record) { showRecords(); return; }
    if (record.status === 'needs_review') void reviewRecord(record);
    else { setSection('Records'); setDetailId(id); }
  };

  if (loading) return <View className="flex-1 items-center justify-center bg-canvas px-8">
    <View className="mb-6 h-20 w-20 items-center justify-center rounded-[28px] border border-lilac/20 bg-lilac/10"><Ionicons name="wallet-outline" size={31} color={colors.lilac} /></View>
    <BrandWordmark size={34} />
    <Text className="mt-3 font-sans text-[14px] text-muted">Getting your finances in focus</Text>
    <ActivityIndicator className="mt-6" color={colors.lilac} />
  </View>;
  if (setupRequired || editingSetup) return <FinanceSetup initial={workspace} onCancel={editingSetup ? () => setEditingSetup(false) : undefined} onSave={saveWorkspace} error={error} />;
  if (error && !workspace) return <ScrollView contentContainerClassName="flex-grow justify-center px-5 py-6">
    <FinanceEmpty icon="cloud-offline-outline" title="Let's reconnect" body={error} />
    <PrimaryButton title="Try again" onPress={() => { setLoading(true); void load(); }} className="mt-5" />
  </ScrollView>;

  return <View className="flex-1 bg-canvas">
    <View className="border-b border-line/70 pb-3 pt-1">
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerClassName="gap-2 px-5" className="flex-grow-0">
        {tabs.map((tab) => <Pressable key={tab.id} accessibilityRole="tab" accessibilityState={{ selected: section === tab.id }} onPress={() => setSection(tab.id)} className={`min-h-11 flex-row items-center gap-2 rounded-full border px-4 active:opacity-70 ${section === tab.id ? 'border-lilac/30 bg-lilac/15' : 'border-transparent bg-panel'}`}>
          <Ionicons name={tab.icon} size={15} color={section === tab.id ? colors.lilac : colors.muted} />
          <Text className={`font-semibold text-[12px] ${section === tab.id ? 'text-lilac-bright' : 'text-muted'}`}>{tab.label}</Text>
        </Pressable>)}
      </ScrollView>
    </View>
    <KeyboardScrollView key={section} className="flex-1" contentContainerClassName="px-5 pb-8 pt-6" refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); void load(); }} tintColor={colors.lilac} />}>
      {error ? <View accessibilityRole="alert" className="mb-5 flex-row items-start gap-3 rounded-2xl border border-rose/20 bg-rose/5 p-4"><Ionicons name="alert-circle-outline" size={19} color={colors.rose} /><Text className="flex-1 font-sans text-[13px] leading-5 text-rose">{error}</Text><Pressable accessibilityRole="button" accessibilityLabel="Refresh finance workspace" onPress={() => void load()} className="p-1"><Ionicons name="refresh" size={19} color={colors.rose} /></Pressable></View> : null}
      {section === 'Overview' ? <>
        <View className="mb-6 flex-row items-center justify-between gap-3">
          <View className="flex-1"><Eyebrow>Finance workspace</Eyebrow><Heading className="mt-2">{workspace?.business_name ?? 'Your finances'}</Heading><Copy className="mt-1">{workspace?.business_type ? `${workspace.business_type} overview` : 'A little clarity. A better day.'}</Copy></View>
          <IconButton icon="options-outline" label="Edit finance workspace" onPress={() => setEditingSetup(true)} />
        </View>
        <View className="overflow-hidden rounded-[28px] border border-lilac/25">
          <LinearGradient colors={isDark ? ['#2c2243', '#1a1727', '#17141f'] : ['#F0EAFB', '#E8E1F3', '#F7F5FA']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={{ padding: 22 }}>
            <View className="flex-row items-center justify-between"><View className="flex-row items-center gap-2"><Ionicons name="wallet-outline" size={17} color={colors.lilac} /><Text className="font-medium text-[13px] text-lilac-bright">{overviewType === 'retail' ? 'Open customer balances' : overviewType === 'corporate' ? 'Open supplier obligations' : 'Invoice - bill difference'}</Text></View><View className="rounded-full border border-lilac/20 bg-lilac/10 px-3 py-1.5"><Text className="font-semibold text-[10px] tracking-[1px] text-lilac-bright">{currency}</Text></View></View>
            <Text numberOfLines={1} adjustsFontSizeToFit className="mt-5 font-display text-[40px] leading-[48px] tracking-[-1.5px] text-white">{money(overviewType === 'general' ? overview?.net_profit : heroValue)}</Text>
            <Text className="mt-1 font-sans text-[12px] text-lilac-bright/70">{overviewType === 'general' ? 'Confirmed issue-date amounts; not cash or final profit' : 'Confirmed remaining balances in workspace currency; other currencies shown below'}</Text>
            <View className="mt-6 flex-row border-t border-white/10 pt-5">
              <BalanceMetric label="Invoices" value={money(income)} icon="arrow-down" color={colors.mint} />
              <View className="mx-4 w-px bg-white/10" />
              <BalanceMetric label="Bills" value={money(expenses)} icon="arrow-up" color={colors.rose} />
            </View>
          </LinearGradient>
        </View>
        <View className="mt-4 flex-row gap-3">
          <Pressable accessibilityRole="button" onPress={() => void upload()} disabled={uploading} className="min-h-14 flex-1 flex-row items-center justify-center gap-2 rounded-2xl border border-action/60 bg-action active:opacity-80">{uploading ? <ActivityIndicator color={colors.actionForeground} size="small" /> : <Ionicons name="add" size={21} color={colors.actionForeground} />}<Text className="font-bold text-[13px] text-action-foreground">{uploading ? 'Uploading…' : 'Add document'}</Text></Pressable>
          <Pressable accessibilityRole="button" onPress={() => showRecords()} className="min-h-14 flex-1 flex-row items-center justify-center gap-2 rounded-2xl border border-line bg-panel active:bg-raised"><Ionicons name="receipt-outline" size={18} color={colors.lilac} /><Text className="font-semibold text-[13px] text-white">View records</Text></Pressable>
        </View>
        <FinanceMobileAttention records={records} onOpenRecord={openAttentionRecord} onOpenImport={(id) => { setSelectedImportSource(id); setSection('Imports'); }} onChanged={load} compact />
        <SectionTitle title="On your radar" action="View all" onAction={() => showRecords()} />
        <View className="mb-4 flex-row gap-3">
          <CountMetric title="To review" count={records.filter((r) => r.status === 'needs_review').length} icon="scan-outline" color={colors.amber} onPress={() => showRecords('Needs review')} />
          <CountMetric title="Outstanding invoices" count={(overview?.outstanding_invoices?.length ?? 0) + (overview?.overdue_invoices?.length ?? 0)} icon="time-outline" color={colors.lilac} onPress={() => showRecords('Open invoices')} />
        </View>
        <BusinessFocus focus={overview?.focus} currency={currency} onOpenRecords={(scope) => showRecords(scope)} />
        {payrollSummary && (payrollSummary.employee_count > 0 || payrollSummary.draft_payslips > 0 || payrollSummary.finalized_unpaid_payslips > 0 || payrollSummary.pending_reimbursements > 0 || payrollSummary.approved_unpaid_reimbursements > 0 || payrollSummary.confirmed_unpaid_taxes > 0 || recentPayslips.length > 0) ? <Card className="mb-4 p-5"><View className="flex-row items-center gap-3"><View className="h-10 w-10 items-center justify-center rounded-xl bg-lilac/15"><Ionicons name="people-outline" size={21} color={colors.lilac} /></View><View className="flex-1"><Text className="font-semibold text-[15px] text-white">Payroll at a glance</Text><Text className="mt-1 font-sans text-[11px] text-muted">{payrollSummary.employee_count} active · {payrollSummary.draft_payslips} draft · {payrollSummary.finalized_unpaid_payslips} unpaid payslips</Text></View></View><View className="mt-4 flex-row items-end justify-between border-t border-line pt-4"><Text className="text-[12px] text-muted">Finalized amount to employees</Text><Text className="font-bold text-[16px] text-white">{formatMoney(payrollSummary.next_payroll_amount, payrollSummary.currency)}</Text></View>{payrollSummary.confirmed_unpaid_taxes > 0 ? <Text className="mt-2 text-[11px] text-amber">{payrollSummary.confirmed_unpaid_taxes} confirmed government tax record(s) marked unpaid. Manage on web.</Text> : null}{recentPayslips.map((slip) => <View key={slip.id} className="mt-3 flex-row items-center gap-3 border-t border-line pt-3"><View className="flex-1"><Text className="font-semibold text-[12px] text-white">{slip.employee_name}</Text><Text className="mt-1 text-[11px] text-muted">{slip.period_end} · {slip.status} · {formatMoney(slip.cash_to_employee, slip.currency)}</Text></View><Pressable accessibilityRole="button" accessibilityLabel={`Save payslip for ${slip.employee_name}`} disabled={downloadingId === slip.id} onPress={() => void downloadPayslip(slip)} className="h-11 w-11 items-center justify-center rounded-xl border border-line">{downloadingId === slip.id ? <ActivityIndicator size="small" color={colors.lilac} /> : <Ionicons name="download-outline" size={19} color={colors.lilac} />}</Pressable></View>)}<Text className="mt-4 font-sans text-[11px] leading-[17px] text-muted">Manage employees, leave, claims, and pay approvals in the web workspace. Zengen does not send payments or file taxes.</Text></Card> : null}
        <View className="gap-3">{attention.slice(0, 4).map((record) => <RecordCard key={record.id} record={record} currency={currency} onOpen={() => setDetailId(record.id)} onReview={() => void reviewRecord(record)} />)}</View>
        {!attention.length ? <FinanceEmpty icon="checkmark-done-outline" title="All clear, for now" body="You're up to date. Records that need a closer look will appear here." compact /> : null}
        {overview?.basis_note ? <View className="mt-5 flex-row items-start gap-2.5 px-1"><Ionicons name="information-circle-outline" size={16} color={colors.muted} /><Text className="flex-1 font-sans text-[12px] leading-[18px] text-muted">{overview.basis_note}</Text></View> : null}
      </> : null}
      {section === 'Attention' ? <FinanceMobileAttention records={records} onOpenRecord={openAttentionRecord} onOpenImport={(id) => { setSelectedImportSource(id); setSection('Imports'); }} onChanged={load} /> : null}
      {section === 'Imports' ? <FinanceMobileImports initialSourceId={selectedImportSource} onUpload={() => void upload()} onApplied={load} /> : null}
      {section === 'Files' ? <>
        <SectionHeader eyebrow="Your source of truth" title="Documents" description="Every invoice, bill and receipt. Together." count={documents.length} />
        <Pressable accessibilityRole="button" onPress={() => void upload()} disabled={uploading} className="mt-5 flex-row items-center gap-4 rounded-[24px] border border-dashed border-lilac/35 bg-lilac/5 p-5 active:bg-lilac/10">
          <View className="h-12 w-12 items-center justify-center rounded-2xl bg-lilac/15">{uploading ? <ActivityIndicator color={colors.lilac} /> : <Ionicons name="cloud-upload-outline" size={24} color={colors.lilac} />}</View>
          <View className="flex-1"><Text className="font-semibold text-[15px] text-white">{uploading ? 'Adding your document…' : 'Add a document'}</Text><Text className="mt-1 font-sans text-[11px] text-muted">PDF, PNG, JPG, CSV or XLSX</Text></View><Ionicons name="add-circle-outline" size={23} color={colors.lilac} />
        </Pressable>
        <Text className="mb-5 mt-3 px-1 font-sans text-[12px] leading-[18px] text-muted">Text based PDF invoices are processed automatically. You can review every extracted value.</Text>
        <View className="gap-3">{documents.map((document) => <DocumentCard key={document.id} document={document} downloading={downloadingId === document.id} processing={processingId === document.id} onDownload={() => void downloadDocument(document)} onProcess={() => void process(document)} onDelete={() => deleteDocument(document)} />)}</View>
        {!documents.length ? <FinanceEmpty icon="documents-outline" title="Your workspace starts here" body="Add your first invoice or bill to bring your finances into focus." /> : null}
      </> : null}
      {section === 'Records' ? <>
        <SectionHeader eyebrow="Money, organized" title="Your records" description="The details behind your business." count={records.length} />
        <View className="mb-4 mt-5 flex-row items-center rounded-2xl border border-line bg-panel px-4"><Ionicons name="search-outline" size={18} color={colors.muted} /><Field accessibilityLabel="Search finance records" placeholder="Search a name or reference" value={search} onChangeText={setSearch} className="flex-1 border-0 bg-transparent px-3" autoCapitalize="none" autoCorrect={false} />{search ? <Pressable accessibilityRole="button" accessibilityLabel="Clear search" onPress={() => setSearch('')} className="min-h-11 min-w-8 items-center justify-center"><Ionicons name="close-circle" size={18} color={colors.muted} /></Pressable> : null}</View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} className="mb-5 flex-grow-0" contentContainerClassName="gap-2"><ChoiceChips items={['All', 'Invoices', 'Bills', 'Needs review', 'Open invoices', 'Unpaid', 'Partial', 'Paid']} selected={recordFilter} onSelect={(value) => setRecordFilter(value as RecordFilter)} /></ScrollView>
        <View className="gap-3">{filteredRecords.map((record) => <RecordCard key={record.id} record={record} currency={currency} onOpen={() => setDetailId(record.id)} onReview={() => void reviewRecord(record)} />)}</View>
        {!filteredRecords.length ? <FinanceEmpty icon={records.length ? 'search-outline' : 'receipt-outline'} title={records.length ? 'No matching records' : 'A fresh start for your finances'} body={records.length ? 'Try another name, reference or filter.' : 'Records from your uploaded documents will appear here, ready to review.'} /> : null}
      </> : null}
      {section === 'Statements' ? <>
        <SectionHeader eyebrow="A complete picture" title="Statements" description="Your bank activity, kept in one place." count={statements.length} />
        <View className="mt-5 gap-3">{statements.map((item) => {
          const document = documents.find((file) => file.id === item.document_id);
          return <Card key={item.id} className="p-5"><View className="flex-row items-center gap-3"><View className="h-12 w-12 items-center justify-center rounded-2xl bg-lilac/10"><Ionicons name="business-outline" size={22} color={colors.lilac} /></View><View className="flex-1"><Text numberOfLines={2} className="font-semibold text-[15px] text-white">{item.institution_name ?? item.document_name}</Text><Text className="mt-1 font-sans text-[12px] text-muted">{formatDate(item.created_at)}</Text></View>{document ? <IconButton icon="download-outline" label={`Download ${item.document_name}`} onPress={() => void downloadDocument(document)} loading={downloadingId === document.id} /> : null}</View><View className="mt-4 flex-row items-center justify-between border-t border-line pt-4"><Text className="font-medium text-[12px] text-muted">{item.transaction_count} transactions</Text><StatusPill label={humanize(item.status)} tone="lilac" /></View></Card>;
        })}</View>
        {!statements.length ? <View className="mt-4"><FinanceEmpty icon="business-outline" title="Room for your statements" body="Supported PDF bank statements appear here for reference, separate from your finance totals." /><PrimaryButton title="Upload a statement" onPress={() => void upload()} loading={uploading} className="mt-4" /></View> : <Copy className="mt-4 px-1 text-[12px]">Statements are reference material and are excluded from finance totals.</Copy>}
      </> : null}
      {section === 'Insights' ? <>
        <SectionHeader eyebrow="Your financial picture" title="A clearer perspective" description="A look at what your records are telling you." />
        <Card className="mt-5 p-5"><View className="flex-row items-center justify-between"><Text className="font-semibold text-[16px] text-white">Issued invoices & bills</Text><Ionicons name="stats-chart-outline" size={20} color={colors.lilac} /></View><Text className="mt-1 font-sans text-[12px] text-muted">Based on confirmed records by issue date</Text><View className="mt-6 gap-5"><AmountBar title="Customer invoices" value={money(income)} color={colors.mint} fraction={totalActivity ? Math.abs(income) / totalActivity : 0} /><AmountBar title="Supplier bills" value={money(expenses)} color={colors.rose} fraction={totalActivity ? Math.abs(expenses) / totalActivity : 0} /></View><View className="mt-6 flex-row items-center justify-between border-t border-line pt-4"><Text className="font-medium text-[13px] text-muted">Issued amount difference</Text><Text className="font-display text-[20px] text-white">{money(overview?.net_profit)}</Text></View></Card>
        <SectionTitle title="Keep an eye on" />
        <Card className="px-5 py-1"><InsightRow icon="time-outline" title="Overdue invoices" subtitle="Customer payments past their due date" count={overview?.overdue_invoices?.length ?? 0} color={colors.rose} onPress={() => showRecords('Invoices')} /><InsightRow icon="receipt-outline" title="Overdue bills" subtitle="Supplier bills past their due date" count={overview?.overdue_bills?.length ?? 0} color={colors.amber} onPress={() => showRecords('Bills')} /><InsightRow icon="calendar-outline" title="Bills due soon" subtitle="Upcoming payments to keep in view" count={overview?.bills_due_soon?.length ?? 0} color={colors.lilac} onPress={() => showRecords('Bills')} last /></Card>
        {overview?.data_completeness_note || overview?.basis_note ? <View className="mt-5 rounded-2xl border border-line bg-panel p-4"><View className="mb-2 flex-row items-center gap-2"><Ionicons name="information-circle-outline" size={17} color={colors.lilac} /><Text className="font-semibold text-[12px] text-lilac-bright">About this picture</Text></View><Copy className="text-[12px]">{overview?.data_completeness_note ?? overview?.basis_note}</Copy></View> : null}
      </> : null}
    </KeyboardScrollView>
    <BottomSheet visible={!!detail} onClose={() => { setDetailId(null); setPaymentTarget(null); }} title="Record details" subtitle={detail?.reference_number ? `Reference ${detail.reference_number}` : 'The details, all in one place.'}>
      {detail ? <>
        <View className="mb-5 rounded-[24px] border border-line bg-raised/60 p-5"><View className="flex-row items-center justify-between gap-3"><Text className="flex-1 font-semibold text-[16px] text-white">{detail.counterparty ?? 'Name not identified'}</Text><RecordStatus record={detail} /></View><Text className="mt-4 font-display text-[34px] text-white">{formatMoney(detail.total_amount, detail.currency ?? currency)}</Text><Text className="mt-1 font-sans text-[12px] text-muted">{detail.record_type === 'expense' ? 'Supplier bill' : 'Customer invoice'}</Text></View>
        <DetailRow label="Issue date" value={formatDate(detail.issue_date)} /><DetailRow label="Due date" value={formatDate(detail.due_date)} /><DetailRow label="Subtotal" value={formatMoney(detail.subtotal, detail.currency ?? currency)} /><DetailRow label="Tax" value={formatMoney(detail.tax_total, detail.currency ?? currency)} />
        {detail.status === 'confirmed' && detail.total_amount != null ? <><DetailRow label="Paid to date" value={formatMoney(detail.amount_paid ?? 0, detail.currency ?? currency)} /><DetailRow label="Balance due" value={formatMoney(remainingBalance(detail), detail.currency ?? currency)} /></> : null}
        {detail.reminder_date ? <DetailRow label="Reminder" value={formatDate(detail.reminder_date)} /> : null}
        {detail.review_notes?.length ? <View className="mt-4 rounded-2xl border border-amber/20 bg-amber/5 p-4"><Text className="mb-2 font-semibold text-[13px] text-amber">Review notes</Text>{detail.review_notes.map((note, index) => <Text key={`${index}-${note}`} className="mb-1 font-sans text-[13px] leading-5 text-muted">{note}</Text>)}</View> : null}
        {sourceDocument ? <Pressable accessibilityRole="button" disabled={downloadingId === sourceDocument.id} onPress={() => void downloadDocument(sourceDocument)} className="mt-4 min-h-14 flex-row items-center gap-3 rounded-2xl border border-line p-4"><Ionicons name="document-text-outline" size={20} color={colors.lilac} /><View className="flex-1"><Text className="font-medium text-[11px] text-muted">Source document</Text><Text numberOfLines={1} className="mt-1 font-semibold text-[13px] text-white">{sourceDocument.original_name}</Text></View>{downloadingId === sourceDocument.id ? <ActivityIndicator size="small" color={colors.lilac} /> : <Ionicons name="download-outline" size={19} color={colors.lilac} />}</Pressable> : null}
        {detail.status === 'needs_review' ? <PrimaryButton title="Review extracted values" onPress={() => { setDetailId(null); void reviewRecord(detail); }} className="mt-5" /> : null}
        {detail.status === 'confirmed' && detail.total_amount != null && paymentTarget?.id !== detail.id ? <PrimaryButton title={Number(detail.amount_paid || 0) > 0 ? 'Edit total paid' : 'Record payment'} loading={paymentId === detail.id} onPress={() => { setPaymentTarget(detail); setPaymentDraft(String(detail.amount_paid ?? 0)); }} className="mt-5" /> : null}
        {paymentTarget?.id === detail.id ? <View className="mt-5 rounded-2xl border border-line bg-raised/50 p-4">
          <Text className="font-semibold text-[14px] text-white">Record a payment</Text>
          <Text className="mt-1 font-sans text-[12px] text-muted">Currently paid: {formatMoney(detail.amount_paid ?? 0, detail.currency ?? currency)}</Text>
          <ReviewField label={`Total paid to date (${detail.currency ?? currency})`} value={paymentDraft} placeholder="0.00" keyboardType="decimal-pad" onChange={setPaymentDraft} />
          <Text className="mt-2 font-sans text-[12px] leading-[18px] text-muted">Use 0 to clear a payment or the full amount to mark it paid. This updates your workspace only; it does not move money or reconcile a bank statement.</Text>
          <PrimaryButton title="Save paid amount" loading={paymentId === detail.id} onPress={() => void savePayment()} className="mt-4" />
          <Pressable accessibilityRole="button" disabled={!!paymentId} onPress={() => setPaymentDraft(String(detail.total_amount))} className="mt-3 min-h-12 items-center justify-center rounded-2xl border border-line"><Text className="font-medium text-[13px] text-lilac-bright">Use full amount</Text></Pressable>
          <Pressable accessibilityRole="button" disabled={!!paymentId} onPress={() => setPaymentTarget(null)} className="mt-3 min-h-11 items-center justify-center"><Text className="font-medium text-[12px] text-muted">Cancel</Text></Pressable>
        </View> : null}
        {detail.status === 'confirmed' && ['expense', 'invoice'].includes(detail.record_type) && detail.payment_status !== 'paid' ? <Pressable accessibilityRole="button" onPress={() => setReminder(detail)} className="mt-3 min-h-14 flex-row items-center justify-center gap-2 rounded-2xl border border-line"><Ionicons name="notifications-outline" size={18} color={colors.lilac} /><Text className="font-semibold text-[14px] text-lilac-bright">{detail.reminder_date ? 'Edit reminder' : 'Set a reminder'}</Text></Pressable> : null}
        {detail.status === 'confirmed' && detail.record_type === 'invoice' && remainingBalance(detail) > 0 ? <Pressable accessibilityRole="button" onPress={() => { setFollowUpTarget(detail); setDetailId(null); setFollowUpDraft(`Hello,\n\nI’m following up on invoice ${detail.reference_number || 'from our business'} for ${formatMoney(remainingBalance(detail), detail.currency ?? currency)}${detail.due_date ? `, due ${formatDate(detail.due_date)}` : ''}. Could you please share an update on the payment? If you have already paid, please disregard this message.\n\nThank you.`); }} className="mt-3 min-h-14 flex-row items-center justify-center gap-2 rounded-2xl border border-line"><Ionicons name="chatbubble-outline" size={18} color={colors.lilac} /><Text className="font-semibold text-[14px] text-lilac-bright">Draft customer follow-up</Text></Pressable> : null}
      </> : null}
    </BottomSheet>
    <BottomSheet visible={!!reviewTarget && !!recordDraft} onClose={closeReview} title="Make it look right" subtitle="Review extracted values before they count toward your finance totals.">
      {reviewTarget && recordDraft ? <>
        <Text className="mb-3 font-medium text-[13px] text-muted">Record type</Text>
        <ChoiceChips items={['Customer invoice', 'Supplier bill']} selected={recordDraft.record_type === 'invoice' ? 'Customer invoice' : 'Supplier bill'} onSelect={(value) => setRecordDraft((draft) => draft ? { ...draft, record_type: value === 'Customer invoice' ? 'invoice' : 'expense' } : draft)} />
        <ReviewField label="Customer or supplier" value={recordDraft.counterparty} placeholder="Name" onChange={(v) => setRecordDraft((d) => d ? { ...d, counterparty: v } : d)} />
        <ReviewField label="Invoice or bill reference" value={recordDraft.reference_number} placeholder="Reference number" onChange={(v) => setRecordDraft((d) => d ? { ...d, reference_number: v } : d)} />
        <View className="flex-row gap-3"><View className="flex-1"><ReviewField label="Issue date" value={recordDraft.issue_date} placeholder="YYYY-MM-DD" onChange={(v) => setRecordDraft((d) => d ? { ...d, issue_date: v } : d)} /></View><View className="flex-1"><ReviewField label="Due date" value={recordDraft.due_date} placeholder="YYYY-MM-DD" onChange={(v) => setRecordDraft((d) => d ? { ...d, due_date: v } : d)} /></View></View>
        <View className="flex-row gap-3"><View className="flex-1"><ReviewField label="Currency" value={recordDraft.currency} placeholder="USD" onChange={(v) => setRecordDraft((d) => d ? { ...d, currency: v } : d)} /></View><View className="flex-1"><ReviewField label="Subtotal" value={recordDraft.subtotal} placeholder="0.00" keyboardType="decimal-pad" onChange={(v) => setRecordDraft((d) => d ? { ...d, subtotal: v } : d)} /></View></View>
        <View className="flex-row gap-3"><View className="flex-1"><ReviewField label="Tax" value={recordDraft.tax_total} placeholder="0.00" keyboardType="decimal-pad" onChange={(v) => setRecordDraft((d) => d ? { ...d, tax_total: v } : d)} /></View><View className="flex-1"><ReviewField label="Total amount" value={recordDraft.total_amount} placeholder="0.00" keyboardType="decimal-pad" onChange={(v) => setRecordDraft((d) => d ? { ...d, total_amount: v } : d)} /></View></View>
        <PrimaryButton title="Confirm and save" loading={savingReview} onPress={() => void confirmRecord(reviewTarget, recordDraft)} className="mt-6" />
        <Pressable accessibilityRole="button" disabled={savingReview} onPress={() => void markUnsupported(reviewTarget)} className="mt-3 min-h-12 items-center justify-center rounded-2xl border border-line"><Text className="font-medium text-[12px] text-muted">Keep as statement or reference instead</Text></Pressable>
      </> : null}
    </BottomSheet>
    <BottomSheet visible={!!reminderTarget} onClose={() => { if (!savingReminder) setReminderTarget(null); }} title="One less thing to remember" subtitle={reminderTarget?.counterparty ?? 'Choose a reminder date for this bill.'}>
      {reminderTarget ? <>
        <View className="mb-4 rounded-2xl border border-line bg-raised/50 p-4"><Text className="font-sans text-[13px] text-muted">Bill due <Text className="font-semibold text-white">{formatDate(reminderTarget.due_date)}</Text></Text></View>
        {reminderTarget.due_date && isValidDate(reminderTarget.due_date) ? <View className="mb-2 gap-2">{[7, 3, 1, 0].map((days) => ({ days, date: offsetDate(reminderTarget.due_date!, -days) })).filter(({ date }) => date >= localDate()).map(({ days, date }) => <Pressable key={date} accessibilityRole="radio" accessibilityState={{ checked: reminderDraft === date }} onPress={() => setReminderDraft(date)} className={`min-h-14 flex-row items-center justify-between rounded-2xl border px-4 ${reminderDraft === date ? 'border-lilac/40 bg-lilac/10' : 'border-line bg-panel'}`}><Text className="font-medium text-[13px] text-white">{days ? `${days} day${days === 1 ? '' : 's'} before` : 'On the due date'}</Text><Text className="font-sans text-[12px] text-muted">{formatDate(date)}</Text></Pressable>)}</View> : null}
        <ReviewField label="Reminder date" placeholder="YYYY-MM-DD" value={reminderDraft} onChange={setReminderDraft} />
        <ReviewField label="Time (24-hour HH:mm)" placeholder="09:00" value={reminderTime} onChange={setReminderTime} />
        <Text className="mt-3 font-semibold text-[12px] text-white">Priority</Text>
        <View className="mt-2 flex-row gap-2">{(['low', 'high'] as const).map((level) => <Pressable key={level} accessibilityRole="radio" accessibilityState={{ checked: reminderPriority === level }} onPress={() => setReminderPriority(level)} className={`flex-1 rounded-xl border px-4 py-3 ${reminderPriority === level ? 'border-lilac/40 bg-lilac/10' : 'border-line bg-panel'}`}><Text className="text-center font-semibold text-[12px] text-white">{level === 'low' ? 'Low · notify' : 'High · urgent'}</Text></Pressable>)}</View>
        <Pressable accessibilityRole="checkbox" accessibilityState={{ checked: reminderCalendar }} onPress={() => setReminderCalendar((value) => !value)} className="mt-3 min-h-12 flex-row items-center gap-2"><Ionicons name={reminderCalendar ? 'checkbox' : 'square-outline'} size={20} color={colors.lilac} /><Text className="font-medium text-[12px] text-white">Show in finance calendar</Text></Pressable>
        <Copy className="mt-3 text-[12px]">High priority alerts can be read aloud from Notifications.</Copy>
        <PrimaryButton title="Save reminder" loading={savingReminder} onPress={() => void saveReminder(reminderTarget, reminderDraft.trim())} className="mt-5" />
        {reminderTarget.reminder_date ? <Pressable accessibilityRole="button" disabled={savingReminder} onPress={() => void saveReminder(reminderTarget, null)} className="mt-2 min-h-12 items-center justify-center"><Text className="font-semibold text-[13px] text-rose">Remove reminder</Text></Pressable> : null}
      </> : null}
    </BottomSheet>
    <BottomSheet visible={!!followUpTarget} onClose={() => setFollowUpTarget(null)} title="Customer follow-up" subtitle="Review and edit the message before choosing where to send it.">
      <TextInput multiline value={followUpDraft} onChangeText={setFollowUpDraft} accessibilityLabel="Customer follow-up draft" textAlignVertical="top" className="min-h-44 rounded-2xl border border-line bg-panel p-4 font-sans text-[14px] text-white" />
      <PrimaryButton title="Share draft" onPress={() => void Share.share({ message: followUpDraft })} className="mt-4" />
      <Copy className="mt-2 text-[12px]">Nothing is sent until you choose an app and send it yourself.</Copy>
    </BottomSheet>
  </View>;
}

function FinanceSetup({ initial, onCancel, onSave, error }: { initial: FinanceWorkspace | null; onCancel?: () => void; onSave: (profile: FinanceProfile, files: DocumentPicker.DocumentPickerAsset[]) => Promise<void>; error: string }) {
  const [step, setStep] = useState(0);
  const [saving, setSaving] = useState(false);
  const [validation, setValidation] = useState('');
  const [customCurrency, setCustomCurrency] = useState(Boolean(initial?.currency && !['USD', 'INR', 'EUR', 'GBP', 'CAD', 'AUD'].includes(initial.currency)));
  const [files, setFiles] = useState<DocumentPicker.DocumentPickerAsset[]>([]);
  const scrollRef = useRef<ScrollView>(null);
  const [profile, setProfile] = useState<FinanceProfile>({
    business_name: initial?.business_name ?? '', business_type: initial?.business_type ?? '', industry: initial?.industry ?? '', country: initial?.country ?? '',
    currency: initial?.currency ?? 'USD', size: initial?.size ?? '1–10 people',
    financial_year: initial?.financial_year ?? 'January–December', workflows: initial?.workflows ?? [],
    sources: initial?.sources ?? [], payment_terms: initial?.payment_terms ?? 'Net 30',
    approval_limit: initial?.approval_limit ?? '', reviewer: initial?.reviewer ?? '',
    categories: initial?.categories ?? 'Software, Travel, Supplies, Payroll, Other',
  });
  const steps = ['Business', 'Workflows', 'Sources', 'Rules', 'Import'];
  const stepIcons: IconName[] = ['business-outline', 'layers-outline', 'folder-open-outline', 'options-outline', 'cloud-upload-outline'];
  const update = (key: keyof FinanceProfile, value: string) => setProfile((current) => ({ ...current, [key]: value }));
  const toggle = (key: 'workflows' | 'sources', value: string) => setProfile((current) => ({ ...current, [key]: current[key].includes(value) ? current[key].filter((item) => item !== value) : [...current[key], value] }));

  async function chooseFiles() {
    try {
      const result = await DocumentPicker.getDocumentAsync({ multiple: true, copyToCacheDirectory: true, type: ['application/pdf', 'image/png', 'image/jpeg', 'text/csv', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'] });
      if (!result.canceled) setFiles((current) => [...current, ...result.assets.filter((asset) => !current.some((picked) => picked.uri === asset.uri))]);
    } catch (e) { setValidation(errorMessage(e, 'Could not open your files.')); }
  }

  function changeStep(next: number) { setValidation(''); setStep(next); scrollRef.current?.scrollTo({ y: 0, animated: true }); }
  async function continueSetup() {
    setValidation('');
    if (step === 0 && !profile.business_name.trim()) { setValidation('Add your business name to continue.'); return; }
    if (step === 0 && !/^[A-Za-z]{3}$/.test(profile.currency.trim())) { setValidation('Use a three-letter currency code, such as USD or INR.'); return; }
    if (step < 4) { changeStep(step + 1); return; }
    setSaving(true);
    try { await onSave(profile, files); } finally { setSaving(false); }
  }

  return <KeyboardScrollView ref={scrollRef} className="flex-1 bg-canvas" contentContainerClassName="px-5 pb-8 pt-6">
    <View className="flex-row items-center justify-between"><BrandWordmark size={31} />{onCancel ? <IconButton icon="close" label="Close workspace setup" onPress={onCancel} /> : <View className="rounded-full border border-line bg-panel px-3 py-2"><Text className="font-semibold text-[10px] tracking-[1px] text-lilac">FINANCE</Text></View>}</View>
    <View className="mb-7 mt-7"><View className="mb-3 flex-row items-center justify-between"><Text className="font-medium text-[12px] text-muted">Your workspace, your way</Text><Text className="font-semibold text-[12px] text-lilac">{step + 1} / 5</Text></View><View className="flex-row gap-1.5">{steps.map((label, index) => <View key={label} className={`h-1.5 flex-1 rounded-full ${index <= step ? 'bg-lilac' : 'bg-raised'}`} />)}</View></View>
    <View className="mb-5 h-14 w-14 items-center justify-center rounded-[20px] border border-lilac/20 bg-lilac/10"><Ionicons name={stepIcons[step]} size={26} color={colors.lilac} /></View>
    <Eyebrow>{steps[step]}</Eyebrow>
    {step === 0 ? <>
      <Heading className="mt-3">Let's start with{'\n'}your business.</Heading><Copy className="mb-6 mt-3">A few details help your analyst see the bigger picture.</Copy>
      <ReviewField label="Business name" placeholder="The name behind your work" value={profile.business_name} onChange={(v) => update('business_name', v)} />
      <Text className="mb-3 mt-5 font-medium text-[13px] text-muted">Business type</Text><ChoiceChips items={['Retail', 'Corporate']} selected={profile.business_type} onSelect={(v) => update('business_type', v as FinanceProfile['business_type'])} />
      <Copy className="mb-5 mt-2 text-[12px]">Retail highlights collections and stock data gaps. Corporate highlights payables, budgets and entity reporting.</Copy>
      <ReviewField label="Industry" placeholder="What does your business do?" value={profile.industry} onChange={(v) => update('industry', v)} />
      <ReviewField label="Country or region" placeholder="Where are you based?" value={profile.country} onChange={(v) => update('country', v)} />
      <Text className="mb-3 mt-6 font-medium text-[13px] text-muted">Operating currency</Text><ChoiceChips items={['USD', 'INR', 'EUR', 'GBP', 'CAD', 'AUD', 'Other']} selected={customCurrency ? 'Other' : profile.currency} onSelect={(v) => { setCustomCurrency(v === 'Other'); update('currency', v === 'Other' ? '' : v); }} />
      {customCurrency ? <ReviewField label="Currency code" placeholder="For example, SGD" value={profile.currency} onChange={(v) => update('currency', v.toUpperCase())} /> : null}
      <Text className="mb-3 mt-6 font-medium text-[13px] text-muted">Team size</Text><ChoiceChips items={['Just me', '1–10 people', '11–50 people', '51–200 people', '201+ people']} selected={profile.size} onSelect={(v) => update('size', v)} />
      <Text className="mb-3 mt-6 font-medium text-[13px] text-muted">Financial year</Text><ChoiceChips items={['January–December', 'April–March', 'July–June', 'October–September', 'Custom']} selected={profile.financial_year} onSelect={(v) => update('financial_year', v)} />
    </> : null}
    {step === 1 ? <SetupChoiceStep title={'Make space for\nwhat matters.'} subtitle="Choose the finance activities you'd like to organize." items={workflows} selected={profile.workflows} onToggle={(v) => toggle('workflows', v)} /> : null}
    {step === 2 ? <SetupChoiceStep title={'Bring your world\ntogether.'} subtitle="Where does your finance information live today? Choose all that apply." items={sources} selected={profile.sources} onToggle={(v) => toggle('sources', v)} /> : null}
    {step === 3 ? <>
      <Heading className="mt-3">A few helpful{'\n'}ground rules.</Heading><Copy className="mt-3">Set the defaults that work for your team. You can change them anytime.</Copy>
      <Text className="mb-3 mt-6 font-medium text-[13px] text-muted">Customer payment terms</Text><ChoiceChips items={['Due on receipt', 'Net 7', 'Net 14', 'Net 30', 'Net 60', 'Other']} selected={profile.payment_terms} onSelect={(v) => update('payment_terms', v)} />
      <ReviewField label={`Flag bills above (${profile.currency})`} placeholder="Optional amount" keyboardType="decimal-pad" value={profile.approval_limit} onChange={(v) => update('approval_limit', v)} />
      <ReviewField label="Who reviews flagged items?" placeholder="Name of reviewer (optional)" value={profile.reviewer} onChange={(v) => update('reviewer', v)} />
      <ReviewField label="Expense categories" placeholder="Software, Travel, Supplies…" value={profile.categories} onChange={(v) => update('categories', v)} />
    </> : null}
    {step === 4 ? <>
      <Heading className="mt-3">The first step{'\n'}to a clearer view.</Heading><Copy className="mt-3">Bring in a few invoices or bills. You can also skip this and add them later.</Copy>
      <Pressable accessibilityRole="button" onPress={() => void chooseFiles()} className="mt-6 min-h-44 items-center justify-center rounded-[26px] border border-dashed border-lilac/40 bg-lilac/5 px-5 py-7 active:bg-lilac/10"><View className="mb-4 h-14 w-14 items-center justify-center rounded-2xl bg-lilac/15"><Ionicons name="cloud-upload-outline" size={28} color={colors.lilac} /></View><Text className="font-semibold text-[15px] text-white">{files.length ? 'Add more files' : 'Choose your first files'}</Text><Text className="mt-2 text-center font-sans text-[12px] text-muted">PDF, PNG, JPG, CSV or XLSX</Text></Pressable>
      <View className="mt-4 gap-2">{files.map((file) => <View key={file.uri} className="flex-row items-center gap-3 rounded-2xl border border-line bg-panel py-2 pl-4 pr-2"><Ionicons name="document-text-outline" size={20} color={colors.lilac} /><Text numberOfLines={1} className="flex-1 font-medium text-[13px] text-white">{file.name}</Text><IconButton icon="close" label={`Remove ${file.name}`} onPress={() => setFiles((current) => current.filter((item) => item.uri !== file.uri))} /></View>)}</View>
      <Copy className="mt-4 text-[12px]">Text based PDF invoices get suggested values for you to review. Other accepted files are saved for reference.</Copy>
    </> : null}
    {validation || error ? <View accessibilityRole="alert" className="mt-5 rounded-2xl border border-rose/20 bg-rose/5 p-4"><Text className="font-sans text-[13px] leading-5 text-rose">{validation || error}</Text></View> : null}
    <View className="mt-8 flex-row items-center gap-3 border-t border-line pt-5">{step > 0 ? <Pressable accessibilityRole="button" accessibilityLabel="Previous setup step" disabled={saving} onPress={() => changeStep(step - 1)} className="h-14 w-14 items-center justify-center rounded-2xl border border-line bg-panel"><Ionicons name="arrow-back" size={21} color={colors.lilac} /></Pressable> : null}<PrimaryButton title={step === 4 ? (initial ? 'Save workspace' : 'Open my workspace') : 'Continue'} onPress={() => void continueSetup()} loading={saving} className="flex-1" /></View>
    <Text className="mt-4 text-center font-sans text-[11px] text-muted">Made for your business. Editable anytime.</Text>
  </KeyboardScrollView>;
}

function SetupChoiceStep({ title, subtitle, items, selected, onToggle }: { title: string; subtitle: string; items: string[]; selected: string[]; onToggle: (item: string) => void }) {
  return <View><Heading className="mt-3">{title}</Heading><Copy className="mt-3">{subtitle}</Copy><View className="mt-6 gap-3">{items.map((item) => {
    const active = selected.includes(item);
    return <Pressable key={item} accessibilityRole="checkbox" accessibilityState={{ checked: active }} onPress={() => onToggle(item)} className={`min-h-20 flex-row items-center gap-4 rounded-[22px] border p-4 active:opacity-80 ${active ? 'border-lilac/40 bg-lilac/10' : 'border-line bg-panel'}`}><View className={`h-6 w-6 items-center justify-center rounded-lg border ${active ? 'border-lilac bg-lilac' : 'border-muted/40 bg-canvas'}`}>{active ? <Ionicons name="checkmark" size={16} color={colors.ink} /> : null}</View><Text className={`flex-1 font-medium text-[14px] leading-[21px] ${active ? 'text-lilac-bright' : 'text-white'}`}>{item}</Text></Pressable>;
  })}</View></View>;
}

function ChoiceChips({ items, selected, onSelect }: { items: string[]; selected: string; onSelect: (item: string) => void }) {
  return <View className="flex-row flex-wrap gap-2">{items.map((item) => <Pressable key={item} accessibilityRole="radio" accessibilityState={{ checked: selected === item }} onPress={() => onSelect(item)} className={`min-h-11 justify-center rounded-xl border px-3.5 py-2.5 active:opacity-70 ${selected === item ? 'border-lilac/40 bg-lilac/10' : 'border-line bg-panel'}`}><Text className={`font-semibold text-[12px] ${selected === item ? 'text-lilac-bright' : 'text-muted'}`}>{item}</Text></Pressable>)}</View>;
}

function ReviewField({ label, value, placeholder, onChange, keyboardType }: { label: string; value: string; placeholder: string; onChange: (value: string) => void; keyboardType?: 'default' | 'decimal-pad' }) {
  return <View className="mt-4"><Text className="mb-2 font-medium text-[12px] text-muted">{label}</Text><Field accessibilityLabel={label} value={value} placeholder={placeholder} onChangeText={onChange} keyboardType={keyboardType} autoCapitalize={keyboardType ? 'none' : 'sentences'} autoCorrect={false} /></View>;
}

function SectionHeader({ eyebrow, title, description, count }: { eyebrow: string; title: string; description: string; count?: number }) {
  return <View><Eyebrow>{eyebrow}</Eyebrow><View className="mt-2 flex-row items-center gap-3"><Heading className="flex-1">{title}</Heading>{count !== undefined ? <View className="min-h-9 min-w-9 items-center justify-center rounded-xl border border-line bg-panel px-2"><Text className="font-semibold text-[13px] text-lilac">{count}</Text></View> : null}</View><Copy className="mt-2">{description}</Copy></View>;
}

function BalanceMetric({ label, value, icon, color }: { label: string; value: string; icon: IconName; color: string }) {
  return <View className="flex-1"><View className="flex-row items-center gap-1.5"><Ionicons name={icon} size={13} color={color} /><Text className="font-medium text-[11px] text-muted">{label}</Text></View><Text numberOfLines={1} adjustsFontSizeToFit className="mt-2 font-display text-[19px] text-white">{value}</Text></View>;
}

function CountMetric({ title, count, icon, color, onPress }: { title: string; count: number; icon: IconName; color: string; onPress: () => void }) {
  return <Pressable accessibilityRole="button" accessibilityLabel={`${count} ${title.toLowerCase()} records`} onPress={onPress} className="flex-1 rounded-[22px] border border-line bg-panel p-4 active:bg-raised"><View className="flex-row items-center justify-between"><Ionicons name={icon} size={21} color={color} /><Text className="font-display text-[26px] text-white">{count}</Text></View><Text className="mt-3 font-medium text-[12px] text-muted">{title}</Text></Pressable>;
}

function FinanceEmpty({ icon, title, body, compact = false }: { icon: IconName; title: string; body: string; compact?: boolean }) {
  return <Card className={`items-center px-6 ${compact ? 'py-6' : 'py-9'}`}><View className="mb-4 h-14 w-14 items-center justify-center rounded-[20px] border border-lilac/15 bg-lilac/10"><Ionicons name={icon} size={25} color={colors.lilac} /></View><Text className="text-center font-semibold text-[16px] text-white">{title}</Text><Text className="mt-2 max-w-[290px] text-center font-sans text-[13px] leading-[21px] text-muted">{body}</Text></Card>;
}

function IconButton({ icon, label, onPress, loading = false }: { icon: IconName; label: string; onPress: () => void; loading?: boolean }) {
  return <Pressable accessibilityRole="button" accessibilityLabel={label} disabled={loading} onPress={onPress} className="h-11 w-11 items-center justify-center rounded-2xl border border-line bg-panel active:bg-raised">{loading ? <ActivityIndicator size="small" color={colors.lilac} /> : <Ionicons name={icon} size={19} color={colors.lilac} />}</Pressable>;
}

function DocumentCard({ document, onDownload, onProcess, onDelete, downloading, processing }: { document: FinanceDocument; onDownload: () => void; onProcess: () => void; onDelete: () => void; downloading: boolean; processing: boolean }) {
  const size = document.size_bytes >= 1024 * 1024 ? `${(document.size_bytes / (1024 * 1024)).toFixed(1)} MB` : `${Math.max(1, Math.round(document.size_bytes / 1024))} KB`;
  return <Card className="p-4"><View className="flex-row items-start gap-3"><View className="h-12 w-12 items-center justify-center rounded-2xl bg-lilac/10"><Ionicons name="document-text-outline" size={23} color={colors.lilac} /></View><View className="min-w-0 flex-1"><Text numberOfLines={2} className="font-semibold text-[14px] leading-5 text-white">{document.original_name}</Text><Text className="mt-1.5 font-sans text-[11px] text-muted">{size} · {formatDate(document.created_at)}</Text></View><Pressable accessibilityRole="button" accessibilityLabel={`Delete ${document.original_name}`} onPress={onDelete} className="h-11 w-9 items-center justify-center"><Ionicons name="trash-outline" size={18} color={colors.muted} /></Pressable></View><View className="mt-4 flex-row flex-wrap items-center gap-2 border-t border-line pt-3"><View className="mr-auto"><StatusPill label={humanize(document.status)} tone={document.status === 'needs_review' ? 'amber' : 'lilac'} /></View><SmallAction title={downloading ? 'Saving…' : 'Save'} icon="download-outline" onPress={onDownload} disabled={downloading} /><SmallAction title={processing ? 'Reading…' : 'Process'} icon="sparkles-outline" onPress={onProcess} disabled={processing} /></View></Card>;
}

function RecordCard({ record, currency, onOpen, onReview }: { record: FinanceRecord; currency: string; onOpen: () => void; onReview: () => void }) {
  const expense = record.record_type === 'expense';
  return <Card className="p-4"><Pressable accessibilityRole="button" accessibilityLabel={`View ${record.counterparty ?? 'record'} details`} onPress={onOpen} className="flex-row items-start gap-3 active:opacity-70"><View className={`h-10 w-10 items-center justify-center rounded-2xl ${expense ? 'bg-rose/10' : 'bg-mint/10'}`}><Ionicons name={expense ? 'arrow-up-outline' : 'arrow-down-outline'} size={20} color={expense ? colors.rose : colors.mint} /></View><View className="min-w-0 flex-1"><Text numberOfLines={1} className="font-semibold text-[14px] text-white">{record.counterparty ?? 'Name not identified'}</Text><Text numberOfLines={1} className="mt-1 font-sans text-[11px] text-muted">{record.reference_number ?? (expense ? 'Supplier bill' : 'Customer invoice')}</Text></View><View className="max-w-[45%] items-end"><Text numberOfLines={1} adjustsFontSizeToFit className="font-semibold text-[15px] text-white">{formatMoney(record.total_amount, record.currency ?? currency)}</Text><Text className="mt-1 font-sans text-[10px] text-muted">{record.status === 'confirmed' && record.total_amount != null ? `Balance ${formatMoney(remainingBalance(record), record.currency ?? currency)}` : record.due_date ? `Due ${formatDate(record.due_date)}` : expense ? 'Expense' : 'Invoice'}</Text></View></Pressable><View className="mt-4 flex-row items-center justify-between border-t border-line pt-3"><RecordStatus record={record} />{record.status === 'needs_review' ? <SmallAction title="Review" icon="arrow-forward" onPress={onReview} /> : <SmallAction title="Details" icon="chevron-forward" onPress={onOpen} />}</View></Card>;
}

function RecordStatus({ record }: { record: FinanceRecord }) {
  const overdue = record.status === 'confirmed' && record.payment_status !== 'paid' && Boolean(record.due_date && record.due_date < localDate());
  const label = record.status === 'needs_review' ? 'Needs review' : record.status === 'unsupported' ? 'Reference' : record.payment_status === 'paid' ? (record.record_type === 'expense' ? 'Paid' : 'Received') : overdue ? 'Overdue' : record.payment_status === 'partial' ? 'Partially paid' : 'Unpaid';
  return <StatusPill label={label} tone={record.status === 'needs_review' ? 'amber' : record.payment_status === 'paid' ? 'mint' : overdue ? 'rose' : 'lilac'} />;
}

function StatusPill({ label, tone }: { label: string; tone: 'mint' | 'rose' | 'lilac' | 'amber' }) {
  const styles = { mint: 'bg-mint/10 text-mint', rose: 'bg-rose/10 text-rose', amber: 'bg-amber/10 text-amber', lilac: 'bg-lilac/10 text-lilac' };
  return <Text className={`self-start rounded-full px-2.5 py-1.5 font-semibold text-[10px] ${styles[tone]}`}>{label}</Text>;
}

function SmallAction({ title, icon, onPress, disabled = false }: { title: string; icon: IconName; onPress: () => void; disabled?: boolean }) {
  return <Pressable accessibilityRole="button" accessibilityLabel={title} disabled={disabled} onPress={onPress} className={`min-h-11 flex-row items-center justify-center gap-1.5 rounded-xl border border-line px-3 active:bg-raised ${disabled ? 'opacity-50' : ''}`}><Text className="font-semibold text-[11px] text-lilac-bright">{title}</Text><Ionicons name={icon} size={14} color={colors.lilac} /></Pressable>;
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return <View className="min-h-12 flex-row items-center justify-between gap-4 border-b border-line py-3"><Text className="font-sans text-[13px] text-muted">{label}</Text><Text className="flex-1 text-right font-medium text-[13px] text-white">{value}</Text></View>;
}

function AmountBar({ title, value, color, fraction }: { title: string; value: string; color: string; fraction: number }) {
  return <View><View className="mb-2.5 flex-row items-center justify-between"><Text className="font-medium text-[13px] text-muted">{title}</Text><Text className="font-semibold text-[15px] text-white">{value}</Text></View><View className="h-2.5 overflow-hidden rounded-full bg-raised"><View style={{ height: '100%', width: `${Math.min(100, Math.max(0, fraction * 100))}%`, backgroundColor: color, borderRadius: 10 }} /></View></View>;
}

function InsightRow({ icon, title, subtitle, count, color, onPress, last = false }: { icon: IconName; title: string; subtitle: string; count: number; color: string; onPress: () => void; last?: boolean }) {
  return <Pressable accessibilityRole="button" onPress={onPress} className={`flex-row items-center gap-3 py-5 active:opacity-70 ${last ? '' : 'border-b border-line'}`}><Ionicons name={icon} size={22} color={color} /><View className="flex-1"><Text className="font-semibold text-[14px] text-white">{title}</Text><Text className="mt-1 font-sans text-[11px] leading-[16px] text-muted">{subtitle}</Text></View><Text className="font-display text-[22px] text-white">{count}</Text><Ionicons name="chevron-forward" size={15} color={colors.muted} /></Pressable>;
}

function formatMoney(value: number | string | null | undefined, currency: string) {
  const amount = Number(value ?? 0);
  try { return new Intl.NumberFormat(undefined, { style: 'currency', currency }).format(amount); }
  catch { return `${currency} ${amount.toFixed(2)}`; }
}

function remainingBalance(record: FinanceRecord): number {
  return Math.max(0, Number(record.balance_due ?? (Number(record.total_amount || 0) - Number(record.amount_paid || 0))));
}

function formatDate(value: string | null | undefined) {
  if (!value) return 'Not set';
  const date = new Date(value.length === 10 ? `${value}T12:00:00` : value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' });
}

function localDate(date = new Date()) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

function isValidDate(value: string) {
  const date = new Date(`${value}T12:00:00`);
  return !Number.isNaN(date.getTime()) && localDate(date) === value;
}

function offsetDate(value: string, days: number) {
  const date = new Date(`${value}T12:00:00`);
  date.setDate(date.getDate() + days);
  return localDate(date);
}

function humanize(value: string) { return value.replaceAll('_', ' ').replace(/^\w/, (letter) => letter.toUpperCase()); }
