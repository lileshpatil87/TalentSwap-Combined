import { BadRequestException, Injectable, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class AnalyticsService {
  constructor(private readonly config: ConfigService) {}
  private get configValues() { return { key: this.config.get<string>('analytics.posthogProjectKey') ?? '', host: this.config.get<string>('analytics.posthogHost') ?? 'https://us.i.posthog.com' }; }
  async flag(flagKey: string, distinctId: string) {
    if (!/^[a-zA-Z0-9_.:-]{1,128}$/.test(flagKey) || !/^[a-zA-Z0-9_.:@-]{1,200}$/.test(distinctId)) throw new BadRequestException('Invalid feature flag key or distinct ID.');
    const { key, host } = this.configValues; if (!key) return { key: flagKey, enabled: false };
    let response: Response;
    try { response = await fetch(`${host}/decide/?v=3`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ token: key, distinct_id: distinctId }), signal: AbortSignal.timeout(2500) }); }
    catch { throw new ServiceUnavailableException('Feature flag provider is unavailable.'); }
    if (!response.ok) throw new ServiceUnavailableException('Feature flag provider rejected the request.');
    const body = await response.json() as { featureFlags?: Record<string, string | boolean> };
    const variant = body.featureFlags?.[flagKey];
    return { key: flagKey, enabled: variant === true || (typeof variant === 'string' && variant.length > 0), ...(variant === undefined ? {} : { variant }) };
  }
  async capture(distinctId: string, event: string, properties: Record<string, unknown>) {
    if (!/^[a-zA-Z0-9_.:@-]{1,200}$/.test(distinctId) || !/^[a-zA-Z0-9_.:-]{1,128}$/.test(event)) throw new BadRequestException('Invalid analytics event.');
    const { key, host } = this.configValues; if (!key) return { captured: false, reason: 'POSTHOG_NOT_CONFIGURED' };
    const safeProperties = Object.fromEntries(Object.entries(properties).filter(([name, value]) => /^[a-zA-Z0-9_.:-]{1,64}$/.test(name) && !/(password|token|secret|email|phone|authorization|cookie)/i.test(name) && (typeof value === 'string' ? value.length <= 256 : typeof value === 'number' || typeof value === 'boolean')).slice(0, 40));
    const response = await fetch(`${host}/capture/`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ api_key: key, distinct_id: distinctId, event, properties: safeProperties }), signal: AbortSignal.timeout(2500) }).catch(() => null);
    if (!response?.ok) throw new ServiceUnavailableException('Analytics event could not be delivered.');
    return { captured: true };
  }
}
