import React from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { Card, Copy, Eyebrow, Heading } from '../../components/ui';
import { colors, type PinnedSpecialist } from '../../config';
import { useAuth } from '../../context/AuthContext';
import { useNavigateApp } from '../../context/NavigationContext';
import { useTheme } from '../../context/ThemeContext';

const specialists = [
  { key: 'finance_analyst', title: 'Finance Analyst', subtitle: 'Bring invoices, records and insights into focus.', icon: 'stats-chart-outline' as const, route: 'finance' as const, shortcut: 'finance' as const },
  { key: 'personal_assistant', title: 'Personal Assistant', subtitle: 'Make space for plans, ideas and everyday tasks.', icon: 'sparkles-outline' as const, route: 'assistant' as const, shortcut: 'assistant' as const },
  { key: 'hr_executive', title: 'HR Executive', subtitle: 'People support for your growing team.', icon: 'people-outline' as const },
  { key: 'sales_analyst', title: 'Sales Analyst', subtitle: 'Find patterns and opportunities in your sales.', icon: 'trending-up-outline' as const },
];

export function AITeamScreen({ pinned, onPin }: { pinned: PinnedSpecialist | null; onPin: (value: PinnedSpecialist | null) => void }) {
  const { user } = useAuth();
  const { isDark } = useTheme();
  const navigate = useNavigateApp();
  const enabled = specialists.filter((item) => user?.specialists.includes(item.key));

  return (
    <ScrollView className="flex-1" contentContainerClassName="px-5 pb-10 pt-3" showsVerticalScrollIndicator={false}>
      <Eyebrow>Your AI team</Eyebrow>
      <Heading className="mt-3">A little help,{ '\n' }right where you need it.</Heading>
      <Copy className="mt-3">Your specialists live here. Add a favorite to your bottom menu for one-tap access.</Copy>

      <View className="mt-7 overflow-hidden rounded-[27px] border border-lilac/20">
        <LinearGradient colors={isDark ? ['#302448', '#1d1928', '#17141d'] : ['#F0EAFB', '#E9E3F2', '#F7F5FA']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={{ padding: 21 }}>
          <View className="flex-row items-center">
            <View className="h-12 w-12 items-center justify-center rounded-2xl border border-lilac/20 bg-lilac/10"><Ionicons name="sparkles" size={23} color={colors.lilac} /></View>
            <View className="ml-4 flex-1"><Text className="font-semibold text-[16px] text-white">Your people, your shortcuts</Text><Text className="mt-1 font-sans text-[13px] leading-[19px] text-body">Keep the bottom menu focused on what you use most.</Text></View>
          </View>
        </LinearGradient>
      </View>

      <View className="mb-4 mt-7 flex-row items-center justify-between">
        <Text className="font-display text-[20px] text-white">Your specialists</Text>
        <Text className="font-medium text-[12px] text-muted">{enabled.length} {enabled.length === 1 ? 'AI teammate' : 'AI teammates'}</Text>
      </View>

      {enabled.map((item) => {
        const route = 'route' in item ? item.route : null;
        const available = route !== null;
        const shortcut = 'shortcut' in item ? item.shortcut : null;
        const isPinned = !!shortcut && pinned === shortcut;
        return (
          <Card key={item.key} className="mb-3 p-0">
            <View className="flex-row items-center px-4 pb-4 pt-4">
              <View className="h-12 w-12 items-center justify-center rounded-2xl border border-lilac/15 bg-lilac/10"><Ionicons name={item.icon} size={22} color={colors.lilac} /></View>
              <View className="ml-3 flex-1"><Text className="font-semibold text-[16px] text-white">{item.title}</Text><Text className="mt-1 font-sans text-[12px] text-mint">{available ? 'Ready to help' : 'Coming soon'}</Text></View>
              {route ? <Pressable accessibilityRole="button" accessibilityLabel={'Open ' + item.title} onPress={() => navigate(route)} className="h-11 w-11 items-center justify-center rounded-full bg-raised active:bg-line"><Ionicons name="arrow-forward" size={19} color={colors.lilac} /></Pressable> : null}
            </View>
            <View className="border-t border-line px-4 py-4">
              <Copy>{item.subtitle}</Copy>
              {shortcut ? <View className="mt-3 flex-row items-center justify-between">
                <Text className="flex-1 pr-3 font-sans text-[11px] leading-[17px] text-muted">{isPinned ? 'Available from your bottom menu.' : 'Add a one-tap shortcut to your bottom menu.'}</Text>
                <Pressable accessibilityRole="button" accessibilityState={{ selected: isPinned }} onPress={() => onPin(isPinned ? null : shortcut)} className={'min-h-10 flex-row items-center rounded-full border px-3 ' + (isPinned ? 'border-lilac/30 bg-lilac/10' : 'border-line bg-raised')}>
                  <Ionicons name={isPinned ? 'checkmark' : 'add'} size={16} color={colors.lilac} />
                  <Text className="ml-1.5 font-semibold text-[11px] text-lilac">{isPinned ? 'In menu' : 'Add to menu'}</Text>
                </Pressable>
              </View> : null}
              {item.key === 'finance_analyst' ? <Pressable accessibilityRole="button" onPress={() => navigate('chat')} className="mt-2 min-h-10 flex-row items-center self-start"><Ionicons name="chatbubble-ellipses-outline" size={16} color={colors.lilac} /><Text className="ml-2 font-semibold text-[12px] text-lilac">Chat with your analyst</Text></Pressable> : null}
            </View>
          </Card>
        );
      })}

      {!enabled.length ? <Card className="items-center px-6 py-9">
        <View className="mb-4 h-14 w-14 items-center justify-center rounded-2xl bg-lilac/10"><Ionicons name="people-outline" size={26} color={colors.lilac} /></View>
        <Text className="text-center font-semibold text-[17px] text-white">Your AI team is waiting</Text>
        <Copy className="mt-2 text-center">Your workspace administrator can enable specialists for your account.</Copy>
        {user?.is_admin ? <Pressable accessibilityRole="button" onPress={() => navigate('admin')} className="mt-3 min-h-11 flex-row items-center"><Text className="font-semibold text-[13px] text-lilac">Manage team access</Text><Ionicons name="arrow-forward" size={16} color={colors.lilac} style={{ marginLeft: 7 }} /></Pressable> : null}
      </Card> : null}

      <Text className="mt-4 px-1 font-sans text-[12px] leading-[19px] text-muted">Your bottom menu stays compact. Use the AI team to see your specialists, then pin a favorite whenever you like.</Text>
    </ScrollView>
  );
}
