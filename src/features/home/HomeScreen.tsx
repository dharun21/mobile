import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, RefreshControl, ScrollView, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { Card, Copy, EmptyState, Eyebrow, Heading, SectionTitle } from '../../components/ui';
import { useAuth } from '../../context/AuthContext';
import { useNavigateApp } from '../../context/NavigationContext';
import { colors } from '../../config';
import { api, errorMessage } from '../../services/api';
import type { AppNotification } from '../../types/api';

const specialists = [
  { key: 'finance_analyst', title: 'AI Finance Analyst', subtitle: 'Invoices, records & business insights', tab: 'finance' as const, icon: 'stats-chart-outline' as const, color: colors.lilac },
  { key: 'personal_assistant', title: 'AI Personal Assistant', subtitle: 'A little help with everything else', tab: 'assistant' as const, icon: 'heart-outline' as const, color: colors.mint },
];

export function HomeScreen() {
  const { user } = useAuth();
  const navigate = useNavigateApp();
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const enabled = user?.specialists ?? [];
  const hasFinance = enabled.includes('finance_analyst');
  const hasAssistant = enabled.includes('personal_assistant');

  const load = useCallback(async () => {
    try {
      const { data } = await api.get<AppNotification[]>('/notifications');
      setNotifications(data.slice(0, 3)); setError('');
    } catch (e) { setError(errorMessage(e)); }
  }, []);
  useEffect(() => { void load(); }, [load]);

  async function refresh() { setRefreshing(true); await load(); setRefreshing(false); }
  const firstName = user?.name?.split(/\s+/)[0] || 'there';

  return <ScrollView className="flex-1" contentContainerClassName="px-5 pb-10 pt-2" refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={colors.lilac} />} showsVerticalScrollIndicator={false}>
    <Eyebrow>Your ZengenAI workspace</Eyebrow>
    <Heading className="mt-2">Good to see you,{'\n'}{firstName}.</Heading>
    <Copy className="mt-2">{enabled.length ? 'Your AI teammates are ready. What can we help with?' : 'Your next AI teammate is waiting to be discovered.'}</Copy>

    <LinearGradient colors={['#2A2238', '#1C1925', '#171820']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} className="mt-6 overflow-hidden rounded-[28px] border border-lilac/25 p-5">
      <View className="flex-row items-center"><Ionicons name="sparkles" size={16} color={colors.lilac} /><Eyebrow className="ml-2">A little more in flow</Eyebrow></View>
      <Text className="mt-4 text-[25px] font-semibold leading-[29px] tracking-[-0.7px] text-white">{hasFinance ? 'Clarity for the\nbusiness behind the numbers.' : 'Meet your next\nthoughtful AI teammate.'}</Text>
      <Copy className="mt-2">{hasFinance ? 'Ask a question, review an invoice, or see what needs your attention.' : 'Bring a little more calm and capability to the work ahead.'}</Copy>
      <Pressable onPress={() => navigate(hasFinance ? 'chat' : hasAssistant ? 'assistant' : 'pricing')} className="mt-4 self-start flex-row items-center rounded-2xl bg-lilac px-4 py-3 active:opacity-80">
        <Text className="text-[12px] font-bold text-ink">{hasFinance ? 'Talk to your AI analyst' : hasAssistant ? 'Open your assistant' : 'Explore your AI team'}</Text><Ionicons name="arrow-forward" size={16} color={colors.ink} style={{ marginLeft: 8 }} />
      </Pressable>
      <View className="absolute -right-9 -top-9 h-36 w-36 rounded-full border border-lilac/15" />
      <View className="absolute -right-2 -top-2 h-24 w-24 rounded-full border border-lilac/10" />
    </LinearGradient>

    <SectionTitle title="Your AI team" action="Plans" onAction={() => navigate('pricing')} />
    {specialists.filter((item) => enabled.includes(item.key)).map((item) => <Pressable key={item.key} onPress={() => navigate(item.tab)} className="mb-2 flex-row items-center rounded-[22px] border border-line bg-panel p-4 active:bg-raised">
      <View className="h-12 w-12 items-center justify-center rounded-2xl" style={{ backgroundColor: `${item.color}20` }}><Ionicons name={item.icon} size={22} color={item.color} /></View>
      <View className="ml-3 flex-1"><Text className="text-[14px] font-semibold text-white">{item.title}</Text><Text className="mt-1 text-[11px] text-muted">{item.subtitle}</Text></View>
      <View className="rounded-full bg-mint/10 px-2 py-1"><Text className="text-[9px] font-bold tracking-wider text-mint">READY</Text></View>
    </Pressable>)}
    {!hasFinance && !hasAssistant ? <EmptyState icon="✦" title="Your AI team starts here" body="Specialist access is managed for your account. Enabled teammates will appear here." /> : null}

    <SectionTitle title="Coming to your team" />
    <View className="flex-row gap-3">
      <ComingCard icon="people-outline" title="AI HR Executive" tone="amber" />
      <ComingCard icon="trending-up-outline" title="AI Sales Analyst" tone="blue" />
    </View>

    {notifications.length ? <><SectionTitle title="Recent activity" action="See all" onAction={() => navigate('notifications')} />{notifications.map((item) => <Card key={item.id} className="mb-2 flex-row items-start p-3"><Ionicons name="notifications-outline" size={18} color={colors.lilac} /><View className="ml-3 flex-1"><Text className="text-[13px] font-semibold text-white">{item.title}</Text><Text numberOfLines={2} className="mt-1 text-[11px] leading-4 text-muted">{item.message}</Text></View></Card>)}</> : error ? <Text className="mt-5 text-[11px] text-muted">Activity is temporarily unavailable.</Text> : null}
  </ScrollView>;
}

function ComingCard({ icon, title, tone }: { icon: keyof typeof Ionicons.glyphMap; title: string; tone: 'amber' | 'blue' }) {
  const color = tone === 'amber' ? colors.amber : '#91C8FF';
  return <Card className="min-h-28 flex-1 p-4"><Ionicons name={icon} size={19} color={color} /><Text className="mt-3 text-[12px] font-semibold text-white">{title}</Text><Text className="mt-1 text-[10px] text-muted">Coming soon</Text></Card>;
}
