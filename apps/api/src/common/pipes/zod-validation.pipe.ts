import { type ArgumentMetadata, Injectable, Optional, type PipeTransform } from '@nestjs/common';
import type { ZodTypeAny } from 'zod';

import { ValidationException } from '../exceptions/domain.exception';
import type { ZodDto } from '../utils/zod-dto.util';

/**
 * The single point every input crosses the trust boundary (Architecture
 * Foundation §10.3, Backend Constitution §24): "Every input crosses the
 * trust boundary exactly once, at the controller ... Services trust their
 * inputs completely."
 *
 * Two usage modes:
 *
 * 1. **Global** (registered as `APP_PIPE` in `app.module.ts`): reads the
 *    static `.schema` a `createZodDto()`-produced DTO class carries. DTOs
 *    that are not Zod-backed (e.g. plain framework types) pass through
 *    unchanged — this is what makes it safe to register globally today,
 *    before any domain module's DTOs exist yet.
 * 2. **Per-route** (`@UsePipes(new ZodValidationPipe(mySchema))`): used
 *    when a route needs to validate something that isn't a class-based
 *    DTO (e.g. WebSocket gateway payloads, per Technology Specification
 *    §5.5 — the same schema backs both).
 *
 * On failure, throws `ValidationException` (`code: VALIDATION_ERROR`),
 * mapped by `GlobalExceptionFilter` to the standard `400` error envelope
 * with the Zod field errors in `details` — never a raw stack trace.
 */
@Injectable()
export class ZodValidationPipe implements PipeTransform {
  constructor(@Optional() private readonly explicitSchema?: ZodTypeAny) {}

  transform(value: unknown, metadata: ArgumentMetadata): unknown {
    const schema = this.explicitSchema ?? this.extractSchema(metadata.metatype);

    if (!schema) {
      // Not a Zod-backed DTO (or no explicit schema supplied) — pass
      // through. Services still trust their inputs completely per the
      // boundary rule above; this pipe simply has nothing to validate.
      return value;
    }

    const result = schema.safeParse(value);

    if (!result.success) {
      const flattened = result.error.flatten();

      throw new ValidationException('Request validation failed.', {
        fieldErrors: flattened.fieldErrors,
        formErrors: flattened.formErrors,
      });
    }

    return result.data;
  }

  private extractSchema(metatype: unknown): ZodTypeAny | undefined {
    if (
      typeof metatype === 'function' &&
      'schema' in metatype &&
      typeof (metatype as ZodDto<unknown>).schema?.safeParse === 'function'
    ) {
      return (metatype as ZodDto<unknown>).schema;
    }

    return undefined;
  }
}
