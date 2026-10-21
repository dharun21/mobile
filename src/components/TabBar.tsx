import React from 'react';
import { Pressable, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { MainTab } from '../config';
import { colors } from '../config';

const destinations: { key: MainTab; title: string; icon: keyof typeof Ionicons.glyphMap }[] = [
  { key: 'home', title: 'Home', icon: 'grid-outline' },
  { key: 'finance', title: 'Finance', icon: 'stats-chart-outline' },
  { key: 'chat', title: 'AI Chat', icon: 'sparkles-outline' },
  { key: 'assistant', title: 'Assistant', icon: 'heart-outline' },
  { key: 'profile', title: 'Profile', icon: 'person-outline' },
];

export function TabBar({ active, onChange }: { active: MainTab; onChange: (tab: MainTab) => void }) {
  return <SafeAreaView edges={['bottom']} className="border-t border-line bg-panel">
    <View className="h-[62px] flex-row items-center justify-around px-1">
      {destinations.map((item) => {
        const selected = active === item.key;
        return <Pressable key={item.key} onPress={() => onChange(item.key)} className="min-w-[62px] items-center gap-1 px-2 py-2">
          <View className={`h-7 min-w-10 items-center justify-center rounded-full px-3 ${selected ? 'bg-lilac/15' : ''}`}><Ionicons name={selected ? item.icon.replace('-outline', '') as keyof typeof Ionicons.glyphMap : item.icon} size={19} color={selected ? colors.lilac : colors.muted} /></View>
          <Text className={`text-[9px] ${selected ? 'font-semibold text-lilac-bright' : 'text-muted'}`}>{item.title}</Text>
        </Pressable>;
      })}
    </View>
  </SafeAreaView>;
}
