import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, Text, View } from 'react-native';
import { api, errorMessage } from '../../services/api';
import { Card } from '../../components/ui';
import { colors } from '../../config';
import type { FinanceRecord } from '../../types/api';

type AttentionItem = { id: string; kind: string; priority: string; title: string; detail: string; action: string; target_id: string; amount?: string; direction?: string; currency?: string };
type Inbox = { total: number; items: AttentionItem[] };

export function FinanceMobileAttention({ records, onOpenRecord, onOpenImport, onChanged, compact = false }: {
  records: FinanceRecord[];
  onOpenRecord: (id: string) => void;
  onOpenImport: (id: string) => void;
  onChanged: () => Promise<void>;
  compact?: boolean;
}) {
  const [inbox, setInbox] = useState<Inbox | null>(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [matching, setMatching] = useState<AttentionItem | null>(null);
  const [chosen, setChosen] = useState('');
  const [expanded, setExpanded] = useState(false);

  async function reload() {
    const today = new Date();
    const asOf = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
    try { setInbox((await api.get<Inbox>('/finance/attention', { params: { as_of: asOf } })).data); setError(''); }
    catch (e) { setError(errorMessage(e)); }
  }
  useEffect(() => { void reload(); }, []);

  async function act(item: AttentionItem) {
    if (item.kind === 'unmatched_payment') { setMatching(item); setChosen(''); return; }
    if (item.kind === 'sync_failed') {
      setBusy(true);
      try {
        const { data } = await api.post<{ status: string; last_error?: string }>(`/finance/imports/${item.target_id}/sync`, null, { timeout: 60_000 });
        if (data.status === 'failed') throw new Error(data.last_error || 'Sync failed.');
        await reload(); await onChanged();
      } catch (e) { setError(errorMessage(e)); }
      finally { setBusy(false); }
      return;
    }
    if (['source_changed', 'new_import', 'invalid_import', 'possible_duplicate'].includes(item.kind)) onOpenImport(item.target_id);
    else onOpenRecord(item.target_id);
  }

  async function handlePayment(ignore: boolean) {
    if (!matching) return;
    setBusy(true);
    try {
      if (ignore) await api.post(`/finance/attention/transactions/${matching.target_id}/ignore`);
      else await api.post(`/finance/attention/transactions/${matching.target_id}/match`, { record_id: chosen });
      setMatching(null);
      await reload(); await onChanged();
    } catch (e) { setError(errorMessage(e)); }
    finally { setBusy(false); }
  }

  const candidates = matching ? records.filter((record) => record.status === 'confirmed' && record.record_type === matching.direction && Number(record.balance_due) >= Number(matching.amount) && (record.currency || '').toUpperCase() === (matching.currency || '').toUpperCase()) : [];
  const items = inbox?.items ?? [];
  return <Card className="mb-4 p-4">
    <View className="flex-row items-center justify-between"><View className="flex-1"><Text className="font-semibold text-[16px] text-white">Needs attention {inbox ? `· ${inbox.total}` : ''}</Text><Text className="mt-1 font-sans text-[11px] text-muted">Your daily review, payment, and sync inbox</Text></View><Pressable accessibilityRole="button" onPress={() => void reload()} className="rounded-lg border border-line px-3 py-2"><Text className="text-[11px] text-lilac">Refresh</Text></Pressable></View>
    {error ? <Text accessibilityRole="alert" className="mt-3 text-[12px] text-rose">{error}</Text> : null}
    {!inbox && !error ? <ActivityIndicator className="mt-4" color={colors.lilac} /> : null}
    {inbox && !items.length ? <Text className="mt-4 font-sans text-[12px] text-muted">All clear for now.</Text> : null}
    {(compact && !expanded ? items.slice(0, 4) : items).map((item) => <View key={item.id} className="mt-3 rounded-xl border border-line bg-raised p-3"><View className="flex-row items-start gap-2"><View className={`mt-1 h-2 w-2 rounded-full ${item.priority === 'high' ? 'bg-rose' : 'bg-lilac'}`} /><View className="flex-1"><Text className="font-semibold text-[12px] text-white">{item.title}</Text><Text className="mt-1 font-sans text-[11px] leading-[17px] text-muted">{item.detail}</Text></View></View><Pressable accessibilityRole="button" disabled={busy} onPress={() => void act(item)} className="mt-3 self-start rounded-lg border border-lilac/30 px-3 py-2"><Text className="font-semibold text-[11px] text-lilac">{item.action}</Text></Pressable></View>)}
    {compact && items.length > 4 ? <Pressable accessibilityRole="button" onPress={() => setExpanded((value) => !value)} className="mt-3"><Text className="text-[11px] text-lilac">{expanded ? 'Show fewer' : `Show all ${inbox?.total ?? items.length}`}</Text></Pressable> : null}
    {matching ? <View className="mt-4 rounded-xl border border-lilac/30 bg-raised p-4"><Text className="font-semibold text-[14px] text-white">Match this bank transaction</Text><Text className="mt-2 font-sans text-[11px] text-muted">{matching.detail}</Text><Text className="mt-2 font-sans text-[11px] text-amber">Choose a confirmed record with the same currency and enough balance. This records a payment only after you confirm.</Text>{candidates.map((record) => <Pressable key={record.id} accessibilityRole="radio" accessibilityState={{ checked: chosen === record.id }} onPress={() => setChosen(record.id)} className={`mt-2 rounded-lg border p-3 ${chosen === record.id ? 'border-lilac bg-lilac/10' : 'border-line'}`}><Text className="text-[12px] text-white">{record.reference_number || record.counterparty || record.id} · {record.currency} {record.balance_due}</Text></Pressable>)}{!candidates.length ? <Text className="mt-3 text-[11px] text-muted">No matching open record. Update the finance record first, or ignore a non-payment.</Text> : null}<View className="mt-4 flex-row flex-wrap gap-2"><Pressable accessibilityRole="button" onPress={() => setMatching(null)} className="rounded-lg border border-line px-3 py-2"><Text className="text-[11px] text-muted">Cancel</Text></Pressable><Pressable accessibilityRole="button" disabled={busy} onPress={() => void handlePayment(true)} className="rounded-lg border border-line px-3 py-2"><Text className="text-[11px] text-muted">Not a payment</Text></Pressable><Pressable accessibilityRole="button" disabled={!chosen || busy} onPress={() => void handlePayment(false)} className="rounded-lg bg-lilac px-3 py-2 disabled:opacity-40"><Text className="font-semibold text-[11px] text-[#21182d]">Confirm match</Text></Pressable></View></View> : null}
  </Card>;
}
