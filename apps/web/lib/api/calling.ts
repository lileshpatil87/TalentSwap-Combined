import { apiRequest } from '@/lib/api';
export interface CallingSession { id: string; initiatorId: string; participantIds: string[]; transactionId: string | null; channelName: string; status: 'RINGING' | 'ACTIVE' | 'ENDED' | 'FAILED'; }
export const callingApi = {
  start: (transactionId: string) => apiRequest<CallingSession>('/calls', { method: 'POST', body: { transactionId } }),
  markStarted: (callId: string) => apiRequest<CallingSession>(`/calls/${encodeURIComponent(callId)}/start`, { method: 'PATCH' }),
  end: (callId: string) => apiRequest<CallingSession>(`/calls/${encodeURIComponent(callId)}/end`, { method: 'PATCH' }),
};
