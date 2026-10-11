import type { z, ZodTypeAny } from 'zod';

/**
 * Minimal `createZodDto` factory, matching the pattern Backend
 * Constitution §16 mandates: "A DTO class is a thin wrapper over a Zod
 * schema imported from `packages/validation` — it never redefines
 * validation rules locally."
 *
 * A domain module defines its schema once in `packages/validation` (or,
 * until FOUND-02 stands that package up, colocated in its own `dto/`
 * folder) and wraps it:
 *
 *   const createSkillSchema = z.object({ title: z.string().min(1), ... });
 *   export class CreateSkillDto extends createZodDto(createSkillSchema) {}
 *
 * `ZodValidationPipe` (common/pipes) reads the static `.schema` property
 * this factory attaches and parses the incoming payload against it —
 * this is what lets the pipe be registered globally without needing an
 * explicit schema argument at every call site.
 */
export interface ZodDto<T> {
  schema: ZodTypeAny;
  new (): T;
}

export function createZodDto<T extends ZodTypeAny>(schema: T): ZodDto<z.infer<T>> {
  class ZodDtoClass {
    public static schema = schema;
  }

  return ZodDtoClass;
}
