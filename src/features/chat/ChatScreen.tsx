import React, { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Card, Copy, EmptyState, Eyebrow, Heading } from '../../components/ui';
import { colors } from '../../config';
import { api, errorMessage } from '../../services/api';
import { Alert } from '../../services/appAlert';
import type { ChatConversation, ChatMessage } from '../../types/api';

export function ChatScreen() {
  const [conversations, setConversations] = useState<ChatConversation[]>([]);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [error, setError] = useState('');
  const scroll = useRef<ScrollView>(null);
  const field = useRef<TextInput>(null);

  const loadConversations = useCallback(async () => {
    try {
      const { data } = await api.get<ChatConversation[]>('/chat/conversations');
      setConversations(data);
      return data;
    } catch (e) { setError(errorMessage(e)); return []; }
  }, []);

  useEffect(() => {
    void (async () => { setLoading(true); await loadConversations(); setLoading(false); })();
  }, [loadConversations]);

  const selectConversation = async (id: string) => {
    setConversationId(id); setMessages([]); setHistoryOpen(false); setLoading(true); setError('');
    try { const { data } = await api.get<ChatMessage[]>(`/chat/conversations/${id}/messages`); setMessages(data); }
    catch (e) { setError(errorMessage(e)); }
    finally { setLoading(false); }
  };

  const send = async (suggestion?: string) => {
    const content = (suggestion ?? input).trim();
    if (!content || sending) return;
    setInput(''); setSending(true); setError('');
    const localId = `local-${Date.now()}`;
    setMessages((current) => [...current, { id: localId, role: 'user', content }]);
    setTimeout(() => scroll.current?.scrollToEnd({ animated: true }), 50);
    try {
      const { data } = await api.post('/chat/send', { conversation_id: conversationId, message: content });
      setConversationId(data.conversation_id);
      setMessages((current) => [...current, { id: data.message_id, conversation_id: data.conversation_id, role: 'assistant', content: data.reply, suggested_questions: data.suggested_questions ?? [] }]);
      await loadConversations();
      setTimeout(() => scroll.current?.scrollToEnd({ animated: true }), 80);
    } catch (e) {
      setMessages((current) => current.filter((message) => message.id !== localId));
      setInput(content);
      setError(errorMessage(e));
    } finally { setSending(false); }
  };

  const newConversation = () => { setConversationId(null); setMessages([]); setInput(''); setError(''); setHistoryOpen(false); };

  const deleteConversation = (conversation: ChatConversation) => Alert.alert('Delete conversation?', `“${conversation.title}” will be removed.`, [
    { text: 'Cancel', style: 'cancel' },
    { text: 'Delete', style: 'destructive', onPress: async () => {
      try { await api.delete(`/chat/conversations/${conversation.id}`); if (conversationId === conversation.id) newConversation(); await loadConversations(); }
      catch (e) { setError(errorMessage(e)); }
    } },
  ]);

  const activeTitle = conversations.find((item) => item.id === conversationId)?.title ?? 'Ask about your business finances';

  return <KeyboardAvoidingView className="flex-1" behavior={Platform.OS === 'ios' ? 'padding' : undefined} keyboardVerticalOffset={4}>
    <View className="flex-row items-center px-4 pb-2 pt-1">
      <Pressable onPress={() => setHistoryOpen(true)} className="flex-1 flex-row items-center rounded-2xl border border-line bg-panel px-3 py-2.5 active:bg-raised">
        <Ionicons name="sparkles" size={16} color={colors.lilac} /><Text numberOfLines={1} className="ml-2 flex-1 text-[12px] font-medium text-white">{activeTitle}</Text><Ionicons name="chevron-down" size={16} color={colors.muted} />
      </Pressable>
      <Pressable accessibilityLabel="New conversation" onPress={newConversation} className="ml-2 h-11 w-11 items-center justify-center rounded-2xl bg-lilac"><Ionicons name="add" size={22} color={colors.ink} /></Pressable>
    </View>

    {loading ? <View className="flex-1 items-center justify-center"><ActivityIndicator color={colors.lilac} /><Text className="mt-3 text-xs text-muted">Loading your conversations…</Text></View> : messages.length ? <ScrollView ref={scroll} className="flex-1" contentContainerClassName="px-4 pb-5 pt-3" keyboardShouldPersistTaps="handled" onContentSizeChange={() => scroll.current?.scrollToEnd({ animated: true })}>
      {messages.map((message) => <MessageBubble key={message.id} message={message} onSuggestion={(question) => void send(question)} />)}
      {sending ? <View className="mb-3 flex-row items-center self-start rounded-[20px] border border-line bg-panel px-4 py-3"><ActivityIndicator color={colors.lilac} size="small" /><Text className="ml-2 text-xs text-muted">Thinking…</Text></View> : null}
      {error ? <Text className="mb-3 text-[12px] text-rose">{error}</Text> : null}
    </ScrollView> : <ScrollView className="flex-1" contentContainerClassName="justify-center px-5 pb-6 pt-6" keyboardShouldPersistTaps="handled">
      {error ? <EmptyState icon="⌁" title="AI chat is unavailable" body={error} /> : <><View className="mb-5 h-14 w-14 items-center justify-center rounded-[20px] bg-lilac/10"><Ionicons name="sparkles" size={27} color={colors.lilac} /></View><Eyebrow>Your finance copilot</Eyebrow><Heading className="mt-2">What would you like to understand?</Heading><Copy className="mt-2">Ask in plain language. Answers are grounded in your confirmed finance records.</Copy><View className="mt-5 gap-2">{['What invoices are overdue?', 'How is my cash flow looking?', 'Summarize my recent expenses'].map((question) => <Pressable key={question} onPress={() => void send(question)} className="flex-row items-center rounded-2xl border border-line bg-panel p-4"><Text className="flex-1 text-[12px] font-medium text-white">{question}</Text><Ionicons name="arrow-forward" size={16} color={colors.lilac} /></Pressable>)}</View></>}
    </ScrollView>}

    <View className="flex-row items-end border-t border-line/60 px-3 pb-2 pt-2">
      <TextInput ref={field} value={input} onChangeText={setInput} editable={!sending} onSubmitEditing={() => void send()} returnKeyType="send" blurOnSubmit={false} multiline maxLength={4000} placeholder="Ask about invoices, cash flow…" placeholderTextColor={colors.muted} selectionColor={colors.lilac} className="max-h-32 min-h-12 flex-1 rounded-2xl border border-line bg-panel px-4 py-3 text-[14px] leading-5 text-white" />
      <Pressable accessibilityLabel="Send message" onPress={() => void send()} disabled={sending || !input.trim()} className={`ml-2 h-12 w-12 items-center justify-center rounded-2xl ${sending || !input.trim() ? 'bg-raised' : 'bg-lilac'}`}><Ionicons name="arrow-up" size={21} color={sending || !input.trim() ? colors.muted : colors.ink} /></Pressable>
    </View>

    <Modal visible={historyOpen} animationType="slide" transparent onRequestClose={() => setHistoryOpen(false)}>
      <View className="flex-1 justify-end bg-black/60"><View className="h-[70%] rounded-t-[28px] border border-line bg-panel px-4 pt-3">
        <View className="mb-3 flex-row items-center justify-between"><Text className="text-[18px] font-semibold text-white">Your conversations</Text><Pressable onPress={() => setHistoryOpen(false)} className="p-2"><Ionicons name="close" size={22} color={colors.muted} /></Pressable></View>
        <Pressable onPress={newConversation} className="mb-3 flex-row items-center rounded-2xl bg-raised p-3"><Ionicons name="add-circle-outline" size={19} color={colors.lilac} /><Text className="ml-2 text-[13px] font-semibold text-lilac-bright">Start a new conversation</Text></Pressable>
        <ScrollView>{conversations.length ? conversations.map((conversation) => <View key={conversation.id} className="mb-2 flex-row items-center rounded-2xl border border-line px-3 py-1"><Pressable onPress={() => void selectConversation(conversation.id)} className="flex-1 flex-row items-center py-3"><Ionicons name="chatbubble-ellipses-outline" size={18} color={colors.lilac} /><View className="ml-3 flex-1"><Text numberOfLines={1} className="text-[13px] font-medium text-white">{conversation.title}</Text><Text className="mt-1 text-[10px] text-muted">{new Date(conversation.updated_at).toLocaleString()}</Text></View></Pressable><Pressable accessibilityLabel="Delete conversation" onPress={() => deleteConversation(conversation)} className="p-2"><Ionicons name="trash-outline" size={17} color={colors.muted} /></Pressable></View>) : <EmptyState icon="◌" title="No saved conversations" body="Your finance questions and answers will appear here." />}</ScrollView>
      </View></View>
    </Modal>
  </KeyboardAvoidingView>;
}

function MessageBubble({ message, onSuggestion }: { message: ChatMessage; onSuggestion: (question: string) => void }) {
  const mine = message.role === 'user';
  return <View className={`mb-3 max-w-[88%] ${mine ? 'self-end' : 'self-start'}`}>
    <View className={`rounded-[20px] px-4 py-3 ${mine ? 'bg-[#584477]' : 'border border-line bg-panel'}`}><Text className="text-[13px] leading-[20px] text-white">{message.content}</Text></View>
    {!mine && message.suggested_questions?.length ? <View className="mt-2 gap-1.5">{message.suggested_questions.slice(0, 3).map((question) => <Pressable key={question} onPress={() => onSuggestion(question)} className="rounded-xl border border-line bg-panel px-3 py-2"><Text className="text-[11px] text-lilac-bright">{question}</Text></Pressable>)}</View> : null}
  </View>;
}
