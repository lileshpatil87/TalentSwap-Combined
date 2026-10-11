import {
  type CallHandler,
  type ExecutionContext,
  Injectable,
  type NestInterceptor,
} from '@nestjs/common';
import type { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

import type { AuthenticatedRequest } from '../interfaces/authenticated-request.interface';

interface SuccessEnvelope<T> {
  success: true;
  data: T;
  meta: {
    requestId: string;
    timestamp: string;
  };
}

/**
 * Applies the standard success envelope (Architecture Foundation §9.1) to
 * every REST response automatically. Individual controllers never
 * hand-construct `{ success, data, meta }` (Backend Constitution §25).
 *
 * Registered globally as `APP_INTERCEPTOR` in `app.module.ts`.
 */
@Injectable()
export class ResponseTransformInterceptor<T> implements NestInterceptor<T, SuccessEnvelope<T>> {
  intercept(context: ExecutionContext, next: CallHandler<T>): Observable<SuccessEnvelope<T>> {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();

    return next.handle().pipe(
      map((data) => ({
        success: true as const,
        data,
        meta: {
          requestId: request.requestId ?? 'unknown',
          timestamp: new Date().toISOString(),
        },
      })),
    );
  }
}
