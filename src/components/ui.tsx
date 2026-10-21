import React from 'react';
import { ActivityIndicator, Pressable, ScrollView, Text, TextInput, View, type ScrollViewProps, type TextInputProps, type ViewProps } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors } from '../config';

export function Screen({ children, scroll = true, className = '', ...props }: ScrollViewProps & { scroll?: boolean; className?: string }) {
  if (!scroll) return <SafeAreaView className={`flex-1 bg-ink ${className}`} {...(props as ViewProps)}>{children}</SafeAreaView>;
  return <SafeAreaView className="flex-1 bg-ink" edges={['top']}><ScrollView className={`flex-1 ${className}`} contentContainerClassName="px-5 pb-10" keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false} {...props}>{children}</ScrollView></SafeAreaView>;
}

export function Card({ children, className = '', ...props }: ViewProps & { className?: string }) {
  return <View className={`rounded-[24px] border border-line bg-panel p-4 ${className}`} {...props}>{children}</View>;
}

export function Eyebrow({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return <Text className={`text-[10px] font-bold uppercase tracking-[2px] text-lilac ${className}`}>{children}</Text>;
}

export function Heading({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return <Text className={`text-[27px] font-bold leading-[32px] tracking-[-0.7px] text-white ${className}`}>{children}</Text>;
}

export function Copy({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return <Text className={`text-[13px] leading-[20px] text-muted ${className}`}>{children}</Text>;
}

export function PrimaryButton({ title, onPress, loading = false, className = '', disabled = false }: { title: string; onPress: () => void; loading?: boolean; className?: string; disabled?: boolean }) {
  return <Pressable accessibilityRole="button" onPress={onPress} disabled={disabled || loading} className={`min-h-14 flex-row items-center justify-center rounded-2xl bg-lilac px-5 ${disabled || loading ? 'opacity-60' : 'active:opacity-80'} ${className}`}>
    {loading ? <ActivityIndicator color={colors.ink} /> : <Text className="text-[14px] font-bold text-ink">{title}</Text>}
  </Pressable>;
}

export function Field({ className = '', ...props }: TextInputProps & { className?: string }) {
  return <TextInput placeholderTextColor={colors.muted} selectionColor={colors.lilac} className={`min-h-14 rounded-2xl border border-line bg-panel px-4 text-[15px] text-white ${className}`} {...props} />;
}

export function SectionTitle({ title, action, onAction }: { title: string; action?: string; onAction?: () => void }) {
  return <View className="mb-3 mt-7 flex-row items-center justify-between"><Text className="text-[18px] font-semibold text-white">{title}</Text>{action ? <Pressable onPress={onAction}><Text className="text-[12px] font-semibold text-lilac-bright">{action}</Text></Pressable> : null}</View>;
}

export function ErrorText({ children }: { children?: React.ReactNode }) {
  if (!children) return null;
  return <Text accessibilityRole="alert" className="mt-3 text-[12px] leading-[18px] text-rose">{children}</Text>;
}

export function EmptyState({ icon, title, body }: { icon: string; title: string; body: string }) {
  return <Card className="items-center px-6 py-7"><Text className="mb-3 text-[25px] text-lilac">{icon}</Text><Text className="text-center text-[15px] font-semibold text-white">{title}</Text><Text className="mt-2 text-center text-[12px] leading-[18px] text-muted">{body}</Text></Card>;
}

export function Row({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return <View className={`flex-row items-center ${className}`}>{children}</View>;
}
