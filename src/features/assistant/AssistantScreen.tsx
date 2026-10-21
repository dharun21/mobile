import React, { useEffect, useState } from 'react';
import { Modal, Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Alert } from '../../services/appAlert';
import { Ionicons } from '@expo/vector-icons';
import { Card, Copy, EmptyState, Eyebrow, Field, Heading, PrimaryButton, SectionTitle } from '../../components/ui';
import { colors } from '../../config';

type AssistantTask = { id: string; text: string; done: boolean };
type Reminder = { id: string; text: string; when: string; done: boolean };
type Thought = { id: string; text: string; created_at: string };
const keys = { name: 'zengen.mobile.assistant.name', tasks: 'zengen.mobile.assistant.tasks', reminders: 'zengen.mobile.assistant.reminders', thoughts: 'zengen.mobile.assistant.thoughts' };
const starterTasks: AssistantTask[] = [
  { id: 'starter-1', text: 'Choose the one thing that matters most today', done: false },
  { id: 'starter-2', text: 'Take a proper break between busy moments', done: false },
  { id: 'starter-3', text: 'Make a little progress on a personal goal', done: false },
];

export function AssistantScreen() {
  const [name, setName] = useState('');
  const [tasks, setTasks] = useState<AssistantTask[]>(starterTasks);
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [thoughts, setThoughts] = useState<Thought[]>([]);
  const [ready, setReady] = useState(false);
  const [modal, setModal] = useState<'task' | 'reminder' | 'thought' | 'setup' | null>(null);
  const [draft, setDraft] = useState('');
  const [when, setWhen] = useState('');
  const [checkIn, setCheckIn] = useState('');

  useEffect(() => {
    void (async () => {
      const values = await AsyncStorage.multiGet(Object.values(keys));
      const stored = Object.fromEntries(values);
      setName(stored[keys.name] ?? '');
      try { if (stored[keys.tasks]) setTasks(JSON.parse(stored[keys.tasks]!)); } catch { /* use starter tasks */ }
      try { if (stored[keys.reminders]) setReminders(JSON.parse(stored[keys.reminders]!)); } catch { /* use an empty list */ }
      try { if (stored[keys.thoughts]) setThoughts(JSON.parse(stored[keys.thoughts]!)); } catch { /* use an empty list */ }
      setReady(true);
    })();
  }, []);

  const persist = async <T,>(key: string, value: T) => AsyncStorage.setItem(key, JSON.stringify(value));
  const completed = tasks.filter((task) => task.done).length;
  const openReminders = reminders.filter((reminder) => !reminder.done).length;

  function openModal(type: 'task' | 'reminder' | 'thought' | 'setup') { setDraft(type === 'setup' ? name : ''); setWhen(''); setModal(type); }
  async function saveModal() {
    const text = draft.trim();
    if (!text) return;
    if (modal === 'setup') { setName(text); await AsyncStorage.setItem(keys.name, text); }
    if (modal === 'task') { const value = [...tasks, { id: String(Date.now()), text, done: false }]; setTasks(value); await persist(keys.tasks, value); }
    if (modal === 'reminder') { const value = [...reminders, { id: String(Date.now()), text, when: when.trim() || 'Anytime', done: false }]; setReminders(value); await persist(keys.reminders, value); }
    if (modal === 'thought') { const value = [{ id: String(Date.now()), text, created_at: new Date().toISOString() }, ...thoughts]; setThoughts(value); await persist(keys.thoughts, value); }
    setModal(null); setDraft('');
  }
  async function toggleTask(task: AssistantTask) { const value = tasks.map((item) => item.id === task.id ? { ...item, done: !item.done } : item); setTasks(value); await persist(keys.tasks, value); }
  async function toggleReminder(reminder: Reminder) { const value = reminders.map((item) => item.id === reminder.id ? { ...item, done: !item.done } : item); setReminders(value); await persist(keys.reminders, value); }
  async function removeThought(thought: Thought) { const value = thoughts.filter((item) => item.id !== thought.id); setThoughts(value); await persist(keys.thoughts, value); }

  if (!ready) return <View className="flex-1 items-center justify-center"><Text className="text-xs text-muted">Getting things ready…</Text></View>;
  if (!name) return <ScrollView contentContainerClassName="flex-grow justify-center px-5 py-8"><Card className="p-5"><View className="mb-4 h-12 w-12 items-center justify-center rounded-2xl bg-mint/10"><Ionicons name="heart" size={22} color={colors.mint} /></View><Eyebrow>A calmer kind of help</Eyebrow><Heading className="mt-2">Let’s make this yours.</Heading><Copy className="mt-2">Choose a name for your personal assistant to use.</Copy><PrimaryButton className="mt-5" title="Get started" onPress={() => openModal('setup')} /></Card><AssistantModal visible={modal === 'setup'} title="What should we call you?" draft={draft} setDraft={setDraft} onClose={() => setModal(null)} onSave={() => void saveModal()} /></ScrollView>;

  return <ScrollView className="flex-1" contentContainerClassName="px-5 pb-10 pt-2" showsVerticalScrollIndicator={false}>
    <Card className="overflow-hidden border-lilac/25 bg-raised p-5"><Eyebrow>Here for the everyday</Eyebrow><Text className="mt-2 text-[24px] font-semibold text-white">You’ve got this, {name}.</Text><Copy className="mt-2">Small steps count. What would make today feel a little lighter?</Copy><View className="mt-4 flex-row flex-wrap gap-2">{['Help me plan my day', 'Break down a task', 'I need a little reset'].map((suggestion) => <Pressable key={suggestion} onPress={() => showSuggestion(suggestion)} className="rounded-full border border-line bg-panel px-3 py-2"><Text className="text-[10px] text-lilac-bright">{suggestion}</Text></Pressable>)}</View></Card>
    <View className="mt-5 flex-row gap-2"><Card className="flex-1 p-3"><Eyebrow>IN YOUR PLAN</Eyebrow><Text className="mt-2 text-[16px] font-semibold text-white">{completed} of {tasks.length}</Text><Text className="text-[10px] text-muted">steps done</Text></Card><Card className="flex-1 p-3"><Eyebrow>UP NEXT</Eyebrow><Text className="mt-2 text-[16px] font-semibold text-white">{openReminders}</Text><Text className="text-[10px] text-muted">open reminders</Text></Card></View>
    <SectionTitle title="Today, gently" action="Add" onAction={() => openModal('task')} />
    {tasks.map((task) => <Pressable key={task.id} onPress={() => void toggleTask(task)} className="mb-2 flex-row items-center rounded-2xl border border-line bg-panel px-3 py-3"><Ionicons name={task.done ? 'checkmark-circle' : 'ellipse-outline'} size={21} color={task.done ? colors.mint : colors.lilac} /><Text className={`ml-3 flex-1 text-[12px] leading-[18px] ${task.done ? 'text-muted line-through' : 'text-white'}`}>{task.text}</Text></Pressable>)}
    <Pressable onPress={() => openModal('task')} className="flex-row items-center justify-center rounded-2xl border border-line py-3"><Ionicons name="add" size={18} color={colors.lilac} /><Text className="ml-1 text-[12px] font-semibold text-lilac-bright">Add a small task</Text></Pressable>

    <SectionTitle title="Gentle reminders" action="Add" onAction={() => openModal('reminder')} />
    {reminders.length ? reminders.map((reminder) => <Pressable key={reminder.id} onPress={() => void toggleReminder(reminder)} className="mb-2 flex-row items-center rounded-2xl border border-line bg-panel px-3 py-3"><Ionicons name={reminder.done ? 'checkmark-circle' : 'alarm-outline'} size={20} color={reminder.done ? colors.mint : colors.amber} /><View className="ml-3 flex-1"><Text className={`text-[12px] ${reminder.done ? 'text-muted line-through' : 'text-white'}`}>{reminder.text}</Text><Text className="mt-1 text-[10px] text-muted">{reminder.when}</Text></View></Pressable>) : <Copy className="text-[11px]">No reminders yet. Add something you’d like to remember.</Copy>}

    <SectionTitle title="Quick check-in" />
    <Card className="p-4"><Text className="text-[13px] font-medium text-white">How are you feeling today?</Text><View className="mt-3 flex-row gap-2">{['Bright', 'Okay', 'Stretched'].map((item) => <Pressable key={item} onPress={() => setCheckIn(item)} className={`flex-1 items-center rounded-xl border px-2 py-2.5 ${checkIn === item ? 'border-lilac bg-lilac/10' : 'border-line'}`}><Text className={`text-[11px] ${checkIn === item ? 'text-lilac-bright' : 'text-muted'}`}>{item}</Text></Pressable>)}</View>{checkIn ? <Text className="mt-3 text-[11px] leading-[17px] text-muted">{checkIn === 'Bright' ? 'Glad there’s some brightness today. What would help keep a little of that feeling?' : checkIn === 'Okay' ? 'An ordinary day is okay too. Choose one thing that would make today easier.' : 'That sounds like a lot to hold. It may help to pause and choose the next small step.'}</Text> : null}</Card>

    <SectionTitle title="Get it out of your head" action="Capture" onAction={() => openModal('thought')} />
    {thoughts.length ? thoughts.map((thought) => <Card key={thought.id} className="mb-2 flex-row items-start p-3.5"><Ionicons name="document-text-outline" size={17} color={colors.lilac} /><Text className="ml-3 flex-1 text-[12px] leading-[18px] text-white">{thought.text}</Text><Pressable onPress={() => void removeThought(thought)} className="ml-2 p-1"><Ionicons name="trash-outline" size={16} color={colors.muted} /></Pressable></Card>) : <EmptyState icon="✎" title="A little room to think" body="Capture a note or idea so you can come back to it later." />}
    <Text className="mt-5 text-[10px] leading-[15px] text-muted">Assistant tasks, reminders, and notes stay on this device and do not sync to the web app.</Text>

    <AssistantModal visible={modal !== null} title={modal === 'setup' ? 'What should we call you?' : modal === 'task' ? 'Add one small task' : modal === 'reminder' ? 'Add a reminder' : 'Capture a thought'} draft={draft} setDraft={setDraft} when={when} setWhen={setWhen} showWhen={modal === 'reminder'} onClose={() => setModal(null)} onSave={() => void saveModal()} />
  </ScrollView>;

  function showSuggestion(suggestion: string) {
    const answer = suggestion.includes('plan') ? 'Pick one must do, one could do, and one thing that can wait. Give your must do a clear first step, then leave a little breathing room.' : suggestion.includes('Break') ? 'Write down the next visible action. Make it small enough to start in ten minutes, and let that be enough progress.' : 'Try stepping away from your screen for five minutes. Stretch, get some water, or let your attention rest.';
    Alert.alert('A gentle suggestion', answer, [{ text: 'That’s enough for now', style: 'cancel' }, { text: 'Add a next step', onPress: () => { const text = suggestion.includes('plan') ? 'Choose one must do for today' : 'Take a five-minute reset'; const value = [...tasks, { id: String(Date.now()), text, done: false }]; setTasks(value); void persist(keys.tasks, value); } }]);
  }
}

