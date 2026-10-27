import React, { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Linking, Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { BottomSheet } from '../../components/BottomSheet';
import { useKeyboardVisible } from '../../components/KeyboardLayout';
import { colors } from '../../config';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { Field } from '../../components/ui';
import { api, errorMessage } from '../../services/api';
import { Alert } from '../../services/appAlert';
import { saveChatExport } from '../../services/chatExport';
import type { ChatConversation, ChatDomain, ChatMessage } from '../../types/api';

const generalPrompts = [
  { icon: 'bulb-outline' as const, title: 'Think something through', question: 'Help me think through a decision I need to make.' },
  { icon: 'create-outline' as const, title: 'Write something', question: 'Help me write a clear, friendly message.' },
  { icon: 'list-outline' as const, title: 'Make a simple plan', question: 'Help me turn a goal into a few practical steps.' },
];
const financePrompts = [
  { icon: 'trending-up-outline' as const, title: 'Check partial payments', question: 'Show my partially paid invoices' },
  { icon: 'receipt-outline' as const, title: 'Stay ahead of invoices', question: 'What invoices are overdue?' },
  { icon: 'pie-chart-outline' as const, title: 'Understand my spending', question: 'Summarize my recent expenses' },
];
const personalFinancePrompts = [
  { icon: 'pie-chart-outline' as const, title: 'Review personal spending', question: 'Summarize my spending this month' },
  { icon: 'wallet-outline' as const, title: 'Check my budgets', question: 'Show my budget status' },
  { icon: 'calendar-outline' as const, title: 'Upcoming personal bills', question: 'What personal bills are coming up?' },
];

const domainLabels: Record<ChatDomain, string> = {
  general: 'General', finance_analyst: 'Finance', personal_finance: 'Personal finance', personal_assistant: 'Personal assistant',
  hr_executive: 'People & HR', sales_analyst: 'Sales',
};

export function ChatScreen() {
  const { user } = useAuth();
  const { isDark } = useTheme();
  const [conversations, setConversations] = useState<ChatConversation[]>([]);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [domain, setDomain] = useState<ChatDomain>('general');
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [historySearch, setHistorySearch] = useState('');
  const [exporting, setExporting] = useState<'current' | 'all' | null>(null);
  const [focused, setFocused] = useState(false);
  const [error, setError] = useState('');
  const keyboardVisible = useKeyboardVisible();
  const scroll = useRef<ScrollView>(null);
  const followingLatest = useRef(true);
  const sendingRef = useRef(false);
  const conversationRequest = useRef(0);
  const mounted = useRef(true);
  const domains: ChatDomain[] = [
    'general',
    ...(user?.specialists.includes('finance_analyst') ? ['finance_analyst' as const] : []),
    ...(user?.specialists.includes('finance_analyst') ? ['personal_finance' as const] : []),
    ...(user?.specialists.includes('personal_assistant') ? ['personal_assistant' as const] : []),
    ...(user?.specialists.includes('hr_executive') ? ['hr_executive' as const] : []),
    ...(user?.specialists.includes('sales_analyst') ? ['sales_analyst' as const] : []),
  ];

  const scrollToLatest = useCallback((animated = true) => {
    if (followingLatest.current) scroll.current?.scrollToEnd({ animated });
  }, []);

  const loadConversations = useCallback(async () => {
    try {
      const { data } = await api.get<ChatConversation[]>('/chat/conversations');
      if (mounted.current) setConversations(data);
    } catch (e) {
      if (mounted.current) setError(errorMessage(e));
    }
  }, []);

  useEffect(() => {
    mounted.current = true;
    void (async () => {
      await loadConversations();
      if (mounted.current) setLoading(false);
    })();
    return () => { mounted.current = false; conversationRequest.current += 1; };
  }, [loadConversations]);

  const selectConversation = async (id: string) => {
    if (sendingRef.current) return;
    const request = ++conversationRequest.current;
    followingLatest.current = true;
    setConversationId(id);
    setMessages([]);
    const savedConversation = conversations.find((item) => item.id === id);
    if (savedConversation?.domain) setDomain(savedConversation.domain);
    setHistoryOpen(false);
    setLoading(true);
    setError('');
    try {
      const { data } = await api.get<ChatMessage[]>(`/chat/conversations/${id}/messages`);
      if (request === conversationRequest.current) setMessages(data);
    } catch (e) {
      if (request === conversationRequest.current) setError(errorMessage(e));
    } finally {
      if (request === conversationRequest.current) setLoading(false);
    }
  };

  const send = async (suggestion?: string) => {
    const content = (suggestion ?? input).trim();
    if (!content || sendingRef.current || loading) return;
    sendingRef.current = true;
    followingLatest.current = true;
    setInput('');
    setSending(true);
    setError('');
    const localId = `local-${Date.now()}`;
    setMessages((current) => [...current, { id: localId, role: 'user', content }]);
    try {
      const { data } = await api.post('/chat/send', { conversation_id: conversationId, message: content, domain }, { timeout: 150_000 });
      if (!mounted.current) return;
      setConversationId(data.conversation_id);
      setMessages((current) => [...current, {
        id: data.message_id,
        conversation_id: data.conversation_id,
        role: 'assistant',
        content: data.reply,
        suggested_questions: data.suggested_questions ?? [],
        metadata: data.metadata ?? null,
      }]);
      await loadConversations();
    } catch (e) {
      if (!mounted.current) return;
      setMessages((current) => current.filter((message) => message.id !== localId));
      setInput(content);
      setError(errorMessage(e));
    } finally {
      sendingRef.current = false;
      if (mounted.current) setSending(false);
    }
  };

  const newConversation = () => {
    if (sendingRef.current) return;
    conversationRequest.current += 1;
    followingLatest.current = true;
    setConversationId(null);
    setMessages([]);
    setInput('');
    setError('');
    setLoading(false);
    setHistoryOpen(false);
  };

  const changeDomain = (nextDomain: ChatDomain) => {
    if (sendingRef.current || nextDomain === domain) return;
    conversationRequest.current += 1;
    followingLatest.current = true;
    setDomain(nextDomain);
    setConversationId(null);
    setMessages([]);
    setInput('');
    setError('');
    setLoading(false);
  };

  const deleteConversation = (conversation: ChatConversation) => {
    if (sendingRef.current) return;
    Alert.alert('Delete conversation?', `"${conversation.title}" will be removed.`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: async () => {
        try {
          await api.delete(`/chat/conversations/${conversation.id}`);
          if (conversationId === conversation.id) newConversation();
          await loadConversations();
        } catch (e) { setError(errorMessage(e)); }
      } },
    ]);
  };

  const exportChats = async (scope: 'current' | 'all') => {
    if (sendingRef.current || exporting) return;
    setExporting(scope);
    try {
      // Read from the API so the file includes the complete saved history,
      // including timestamps and metadata absent from optimistic UI messages.
      const { data: latest } = await api.get<ChatConversation[]>('/chat/conversations');
      const selected = scope === 'all' ? latest : latest.filter((item) => item.id === conversationId);
      if (!selected.length) throw new Error(scope === 'current' ? 'Open a saved conversation first.' : 'There are no saved chats to export.');
      const exported = [];
      for (const conversation of selected) {
        const { data: fullMessages } = await api.get<ChatMessage[]>(`/chat/conversations/${conversation.id}/messages`);
        exported.push({ conversation, messages: fullMessages });
      }
      await saveChatExport({
        format: 'zengen-ai-chat-export',
        version: 1,
        exported_at: new Date().toISOString(),
        scope,
        conversations: exported,
      });
    } catch (e) {
      const detail = e instanceof Error && !('isAxiosError' in e) ? e.message : errorMessage(e);
      Alert.alert('Could not export chats', detail);
    } finally {
      if (mounted.current) setExporting(null);
    }
  };

  const visibleConversations = conversations.filter((item) => item.title.toLocaleLowerCase().includes(historySearch.trim().toLocaleLowerCase()));
  const prompts = domain === 'personal_finance' ? personalFinancePrompts : domain === 'finance_analyst' ? financePrompts : generalPrompts;

  return <View className="min-h-0 flex-1">
    <View className="px-5 pb-3 pt-1">
      <ScrollView horizontal className="mt-4" contentContainerClassName="gap-2" showsHorizontalScrollIndicator={false}>
        {domains.map((option) => {
          const selected = domain === option;
          return <Pressable key={option} accessibilityRole="button" accessibilityState={{ selected }} onPress={() => changeDomain(option)} className={'min-h-10 flex-row items-center rounded-full border px-4 ' + (selected ? 'border-lilac/40 bg-lilac/15' : 'border-line bg-panel')}>
            {option === 'general' ? <Ionicons name="sparkles-outline" size={15} color={selected ? colors.lilac : colors.muted} /> : null}
            <Text className={'ml-1.5 font-medium text-[12px] ' + (selected ? 'text-lilac' : 'text-muted')}>{domainLabels[option]}</Text>
          </Pressable>;
        })}
      </ScrollView>
      <View className="mt-3 flex-row items-center justify-between">
        <Text className="font-sans text-[12px] text-muted">Focus: {domainLabels[domain]}</Text>
        <View className="flex-row items-center gap-2">
          <Pressable accessibilityRole="button" accessibilityLabel={`Conversation history, ${conversations.length} saved`} disabled={sending} onPress={() => setHistoryOpen(true)} className="h-10 flex-row items-center gap-2 rounded-full border border-line bg-panel px-3 active:bg-raised disabled:opacity-40">
            <Ionicons name="time-outline" size={17} color={colors.lilac} />
            <Text className="font-medium text-[12px] text-white">Chats</Text>
            <View className="min-w-5 items-center rounded-full bg-lilac/15 px-1.5 py-0.5"><Text className="font-semibold text-[10px] text-lilac">{conversations.length}</Text></View>
          </Pressable>
          <Pressable accessibilityRole="button" accessibilityLabel="Start a new chat" disabled={sending} onPress={newConversation} className="h-10 flex-row items-center gap-1.5 rounded-full bg-lilac/10 px-3 active:bg-lilac/20 disabled:opacity-40">
            <Ionicons name="create-outline" size={17} color={colors.lilac} />
            <Text className="font-medium text-[12px] text-lilac">New chat</Text>
          </Pressable>
        </View>
      </View>
    </View>

    {loading ? <View className="flex-1 items-center justify-center gap-3">
      <ActivityIndicator color={colors.lilac} />
      <Text className="font-sans text-[14px] text-muted">Opening your conversations...</Text>
    </View> : <ScrollView
      ref={scroll}
      className="min-h-0 flex-1"
      contentContainerClassName={messages.length ? 'px-5 pb-6 pt-5' : 'px-5 pb-7 pt-3'}
      keyboardShouldPersistTaps="handled"
      keyboardDismissMode="interactive"
      showsVerticalScrollIndicator={false}
      scrollEventThrottle={32}
      onScroll={({ nativeEvent }) => {
        followingLatest.current = nativeEvent.contentSize.height - nativeEvent.contentOffset.y - nativeEvent.layoutMeasurement.height < 100;
      }}
      onContentSizeChange={() => { if (messages.length) scrollToLatest(); }}
      onLayout={() => { if (messages.length) scrollToLatest(false); }}
    >
      {messages.length ? <>
        <View className="mb-6 flex-row items-center justify-center gap-2">
          <View className="h-px flex-1 bg-line/60" />
          <Text className="font-medium text-[11px] tracking-[1px] text-muted">{domainLabels[domain].toLocaleUpperCase()} FOCUS</Text>
          <View className="h-px flex-1 bg-line/60" />
        </View>
        {messages.map((message) => <MessageBubble key={message.id} message={message} disabled={sending} onSuggestion={(question) => void send(question)} />)}
        {sending ? <View accessibilityLiveRegion="polite" className="mb-4 flex-row items-center gap-3 py-2">
          <View className="h-8 w-8 items-center justify-center rounded-full bg-lilac/10"><Ionicons name="sparkles" size={15} color={colors.lilac} /></View>
          <ActivityIndicator color={colors.lilac} size="small" />
          <Text className="font-sans text-[14px] text-muted">Thinking...</Text>
        </View> : null}
      </> : <View>
        <View className="mb-4 self-start overflow-hidden rounded-[22px]">
          <LinearGradient colors={isDark ? ['#6d55a1', '#292039'] : ['#DCD0F2', '#CDBDEA']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={{ width: 58, height: 58, alignItems: 'center', justifyContent: 'center' }}>
            <Ionicons name="sparkles" size={26} color={isDark ? '#ede9fe' : '#6547A0'} />
          </LinearGradient>
        </View>
        <Text className="font-display text-[29px] leading-[37px] tracking-[-0.8px] text-white">What's on your mind?</Text>
        <Text className="mt-2 max-w-[340px] font-sans text-[14px] leading-[22px] text-muted">Start anywhere, or choose a focus above to bring one of your AI teammate's perspectives into the conversation.</Text>
        {conversations.length ? <View className="mt-6">
          <View className="mb-3 flex-row items-center justify-between"><Text className="font-semibold text-[14px] text-white">Pick up where you left off</Text><Pressable accessibilityRole="button" onPress={() => setHistoryOpen(true)} className="min-h-10 flex-row items-center"><Text className="font-semibold text-[12px] text-lilac">All chats</Text><Ionicons name="chevron-forward" size={14} color={colors.lilac} /></Pressable></View>
          <ScrollView horizontal contentContainerClassName="gap-3" showsHorizontalScrollIndicator={false}>
            {conversations.slice(0, 4).map((conversation) => <Pressable key={conversation.id} accessibilityRole="button" onPress={() => void selectConversation(conversation.id)} className="w-[230px] rounded-[20px] border border-line bg-panel p-4 active:bg-raised">
              <View className="mb-3 flex-row items-center justify-between"><View className="rounded-full bg-lilac/10 px-2.5 py-1"><Text className="font-medium text-[10px] text-lilac">{domainLabels[conversation.domain] ?? 'General'}</Text></View><Ionicons name="arrow-forward-outline" size={15} color={colors.muted} /></View>
              <Text numberOfLines={2} className="font-medium text-[13px] leading-5 text-white">{conversation.title}</Text>
              <Text className="mt-2 font-sans text-[11px] text-muted">{new Date(conversation.updated_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}</Text>
            </Pressable>)}
          </ScrollView>
        </View> : null}
        <Text className="mb-3 mt-7 font-semibold text-[14px] text-white">Try starting with</Text>
        <View className="gap-2.5">
          {prompts.map((prompt) => <Pressable key={prompt.question} accessibilityRole="button" onPress={() => void send(prompt.question)} className="flex-row items-center rounded-[20px] bg-panel px-4 py-4 active:bg-raised">
            <View className="mr-3 h-10 w-10 items-center justify-center rounded-xl bg-lilac/10"><Ionicons name={prompt.icon} size={21} color={colors.lilac} /></View>
            <View className="flex-1"><Text className="font-medium text-[14px] text-white">{prompt.title}</Text><Text className="mt-1 font-sans text-[12px] text-muted">{prompt.question}</Text></View>
            <Ionicons name="arrow-up-outline" size={17} color={colors.muted} style={{ transform: [{ rotate: '45deg' }] }} />
          </Pressable>)}
        </View>
      </View>}
      {error ? <View accessibilityRole="alert" className="mt-4 flex-row items-start gap-2 rounded-2xl bg-rose/10 p-4">
        <Ionicons name="alert-circle-outline" size={18} color={colors.rose} />
        <View className="flex-1"><Text className="font-sans text-[13px] leading-5 text-rose">{error}</Text>{!sending ? <Pressable accessibilityRole="button" onPress={() => { setError(''); if (conversationId && !messages.length) void selectConversation(conversationId); else void loadConversations(); }} className="self-start py-2"><Text className="font-semibold text-[13px] text-rose">Try again</Text></Pressable> : null}</View>
      </View> : null}
    </ScrollView>}

    <View className="bg-canvas px-4 pb-3 pt-2">
      <View className={`flex-row items-end rounded-[26px] border bg-panel p-2 ${focused ? 'border-lilac/50' : 'border-line'}`}>
        <TextInput
          accessibilityLabel="Message Zengen AI"
          value={input}
          onChangeText={setInput}
          editable={!sending && !loading}
          onFocus={() => { setFocused(true); followingLatest.current = true; }}
          onBlur={() => setFocused(false)}
          onSubmitEditing={() => void send()}
          returnKeyType="send"
          submitBehavior="submit"
          multiline
          maxLength={4000}
          placeholder="Ask Zengen AI anything..."
          placeholderTextColor={colors.muted}
          selectionColor={colors.lilac}
          keyboardAppearance={isDark ? 'dark' : 'light'}
          textAlignVertical="top"
          className="max-h-32 min-h-11 flex-1 px-3 py-2.5 font-sans text-[15px] leading-[23px] text-white"
        />
        <Pressable accessibilityRole="button" accessibilityLabel="Send message" onPress={() => void send()} disabled={sending || loading || !input.trim()} className={`ml-1 h-11 w-11 items-center justify-center rounded-full ${sending || loading || !input.trim() ? 'bg-raised' : 'bg-lilac active:opacity-80'}`}>
          {sending ? <ActivityIndicator size="small" color={colors.lilac} /> : <Ionicons name="arrow-up" size={22} color={loading || !input.trim() ? colors.muted : colors.ink} />}
        </Pressable>
      </View>
      {!keyboardVisible ? <Text className="mt-2 text-center font-sans text-[11px] text-muted">Focus: {domainLabels[domain]} | Change focus to start a new chat.</Text> : null}
    </View>

    <BottomSheet visible={historyOpen} onClose={() => setHistoryOpen(false)} title="Your conversations" subtitle="Pick up where you left off.">
      <Pressable accessibilityRole="button" disabled={sending} onPress={newConversation} className="mb-5 min-h-14 flex-row items-center justify-center gap-2 rounded-2xl bg-lilac active:opacity-80">
        <Ionicons name="add" size={21} color={colors.ink} />
        <Text className="font-semibold text-[14px] text-ink">Start a new conversation</Text>
      </Pressable>
      {/* Temporary testing controls: remove this block and chatExport.ts after testing. */}
      {conversations.length ? <View className="mb-5 rounded-2xl border border-line bg-canvas/60 p-3">
        <View className="flex-row items-center gap-2"><Ionicons name="download-outline" size={17} color={colors.lilac} /><Text className="font-semibold text-[13px] text-white">Testing export</Text></View>
        <Text className="mt-1 font-sans text-[11px] leading-4 text-muted">Save full messages, dates and answer metadata as a JSON file. It may contain private chat content.</Text>
        <View className="mt-3 flex-row gap-2">
          <Pressable accessibilityRole="button" accessibilityLabel="Export current chat as JSON" disabled={!conversationId || !!exporting || sending} onPress={() => void exportChats('current')} className="min-h-11 flex-1 flex-row items-center justify-center gap-1.5 rounded-xl border border-line bg-panel px-2 disabled:opacity-40">
            {exporting === 'current' ? <ActivityIndicator size="small" color={colors.lilac} /> : <Ionicons name="chatbubble-outline" size={15} color={colors.lilac} />}
            <Text className="font-medium text-[12px] text-white">Current chat</Text>
          </Pressable>
          <Pressable accessibilityRole="button" accessibilityLabel="Export all chats as JSON" disabled={!!exporting || sending} onPress={() => void exportChats('all')} className="min-h-11 flex-1 flex-row items-center justify-center gap-1.5 rounded-xl border border-line bg-panel px-2 disabled:opacity-40">
            {exporting === 'all' ? <ActivityIndicator size="small" color={colors.lilac} /> : <Ionicons name="albums-outline" size={15} color={colors.lilac} />}
            <Text className="font-medium text-[12px] text-white">All chats</Text>
          </Pressable>
        </View>
      </View> : null}
      {conversations.length ? <View className="mb-4"><Field accessibilityLabel="Search conversations" placeholder="Find a conversation" value={historySearch} onChangeText={setHistorySearch} icon="search-outline" autoCapitalize="none" autoCorrect={false} /></View> : null}
      {visibleConversations.length ? visibleConversations.map((conversation) => <View key={conversation.id} className={`mb-2 flex-row items-center rounded-2xl px-3 ${conversationId === conversation.id ? 'bg-lilac/10' : 'bg-canvas/60'}`}>
        <Pressable accessibilityRole="button" accessibilityState={{ selected: conversationId === conversation.id }} disabled={sending} onPress={() => void selectConversation(conversation.id)} className="min-h-[76px] flex-1 flex-row items-center py-3">
          <Ionicons name="chatbubble-outline" size={20} color={conversationId === conversation.id ? colors.lilac : colors.muted} />
          <View className="ml-3 flex-1"><Text numberOfLines={2} className="font-medium text-[14px] leading-5 text-white">{conversation.title}</Text><Text className="mt-1 font-sans text-[12px] text-muted">{domainLabels[conversation.domain] ?? 'General'} | {new Date(conversation.updated_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}</Text></View>
        </Pressable>
        <Pressable accessibilityRole="button" accessibilityLabel={`Delete ${conversation.title}`} disabled={sending} onPress={() => deleteConversation(conversation)} className="ml-1 h-11 w-11 items-center justify-center rounded-full active:bg-rose/10"><Ionicons name="trash-outline" size={18} color={colors.muted} /></Pressable>
      </View>) : <View className="items-center py-10"><Ionicons name={conversations.length ? 'search-outline' : 'chatbubbles-outline'} size={32} color={colors.lilac} /><Text className="mt-4 font-semibold text-[16px] text-white">{conversations.length ? 'No chats found' : 'Your next good question starts here.'}</Text><Text className="mt-2 text-center font-sans text-[14px] leading-5 text-muted">{conversations.length ? 'Try a different title or topic.' : 'Conversations will be saved here as you go.'}</Text></View>}
    </BottomSheet>
  </View>;
}

function MessageBubble({ message, onSuggestion, disabled }: { message: ChatMessage; onSuggestion: (question: string) => void; disabled: boolean }) {
  const mine = message.role === 'user';
  const sources = message.metadata?.sources?.filter((source) => source.title && /^https:\/\//i.test(source.url)) ?? [];
  return <View className={`mb-6 ${mine ? 'max-w-[88%] self-end' : 'w-full self-start'}`}>
    {!mine ? <View className="mb-2 flex-row items-center gap-2"><View className="h-7 w-7 items-center justify-center rounded-full bg-lilac/10"><Ionicons name="sparkles" size={13} color={colors.lilac} /></View><Text className="font-semibold text-[12px] text-lilac">Zengen AI</Text></View> : null}
    <View className={mine ? 'rounded-[24px] rounded-br-md bg-lilac px-4 py-3.5' : 'rounded-[22px] rounded-tl-md bg-panel px-4 py-4'}>
      <Text selectable className={`font-sans text-[15px] leading-[24px] ${mine ? 'text-ink' : 'text-body'}`}>{message.content}</Text>
    </View>
    {!mine && sources.length ? <View className="mt-2 flex-row flex-wrap items-center gap-2">
      <Text className="font-sans text-[11px] text-muted">Sources</Text>
      {sources.map((source) => <Pressable key={source.url} accessibilityRole="link" accessibilityLabel={`Open ${source.title}`} onPress={() => void Linking.openURL(source.url).catch(() => Alert.alert('Could not open source', 'Please try again later.'))} className="min-h-9 flex-row items-center gap-1 rounded-full border border-line bg-panel px-3 py-2 active:bg-raised">
        <Ionicons name="open-outline" size={12} color={colors.lilac} />
        <Text className="font-medium text-[11px] text-lilac" numberOfLines={1}>{source.title}</Text>
      </Pressable>)}
    </View> : null}
    {!mine && message.suggested_questions?.length ? <View className="mt-3 gap-2">{message.suggested_questions.slice(0, 3).map((question) => <Pressable key={question} accessibilityRole="button" disabled={disabled} onPress={() => onSuggestion(question)} className="min-h-11 flex-row items-center gap-2 rounded-2xl border border-line px-3 py-3 active:bg-raised disabled:opacity-50"><Text className="flex-1 font-sans text-[13px] leading-5 text-lilac-bright">{question}</Text><Ionicons name="arrow-forward" size={15} color={colors.lilac} /></Pressable>)}</View> : null}
  </View>;
}
