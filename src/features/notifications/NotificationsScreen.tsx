import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Platform, Pressable, RefreshControl, ScrollView, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Speech from 'expo-speech';
import type * as Calendar from 'expo-calendar/legacy';
import * as Notifications from 'expo-notifications';
import { Card, Copy, Eyebrow, Heading, PrimaryButton } from '../../components/ui';
import { colors } from '../../config';
import { api, errorMessage } from '../../services/api';
import { Alert } from '../../services/appAlert';
import type { AppNotification } from '../../types/api';
import { syncLocalFinanceReminders } from '../../services/pushNotifications';
import { getSelectedDeviceCalendar, getWritableDeviceCalendars, selectDeviceCalendar, stopDeviceCalendarSync, syncDeviceCalendar, type CalendarReminder } from '../../services/deviceCalendar';
import { useAuth } from '../../context/AuthContext';
import { localDayKey, ReminderMonth } from './ReminderMonth';

export function NotificationsScreen() {
  const { user } = useAuth();
  const [items, setItems] = useState<AppNotification[]>([]);
  const [reminders, setReminders] = useState<CalendarReminder[]>([]);
  const [selectedDay, setSelectedDay] = useState(() => localDayKey(new Date()));
  const [calendars, setCalendars] = useState<Calendar.Calendar[]>([]);
  const [selectedCalendar, setSelectedCalendar] = useState<string | null>(null);
  const [choosingCalendar, setChoosingCalendar] = useState(false);
  const [calendarBusy, setCalendarBusy] = useState(false);
  const [calendarMessage, setCalendarMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState('');
  const unread = items.filter((item) => !item.is_read).length;

  const load = useCallback(async () => {
    try {
      const { data } = await api.get<AppNotification[]>('/notifications');
      setItems(data);
      const reminderResponse = await api.get<CalendarReminder[]>('/reminders').catch(() => null);
      setReminders(reminderResponse?.data ?? []);
      if (user && reminderResponse) void syncDeviceCalendar(user.id, reminderResponse.data).catch(() => setCalendarMessage('Calendar sync needs attention. Try refreshing.'));
      setError('');
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setLoading(false);
    }
  }, [user?.id]);
  useEffect(() => { void load(); }, [load]);
  useEffect(() => {
    if (!user || Platform.OS === 'web') return;
    let mounted = true;
    void Promise.all([getSelectedDeviceCalendar(user.id), getWritableDeviceCalendars(false)]).then(([id, available]) => {
      if (!mounted) return;
      setSelectedCalendar(id);
      setCalendars(available);
    }).catch(() => undefined);
    return () => { mounted = false; };
  }, [user?.id]);
  useEffect(() => {
    if (Platform.OS === 'web') return;
    const subscription = Notifications.addNotificationReceivedListener(() => { void load(); });
    return () => subscription.remove();
  }, [load]);

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

  async function connectCalendar() {
    if (!user || Platform.OS === 'web') return;
    setCalendarBusy(true);
    try {
      const available = await getWritableDeviceCalendars(true);
      setCalendars(available);
      setChoosingCalendar(available.length > 0);
      setCalendarMessage(available.length ? '' : 'Calendar permission was declined, or no editable calendar is available. Add an account in device settings and try again.');
    } catch (e) {
      setCalendarMessage(`Could not access device calendars: ${errorMessage(e)}`);
    } finally { setCalendarBusy(false); }
  }

  async function chooseCalendar(calendar: Calendar.Calendar) {
    if (!user) return;
    setCalendarBusy(true);
    try {
      await selectDeviceCalendar(user.id, calendar.id);
      setSelectedCalendar(calendar.id);
      setChoosingCalendar(false);
      await syncDeviceCalendar(user.id, reminders);
      setCalendarMessage(`Reminders are synced to ${calendar.title}.`);
    } catch (e) {
      setCalendarMessage(`Could not sync reminders: ${errorMessage(e)}`);
    } finally { setCalendarBusy(false); }
  }

  async function stopCalendar() {
    if (!user) return;
    await stopDeviceCalendarSync(user.id);
    setSelectedCalendar(null);
    setChoosingCalendar(false);
    setCalendarMessage('Calendar sync stopped. Existing calendar events remain on your device.');
  }

  async function snooze(reminder: CalendarReminder) {
    try {
      await api.post(`/reminders/${reminder.id}/snooze`, { minutes: 60 });
      await syncLocalFinanceReminders();
      await load();
    } catch (e) {
      Alert.alert('Could not snooze reminder', errorMessage(e));
    }
  }

  return (
    <ScrollView className="flex-1" contentContainerClassName="px-5 pb-10 pt-3" showsVerticalScrollIndicator={false} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={colors.lilac} />}>
      <Eyebrow>Your notifications</Eyebrow>
      <Heading className="mt-3">In the loop.</Heading>
      <Copy className="mt-2">The latest from your workspace, all in one place.</Copy>

      {user?.specialists.includes('finance_analyst') ? <View className="mt-6">
        <View className="flex-row items-center justify-between gap-3">
          <View className="flex-1"><Text className="font-semibold text-[17px] text-white">Reminder calendar</Text><Text className="mt-1 font-sans text-[12px] text-muted">See how many reminders are planned for each day.</Text></View>
          {Platform.OS !== 'web' ? <Pressable accessibilityRole="button" disabled={calendarBusy} onPress={() => void connectCalendar()} className="rounded-xl border border-lilac/30 bg-lilac/10 px-3 py-2"><Text className="font-semibold text-[11px] text-lilac">{selectedCalendar ? 'Change calendar' : 'Connect calendar'}</Text></Pressable> : null}
        </View>
        {Platform.OS !== 'web' ? <Text className="mt-2 font-sans text-[11px] text-muted">{selectedCalendar ? calendars.some((item) => item.id === selectedCalendar) ? `Syncing to ${calendars.find((item) => item.id === selectedCalendar)?.title}` : 'The selected calendar is unavailable. Check device permissions or choose another calendar.' : 'Choose a device calendar to sync. Google, iCloud and other accounts appear when set up on this device.'}</Text> : null}
        {selectedCalendar && Platform.OS !== 'web' ? <Pressable accessibilityRole="button" onPress={() => void stopCalendar()} className="mt-2 self-start"><Text className="font-sans text-[11px] text-muted underline">Stop calendar sync</Text></Pressable> : null}
        {calendarMessage ? <Text accessibilityRole="alert" className="mt-2 font-sans text-[11px] text-lilac">{calendarMessage}</Text> : null}
        {choosingCalendar ? <Card className="mt-3 p-4"><Text className="mb-2 font-semibold text-[13px] text-white">Choose where reminders go</Text>{calendars.map((calendar) => <Pressable key={calendar.id} accessibilityRole="button" disabled={calendarBusy} onPress={() => void chooseCalendar(calendar)} className="mb-2 rounded-xl border border-line bg-raised p-3"><Text className="font-semibold text-[13px] text-white">{calendar.title}</Text><Text className="mt-0.5 font-sans text-[11px] text-muted">{calendar.ownerAccount || calendar.source?.name || 'Device calendar'}</Text></Pressable>)}</Card> : null}
        <ReminderMonth reminders={reminders.filter((item) => item.calendar_enabled)} selectedDay={selectedDay} onSelectDay={setSelectedDay} />
        <Text className="mb-3 mt-5 font-semibold text-[14px] text-white">{new Date(`${selectedDay}T12:00:00`).toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' })}</Text>
        {reminders.filter((item) => item.calendar_enabled && localDayKey(item.scheduled_at) === selectedDay).map((reminder) => <Card key={reminder.id} className="mb-3 p-4">
          <View className="flex-row items-center justify-between gap-2"><Text className="flex-1 font-semibold text-[14px] text-white">{reminder.title}</Text><Text className={`font-semibold text-[10px] ${reminder.priority === 'high' ? 'text-rose' : 'text-lilac'}`}>{reminder.priority === 'high' ? 'HIGH' : 'LOW'}</Text></View>
          <Text className="mt-1 font-sans text-[12px] text-muted">{formatDate(reminder.scheduled_at)}</Text>
          <Text className="mt-2 font-sans text-[12px] text-muted">{reminder.detail}</Text>
          <View className="mt-3 flex-row flex-wrap gap-2">{reminder.priority === 'high' ? <Pressable accessibilityRole="button" onPress={() => { Speech.stop(); Speech.speak(`${reminder.title}. ${reminder.detail}`); }} className="rounded-xl border border-lilac/30 px-3 py-2"><Text className="font-semibold text-[12px] text-lilac">Hear reminder</Text></Pressable> : null}<Pressable accessibilityRole="button" onPress={() => void snooze(reminder)} className="rounded-xl border border-lilac/30 px-3 py-2"><Text className="font-semibold text-[12px] text-lilac">Snooze 1 hour</Text></Pressable></View>
        </Card>)}
        {!reminders.some((item) => item.calendar_enabled && localDayKey(item.scheduled_at) === selectedDay) ? <Text className="rounded-xl border border-line bg-panel p-4 font-sans text-[12px] text-muted">No reminders on this day.</Text> : null}
      </View> : null}

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
                  {item.title.startsWith('Urgent reminder:') ? <Pressable accessibilityRole="button" accessibilityLabel="Read urgent reminder aloud" onPress={(event) => { event.stopPropagation(); Speech.stop(); Speech.speak(`${item.title}. ${item.message}`); }} className="mt-3 self-start rounded-xl border border-lilac/30 px-3 py-2"><Text className="font-semibold text-[12px] text-lilac">Hear reminder</Text></Pressable> : null}
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