function AssistantModal({ visible, title, draft, setDraft, when, setWhen, showWhen = false, onClose, onSave }: { visible: boolean; title: string; draft: string; setDraft: (value: string) => void; when?: string; setWhen?: (value: string) => void; showWhen?: boolean; onClose: () => void; onSave: () => void }) {
  return <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}><View className="flex-1 justify-end bg-black/60"><View className="rounded-t-[28px] border border-line bg-panel px-5 pb-10 pt-5"><View className="mb-4 flex-row items-center justify-between"><Text className="text-[18px] font-semibold text-white">{title}</Text><Pressable onPress={onClose} className="p-2"><Ionicons name="close" size={22} color={colors.muted} /></Pressable></View><TextInput autoFocus value={draft} onChangeText={setDraft} multiline placeholder="Write a few words…" placeholderTextColor={colors.muted} className="min-h-14 rounded-2xl border border-line bg-ink px-4 py-3 text-[14px] text-white" />{showWhen ? <TextInput value={when} onChangeText={setWhen} placeholder="When? (e.g. Tomorrow, 4:00 PM)" placeholderTextColor={colors.muted} className="mt-3 min-h-12 rounded-2xl border border-line bg-ink px-4 text-[13px] text-white" /> : null}<PrimaryButton title="Save" onPress={onSave} className="mt-4" /></View></View></Modal>;
}
