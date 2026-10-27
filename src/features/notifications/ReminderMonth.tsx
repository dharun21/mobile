import React, { useMemo, useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../../config';
import type { CalendarReminder } from '../../services/deviceCalendar';

export function localDayKey(value: string | Date) {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

export function ReminderMonth({ reminders, selectedDay, onSelectDay }: {
  reminders: CalendarReminder[];
  selectedDay: string;
  onSelectDay: (day: string) => void;
}) {
  const [month, setMonth] = useState(() => new Date());
  const visibleMonth = new Date(month.getFullYear(), month.getMonth(), 1);
  const start = new Date(visibleMonth);
  start.setDate(1 - start.getDay());
  const cells = Array.from({ length: 42 }, (_, index) => {
    const day = new Date(start);
    day.setDate(start.getDate() + index);
    return day;
  });
  const counts = useMemo(() => {
    const result = new Map<string, { count: number; urgent: boolean }>();
    for (const reminder of reminders) {
      const key = localDayKey(reminder.scheduled_at);
      if (!key) continue;
      const prior = result.get(key);
      result.set(key, { count: (prior?.count ?? 0) + 1, urgent: (prior?.urgent ?? false) || reminder.priority === 'high' });
    }
    return result;
  }, [reminders]);
  const today = localDayKey(new Date());

  function moveMonth(delta: number) {
    const next = new Date(visibleMonth.getFullYear(), visibleMonth.getMonth() + delta, 1);
    setMonth(next);
    onSelectDay(localDayKey(next));
  }

  return <View className="mt-4 rounded-[24px] border border-line bg-panel p-3">
    <View className="mb-4 flex-row items-center justify-between px-1">
      <Pressable accessibilityRole="button" accessibilityLabel="Previous month" onPress={() => moveMonth(-1)} className="h-10 w-10 items-center justify-center rounded-xl bg-raised"><Ionicons name="chevron-back" size={17} color={colors.lilac} /></Pressable>
      <Text className="font-semibold text-[16px] text-white">{visibleMonth.toLocaleDateString(undefined, { month: 'long', year: 'numeric' })}</Text>
      <Pressable accessibilityRole="button" accessibilityLabel="Next month" onPress={() => moveMonth(1)} className="h-10 w-10 items-center justify-center rounded-xl bg-raised"><Ionicons name="chevron-forward" size={17} color={colors.lilac} /></Pressable>
    </View>
    <View className="flex-row">{['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((label, index) => <Text key={index} style={{ width: '14.2857%' }} className="pb-2 text-center font-medium text-[11px] text-muted">{label}</Text>)}</View>
    <View className="flex-row flex-wrap">{cells.map((day) => {
      const key = localDayKey(day);
      const entry = counts.get(key);
      const isSelected = key === selectedDay;
      const isCurrent = day.getMonth() === visibleMonth.getMonth();
      return <View key={key} style={{ width: '14.2857%' }} className="p-0.5"><Pressable
        accessibilityRole="button"
        accessibilityLabel={`${day.toLocaleDateString(undefined, { month: 'long', day: 'numeric' })}, ${entry?.count ?? 0} reminders`}
        accessibilityState={{ selected: isSelected }}
        onPress={() => onSelectDay(key)}
        className={`min-h-12 items-center justify-center rounded-xl ${isSelected ? 'bg-lilac' : key === today ? 'border border-lilac/60 bg-raised' : ''}`}
      >
        <Text className={`font-semibold text-[12px] ${isSelected ? 'text-[#20172e]' : isCurrent ? 'text-white' : 'text-muted/50'}`}>{day.getDate()}</Text>
        {entry ? <View className={`mt-0.5 min-w-4 rounded-full px-1 ${isSelected ? 'bg-[#20172e]/20' : entry.urgent ? 'bg-rose/20' : 'bg-lilac/15'}`}><Text className={`text-center font-bold text-[9px] ${isSelected ? 'text-[#20172e]' : entry.urgent ? 'text-rose' : 'text-lilac'}`}>{entry.count > 9 ? '9+' : entry.count}</Text></View> : null}
      </Pressable></View>;
    })}</View>
    <Text className="mt-3 px-1 font-sans text-[11px] text-muted">Tap a day to see its reminders. Pink counts include high priority items.</Text>
  </View>;
}
