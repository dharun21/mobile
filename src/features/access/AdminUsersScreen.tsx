import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, RefreshControl, ScrollView, Switch, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Card, Copy, EmptyState, Eyebrow, Heading } from '../../components/ui';
import { colors } from '../../config';
import { api, errorMessage } from '../../services/api';
import { Alert } from '../../services/appAlert';

const specialistMap = { finance_analyst: 'Finance Analyst', personal_assistant: 'Personal Assistant', hr_executive: 'HR Executive', sales_analyst: 'Sales Analyst' } as const;
type SpecialistKey = keyof typeof specialistMap;
type Access = { enabled: boolean; expires_at?: string | null; monthly_usage_limit?: number | null };
type AdminUser = { id: string; name: string; email: string; is_admin: boolean; access: Record<SpecialistKey, Access> };

export function AdminUsersScreen() {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const load = useCallback(async () => { try { const { data } = await api.get<AdminUser[]>('/admin/users'); setUsers(data); setError(''); } catch (e) { setError(errorMessage(e)); } finally { setLoading(false); } }, []);
  useEffect(() => { void load(); }, [load]);

  async function setAccess(user: AdminUser, key: SpecialistKey, enabled: boolean) {
    const current = user.access[key] ?? { enabled: false };
    try {
      const { data } = await api.put<AdminUser>(`/admin/users/${user.id}/access/${key}`, { enabled, expires_at: current.expires_at ?? null, monthly_usage_limit: current.monthly_usage_limit ?? null });
      setUsers((items) => items.map((item) => item.id === data.id ? data : item));
    } catch (e) { Alert.alert('Could not update access', errorMessage(e)); }
  }

  if (loading) return <View className="flex-1 items-center justify-center"><ActivityIndicator color={colors.lilac} /><Text className="mt-3 text-xs text-muted">Loading accounts…</Text></View>;
  if (error) return <View className="flex-1 justify-center px-5"><EmptyState icon="⌁" title="Could not load account access" body={error} /></View>;
  return <ScrollView className="flex-1" contentContainerClassName="px-5 pb-10 pt-2" refreshControl={<RefreshControl refreshing={false} onRefresh={() => { setLoading(true); void load(); }} tintColor={colors.lilac} />}>
    <Eyebrow>Administration</Eyebrow><Heading className="mt-2">Specialist access</Heading><Copy className="mt-2">Enable individual AI specialists for each account. Changes apply to protected app features and APIs.</Copy>
    <View className="mt-5 gap-3">{users.map((user) => <Card key={user.id} className="p-4"><View className="flex-row items-center"><View className="h-10 w-10 items-center justify-center rounded-full bg-raised"><Ionicons name={user.is_admin ? 'shield-checkmark' : 'person'} size={18} color={colors.lilac} /></View><View className="ml-3 flex-1"><Text className="text-[14px] font-semibold text-white">{user.name}</Text><Text className="mt-1 text-[10px] text-muted">{user.email}</Text></View></View><View className="my-3 h-px bg-line" />{(Object.keys(specialistMap) as SpecialistKey[]).map((key) => { const access = user.access?.[key] ?? { enabled: false }; return <View key={key} className="min-h-11 flex-row items-center justify-between"><Text className="flex-1 text-[12px] text-white">{specialistMap[key]}</Text><Switch value={access.enabled} onValueChange={(enabled) => void setAccess(user, key, enabled)} trackColor={{ false: colors.raised, true: '#70559A' }} thumbColor={access.enabled ? colors.lilac : '#A9A3B4'} /></View>; })}</Card>)}</View>
    {!users.length ? <View className="mt-4"><EmptyState icon="♙" title="No user accounts" body="Registered accounts will appear here." /></View> : null}
  </ScrollView>;
}
