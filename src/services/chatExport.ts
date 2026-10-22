import { File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { Platform } from 'react-native';
import type { ChatConversation, ChatMessage } from '../types/api';

type ChatExport = {
  format: 'zengen-ai-chat-export';
  version: 1;
  exported_at: string;
  scope: 'current' | 'all';
  conversations: { conversation: ChatConversation; messages: ChatMessage[] }[];
};

/** Temporary testing export. Keep file creation separate from the chat UI. */
export async function saveChatExport(payload: ChatExport): Promise<void> {
  const filename = `zengen-ai-chats-${payload.scope}-${payload.exported_at.replace(/[:.]/g, '-')}.json`;
  const json = `${JSON.stringify(payload, null, 2)}\n`;

  if (Platform.OS === 'web') {
    const url = URL.createObjectURL(new Blob([json], { type: 'application/json' }));
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 60_000);
    return;
  }

  if (!(await Sharing.isAvailableAsync())) {
    throw new Error('File sharing is unavailable on this device.');
  }
  const file = new File(Paths.cache, filename);
  file.create({ overwrite: true });
  file.write(json);
  await Sharing.shareAsync(file.uri, {
    mimeType: 'application/json',
    UTI: 'public.json',
    dialogTitle: 'Export Zengen AI chats',
  });
}
