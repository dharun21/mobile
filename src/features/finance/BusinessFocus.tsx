import React from 'react';
import { Pressable, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Card, Copy } from '../../components/ui';
import type { FinanceOverview } from '../../types/api';

type Focus = NonNullable<FinanceOverview['focus']>;
type BalanceRow = Focus['balances'][string][number];

function amount(value: string | number, currency: string) {
  try { return new Intl.NumberFormat(undefined, { style: 'currency', currency }).format(Number(value)); }
  catch { return `${currency} ${Number(value).toFixed(2)}`; }
}

function amounts(rows: BalanceRow[] | undefined, currency: string) {
  return rows?.length ? rows.map((row) => amount(row.amount, row.currency)).join(' · ') : amount(0, currency);
}

export function BusinessFocus({ focus, currency, onOpenRecords }: {
  focus?: FinanceOverview['focus']; currency: string; onOpenRecords: (scope: 'Invoices' | 'Bills') => void;
}) {
  if (!focus || focus.business_type === 'general') return null;
  const retail = focus.business_type === 'retail';
  const scope = retail ? 'invoices' : 'bills';
  const counterparties = retail ? focus.concentration.customers : focus.concentration.suppliers;
  const metrics: { title: string; rows: BalanceRow[] | undefined; destination: 'Invoices' | 'Bills' }[] = retail ? [
    { title: 'Open customer balances', rows: focus.balances.invoices, destination: 'Invoices' },
    { title: 'Overdue collections', rows: focus.balances.overdue_invoices, destination: 'Invoices' },
    { title: 'Supplier bills due in 7 days', rows: focus.balances.due_soon_bills, destination: 'Bills' },
  ] : [
    { title: 'Open supplier obligations', rows: focus.balances.bills, destination: 'Bills' },
    { title: 'Overdue supplier bills', rows: focus.balances.overdue_bills, destination: 'Bills' },
    { title: 'Customer balances due in 7 days', rows: focus.balances.due_soon_invoices, destination: 'Invoices' },
  ];
  return <View className="mt-6 gap-4">
    <Card className="border-lilac/25 bg-lilac/5 p-5"><Text className="font-semibold text-[10px] tracking-[1.4px] text-lilac-bright">{retail ? 'RETAIL VIEW' : 'CORPORATE VIEW'} · {focus.as_of}</Text><Text className="mt-2 font-semibold text-[18px] text-white">{retail ? 'Collections and store finance' : 'Obligations and exposure'}</Text><Copy className="mt-2 text-[12px]">{retail ? 'Start with customer balances and bills. Product margins need stock and POS records.' : 'Start with payables and due dates. Group profit and budgets need entity and ledger records.'}</Copy></Card>
    <View className="gap-2">{metrics.map((metric) => <Pressable key={metric.title} accessibilityRole="button" onPress={() => onOpenRecords(metric.destination)} className="min-h-20 flex-row items-center justify-between gap-4 rounded-2xl border border-line bg-panel p-4"><View className="flex-1"><Text className="font-medium text-[12px] text-muted">{metric.title}</Text><Text className="mt-1 font-semibold text-[17px] text-white">{amounts(metric.rows, currency)}</Text><Text className="mt-1 font-sans text-[10px] text-muted">{(metric.rows ?? []).reduce((sum, row) => sum + row.count, 0)} confirmed open record(s) · by currency</Text></View><Ionicons name="chevron-forward" size={17} color="#B89BE7" /></Pressable>)}</View>
    <Card className="p-5"><Text className="font-semibold text-[15px] text-white">{retail ? 'Customer invoice aging' : 'Supplier bill aging'}</Text><Copy className="mt-1 text-[11px]">Remaining balances by saved due date</Copy>{focus.aging[scope]?.length ? <View className="mt-4">{focus.aging[scope].map((row) => <View key={`${row.currency}-${row.bucket}`} className="flex-row justify-between gap-3 border-b border-line py-3"><Text className="flex-1 font-sans text-[12px] text-muted">{row.label} ({row.count})</Text><Text className="font-semibold text-[12px] text-white">{amount(row.amount, row.currency)}</Text></View>)}</View> : <Copy className="mt-4 text-[12px]">No confirmed open {retail ? 'customer invoices' : 'supplier bills'} yet.</Copy>}</Card>
    <Card className="p-5"><Text className="font-semibold text-[15px] text-white">{retail ? 'Largest customer balances' : 'Largest supplier balances'}</Text><Copy className="mt-1 text-[11px]">Share of identified open balances within each currency</Copy>{counterparties?.length ? <View className="mt-4">{counterparties.map((row) => <View key={`${row.currency}-${row.name}`} className="flex-row justify-between gap-3 border-b border-line py-3"><Text numberOfLines={1} className="flex-1 font-sans text-[12px] text-muted">{row.name} · {row.share_percent}%</Text><Text className="font-semibold text-[12px] text-white">{amount(row.amount, row.currency)}</Text></View>)}</View> : <Copy className="mt-4 text-[12px]">Identified {retail ? 'customers' : 'suppliers'} with open balances will appear here.</Copy>}{focus.missing_counterparty_counts[scope] > 0 ? <Text className="mt-3 font-sans text-[11px] text-amber">{focus.missing_counterparty_counts[scope]} record(s) without a name are excluded from shares.</Text> : null}</Card>
    <Card className="p-5"><Text className="font-semibold text-[15px] text-white">What would complete this view</Text><View className="mt-4 gap-3">{focus.missing_data.map((item) => <View key={item.title} className="rounded-2xl border border-dashed border-line bg-raised/40 p-4"><Text className="font-semibold text-[10px] tracking-[1px] text-amber">NEEDS DATA</Text><Text className="mt-2 font-semibold text-[13px] text-white">{item.title}</Text><Copy className="mt-1 text-[11px]">{item.detail}</Copy></View>)}</View></Card>
    <Copy className="px-1 text-[11px]">{focus.basis_note}</Copy>
  </View>;
}
