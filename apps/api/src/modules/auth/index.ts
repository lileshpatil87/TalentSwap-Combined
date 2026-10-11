/**
 * Public surface of the `auth` module (Backend Constitution §11 —
 * "re-exports only what other modules are permitted to call. Anything
 * not re-exported is private"). Deep-importing a file not re-exported
 * here (e.g. `modules/auth/auth.repository`) is forbidden and CI-checked
 * (Architecture Foundation §6.5).
 *
 * Only `AuthModule` is exported today: no other module needs to inject
 * `AuthService` or anything else from this module yet (`users`'
 * role-assignment concern, once that module exists, is a `users`-owned
 * write to a table `auth` also happens to own — see Architecture
 * Foundation §3.1 — not a call into `auth`'s service). Widen this barrel
 * when a real caller needs something specific; do not pre-export
 * speculatively.
 */
export { AuthModule } from './auth.module';
