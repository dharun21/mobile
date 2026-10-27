import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { api } from './api';
import { sessionStorage } from './sessionStorage';

let registeredToken: string | null = null;
const tokenStorageKey = 'zengenai-finance-push-token';

type Reminder = { id: string; title: string; detail: string; scheduled_at: string; priority: 'low' | 'high'; active: boolean };

async function cancelLocalFinanceReminders() {
  const scheduled = (await Notifications.getAllScheduledNotificationsAsync()).filter((item) => item.content.data?.zengenReminderId);
  await Promise.all(scheduled.map((item) => Notifications.cancelScheduledNotificationAsync(item.identifier)));
}

export async function syncLocalFinanceReminders() {
  if (Platform.OS === 'web' || registeredToken) return;
  const permission = await Notifications.getPermissionsAsync();
  if (!permission.granted) return;
  const { data } = await api.get<Reminder[]>('/reminders');
  const existing = (await Notifications.getAllScheduledNotificationsAsync()).filter((item) => item.content.data?.zengenReminderId);
  const upcoming = new Map(data.filter((item) => item.active && new Date(item.scheduled_at).getTime() > Date.now()).map((item) => [item.id, item]));
  for (const item of existing) {
    const reminder = upcoming.get(String(item.content.data?.zengenReminderId));
    if (reminder && item.content.data?.scheduledAt === reminder.scheduled_at) {
      upcoming.delete(reminder.id);
    } else {
      await Notifications.cancelScheduledNotificationAsync(item.identifier);
    }
  }
  for (const reminder of upcoming.values()) {
    await Notifications.scheduleNotificationAsync({
      content: {
        title: reminder.priority === 'high' ? 'Urgent finance reminder' : 'Finance reminder',
        body: 'Open Zengen AI to view your reminder.',
        data: { zengenReminderId: reminder.id, scheduledAt: reminder.scheduled_at, screen: 'notifications' },
        ...(Platform.OS === 'android' ? { channelId: 'finance-reminders' } : {}),
      },
      trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: new Date(reminder.scheduled_at) },
    });
  }
}

export async function registerFinancePush() {
  if (Platform.OS === 'web') return;
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('finance-reminders', {
      name: 'Finance reminders',
      importance: Notifications.AndroidImportance.HIGH,
    });
  }
  const current = await Notifications.getPermissionsAsync();
  const permission = current.granted ? current : await Notifications.requestPermissionsAsync();
  if (!permission.granted) return;
  await syncLocalFinanceReminders();
  try {
    const token = (await Notifications.getExpoPushTokenAsync()).data;
    await api.post('/reminders/devices', { token });
    registeredToken = token;
    await sessionStorage.setItem(tokenStorageKey, token);
    await cancelLocalFinanceReminders();
  } catch {
    // Local device reminders still work before a push project is configured.
  }
}

export async function unregisterFinancePush() {
  if (Platform.OS !== 'web') {
    await cancelLocalFinanceReminders();
  }
  const token = registeredToken || await sessionStorage.getItem(tokenStorageKey);
  if (!token) return;
  try { await api.delete('/reminders/devices', { data: { token } }); }
  finally { registeredToken = null; await sessionStorage.deleteItem(tokenStorageKey); }
}
