import React, { useState } from 'react';
import { Platform, Pressable, ScrollView, Switch, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { BottomSheet } from '../../components/BottomSheet';
import { BrandWordmark } from '../../components/BrandWordmark';
import { Card, Copy, ErrorText, Eyebrow, Field, Heading, PrimaryButton, SectionTitle } from '../../components/ui';
import { colors } from '../../config';
import { useAuth } from '../../context/AuthContext';
import { useNavigateApp } from '../../context/NavigationContext';
import { useTheme } from '../../context/ThemeContext';
import { errorMessage } from '../../services/api';
import { Alert } from '../../services/appAlert';

const specialistNames: Record<string, string> = {
  finance_analyst: 'Finance Analyst', personal_assistant: 'Personal Assistant',
  hr_executive: 'HR Executive', sales_analyst: 'Sales Analyst',
};

export function ProfileScreen() {
  const { user, updateName, signOut } = useAuth();
  const navigate = useNavigateApp();
  const { mode, isDark, toggleTheme } = useTheme();
  const [editOpen, setEditOpen] = useState(false);
  const [draftName, setDraftName] = useState(user?.name ?? '');
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState('');
  const initials = (user?.name ?? 'Z').trim().split(/\s+/).slice(0, 2).map((part) => part[0]?.toUpperCase()).join('');

  function openEditor() {
    setDraftName(user?.name ?? '');
    setSaveError('');
    setEditOpen(true);
  }

  async function saveName() {
    if (!draftName.trim() || saving) return;
    setSaving(true);
    setSaveError('');
    try {
      await updateName(draftName.trim());
      setEditOpen(false);
    } catch (e) {
      setSaveError(errorMessage(e));
    } finally {
      setSaving(false);
    }
  }

  function askSignOut() {
    Alert.alert('Sign out of Zengen AI?', 'Your workspace will be here when you return.', [
      { text: 'Stay signed in', style: 'cancel' },
      { text: 'Sign out', style: 'destructive', onPress: () => void signOut() },
    ]);
  }

  return (
    <>
      <ScrollView className="flex-1" contentContainerClassName="px-5 pb-10 pt-3" showsVerticalScrollIndicator={false}>
        <Eyebrow>Your account</Eyebrow>
        <Heading className="mt-3">Make it yours.</Heading>
        <Copy className="mt-2">Your profile, your team, your workspace.</Copy>

        <View className="mt-7 overflow-hidden rounded-[28px] border border-lilac/20">
        <LinearGradient colors={isDark ? ['#282037', '#17131f'] : ['#F0EAFB', '#E7E1F2']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={{ padding: 24 }}>
          <View className="flex-row items-start justify-between">
            <View className="h-[76px] w-[76px] items-center justify-center rounded-[24px] border border-lilac/30 bg-lilac/15"><Text className="font-display text-[28px] text-lilac-bright">{initials || 'Z'}</Text></View>
            <Pressable accessibilityRole="button" accessibilityLabel="Edit your profile name" onPress={openEditor} className="h-12 w-12 items-center justify-center rounded-full border border-line bg-panel/50 active:bg-raised"><Ionicons name="create-outline" size={21} color={colors.lilac} /></Pressable>
          </View>
          <Text className="mt-5 font-display text-[25px] leading-[33px] text-white">{user?.name || 'Your profile'}</Text>
          <Text selectable className="mt-1.5 font-sans text-[14px] leading-[21px] text-muted">{user?.email}</Text>
          <View className="mt-4 self-start rounded-full border border-lilac/15 bg-lilac/10 px-3 py-1.5"><Text className="font-medium text-[12px] text-lilac">{user?.is_admin ? 'Workspace administrator' : 'Zengen AI member'}</Text></View>
        </LinearGradient>
        </View>

        <SectionTitle title="Your AI team" action="Explore plans" onAction={() => navigate('pricing')} />
        <Card className="p-0">
          {user?.specialists.length ? user.specialists.map((key, index) => (
            <View key={key} className={'flex-row items-center px-5 py-4 ' + (index ? 'border-t border-line' : '')}>
              <View className="h-10 w-10 items-center justify-center rounded-xl bg-lilac/10"><Ionicons name={key === 'finance_analyst' ? 'stats-chart-outline' : key === 'personal_assistant' ? 'sparkles-outline' : 'people-outline'} size={20} color={colors.lilac} /></View>
              <Text className="mx-3 flex-1 font-medium text-[15px] text-white">{specialistNames[key] ?? key}</Text>
              <Ionicons name="checkmark-circle" size={21} color={colors.mint} />
            </View>
          )) : <View className="p-5"><Copy>Your enabled specialists will appear here.</Copy></View>}
        </Card>

        <SectionTitle title="Account & preferences" />
        <Card className="p-0">
          <SettingRow icon="person-outline" title="Personal details" subtitle="Update how your workspace greets you" onPress={openEditor} />
          <View className="mx-5 h-px bg-line" />
          <View className="min-h-[76px] flex-row items-center px-5 py-3">
            <Ionicons name={isDark ? 'moon-outline' : 'sunny-outline'} size={22} color={colors.lilac} />
            <View className="mx-4 flex-1"><Text className="font-medium text-[15px] text-white">Light appearance</Text><Text className="mt-1 font-sans text-[12px] leading-[18px] text-muted">{mode === 'light' ? 'A brighter, softer workspace' : 'Switch to a brighter workspace'}</Text></View>
            <Switch accessibilityRole="switch" accessibilityLabel="Light appearance" accessibilityState={{ checked: !isDark }} value={!isDark} onValueChange={toggleTheme} trackColor={{ false: colors.line, true: '#8A70CC' }} thumbColor={!isDark ? '#FFFFFF' : '#A29BB0'} />
          </View>
          <View className="mx-5 h-px bg-line" />
          <SettingRow icon="diamond-outline" title="Plans & pricing" subtitle="Find the right team for your work" onPress={() => navigate('pricing')} />
          {user?.is_admin ? <><View className="mx-5 h-px bg-line" /><SettingRow icon="shield-checkmark-outline" title="Manage team access" subtitle="Choose each account's AI specialists" onPress={() => navigate('admin')} /></> : null}
        </Card>

        <View className="mt-5 flex-row items-start px-1">
          <Ionicons name="lock-closed-outline" size={17} color={colors.muted} style={{ marginTop: 2 }} />
          <View className="ml-3 flex-1"><Text className="font-medium text-[13px] text-body">Secure sign in</Text><Text className="mt-1 font-sans text-[12px] leading-[19px] text-muted">{Platform.OS === 'web' ? 'Your session stays in this browser.' : 'Your session is kept in your device’s secure storage.'}</Text></View>
        </View>
        <Pressable accessibilityRole="button" onPress={askSignOut} className="mt-7 min-h-14 flex-row items-center justify-center rounded-2xl border border-rose/20 bg-rose/5 active:bg-rose/10">
          <Ionicons name="log-out-outline" size={20} color={colors.rose} /><Text className="ml-2 font-semibold text-[15px] text-rose">Sign out</Text>
        </Pressable>
        <View className="mt-9 items-center"><BrandWordmark size={37} /><Text className="mt-2 font-sans text-[12px] text-muted">A little more possibility, every day.</Text></View>
      </ScrollView>

      <BottomSheet visible={editOpen} onClose={() => { if (!saving) setEditOpen(false); }} title="A name that feels like you." subtitle="This is how your workspace will greet you.">
        <Text className="mb-2 font-medium text-[14px] text-lilac-bright">Your name</Text>
        <Field accessibilityLabel="Your name" autoFocus autoCapitalize="words" autoComplete="name" textContentType="name" value={draftName} onChangeText={setDraftName} placeholder="Enter your name" editable={!saving} returnKeyType="done" onSubmitEditing={() => void saveName()} />
        <ErrorText>{saveError}</ErrorText>
        <PrimaryButton className="mt-5" title="Save changes" loading={saving} disabled={!draftName.trim()} onPress={() => void saveName()} />
      </BottomSheet>
    </>
  );
}

function SettingRow({ icon, title, subtitle, onPress }: { icon: keyof typeof Ionicons.glyphMap; title: string; subtitle: string; onPress: () => void }) {
  return (
    <Pressable accessibilityRole="button" onPress={onPress} className="flex-row items-center px-5 py-5 active:bg-raised">
      <Ionicons name={icon} size={22} color={colors.lilac} />
      <View className="mx-4 flex-1"><Text className="font-medium text-[15px] text-white">{title}</Text><Text className="mt-1 font-sans text-[12px] leading-[18px] text-muted">{subtitle}</Text></View>
      <Ionicons name="chevron-forward" size={18} color={colors.muted} />
    </Pressable>
  );
}
