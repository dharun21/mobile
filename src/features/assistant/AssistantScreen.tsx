import React, { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { BottomSheet } from '../../components/BottomSheet';
import { useRevealFocusedInput } from '../../components/KeyboardLayout';
import { BrandWordmark } from '../../components/BrandWordmark';
import { PrimaryButton, SectionTitle } from '../../components/ui';
import { colors } from '../../config';
import { Alert } from '../../services/appAlert';
import { useTheme } from '../../context/ThemeContext';

type AssistantTask = { id: string; text: string; done: boolean };
type Reminder = { id: string; text: string; when: string; done: boolean };
type Thought = { id: string; text: string; created_at: string };
type ModalKind = 'task' | 'reminder' | 'thought' | 'setup';
type IconName = React.ComponentProps<typeof Ionicons>['name'];

const keys = {
  name: 'zengen.mobile.assistant.name',
  tasks: 'zengen.mobile.assistant.tasks',
  reminders: 'zengen.mobile.assistant.reminders',
  thoughts: 'zengen.mobile.assistant.thoughts',
};
const starterTasks: AssistantTask[] = [
  { id: 'starter-1', text: 'Choose the one thing that matters most today', done: false },
  { id: 'starter-2', text: 'Take a proper break between busy moments', done: false },
  { id: 'starter-3', text: 'Make a little progress on a personal goal', done: false },
];
const checkIns: { label: string; icon: IconName; response: string }[] = [
  { label: 'Bright', icon: 'sunny-outline', response: "Glad there's some brightness today. What would help keep a little of that feeling?" },
  { label: 'Okay', icon: 'partly-sunny-outline', response: 'An ordinary day is okay too. Choose one thing that would make today easier.' },
  { label: 'Stretched', icon: 'cloud-outline', response: 'That sounds like a lot to hold. It may help to pause and choose the next small step.' },
];

export function AssistantScreen() {
  const { isDark } = useTheme();
  const [name, setName] = useState('');
  const [tasks, setTasks] = useState<AssistantTask[]>(starterTasks);
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [thoughts, setThoughts] = useState<Thought[]>([]);
  const [ready, setReady] = useState(false);
  const [modal, setModal] = useState<ModalKind | null>(null);
  const [draft, setDraft] = useState('');
  const [when, setWhen] = useState('');
  const [checkIn, setCheckIn] = useState('');
  const [saving, setSaving] = useState(false);
  const savingRef = useRef(false);

  useEffect(() => {
    let active = true;
    void (async () => {
      try {
        const values = await AsyncStorage.multiGet(Object.values(keys));
        if (!active) return;
        const stored = Object.fromEntries(values);
        setName(stored[keys.name] ?? '');
        try { if (stored[keys.tasks]) setTasks(JSON.parse(stored[keys.tasks]!)); } catch { /* Keep starter tasks if stored data is unreadable. */ }
        try { if (stored[keys.reminders]) setReminders(JSON.parse(stored[keys.reminders]!)); } catch { /* Keep an empty list if stored data is unreadable. */ }
        try { if (stored[keys.thoughts]) setThoughts(JSON.parse(stored[keys.thoughts]!)); } catch { /* Keep an empty list if stored data is unreadable. */ }
      } catch {
        if (active) Alert.alert('Could not open your planner', 'Your saved items could not be read. Please reopen the app to try again.');
      } finally {
        if (active) setReady(true);
      }
    })();
    return () => { active = false; };
  }, []);

  const persist = async <T,>(key: string, value: T) => AsyncStorage.setItem(key, JSON.stringify(value));
  const completed = tasks.filter((task) => task.done).length;
  const openReminders = reminders.filter((reminder) => !reminder.done).length;
  const progress = tasks.length ? completed / tasks.length : 0;
  const today = new Date().toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' });

  function openModal(type: ModalKind) {
    setDraft(type === 'setup' ? name : '');
    setWhen('');
    setModal(type);
  }

  async function saveModal() {
    const text = draft.trim();
    if (!text || savingRef.current) return;
    savingRef.current = true;
    setSaving(true);
    try {
      if (modal === 'setup') {
        await AsyncStorage.setItem(keys.name, text);
        setName(text);
      }
      if (modal === 'task') {
        const value = [...tasks, { id: String(Date.now()), text, done: false }];
        await persist(keys.tasks, value);
        setTasks(value);
      }
      if (modal === 'reminder') {
        const value = [...reminders, { id: String(Date.now()), text, when: when.trim() || 'Anytime', done: false }];
        await persist(keys.reminders, value);
        setReminders(value);
      }
      if (modal === 'thought') {
        const value = [{ id: String(Date.now()), text, created_at: new Date().toISOString() }, ...thoughts];
        await persist(keys.thoughts, value);
        setThoughts(value);
      }
      setModal(null);
      setDraft('');
    } catch {
      Alert.alert('Could not save this yet', 'Your text is still here. Please try saving again.');
    } finally { savingRef.current = false; setSaving(false); }
  }

  async function toggleTask(task: AssistantTask) {
    const value = tasks.map((item) => item.id === task.id ? { ...item, done: !item.done } : item);
    setTasks(value);
    try { await persist(keys.tasks, value); }
    catch { setTasks(tasks); Alert.alert('Could not save your task', 'Please try again.'); }
  }

  async function toggleReminder(reminder: Reminder) {
    const value = reminders.map((item) => item.id === reminder.id ? { ...item, done: !item.done } : item);
    setReminders(value);
    try { await persist(keys.reminders, value); }
    catch { setReminders(reminders); Alert.alert('Could not save your reminder', 'Please try again.'); }
  }

  async function removeThought(thought: Thought) {
    const value = thoughts.filter((item) => item.id !== thought.id);
    setThoughts(value);
    try { await persist(keys.thoughts, value); }
    catch { setThoughts(thoughts); Alert.alert('Could not remove this note', 'Please try again.'); }
  }

  function showSuggestion(suggestion: string) {
    const answer = suggestion.includes('plan')
      ? 'Pick one must do, one could do, and one thing that can wait. Give your must do a clear first step, then leave a little breathing room.'
      : suggestion.includes('Break')
        ? 'Write down the next visible action. Make it small enough to start in ten minutes, and let that be enough progress.'
        : 'Try stepping away from your screen for five minutes. Stretch, get some water, or let your attention rest.';
    Alert.alert('A little inspiration', answer, [
      { text: 'Done', style: 'cancel' },
      { text: 'Add a next step', onPress: async () => {
        const text = suggestion.includes('plan') ? 'Choose one must do for today' : suggestion.includes('Break') ? 'Choose one ten-minute first step' : 'Take a five-minute reset';
        const value = [...tasks, { id: String(Date.now()), text, done: false }];
        try { await persist(keys.tasks, value); setTasks(value); }
        catch { Alert.alert('Could not add your task', 'Please try again.'); }
      } },
    ]);
  }

  const sheet = <AssistantModal
    visible={modal !== null}
    kind={modal ?? 'task'}
    draft={draft}
    setDraft={setDraft}
    when={when}
    setWhen={setWhen}
    saving={saving}
    onClose={() => { if (!savingRef.current) setModal(null); }}
    onSave={() => void saveModal()}
  />;

  if (!ready) return <View className="flex-1 items-center justify-center gap-3"><ActivityIndicator color={colors.lilac} /><Text className="font-sans text-[14px] text-muted">Getting your day ready...</Text></View>;

  if (!name) return <View className="flex-1"><ScrollView contentContainerClassName="flex-grow justify-center px-6 pb-10 pt-6" showsVerticalScrollIndicator={false}>
    <View className="mb-8 overflow-hidden rounded-[32px]">
      <LinearGradient colors={isDark ? ['#37294f', '#1b1727'] : ['#EFE8FA', '#E6DEF2']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={{ padding: 28, minHeight: 230, justifyContent: 'space-between' }}>
        <View className="h-14 w-14 items-center justify-center rounded-[20px] bg-lilac/15"><Ionicons name="sparkles-outline" size={28} color={colors.lilac} /></View>
        <View className="mt-9"><BrandWordmark size={43} /><Text className="mt-3 font-medium text-[12px] tracking-[2px] text-lilac">A LITTLE MORE ROOM FOR YOU</Text></View>
      </LinearGradient>
    </View>
    <Text className="font-display text-[32px] leading-[40px] tracking-[-1px] text-white">Meet your{'\n'}everyday companion.</Text>
    <Text className="mt-3 font-sans text-[16px] leading-[25px] text-muted">A thoughtful place for your plans, little reminders, and everything on your mind.</Text>
    <View className="mb-8 mt-6 gap-4">{[
      { icon: 'checkmark-circle-outline' as const, text: 'Make space for what matters' },
      { icon: 'notifications-outline' as const, text: 'Keep the little things in view' },
      { icon: 'document-text-outline' as const, text: 'Give your ideas a home' },
    ].map((item) => <View key={item.text} className="flex-row items-center gap-3"><Ionicons name={item.icon} size={21} color={colors.lilac} /><Text className="font-sans text-[14px] text-white">{item.text}</Text></View>)}</View>
    <PrimaryButton title="Make it mine" onPress={() => openModal('setup')} />
    <Text className="mt-4 text-center font-sans text-[12px] text-muted">Your personal planner, saved on this device.</Text>
  </ScrollView>{sheet}</View>;

  return <View className="flex-1"><ScrollView className="flex-1" contentContainerClassName="px-5 pb-10 pt-3" showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
    <View className="mb-6 flex-row items-center justify-between gap-3">
      <View className="flex-1"><Text className="font-sans text-[13px] text-muted">{today}</Text><Text className="mt-1 font-display text-[31px] leading-10 tracking-[-0.8px] text-white">My day</Text></View>
      <Pressable accessibilityRole="button" accessibilityLabel="Change your preferred name" onPress={() => openModal('setup')} className="h-12 w-12 items-center justify-center rounded-full border border-lilac/20 bg-lilac/10 active:bg-lilac/20"><Text className="font-semibold text-[20px] text-lilac">{name.trim().charAt(0).toUpperCase()}</Text></Pressable>
    </View>

    <View className="overflow-hidden rounded-[28px]">
      <LinearGradient colors={isDark ? ['#352747', '#211b2e'] : ['#F0EAF7', '#E9E3F1']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={{ padding: 24 }}>
        <View className="flex-row items-center justify-between"><Text className="font-semibold text-[11px] tracking-[2px] text-lilac">AT YOUR OWN PACE</Text><Ionicons name="sunny-outline" size={25} color={colors.lilac} /></View>
        <Text className="mt-5 font-display text-[25px] leading-[33px] tracking-[-0.5px] text-white">You've got this, {name}.</Text>
        <Text className="mt-2 font-sans text-[14px] leading-[22px] text-body">One small step is a good place to start.</Text>
        <View className="mt-6 flex-row items-center justify-between"><Text className="font-medium text-[13px] text-lilac-bright">{completed === tasks.length && tasks.length ? 'A little progress, worth celebrating.' : 'Your progress today'}</Text><Text className="font-semibold text-[13px] text-lilac">{completed} / {tasks.length}</Text></View>
        <View accessibilityRole="progressbar" accessibilityValue={{ min: 0, max: tasks.length || 1, now: completed }} className="mt-3 h-1.5 overflow-hidden rounded-full bg-black/20"><View className="h-full rounded-full bg-lilac" style={{ width: `${progress * 100}%` }} /></View>
      </LinearGradient>
    </View>

    <View className="mt-4 flex-row gap-3">
      <QuickAction icon="add-outline" title="New task" onPress={() => openModal('task')} />
      <QuickAction icon="alarm-outline" title="Reminder" onPress={() => openModal('reminder')} />
      <QuickAction icon="create-outline" title="Quick note" onPress={() => openModal('thought')} />
    </View>

    <SectionTitle title="A few things for today" action="Add task" onAction={() => openModal('task')} />
    <View className="overflow-hidden rounded-[24px] bg-panel px-4">
      {tasks.map((task, index) => <Pressable key={task.id} accessibilityRole="checkbox" accessibilityState={{ checked: task.done }} onPress={() => void toggleTask(task)} className={`min-h-[76px] flex-row items-center py-4 active:opacity-70 ${index ? 'border-t border-line/60' : ''}`}>
        <View className={`h-6 w-6 items-center justify-center rounded-full border ${task.done ? 'border-lilac bg-lilac' : 'border-muted/60'}`}>{task.done ? <Ionicons name="checkmark" size={15} color={colors.ink} /> : null}</View>
        <Text className={`ml-3 flex-1 font-sans text-[15px] leading-[23px] ${task.done ? 'text-muted line-through' : 'text-white'}`}>{task.text}</Text>
      </Pressable>)}
      <Pressable accessibilityRole="button" onPress={() => openModal('task')} className="min-h-14 flex-row items-center gap-3 border-t border-line/60 py-3"><Ionicons name="add" size={23} color={colors.lilac} /><Text className="font-medium text-[14px] text-lilac">Add one small thing</Text></Pressable>
    </View>

    <SectionTitle title="On the horizon" action={openReminders ? `${openReminders} open` : 'Add reminder'} onAction={() => openModal('reminder')} />
    {reminders.length ? <View className="overflow-hidden rounded-[24px] bg-panel px-4">{reminders.map((reminder, index) => <Pressable key={reminder.id} accessibilityRole="checkbox" accessibilityState={{ checked: reminder.done }} onPress={() => void toggleReminder(reminder)} className={`min-h-[78px] flex-row items-center py-4 ${index ? 'border-t border-line/60' : ''}`}>
      <View className={`h-10 w-10 items-center justify-center rounded-2xl ${reminder.done ? 'bg-lilac/10' : 'bg-amber/10'}`}><Ionicons name={reminder.done ? 'checkmark' : 'alarm-outline'} size={21} color={reminder.done ? colors.lilac : colors.amber} /></View>
      <View className="ml-3 flex-1"><Text className={`font-medium text-[14px] leading-5 ${reminder.done ? 'text-muted line-through' : 'text-white'}`}>{reminder.text}</Text><Text className="mt-1 font-sans text-[12px] text-muted">{reminder.when}</Text></View>
    </Pressable>)}</View> : <Pressable accessibilityRole="button" onPress={() => openModal('reminder')} className="flex-row items-center gap-4 rounded-[24px] bg-panel p-5"><View className="h-12 w-12 items-center justify-center rounded-2xl bg-amber/10"><Ionicons name="alarm-outline" size={23} color={colors.amber} /></View><View className="flex-1"><Text className="font-medium text-[15px] text-white">Nothing waiting on you.</Text><Text className="mt-1 font-sans text-[13px] leading-5 text-muted">Add something you'd like to remember.</Text></View><Ionicons name="add" size={20} color={colors.muted} /></Pressable>}

    <SectionTitle title="A moment for yourself" />
    <View className="rounded-[24px] bg-panel p-5">
      <Text className="font-medium text-[16px] text-white">How does today feel?</Text>
      <Text className="mt-1 font-sans text-[13px] text-muted">There's no right answer.</Text>
      <View className="mt-5 flex-row gap-2.5">{checkIns.map((item) => <Pressable key={item.label} accessibilityRole="button" accessibilityState={{ selected: checkIn === item.label }} onPress={() => setCheckIn(item.label)} className={`min-h-[88px] flex-1 items-center justify-center gap-2 rounded-[20px] border ${checkIn === item.label ? 'border-lilac/50 bg-lilac/10' : 'border-line/70 bg-canvas/30'}`}><Ionicons name={item.icon} size={24} color={checkIn === item.label ? colors.lilac : colors.muted} /><Text className={`font-medium text-[13px] ${checkIn === item.label ? 'text-lilac-bright' : 'text-muted'}`}>{item.label}</Text></Pressable>)}</View>
      {checkIn ? <Text accessibilityLiveRegion="polite" className="mt-4 font-sans text-[14px] leading-[22px] text-muted">{checkIns.find((item) => item.label === checkIn)?.response}</Text> : null}
    </View>

    <SectionTitle title="A little inspiration" />
    <View className="gap-2">{[
      { title: 'Help me plan my day', icon: 'sunny-outline' as const },
      { title: 'Break down a task', icon: 'layers-outline' as const },
      { title: 'I need a little reset', icon: 'leaf-outline' as const },
    ].map((suggestion) => <Pressable key={suggestion.title} accessibilityRole="button" onPress={() => showSuggestion(suggestion.title)} className="min-h-14 flex-row items-center gap-3 rounded-2xl bg-panel px-4 py-3 active:bg-raised"><Ionicons name={suggestion.icon} size={20} color={colors.lilac} /><Text className="flex-1 font-sans text-[14px] text-white">{suggestion.title}</Text><Ionicons name="chevron-forward" size={16} color={colors.muted} /></Pressable>)}</View>

    <SectionTitle title="Room to think" action="Capture a note" onAction={() => openModal('thought')} />
    {thoughts.length ? <View className="gap-3">{thoughts.map((thought) => <View key={thought.id} className="rounded-[24px] bg-panel p-5"><View className="mb-3 flex-row items-center justify-between"><View className="flex-row items-center gap-2"><Ionicons name="document-text-outline" size={17} color={colors.lilac} /><Text className="font-sans text-[12px] text-muted">{new Date(thought.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}</Text></View><Pressable accessibilityRole="button" accessibilityLabel="Delete note" onPress={() => void removeThought(thought)} hitSlop={10} className="h-8 w-8 items-center justify-center rounded-full active:bg-rose/10"><Ionicons name="trash-outline" size={17} color={colors.muted} /></Pressable></View><Text selectable className="font-sans text-[15px] leading-[24px] text-white">{thought.text}</Text></View>)}</View> : <Pressable accessibilityRole="button" onPress={() => openModal('thought')} className="items-center rounded-[24px] border border-dashed border-line px-6 py-8"><View className="mb-3 h-12 w-12 items-center justify-center rounded-2xl bg-lilac/10"><Ionicons name="create-outline" size={25} color={colors.lilac} /></View><Text className="font-medium text-[16px] text-white">Get it out of your head.</Text><Text className="mt-2 text-center font-sans text-[14px] leading-[22px] text-muted">An idea, a note, a thought for later.{'\n'}Give it a little space here.</Text></Pressable>}
    <View className="mt-8 flex-row items-start justify-center gap-2 px-3"><Ionicons name="phone-portrait-outline" size={14} color={colors.muted} /><Text className="flex-1 text-center font-sans text-[12px] leading-[18px] text-muted">Your tasks, reminders, and notes stay on this device. They don't sync to your web workspace.</Text></View>
  </ScrollView>{sheet}</View>;
}

function QuickAction({ icon, title, onPress }: { icon: IconName; title: string; onPress: () => void }) {
  return <Pressable accessibilityRole="button" onPress={onPress} className="min-h-[88px] flex-1 items-center justify-center gap-2 rounded-[22px] bg-panel px-2 py-4 active:bg-raised"><Ionicons name={icon} size={23} color={colors.lilac} /><Text className="text-center font-medium text-[12px] text-white">{title}</Text></Pressable>;
}

function AssistantModal({ visible, kind, draft, setDraft, when, setWhen, saving, onClose, onSave }: { visible: boolean; kind: ModalKind; draft: string; setDraft: (value: string) => void; when: string; setWhen: (value: string) => void; saving: boolean; onClose: () => void; onSave: () => void }) {
  const [focused, setFocused] = useState(false);
  const { isDark } = useTheme();
  const revealFocusedInput = useRevealFocusedInput();
  const isName = kind === 'setup';
  const title = isName ? 'Make yourself at home.' : kind === 'task' ? 'One small step.' : kind === 'reminder' ? 'Keep it in mind.' : 'A little room to think.';
  const subtitle = isName ? 'What would you like us to call you?' : kind === 'task' ? 'A clear next step makes a good beginning.' : kind === 'reminder' ? 'Add a reminder to your personal planner.' : 'Capture it now. Come back when you have space.';
  return <BottomSheet visible={visible} onClose={onClose} title={title} subtitle={subtitle}>
    <Text className="mb-2 font-medium text-[13px] text-lilac-bright">{isName ? 'Your preferred name' : kind === 'reminder' ? 'Remind me about' : kind === 'task' ? 'What would you like to do?' : 'Your note'}</Text>
    <TextInput
      accessibilityLabel={isName ? 'Your preferred name' : kind === 'reminder' ? 'Reminder' : kind === 'task' ? 'Task' : 'Note'}
      value={draft}
      onChangeText={setDraft}
      onFocus={() => { setFocused(true); revealFocusedInput(); }}
      onBlur={() => setFocused(false)}
      editable={!saving}
      multiline={!isName}
      textAlignVertical={isName ? 'center' : 'top'}
      autoCapitalize={isName ? 'words' : 'sentences'}
      maxLength={isName ? 60 : 4000}
      placeholder={isName ? 'Your name' : kind === 'task' ? 'Start with one small thing...' : kind === 'reminder' ? 'Something to remember...' : 'Let your thoughts land here...'}
      placeholderTextColor={colors.muted}
      selectionColor={colors.lilac}
      keyboardAppearance={isDark ? 'dark' : 'light'}
      returnKeyType={isName ? 'done' : 'default'}
      onSubmitEditing={isName ? onSave : undefined}
      className={`rounded-[20px] border bg-canvas px-4 py-4 font-sans text-[16px] leading-6 text-white ${isName ? 'min-h-14' : 'min-h-[128px]'} ${focused ? 'border-lilac/50' : 'border-line'}`}
    />
    {kind === 'reminder' ? <View className="mt-5"><Text className="mb-2 font-medium text-[13px] text-lilac-bright">When</Text><TextInput accessibilityLabel="When to remember" value={when} onChangeText={setWhen} onFocus={revealFocusedInput} editable={!saving} placeholder="Tomorrow, 4:00 PM" placeholderTextColor={colors.muted} selectionColor={colors.lilac} keyboardAppearance={isDark ? 'dark' : 'light'} returnKeyType="done" onSubmitEditing={onSave} className="min-h-14 rounded-[20px] border border-line bg-canvas px-4 py-3 font-sans text-[15px] text-white" /><Text className="mt-2 font-sans text-[12px] leading-[18px] text-muted">Saved in your planner. Device notifications aren't scheduled.</Text></View> : null}
    <PrimaryButton title={isName ? 'Make it mine' : kind === 'task' ? 'Add task' : kind === 'reminder' ? 'Save reminder' : 'Save note'} onPress={onSave} disabled={!draft.trim()} loading={saving} className="mt-6" />
  </BottomSheet>;
}
