import {
  type CallHandler,
  type ExecutionContext,
  Inject,
  Injectable,
  type NestInterceptor,
} from '@nestjs/common';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';
import type { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import type { Logger } from 'winston';

import type { AuthenticatedRequest } from '../interfaces/authenticated-request.interface';

/**
 * Emits one structured log line per request — method, path, status,
 * duration, userId, requestId (Backend Constitution §28, Architecture
 * Foundation §6.7). Registered globally as `APP_INTERCEPTOR`.
 *
 * Business events ("transaction completed", "user registered") are logged
 * by the owning module's service at `info` level — this interceptor only
 * covers the generic per-request access log line.
 */
@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  constructor(@Inject(WINSTON_MODULE_PROVIDER) private readonly logger: Logger) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const response = context.switchToHttp().getResponse<{ statusCode: number }>();
    const start = Date.now();

    return next.handle().pipe(
      tap({
        next: () => this.log(request, response.statusCode, start),
        error: () => this.log(request, response.statusCode || 500, start),
      }),
    );
  }

  private log(request: AuthenticatedRequest, statusCode: number, start: number): void {
    this.logger.info('request', {
      requestId: request.requestId,
      method: request.method,
      path: request.originalUrl,
      statusCode,
      durationMs: Date.now() - start,
      userId: request.user?.id ?? null,
    });
  }
}
