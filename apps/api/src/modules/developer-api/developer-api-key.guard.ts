import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { DeveloperApiService } from './developer-api.service';

@Injectable()
export class DeveloperApiKeyGuard implements CanActivate {
  constructor(private readonly service: DeveloperApiService) {}
  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<{ headers: Record<string, string | string[] | undefined>; developerApiKey?: unknown }>();
    const header = request.headers['x-api-key'];
    request.developerApiKey = await this.service.authenticate(typeof header === 'string' ? header : undefined);
    return true;
  }
}
