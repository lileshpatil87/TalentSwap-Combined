import type { SettingsInput } from '@talentswap/validation';
import { apiRequest } from '@/lib/api';

export const settingsApi = {
  get: () => apiRequest<SettingsInput>('/settings'),
  update: (body: SettingsInput) => apiRequest<SettingsInput>('/settings', { method: 'PATCH', body }),
};
