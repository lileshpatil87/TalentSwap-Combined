import { Injectable, type NestMiddleware } from '@nestjs/common';
import type { NextFunction, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';

import { REQUEST_ID_HEADER } from '../constants/app.constants';
import type { AuthenticatedRequest } from '../interfaces/authenticated-request.interface';

/**
 * Generates a UUID `requestId` for every incoming request and threads it
 * through to the error envelope and access log (Backend Constitution §28,
 * Architecture Foundation §6.7) — "a user-reported error can be grepped
 * straight to its log line." Applied to every route in `AppModule.configure()`.
 *
 * If the caller already supplied an `X-Request-Id` header (e.g. an
 * upstream proxy or a retried client request), it is honored rather than
 * overwritten, so a single logical request keeps one ID end-to-end.
 */
@Injectable()
export class RequestIdMiddleware implements NestMiddleware {
  use(req: AuthenticatedRequest, res: Response, next: NextFunction): void {
    const incoming = req.headers[REQUEST_ID_HEADER.toLowerCase()];
    const requestId = (Array.isArray(incoming) ? incoming[0] : incoming) || uuidv4();

    req.requestId = requestId;
    res.setHeader(REQUEST_ID_HEADER, requestId);

    next();
  }
}
