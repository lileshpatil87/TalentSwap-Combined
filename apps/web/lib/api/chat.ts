import type { ChatMessage, Conversation } from '@talentswap/types';
import { apiRequest } from '@/lib/api';

export const chatApi = {
  conversations: () => apiRequest<Conversation[]>('/conversations'),
  createConversation: (participantIds: string[]) => apiRequest<{ id: string }>('/conversations', { method: 'POST', body: { participantIds } }),
  messages: (id: string) => apiRequest<ChatMessage[]>(`/conversations/${encodeURIComponent(id)}/messages`),
  send: (id: string, content: string) => apiRequest<ChatMessage>(`/conversations/${encodeURIComponent(id)}/messages`, { method: 'POST', body: { content } }),
};
