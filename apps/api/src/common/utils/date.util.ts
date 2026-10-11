/**
 * Pure, framework-agnostic date helpers (Architecture Foundation §2.3 —
 * `packages/utils` conventions, colocated here until FOUND-02 stands that
 * package up). No business-specific date logic (e.g. confirmation-window
 * defaults) belongs here — that lives in the owning module.
 */

export function addSeconds(date: Date, seconds: number): Date {
  return new Date(date.getTime() + seconds * 1000);
}

export function addMinutes(date: Date, minutes: number): Date {
  return addSeconds(date, minutes * 60);
}

export function addHours(date: Date, hours: number): Date {
  return addMinutes(date, hours * 60);
}

export function addDays(date: Date, days: number): Date {
  return addHours(date, days * 24);
}

export function isPast(date: Date, now: Date = new Date()): boolean {
  return date.getTime() < now.getTime();
}

export function toIsoString(date: Date): string {
  return date.toISOString();
}
