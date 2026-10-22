import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, RefreshControl, ScrollView, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Card, Copy, Eyebrow, Heading, PrimaryButton } from '../../components/ui';
import { colors } from '../../config';
import { api, errorMessage } from '../../services/api';
import { Alert } from '../../services/appAlert';
import type { AppNotification } from '../../types/api';

export function NotificationsScreen() {
  const [items, setItems] = useState<AppNotification[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState('');
  const unread = items.filter((item) => !item.is_read).length;

  const load = useCallback(async () => {
    try {
      const { data } = await api.get<AppNotification[]>('/notifications');
      setItems(data);
      setError('');
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setLoading(false);
    }
  }, []);
  useEffect(() => { void load(); }, [load]);

  async function refresh() {
    if (busyId) return;
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }

  async function markRead(id: string) {
    if (busyId || refreshing) return;
    setBusyId(id);
    try {
      await api.patch('/notifications/' + id + '/read');
      setItems((current) => current.map((item) => item.id === id ? { ...item, is_read: true } : item));
    } catch (e) {
      Alert.alert('Could not update notification', errorMessage(e));
    } finally {
      setBusyId(null);
    }
  }

  async function markAllRead() {
    if (busyId || refreshing) return;
    setBusyId('all');
    try {
      await api.post('/notifications/read-all');
      setItems((current) => current.map((item) => ({ ...item, is_read: true })));
    } catch (e) {
      Alert.alert('Could not update notifications', errorMessage(e));
    } finally {
      setBusyId(null);
    }
  }

  return (
    <ScrollView className="flex-1" contentContainerClassName="px-5 pb-10 pt-3" showsVerticalScrollIndicator={false} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={colors.lilac} />}>
      <Eyebrow>Your notifications</Eyebrow>
      <Heading className="mt-3">In the loop.</Heading>
      <Copy className="mt-2">The latest from your workspace, all in one place.</Copy>

      {loading ? (
        <View className="items-center py-20"><ActivityIndicator color={colors.lilac} /><Text className="mt-4 font-sans text-[14px] text-muted">Finding your latest updates…</Text></View>
      ) : error && !items.length ? (
        <Card className="mt-7 items-center px-6 py-8">
          <View className="mb-5 h-14 w-14 items-center justify-center rounded-full bg-lilac/10"><Ionicons name="cloud-offline-outline" size={26} color={colors.lilac} /></View>
          <Text className="text-center font-semibold text-[18px] text-white">Your updates couldn't be loaded</Text>
          <Copy className="mt-3 text-center">{error}</Copy>
          <PrimaryButton className="mt-6 self-stretch" title="Try again" loading={refreshing} onPress={() => void refresh()} />
        </Card>
      ) : (
        <>
          <View className="mb-5 mt-7 flex-row flex-wrap items-center justify-between gap-x-3">
            <View className="flex-row items-center"><View className={'mr-2 h-2 w-2 rounded-full ' + (unread ? 'bg-lilac' : 'bg-mint')} /><Text className="font-medium text-[14px] text-body">{unread ? unread + (unread === 1 ? ' unread update' : ' unread updates') : 'All caught up'}</Text></View>
            {unread ? <Pressable accessibilityRole="button" accessibilityLabel="Mark all notifications as read" accessibilityState={{ disabled: Boolean(busyId) || refreshing }} disabled={Boolean(busyId) || refreshing} onPress={() => void markAllRead()} className="min-h-11 flex-row items-center rounded-xl px-2 active:bg-raised">
              {busyId === 'all' ? <ActivityIndicator size="small" color={colors.lilac} /> : <Ionicons name="checkmark-done-outline" size={18} color={colors.lilac} />}
              <Text className="ml-1.5 font-semibold text-[13px] text-lilac">Mark all read</Text>
            </Pressable> : null}
          </View>

          {error ? <View accessibilityRole="alert" className="mb-4 rounded-2xl border border-rose/20 bg-rose/5 p-4"><Text className="font-sans text-[13px] leading-[20px] text-rose">Couldn't refresh your updates. Pull down to try again.</Text></View> : null}

          {items.length ? items.map((item) => (
            <Pressable
              key={item.id}
              accessibilityRole={item.is_read ? undefined : 'button'}
              accessibilityLabel={item.title + (item.is_read ? ', read' : ', unread. Mark as read')}
              disabled={item.is_read || Boolean(busyId) || refreshing}
              onPress={() => void markRead(item.id)}
              className={'mb-3 rounded-[24px] border p-5 ' + (item.is_read ? 'border-line bg-panel' : 'border-lilac/25 bg-raised')}
            >
              <View className="flex-row items-start">
                <View className={'h-10 w-10 items-center justify-center rounded-2xl ' + (item.is_read ? 'bg-raised' : 'bg-lilac/10')}><Ionicons name={item.is_read ? 'notifications-outline' : 'notifications'} size={20} color={item.is_read ? colors.muted : colors.lilac} /></View>
                <View className="ml-3 flex-1">
                  <View className="flex-row items-start">
                    <Text className="flex-1 font-semibold text-[15px] leading-[22px] text-white">{item.title}</Text>
                    {busyId === item.id ? <ActivityIndicator size="small" color={colors.lilac} style={{ marginLeft: 8 }} /> : !item.is_read ? <View className="ml-3 mt-2 h-2 w-2 rounded-full bg-lilac" /> : null}
                  </View>
                  <Text className="mt-2 font-sans text-[14px] leading-[22px] text-muted">{item.message}</Text>
                  <Text className="mt-3 font-medium text-[11px] leading-[17px] text-muted">{formatDate(item.created_at)}</Text>
                </View>
              </View>
            </Pressable>
          )) : (
            <Card className="items-center px-6 py-10">
              <View className="mb-6 h-[76px] w-[76px] items-center justify-center rounded-[26px] border border-lilac/15 bg-lilac/10"><Ionicons name="notifications-off-outline" size={32} color={colors.lilac} /></View>
              <Text className="text-center font-display text-[22px] text-white">Enjoy the quiet.</Text>
              <Copy className="mt-3 text-center">When something needs your attention, you'll find it right here.</Copy>
            </Card>
          )}
        </>
      )}
    </ScrollView>
  );
}

function formatDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' }) + ' · ' + date.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
}
