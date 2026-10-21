import React, { useState } from 'react';
import { Modal, Platform, Pressable, ScrollView, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Card, Copy, Eyebrow, Field, PrimaryButton } from '../../components/ui';
import { colors } from '../../config';
import { useAuth } from '../../context/AuthContext';
import { useNavigateApp } from '../../context/NavigationContext';
import { errorMessage } from '../../services/api';
import { Alert } from '../../services/appAlert';

const specialistNames: Record<string, string> = {
  finance_analyst: 'AI Finance Analyst', personal_assistant: 'AI Personal Assistant',
  hr_executive: 'AI HR Executive', sales_analyst: 'AI Sales Analyst',
};

export function ProfileScreen() {
  const { user, updateName, signOut } = useAuth();
  const navigate = useNavigateApp();
  const [editOpen, setEditOpen] = useState(false);
  const [draftName, setDraftName] = useState(user?.name ?? '');
  const initials = (user?.name ?? 'Z').split(/\s+/).slice(0, 2).map((part) => part[0]?.toUpperCase()).join('');

  async function saveName() {
    if (!draftName.trim()) return;
    try { await updateName(draftName); setEditOpen(false); }
    catch (e) { Alert.alert('Could not update profile', errorMessage(e)); }
  }
  function askSignOut() {
    Alert.alert('Sign out?', 'You can sign in again whenever you’re ready.', [
      { text: 'Stay signed in', style: 'cancel' },
      { text: 'Sign out', style: 'destructive', onPress: () => void signOut() },
    ]);
  }

  return <ScrollView className="flex-1" contentContainerClassName="px-5 pb-10 pt-2" showsVerticalScrollIndicator={false}>
    <Card className="flex-row items-center p-4"><View className="h-14 w-14 items-center justify-center rounded-full bg-[#594675]"><Text className="text-[19px] font-bold text-white">{initials}</Text></View><View className="ml-3 flex-1"><Text className="text-[16px] font-semibold text-white">{user?.name}</Text><Text className="mt-1 text-[11px] text-muted">{user?.email}</Text></View><Pressable accessibilityLabel="Edit profile name" onPress={() => { setDraftName(user?.name ?? ''); setEditOpen(true); }} className="p-2"><Ionicons name="create-outline" size={20} color={colors.lilac} /></Pressable></Card>

    <Eyebrow className="mb-2 mt-7">Workspace</Eyebrow>
    <Card><Text className="text-[14px] font-semibold text-white">Your enabled AI teammates</Text>{user?.specialists.length ? user.specialists.map((key) => <View key={key} className="mt-3 flex-row items-center"><Ionicons name="checkmark-circle" size={17} color={colors.mint} /><Text className="ml-2 text-[12px] text-white">{specialistNames[key] ?? key}</Text></View>) : <Copy className="mt-2 text-[11px]">No specialist access is enabled yet.</Copy>}</Card>

    <Eyebrow className="mb-2 mt-7">Preferences & security</Eyebrow>
    <Card className="gap-4 p-0">
      <Pressable onPress={() => { setDraftName(user?.name ?? ''); setEditOpen(true); }} className="flex-row items-center p-4"><Ionicons name="person-outline" size={20} color={colors.lilac} /><View className="ml-3 flex-1"><Text className="text-[13px] font-medium text-white">Edit your name</Text><Text className="mt-1 text-[10px] text-muted">Update how your workspace greets you</Text></View><Ionicons name="chevron-forward" size={17} color={colors.muted} /></Pressable>
      <View className="h-px bg-line" />
      <View className="flex-row items-center px-4 pb-4"><Ionicons name="lock-closed-outline" size={19} color={colors.lilac} /><View className="ml-3 flex-1"><Text className="text-[13px] font-medium text-white">Secure sign in</Text><Text className="mt-1 text-[10px] text-muted">{Platform.OS === 'web' ? 'Browser preview keeps your session in this browser.' : 'Your session is stored in device secure storage.'}</Text></View></View>
    </Card>

    <Pressable onPress={() => navigate('pricing')} className="mt-3 flex-row items-center rounded-[22px] border border-line bg-panel p-4"><Ionicons name="diamond-outline" size={20} color={colors.lilac} /><View className="ml-3 flex-1"><Text className="text-[13px] font-medium text-white">Plans & pricing</Text><Text className="mt-1 text-[10px] text-muted">Compare available launch plans</Text></View><Ionicons name="chevron-forward" size={17} color={colors.muted} /></Pressable>
    {user?.is_admin ? <Pressable onPress={() => navigate('admin')} className="mt-3 flex-row items-center rounded-[22px] border border-line bg-panel p-4"><Ionicons name="shield-checkmark-outline" size={20} color={colors.lilac} /><View className="ml-3 flex-1"><Text className="text-[13px] font-medium text-white">Manage user AI access</Text><Text className="mt-1 text-[10px] text-muted">Administer specialist grants</Text></View><Ionicons name="chevron-forward" size={17} color={colors.muted} /></Pressable> : null}
    <Pressable onPress={askSignOut} className="mt-5 min-h-12 flex-row items-center justify-center rounded-2xl border border-line"><Ionicons name="log-out-outline" size={18} color={colors.rose} /><Text className="ml-2 text-[13px] font-semibold text-rose">Sign out</Text></Pressable>
    <Text className="mt-6 text-center text-[10px] text-muted">ZengenAI · Thoughtfully built for better work</Text>

    <Modal visible={editOpen} transparent animationType="slide" onRequestClose={() => setEditOpen(false)}><View className="flex-1 justify-end bg-black/60"><View className="rounded-t-[28px] border border-line bg-panel px-5 pb-10 pt-5"><Text className="mb-4 text-[18px] font-semibold text-white">Your name</Text><Field autoCapitalize="words" value={draftName} onChangeText={setDraftName} placeholder="Name" /><PrimaryButton className="mt-4" title="Save" onPress={() => void saveName()} /><Pressable onPress={() => setEditOpen(false)} className="mt-3 items-center py-2"><Text className="text-[12px] text-muted">Cancel</Text></Pressable></View></View></Modal>
  </ScrollView>;
}
