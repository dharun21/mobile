import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Calendar from 'expo-calendar/legacy';
import { Platform } from 'react-native';
import { api } from './api';

export type CalendarReminder = {
  id: string;
  title: string;
  detail: string;
  scheduled_at: string;
  priority: 'low' | 'high';
  calendar_enabled: boolean;
  active: boolean;
};

type SavedEvent = { eventId: string; calendarId: string; signature: string };
type SavedEvents = Record<string, SavedEvent>;
const selectionKey = (userId: string) => `zengen.calendar.selection.${userId}`;
const eventsKey = (userId: string) => `zengen.calendar.events.${userId}`;
let syncQueue: Promise<void> = Promise.resolve();

export async function getSelectedDeviceCalendar(userId: string) {
  return AsyncStorage.getItem(selectionKey(userId));
}

export async function getWritableDeviceCalendars(requestPermission: boolean) {
  if (Platform.OS === 'web') return [] as Calendar.Calendar[];
  const permission = requestPermission
    ? await Calendar.requestCalendarPermissionsAsync()
    : await Calendar.getCalendarPermissionsAsync();
  if (!permission.granted) return [] as Calendar.Calendar[];
  const calendars = await Calendar.getCalendarsAsync(Calendar.EntityTypes.EVENT);
  return calendars.filter((item) => item.allowsModifications);
}

export async function selectDeviceCalendar(userId: string, calendarId: string) {
  await AsyncStorage.setItem(selectionKey(userId), calendarId);
}

export async function stopDeviceCalendarSync(userId: string) {
  await syncQueue.catch(() => undefined);
  await AsyncStorage.removeItem(selectionKey(userId));
}

async function performSync(userId: string, reminders?: CalendarReminder[]) {
  if (Platform.OS === 'web') return;
  const calendarId = await getSelectedDeviceCalendar(userId);
  if (!calendarId) return;
  const calendars = await getWritableDeviceCalendars(false);
  if (!calendars.some((item) => item.id === calendarId)) return;
  const rows = reminders ?? (await api.get<CalendarReminder[]>('/reminders')).data;
  const target = new Map(rows.filter((item) => item.active && item.calendar_enabled).map((item) => [item.id, item]));
  const stored = await AsyncStorage.getItem(eventsKey(userId));
  const saved: SavedEvents = stored ? JSON.parse(stored) : {};
  const persist = () => AsyncStorage.setItem(eventsKey(userId), JSON.stringify(saved));

  for (const [id, existing] of Object.entries(saved)) {
    if (target.has(id) && existing.calendarId === calendarId) continue;
    try { await Calendar.deleteEventAsync(existing.eventId); } catch { /* Event may have been removed by the user. */ }
    delete saved[id];
    await persist();
  }
  for (const reminder of target.values()) {
    const startDate = new Date(reminder.scheduled_at);
    if (Number.isNaN(startDate.getTime())) continue;
    const event = {
      title: reminder.title,
      notes: reminder.detail,
      startDate,
      endDate: new Date(startDate.getTime() + 15 * 60_000),
      alarms: [{ relativeOffset: 0 }],
    };
    const signature = JSON.stringify([calendarId, reminder.title, reminder.detail, reminder.scheduled_at]);
    const existing = saved[reminder.id];
    if (existing?.signature === signature) continue;
    if (existing) {
      try {
        await Calendar.updateEventAsync(existing.eventId, event);
        saved[reminder.id] = { ...existing, signature };
        await persist();
        continue;
      } catch { /* Recreate a calendar event that the user deleted. */ }
    }
    const eventId = await Calendar.createEventAsync(calendarId, event);
    saved[reminder.id] = { eventId, calendarId, signature };
    await persist();
  }
}

export async function syncDeviceCalendar(userId: string, reminders?: CalendarReminder[]) {
  const task = syncQueue.catch(() => undefined).then(() => performSync(userId, reminders));
  syncQueue = task;
  await task;
}
