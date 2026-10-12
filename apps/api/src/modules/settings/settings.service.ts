import { Injectable } from '@nestjs/common';
import { SettingsRepository, type UserSettingsInput } from './settings.repository';

@Injectable()
export class SettingsService {
  constructor(private readonly repository: SettingsRepository) {}
  get(userId: string) { return this.repository.get(userId); }
  getProfileVisibility(userId: string) { return this.repository.getProfileVisibility(userId); }
  update(userId: string, input: UserSettingsInput) { return this.repository.update(userId, input); }
}
