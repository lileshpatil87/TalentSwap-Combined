import {
  type ArgumentsHost,
  Catch,
  type ExceptionFilter,
  HttpException,
  HttpStatus,
  Inject,
  Injectable,
} from '@nestjs/common';
import type { Response } from 'express';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';
import type { Logger } from 'winston';

import { DomainException } from '../exceptions/domain.exception';
import type { AuthenticatedRequest } from '../interfaces/authenticated-request.interface';

interface ErrorEnvelope {
  success: false;
  error: {
    code: string;
    message: string;
    details?: Record<string, unknown>;
  };
  meta: {
    requestId: string;
    timestamp: string;
  };
}

/**
 * The single catch point for every exception raised anywhere in the
 * request pipeline (Backend Constitution §26/§27, Architecture Foundation
 * §9.2, §6.6). No controller ever writes its own try/catch-and-format
 * logic — this filter is the only place the error envelope is assembled.
 *
 * - `DomainException` subtypes → their own `code`/`status`/`details`.
 * - Nest's built-in `HttpException` (guards, pipes, framework) → mapped to
 *   a generic code derived from the status.
 * - Anything else (a dropped DB connection, an unhandled third-party SDK
 *   error) → logged with full server-side context and returned to the
 *   client as a generic `500` with no stack trace, no internal detail
 *   (Architecture Foundation §9.8, Backend Constitution §26).
 */
@Injectable()
@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  constructor(@Inject(WINSTON_MODULE_PROVIDER) private readonly logger: Logger) {}

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<AuthenticatedRequest>();
    const requestId = request.requestId ?? 'unknown';

    const { status, body } = this.resolve(exception, requestId);

    // Ledger/escrow/auth paths and any unexpected error fail loud — always
    // logged server-side with full context, never swallowed (Backend
    // Constitution §26).
    //
    // `status` is typed `number` (NestJS's own `HttpException.getStatus()`
    // returns `number`, not `HttpStatus`, despite `HttpStatus` being a
    // numeric enum), so `@typescript-eslint/no-unsafe-enum-comparison`
    // flags this comparison — and a type assertion doesn't satisfy it
    // either, since `number`/`HttpStatus` are structurally identical here.
    // Disabled with justification per Architecture Foundation §7.4: this
    // is a correct, intentional comparison against a well-known constant,
    // not an actual unsafe/accidental cross-type comparison.
    // eslint-disable-next-line @typescript-eslint/no-unsafe-enum-comparison
    if (status >= HttpStatus.INTERNAL_SERVER_ERROR) {
      this.logger.error('Unhandled exception', {
        requestId,
        path: request.originalUrl,
        method: request.method,
        error: exception instanceof Error ? exception.stack : exception,
      });
    } else {
      this.logger.warn('Handled exception', {
        requestId,
        path: request.originalUrl,
        method: request.method,
        code: body.error.code,
      });
    }

    response.status(status).json(body);
  }

  private resolve(exception: unknown, requestId: string): { status: number; body: ErrorEnvelope } {
    const timestamp = new Date().toISOString();

    if (exception instanceof DomainException) {
      return {
        status: exception.getStatus(),
        body: {
          success: false,
          error: {
            code: exception.code,
            message: exception.message,
            ...(exception.details ? { details: exception.details } : {}),
          },
          meta: { requestId, timestamp },
        },
      };
    }

    if (exception instanceof HttpException) {
      const status = exception.getStatus();
      const response = exception.getResponse();
      const message =
        typeof response === 'string'
          ? response
          : ((response as { message?: string | string[] }).message ?? exception.message);

      return {
        status,
        body: {
          success: false,
          error: {
            code: httpStatusToCode(status),
            message: Array.isArray(message) ? message.join(', ') : message,
          },
          meta: { requestId, timestamp },
        },
      };
    }

    // Unknown/unexpected error — never leak internals to the client.
    return {
      status: HttpStatus.INTERNAL_SERVER_ERROR,
      body: {
        success: false,
        error: {
          code: 'INTERNAL_SERVER_ERROR',
          message: 'An unexpected error occurred. Our team has been notified.',
        },
        meta: { requestId, timestamp },
      },
    };
  }
}

function httpStatusToCode(status: number): string {
  // Same `number` vs `HttpStatus` friction as global-exception.filter.ts's
  // aggregate check above — `status` is `number` (NestJS's
  // `HttpException.getStatus()` return type), so every `case` against a
  // numeric `HttpStatus` member trips `no-unsafe-enum-comparison`. Disabled
  // for the whole switch rather than per-case, per Architecture Foundation
  // §7.4 (justification required, which this comment provides).
  /* eslint-disable @typescript-eslint/no-unsafe-enum-comparison */
  switch (status) {
    case HttpStatus.BAD_REQUEST:
      return 'VALIDATION_ERROR';
    case HttpStatus.UNAUTHORIZED:
      return 'UNAUTHORIZED';
    case HttpStatus.FORBIDDEN:
      return 'FORBIDDEN_ACTION';
    case HttpStatus.NOT_FOUND:
      return 'RESOURCE_NOT_FOUND';
    case HttpStatus.CONFLICT:
      return 'RESOURCE_CONFLICT';
    case HttpStatus.UNPROCESSABLE_ENTITY:
      return 'UNPROCESSABLE_ENTITY';
    case HttpStatus.TOO_MANY_REQUESTS:
      return 'RATE_LIMIT_EXCEEDED';
    default:
      return 'HTTP_ERROR';
  }
  /* eslint-enable @typescript-eslint/no-unsafe-enum-comparison */
}
