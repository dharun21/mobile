import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, RefreshControl, ScrollView, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Card, Copy, EmptyState } from '../../components/ui';
import { colors } from '../../config';
import { api, errorMessage } from '../../services/api';
import { Alert } from '../../services/appAlert';
import type { AppNotification } from '../../types/api';

export function NotificationsScreen() {
  const [items, setItems] = useState<AppNotification[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const load = useCallback(async () => { try { const { data } = await api.get<AppNotification[]>('/notifications'); setItems(data); setError(''); } catch (e) { setError(errorMessage(e)); } finally { setLoading(false); } }, []);
  useEffect(() => { void load(); }, [load]);
  async function markRead(id: string) { try { await api.patch(`/notifications/${id}/read`); await load(); } catch (e) { Alert.alert('Could not update notification', errorMessage(e)); } }
  async function markAllRead() { try { await api.post('/notifications/read-all'); await load(); } catch (e) { Alert.alert('Could not update notifications', errorMessage(e)); } }
  if (loading) return <View className="flex-1 items-center justify-center"><ActivityIndicator color={colors.lilac} /><Text className="mt-3 text-xs text-muted">Checking for updates…</Text></View>;
  if (error) return <View className="flex-1 justify-center px-5"><EmptyState icon="⌁" title="Could not load notifications" body={error} /></View>;
  return <ScrollView className="flex-1" contentContainerClassName="px-5 pb-10 pt-2" refreshControl={<RefreshControl refreshing={false} onRefresh={() => { setLoading(true); void load(); }} tintColor={colors.lilac} />}>
    <View className="mb-3 flex-row items-end justify-between"><View><Text className="text-[13px] text-muted">Updates from your workspace</Text><Text className="mt-1 text-[11px] text-muted">{items.filter((item) => !item.is_read).length} unread</Text></View>{items.some((item) => !item.is_read) ? <Pressable onPress={() => void markAllRead()}><Text className="text-[11px] font-semibold text-lilac-bright">Mark all read</Text></Pressable> : null}</View>
    {items.length ? items.map((item) => <Pressable key={item.id} onPress={() => !item.is_read && void markRead(item.id)} className="mb-2"><Card className="flex-row items-start p-4"><View className={`h-10 w-10 items-center justify-center rounded-2xl ${item.is_read ? 'bg-raised' : 'bg-lilac/10'}`}><Ionicons name={item.is_read ? 'notifications-outline' : 'notifications'} size={19} color={item.is_read ? colors.muted : colors.lilac} /></View><View className="ml-3 flex-1"><View className="flex-row items-center"><Text className="flex-1 text-[13px] font-semibold text-white">{item.title}</Text>{!item.is_read ? <View className="h-2 w-2 rounded-full bg-lilac" /> : null}</View><Copy className="mt-1 text-[11px]">{item.message}</Copy><Text className="mt-2 text-[10px] text-muted">{new Date(item.created_at).toLocaleString()}</Text></View></Card></Pressable>) : <EmptyState icon="♧" title="All quiet here" body="Updates about your workspace will show up here." />}
  </ScrollView>;
}
