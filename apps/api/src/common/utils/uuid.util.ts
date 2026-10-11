import { randomUUID } from 'node:crypto';

/**
 * Small, framework-agnostic UUID helpers. Added per the 2026-08
 * integration review's cherry-pick recommendation — every module that
 * validates a route param against `users.id`/`skills.id`/etc. (all UUID
 * primary keys, per Technology Specification §4.1) needs the same check;
 * this is the one shared place for it rather than each module writing
 * its own regex.
 */

const UUID_V4_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function generateUuid(): string {
  return randomUUID();
}

export function isValidUuid(value: string): boolean {
  return UUID_V4_REGEX.test(value);
}
