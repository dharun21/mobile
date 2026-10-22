import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, RefreshControl, ScrollView, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { BrandWordmark } from '../../components/BrandWordmark';
import { Card, Copy, Eyebrow, Heading, SectionTitle } from '../../components/ui';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { useNavigateApp } from '../../context/NavigationContext';
import { colors } from '../../config';
import { api } from '../../services/api';
import type { AppNotification } from '../../types/api';

const specialists = [
  { key: 'finance_analyst', title: 'Finance Analyst', subtitle: 'See the story behind your numbers.', detail: 'Invoices · Records · Insights', tab: 'finance' as const, icon: 'stats-chart-outline' as const },
  { key: 'personal_assistant', title: 'Personal Assistant', subtitle: 'A little help with everything else.', detail: 'Ideas · Plans · Everyday help', tab: 'assistant' as const, icon: 'sparkles-outline' as const },
];

export function HomeScreen() {
  const { user } = useAuth();
  const { isDark } = useTheme();
  const navigate = useNavigateApp();
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activityUnavailable, setActivityUnavailable] = useState(false);
  const enabled = user?.specialists ?? [];
  const hasFinance = enabled.includes('finance_analyst');
  const hasAssistant = enabled.includes('personal_assistant');
  const activeSpecialists = specialists.filter((item) => enabled.includes(item.key));

  const load = useCallback(async () => {
    try {
      const { data } = await api.get<AppNotification[]>('/notifications');
      setNotifications(data.slice(0, 3));
      setActivityUnavailable(false);
    } catch {
      setActivityUnavailable(true);
    } finally {
      setLoading(false);
    }
  }, []);
  useEffect(() => { void load(); }, [load]);

  async function refresh() {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }

  const firstName = user?.name?.trim().split(/\s+/)[0] || 'there';

  return (
    <ScrollView
      className="flex-1"
      contentContainerClassName="px-5 pb-10 pt-3"
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={colors.lilac} />}
      showsVerticalScrollIndicator={false}
    >
      <Eyebrow>Your workspace</Eyebrow>
      <Heading className="mt-3 text-[32px] leading-[39px]">Good to see you,{'\n'}{firstName}.</Heading>
      <Copy className="mt-3">A little more clarity. A little more room for you.</Copy>

      <View className="relative mt-7 overflow-hidden rounded-[28px] border border-lilac/20">
      <LinearGradient
        colors={isDark ? ['#2c2143', '#1c172a', '#17131f'] : ['#F0EAFB', '#E8E1F3', '#F7F5FA']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={{ padding: 24 }}
      >
        <View pointerEvents="none" className="absolute -right-20 -top-12 h-64 w-64 rounded-full border border-lilac/10" />
        <View pointerEvents="none" className="absolute -right-12 -top-4 h-48 w-48 rounded-full border border-lilac/10" />
        <View pointerEvents="none" className="absolute -right-4 top-4 h-32 w-32 rounded-full border border-lilac/10" />
        <BrandWordmark size={44} />
        <Text className="mt-5 font-display text-[27px] leading-[35px] tracking-[-0.8px] text-white">
          {hasFinance ? 'Your numbers.\nA clearer perspective.' : hasAssistant ? 'More space for\nwhat matters.' : 'Great work starts\nwith a great team.'}
        </Text>
        <Text className="mt-3 font-sans text-[14px] leading-[22px] text-body">
          {hasFinance ? 'Meet your next question with a little more confidence. Your analyst is here to help.' : hasAssistant ? 'Talk through an idea, plan your day, or find a new way forward with your assistant.' : 'Discover dedicated AI teammates, built around the work you do every day.'}
        </Text>
        <Pressable
          accessibilityRole="button"
          onPress={() => navigate(hasFinance ? 'chat' : hasAssistant ? 'assistant' : 'pricing')}
          className="mt-6 min-h-14 flex-row items-center justify-between rounded-2xl border border-action/60 bg-action px-4 active:opacity-80"
        >
          <Text className="flex-1 font-bold text-[14px] text-action-foreground">{hasFinance ? 'Talk to your analyst' : hasAssistant ? 'Open your assistant' : 'Explore your AI team'}</Text>
          <Ionicons name="arrow-forward" size={19} color={colors.actionForeground} />
        </Pressable>
      </LinearGradient>
      </View>

      <SectionTitle title="Your AI team" action="View plans" onAction={() => navigate('pricing')} />
      {activeSpecialists.map((item) => (
        <Pressable
          key={item.key}
          accessibilityRole="button"
          accessibilityLabel={'Open AI ' + item.title}
          onPress={() => navigate(item.tab)}
          className="mb-3 overflow-hidden rounded-[24px] border border-line bg-panel active:bg-raised"
        >
          <View className="flex-row items-center p-5">
            <View className="h-12 w-12 items-center justify-center rounded-2xl border border-lilac/15 bg-lilac/10">
              <Ionicons name={item.icon} size={24} color={colors.lilac} />
            </View>
            <View className="ml-4 flex-1">
              <Text className="font-semibold text-[17px] text-white">{item.title}</Text>
              <View className="mt-1.5 flex-row items-center">
                <View className="mr-1.5 h-1.5 w-1.5 rounded-full bg-mint" />
                <Text className="font-medium text-[12px] text-mint">Ready to help</Text>
              </View>
            </View>
            <Ionicons name="arrow-forward" size={19} color={colors.muted} />
          </View>
          <View className="border-t border-line px-5 py-4">
            <Text className="font-sans text-[14px] leading-[21px] text-body">{item.subtitle}</Text>
            <Text className="mt-1.5 font-sans text-[12px] leading-[18px] text-muted">{item.detail}</Text>
          </View>
        </Pressable>
      ))}
      {!activeSpecialists.length ? (
        <Card className="p-5">
          <View className="mb-4 h-12 w-12 items-center justify-center rounded-2xl bg-lilac/10"><Ionicons name="people-outline" size={24} color={colors.lilac} /></View>
          <Text className="font-semibold text-[17px] text-white">Make room for your AI team</Text>
          <Copy className="mt-2">Your enabled specialists will appear here. Explore the plans to find the right fit.</Copy>
          <Pressable accessibilityRole="button" onPress={() => navigate('pricing')} className="mt-3 min-h-12 flex-row items-center">
            <Text className="mr-2 font-semibold text-[14px] text-lilac">Discover specialists</Text>
            <Ionicons name="arrow-forward" size={18} color={colors.lilac} />
          </Pressable>
        </Card>
      ) : null}

      <SectionTitle title="Latest updates" action="See all" onAction={() => navigate('notifications')} />
      <Card className="p-0">
        {loading ? (
          <View className="flex-row items-center p-5"><ActivityIndicator color={colors.lilac} /><Text className="ml-3 font-sans text-[14px] text-muted">Finding your latest updates…</Text></View>
        ) : activityUnavailable ? (
          <View className="p-5">
            <Text className="font-sans text-[14px] leading-[21px] text-muted">Your updates could not be loaded.</Text>
            <Pressable accessibilityRole="button" onPress={() => { setLoading(true); void load(); }} className="mt-1 min-h-11 justify-center self-start"><Text className="font-semibold text-[14px] text-lilac">Try again</Text></Pressable>
          </View>
        ) : notifications.length ? notifications.map((item, index) => (
          <Pressable key={item.id} accessibilityRole="button" accessibilityLabel={'View notification: ' + item.title} onPress={() => navigate('notifications')} className={'flex-row items-start p-5 ' + (index ? 'border-t border-line' : '')}>
            <View className="mt-1 h-9 w-9 items-center justify-center rounded-xl bg-lilac/10"><Ionicons name="notifications-outline" size={17} color={colors.lilac} /></View>
            <View className="ml-3 flex-1">
              <Text className="font-semibold text-[14px] leading-[21px] text-white">{item.title}</Text>
              <Text numberOfLines={2} className="mt-1 font-sans text-[13px] leading-[20px] text-muted">{item.message}</Text>
            </View>
          </Pressable>
        )) : (
          <View className="flex-row items-center p-5">
            <View className="h-11 w-11 items-center justify-center rounded-full bg-lilac/10"><Ionicons name="checkmark-done-outline" size={21} color={colors.lilac} /></View>
            <View className="ml-3 flex-1"><Text className="font-semibold text-[15px] text-white">A quiet moment</Text><Text className="mt-1 font-sans text-[13px] leading-[20px] text-muted">Your workspace updates will appear here.</Text></View>
          </View>
        )}
      </Card>

      <SectionTitle title="Meet what's next" />
      <Card className="p-0">
        <ComingRow icon="people-outline" title="HR Executive" subtitle="A little more care for your people." />
        <View className="mx-5 h-px bg-line" />
        <ComingRow icon="trending-up-outline" title="Sales Analyst" subtitle="Find your next opportunity." />
      </Card>
    </ScrollView>
  );
}

function ComingRow({ icon, title, subtitle }: { icon: keyof typeof Ionicons.glyphMap; title: string; subtitle: string }) {
  return (
    <View className="flex-row items-start p-5">
      <View className="h-10 w-10 items-center justify-center rounded-xl bg-raised"><Ionicons name={icon} size={20} color={colors.muted} /></View>
      <View className="ml-3 flex-1">
        <View className="flex-row flex-wrap items-center gap-2"><Text className="font-semibold text-[15px] text-white">{title}</Text><Text className="font-medium text-[11px] text-lilac">Coming soon</Text></View>
        <Text className="mt-1 font-sans text-[13px] leading-[20px] text-muted">{subtitle}</Text>
      </View>
    </View>
  );
}
