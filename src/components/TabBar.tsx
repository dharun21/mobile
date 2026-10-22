import React, { useEffect, useRef } from 'react';
import { Animated, Platform, Pressable, Text, View, useWindowDimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { MainTab, PinnedSpecialist } from '../config';
import { colors, fonts } from '../config';
import { useReduceMotion } from './Motion';

type PinnedTab = PinnedSpecialist;
type Destination = { key: MainTab; title: string; icon: keyof typeof Ionicons.glyphMap; activeIcon: keyof typeof Ionicons.glyphMap };
const fixedDestinations: Destination[] = [
  { key: 'home', title: 'Home', icon: 'grid-outline', activeIcon: 'grid' },
  { key: 'ais', title: "AI's", icon: 'apps-outline', activeIcon: 'apps' },
  { key: 'profile', title: 'Profile', icon: 'person-outline', activeIcon: 'person' },
];
const chatDestination = { key: 'chat' as const, title: 'AI Chat', icon: 'sparkles-outline' as const, activeIcon: 'sparkles' as const };
const pinnedDestination: Record<PinnedTab, { key: PinnedTab; title: string; icon: keyof typeof Ionicons.glyphMap; activeIcon: keyof typeof Ionicons.glyphMap }> = {
  finance: { key: 'finance', title: 'Finance', icon: 'stats-chart-outline', activeIcon: 'stats-chart' },
  assistant: { key: 'assistant', title: 'Assist', icon: 'heart-outline', activeIcon: 'heart' },
};

export function TabBar({ active, pinned, specialists, onChange }: { active: MainTab; pinned: PinnedTab | null; specialists: string[]; onChange: (tab: MainTab) => void }) {
  const { width: screenWidth } = useWindowDimensions();
  const shortcut = pinned && specialists.includes(pinned === 'assistant' ? 'personal_assistant' : 'finance_analyst')
    ? [pinnedDestination[pinned]] : [];
  const allowed = [fixedDestinations[0], fixedDestinations[1], ...(specialists.length ? [chatDestination] : []), ...shortcut, fixedDestinations[2]];
  const tabWidth = Math.min(78, Math.max(52, (screenWidth - 44) / allowed.length));

  return <SafeAreaView edges={['bottom']} className="bg-canvas px-4 pt-1">
    <View accessibilityRole="tablist" style={{ width: allowed.length * tabWidth + 12 }} className="h-[72px] flex-row items-center self-start rounded-[26px] border border-line bg-panel px-1.5">
      {allowed.map((item) => <TabItem key={item.key} item={item} width={tabWidth} selected={active === item.key} onPress={() => onChange(item.key)} />)}
    </View>
  </SafeAreaView>;
}

function TabItem({ item, width, selected, onPress }: { item: Destination; width: number; selected: boolean; onPress: () => void }) {
  const progress = useRef(new Animated.Value(selected ? 1 : 0)).current;
  const reducedMotion = useReduceMotion();

  useEffect(() => {
    const animation = Animated.spring(progress, {
      toValue: selected ? 1 : 0,
      stiffness: 310,
      damping: 26,
      mass: 0.8,
      useNativeDriver: Platform.OS !== 'web',
    });
    if (reducedMotion) progress.setValue(selected ? 1 : 0);
    else animation.start();
    return () => animation.stop();
  }, [progress, reducedMotion, selected]);

  const pillOpacity = progress.interpolate({ inputRange: [0, 1], outputRange: [0, 1] });
  const iconScale = progress.interpolate({ inputRange: [0, 1], outputRange: [1, 1.08] });
  const iconTranslate = progress.interpolate({ inputRange: [0, 1], outputRange: [0, -1] });

  return <Pressable
    accessibilityRole="tab"
    accessibilityLabel={item.title}
    accessibilityState={{ selected }}
    onPress={onPress}
    style={{ width }}
    className="h-full flex-none items-center justify-center px-0.5 py-2 active:opacity-80"
  >
    <View className="h-10 w-[58px] items-center justify-center">
      <Animated.View pointerEvents="none" className="absolute h-9 w-[54px] overflow-hidden rounded-[18px]" style={{ opacity: pillOpacity }}>
        <LinearGradient colors={['#C4B5FD35', '#8B75C914']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={{ flex: 1, borderWidth: 1, borderColor: '#C4B5FD30', borderRadius: 18 }} />
      </Animated.View>
      <Animated.View style={{ transform: [{ scale: iconScale }, { translateY: iconTranslate }] }}>
        <Ionicons name={selected ? item.activeIcon : item.icon} size={20} color={selected ? colors.lilac : colors.muted} />
      </Animated.View>
    </View>
    <Text style={{ fontFamily: selected ? fonts.semibold : fonts.medium, fontSize: width < 62 ? 9 : 10, lineHeight: 15, letterSpacing: 0, color: selected ? colors.text : colors.muted, textAlign: 'center' }}>{item.title}</Text>
  </Pressable>;
}
