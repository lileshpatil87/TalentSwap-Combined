import { SetMetadata } from '@nestjs/common';

import { METADATA_KEYS } from '../constants/app.constants';

export const IS_PUBLIC_KEY = METADATA_KEYS.IS_PUBLIC;

/**
 * Opts a route out of authentication. Per Architecture Foundation §13
 * rule 3: "Every NestJS route requires authentication unless explicitly
 * decorated `@Public()`." An undecorated route is a bug, not an implicit
 * default — this decorator exists so that default can be enforced once
 * `JwtAuthGuard` is registered globally by the `auth` module (see the
 * comment in `jwt-auth.guard.ts` and `app.module.ts`).
 */
export const Public = (): MethodDecorator & ClassDecorator => SetMetadata(IS_PUBLIC_KEY, true);
