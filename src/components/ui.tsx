import React, { forwardRef, useState } from 'react';
import { ActivityIndicator, Pressable, Text, TextInput, View, type ScrollViewProps, type TextInputProps, type ViewProps } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { colors, fonts } from '../config';
import { useTheme } from '../context/ThemeContext';
import { KeyboardScrollView, useRevealFocusedInput } from './KeyboardLayout';

export function Screen({ children, scroll = true, className = '', ...props }: ScrollViewProps & { scroll?: boolean; className?: string }) {
  if (!scroll) return <View className={`flex-1 bg-canvas ${className}`} {...(props as ViewProps)}>{children}</View>;
  return <KeyboardScrollView className={`flex-1 bg-canvas ${className}`} contentContainerClassName="px-6 pb-10 pt-3" {...props}>{children}</KeyboardScrollView>;
}

export function Card({ children, className = '', ...props }: ViewProps & { className?: string }) {
  return <View className={`rounded-[24px] border border-line bg-panel p-5 ${className}`} {...props}>{children}</View>;
}

export function Eyebrow({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return <Text className={`font-semibold text-[11px] uppercase leading-[16px] tracking-[2px] text-lilac ${className}`}>{children}</Text>;
}

export function Heading({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return <Text accessibilityRole="header" className={`font-display text-[30px] leading-[38px] tracking-[-1px] text-white ${className}`}>{children}</Text>;
}

export function Copy({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return <Text className={`font-sans text-[14px] leading-[22px] text-muted ${className}`}>{children}</Text>;
}

export function PrimaryButton({ title, onPress, loading = false, className = '', disabled = false, icon = 'arrow-forward', accessibilityLabel }: { title: string; onPress: () => void; loading?: boolean; className?: string; disabled?: boolean; icon?: keyof typeof Ionicons.glyphMap | null; accessibilityLabel?: string }) {
  return <Pressable accessibilityRole="button" accessibilityLabel={accessibilityLabel ?? title} accessibilityState={{ disabled: disabled || loading, busy: loading }} onPress={onPress} disabled={disabled || loading} className={`overflow-hidden rounded-[18px] ${disabled || loading ? 'opacity-60' : 'active:opacity-80'} ${className}`}>
    <LinearGradient colors={['#D5C5FF', '#B49BEF']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={{ minHeight: 56, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingHorizontal: 20, paddingVertical: 16, gap: 10 }}>
      {loading ? <ActivityIndicator color={colors.ink} /> : <><Text style={{ fontFamily: fonts.bold, fontSize: 15, color: colors.ink }}>{title}</Text>{icon ? <Ionicons name={icon} size={18} color={colors.ink} /> : null}</>}
    </LinearGradient>
  </Pressable>;
}

type FieldProps = TextInputProps & {
  className?: string;
  label?: string;
  hint?: string;
  error?: string;
  icon?: keyof typeof Ionicons.glyphMap;
  trailingIcon?: keyof typeof Ionicons.glyphMap;
  trailingIconLabel?: string;
  onTrailingIconPress?: () => void;
};
export const Field = forwardRef<TextInput, FieldProps>(function Field({ className = '', label, hint, error, icon, trailingIcon, trailingIconLabel, onTrailingIconPress, style, onFocus, onBlur, onContentSizeChange, ...props }, ref) {
  const [focused, setFocused] = useState(false);
  const { isDark } = useTheme();
  const reveal = useRevealFocusedInput();
  const field = <View className={`h-14 flex-row items-center overflow-hidden rounded-[16px] border bg-canvas ${className}`} style={{ borderColor: error ? colors.rose : focused ? '#B7A0F0' : colors.line }}>
    {icon ? <View pointerEvents="none" className="h-14 w-12 shrink-0 items-center justify-center"><Ionicons name={icon} size={19} color={focused ? colors.lilac : colors.muted} /></View> : null}
    <TextInput ref={ref} placeholderTextColor={isDark ? '#756E84' : '#777080'} selectionColor={colors.lilac} keyboardAppearance={isDark ? 'dark' : 'light'} accessibilityLabel={props.accessibilityLabel ?? label ?? props.placeholder} {...props}
    onFocus={(event) => { setFocused(true); reveal(); onFocus?.(event); }}
    onBlur={(event) => { setFocused(false); onBlur?.(event); }}
    onContentSizeChange={(event) => { if (focused && props.multiline) reveal(); onContentSizeChange?.(event); }}
    className="h-14 min-w-0 flex-1 border-0 bg-transparent px-0 py-0 font-sans text-[16px] leading-6 text-white"
    style={[{ textAlignVertical: 'center' }, style]} />
    {trailingIcon && onTrailingIconPress ? <Pressable accessibilityRole="button" accessibilityLabel={trailingIconLabel ?? 'Field action'} onPress={onTrailingIconPress} className="h-14 w-12 shrink-0 items-center justify-center active:bg-white/5"><Ionicons name={trailingIcon} size={20} color={colors.muted} /></Pressable> : null}
  </View>;
  if (!label && !hint && !error) return field;
  return <View>
    {label ? <Text className="mb-3 font-medium text-[13px] text-lilac-bright">{label}</Text> : null}
    {field}
    {error ? <ErrorText>{error}</ErrorText> : hint ? <Text className="mt-2 font-sans text-[12px] leading-[18px] text-muted">{hint}</Text> : null}
  </View>;
});

export function SectionTitle({ title, action, onAction }: { title: string; action?: string; onAction?: () => void }) {
  return <View className="mb-3 mt-7 flex-row items-center justify-between gap-2"><Text accessibilityRole="header" className="flex-1 font-display text-[19px] tracking-[-0.4px] text-white">{title}</Text>{action ? <Pressable accessibilityRole="button" accessibilityLabel={`${action} ${title.toLowerCase()}`} onPress={onAction} className="min-h-11 min-w-11 items-end justify-center"><Text className="font-semibold text-[13px] text-lilac">{action}</Text></Pressable> : null}</View>;
}

export function ErrorText({ children }: { children?: React.ReactNode }) {
  if (!children) return null;
  return <Text accessibilityRole="alert" accessibilityLiveRegion="polite" className="mt-3 font-sans text-[13px] leading-[20px] text-rose">{children}</Text>;
}

export function EmptyState({ icon, title, body }: { icon: string; title: string; body: string }) {
  const iconName = icon in Ionicons.glyphMap ? icon as keyof typeof Ionicons.glyphMap : 'sparkles-outline';
  return <View className="items-center rounded-[24px] border border-dashed border-line px-6 py-8"><View className="mb-4 h-12 w-12 items-center justify-center rounded-2xl bg-lilac/10"><Ionicons name={iconName} size={23} color={colors.lilac} /></View><Text className="text-center font-semibold text-[16px] text-white">{title}</Text><Text className="mt-2 text-center font-sans text-[14px] leading-[22px] text-muted">{body}</Text></View>;
}

export function Row({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return <View className={`flex-row items-center ${className}`}>{children}</View>;
}
