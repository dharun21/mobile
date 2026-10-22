import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, RefreshControl, ScrollView, Switch, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Card, Copy, Eyebrow, Field, Heading, PrimaryButton } from '../../components/ui';
import { colors } from '../../config';
import { api, errorMessage } from '../../services/api';
import { Alert } from '../../services/appAlert';

const specialistMap = {
  finance_analyst: { title: 'Finance Analyst', icon: 'stats-chart-outline' as const },
  personal_assistant: { title: 'Personal Assistant', icon: 'sparkles-outline' as const },
  hr_executive: { title: 'HR Executive', icon: 'people-outline' as const },
  sales_analyst: { title: 'Sales Analyst', icon: 'trending-up-outline' as const },
};
type SpecialistKey = keyof typeof specialistMap;
type Access = { enabled: boolean; expires_at?: string | null; monthly_usage_limit?: number | null };
type AdminUser = { id: string; name: string; email: string; is_admin: boolean; access: Record<SpecialistKey, Access> };

export function AdminUsersScreen() {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [savingKey, setSavingKey] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');

  const load = useCallback(async () => {
    try {
      const { data } = await api.get<AdminUser[]>('/admin/users');
      setUsers(data);
      setError('');
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setLoading(false);
    }
  }, []);
  useEffect(() => { void load(); }, [load]);

  async function refresh() {
    if (savingKey) return;
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }

  async function setAccess(user: AdminUser, key: SpecialistKey, enabled: boolean) {
    if (savingKey || refreshing) return;
    const current = user.access?.[key] ?? { enabled: false };
    setSavingKey(user.id + ':' + key);
    try {
      const { data } = await api.put<AdminUser>('/admin/users/' + user.id + '/access/' + key, {
        enabled,
        expires_at: current.expires_at ?? null,
        monthly_usage_limit: current.monthly_usage_limit ?? null,
      });
      setUsers((items) => items.map((item) => item.id === data.id ? data : item));
    } catch (e) {
      Alert.alert('Could not update access', errorMessage(e));
    } finally {
      setSavingKey(null);
    }
  }

  const filteredUsers = users.filter((user) =>
    `${user.name} ${user.email}`.toLocaleLowerCase().includes(search.trim().toLocaleLowerCase()),
  );

  return (
    <ScrollView className="flex-1" contentContainerClassName="px-5 pb-10 pt-3" showsVerticalScrollIndicator={false} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={colors.lilac} />}>
      <Eyebrow>Workspace administration</Eyebrow>
      <Heading className="mt-3">The right team,{'\n'}for every person.</Heading>
      <Copy className="mt-3">Choose which AI specialists each account can use. Changes take effect when you switch access on or off.</Copy>

      {loading ? (
        <View className="items-center py-20"><ActivityIndicator color={colors.lilac} /><Text className="mt-4 font-sans text-[14px] text-muted">Loading your workspace accounts…</Text></View>
      ) : error && !users.length ? (
        <Card className="mt-7 items-center px-6 py-8">
          <View className="mb-5 h-14 w-14 items-center justify-center rounded-full bg-lilac/10"><Ionicons name="cloud-offline-outline" size={26} color={colors.lilac} /></View>
          <Text className="text-center font-semibold text-[18px] text-white">Accounts couldn't be loaded</Text>
          <Copy className="mt-3 text-center">{error}</Copy>
          <PrimaryButton className="mt-6 self-stretch" title="Try again" loading={refreshing} onPress={() => void refresh()} />
        </Card>
      ) : (
        <>
          <View className="mb-5 mt-7 flex-row items-center"><Ionicons name="people-outline" size={19} color={colors.lilac} /><Text className="ml-2 font-medium text-[14px] text-lilac">{users.length} {users.length === 1 ? 'workspace account' : 'workspace accounts'}</Text></View>
          {error ? <View accessibilityRole="alert" className="mb-4 rounded-2xl border border-rose/20 bg-rose/5 p-4"><Text className="font-sans text-[13px] leading-[20px] text-rose">Couldn't refresh these accounts. Pull down to try again.</Text></View> : null}
          {users.length ? <View className="mb-5"><Field
            accessibilityLabel="Search team members"
            placeholder="Search by name or email"
            value={search}
            onChangeText={setSearch}
            icon="search-outline"
            autoCapitalize="none"
            autoCorrect={false}
            returnKeyType="search"
          /></View> : null}
          {filteredUsers.map((user) => (
            <Card key={user.id} className="mb-4 overflow-hidden p-0">
              <View className="border-b border-line bg-raised/50 p-5">
                <View className="flex-row items-start">
                  <View className="h-12 w-12 items-center justify-center rounded-2xl border border-lilac/15 bg-lilac/10"><Text className="font-semibold text-[18px] text-lilac">{user.name.trim().slice(0, 1).toUpperCase() || 'Z'}</Text></View>
                  <View className="ml-3 flex-1">
                    <Text className="font-semibold text-[17px] leading-[24px] text-white">{user.name}</Text>
                    <Text selectable className="mt-1 font-sans text-[13px] leading-[20px] text-muted">{user.email}</Text>
                  </View>
                </View>
                {user.is_admin ? <View className="mt-3 flex-row items-center"><Ionicons name="shield-checkmark-outline" size={14} color={colors.lilac} /><Text className="ml-1.5 font-medium text-[12px] text-lilac">Administrator</Text></View> : null}
              </View>
              <View className="px-5 py-2">
                {(Object.keys(specialistMap) as SpecialistKey[]).map((key, index) => {
                  const access = user.access?.[key] ?? { enabled: false };
                  const specialist = specialistMap[key];
                  const isSaving = savingKey === user.id + ':' + key;
                  return (
                    <View key={key} className={'min-h-[68px] flex-row items-center py-3 ' + (index ? 'border-t border-line' : '')}>
                      <Ionicons name={specialist.icon} size={19} color={access.enabled ? colors.lilac : colors.muted} />
                      <View className="ml-3 flex-1"><Text className="font-medium text-[14px] leading-[21px] text-white">{specialist.title}</Text><Text className={'mt-0.5 font-sans text-[12px] ' + (access.enabled ? 'text-mint' : 'text-muted')}>{isSaving ? 'Saving…' : access.enabled ? 'Access enabled' : 'No access'}</Text></View>
                      {isSaving ? <ActivityIndicator size="small" color={colors.lilac} style={{ marginLeft: 8, marginRight: 8 }} /> : null}
                      <View className="min-h-11 min-w-11 items-center justify-center">
                        <Switch
                          accessibilityLabel={specialist.title + ' access for ' + user.name}
                          accessibilityState={{ disabled: Boolean(savingKey) || refreshing }}
                          disabled={Boolean(savingKey) || refreshing}
                          value={access.enabled}
                          onValueChange={(enabled) => void setAccess(user, key, enabled)}
                          trackColor={{ false: colors.line, true: '#70618d' }}
                          thumbColor={access.enabled ? colors.lilac : '#a29bb0'}
                          ios_backgroundColor={colors.line}
                        />
                      </View>
                    </View>
                  );
                })}
              </View>
            </Card>
          ))}
          {users.length > 0 && !filteredUsers.length ? (
            <Card className="items-center px-6 py-8">
              <View className="mb-4 h-12 w-12 items-center justify-center rounded-2xl bg-lilac/10"><Ionicons name="search-outline" size={23} color={colors.lilac} /></View>
              <Text className="text-center font-semibold text-[16px] text-white">No teammates found</Text>
              <Copy className="mt-2 text-center">Try another name or email address.</Copy>
            </Card>
          ) : null}
          {!users.length ? (
            <Card className="items-center px-6 py-10">
              <View className="mb-5 h-[72px] w-[72px] items-center justify-center rounded-[24px] bg-lilac/10"><Ionicons name="people-outline" size={30} color={colors.lilac} /></View>
              <Text className="text-center font-display text-[22px] text-white">Room for your team.</Text>
              <Copy className="mt-3 text-center">Registered accounts will appear here, ready for you to set up their AI specialists.</Copy>
            </Card>
          ) : null}
        </>
      )}
    </ScrollView>
  );
}
