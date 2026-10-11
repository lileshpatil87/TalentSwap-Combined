/**
 * Prisma seed entrypoint.
 *
 * Wired via `package.json`'s `"prisma": { "seed": "ts-node prisma/seed.ts" }`
 * field, so `npx prisma db seed` (and `prisma migrate reset`, which calls
 * seed automatically) picks it up with no extra configuration.
 * `scripts/seed-db.ts` (FOUND-08, delivered by DEV-02) wraps this for
 * convenience per Architecture Foundation §2.6 — run `pnpm seed:db`.
 *
 * Contract every module's seed section MUST follow (merged from the
 * backend-foundation and DB-01 deliveries during the 2026-08 integration
 * merge):
 *  - Idempotent — running this script twice produces the same end state,
 *    via `upsert()` keyed on a natural/well-known identifier, never a
 *    blind `create()`.
 *  - Local/CI environments may include representative fake data.
 *  - Staging/production seed sections are limited to structural/reference
 *    data (e.g. skill_categories, badges) plus the minimum admin
 *    bootstrap account — never fake user, transaction, or ledger data.
 *  - Each module appends its own section below under a
 *    `// === <module> module ===` comment header, mirroring the same
 *    append-only discipline `schema.prisma` itself uses — never reorder
 *    or edit another module's section.
 */
import { PrismaClient } from '@prisma/client';
import { hash } from 'bcrypt';

const prisma = new PrismaClient();

async function main(): Promise<void> {
  // === auth module ===
  //
  // Seeds exactly one ADMIN-role bootstrap account, IF AND ONLY IF both
  // `SEED_ADMIN_EMAIL` and `SEED_ADMIN_PASSWORD` are set in the
  // environment — there is no hardcoded default admin password anywhere
  // in this codebase (Backend Constitution §48 "never committed... under
  // any name"). This is deliberately the only seed data `auth` ever
  // produces: no fake regular users, per the staging/production
  // constraint above applying equally to local/CI unless a future
  // module's own seed section (e.g. a `users` module fixture set)
  // decides otherwise for ITS OWN fake-data needs.
  const seedAdminEmail = process.env.SEED_ADMIN_EMAIL;
  const seedAdminPassword = process.env.SEED_ADMIN_PASSWORD;

  if (seedAdminEmail && seedAdminPassword) {
    const saltRounds = parseInt(process.env.BCRYPT_SALT_ROUNDS ?? '12', 10);
    const passwordHash = await hash(seedAdminPassword, saltRounds);

    await prisma.user.upsert({
      where: { email: seedAdminEmail },
      update: {}, // Never overwrite an existing admin's password on re-seed.
      create: {
        email: seedAdminEmail,
        passwordHash,
        role: 'ADMIN',
        isEmailVerified: true,
      },
    });

    // eslint-disable-next-line no-console -- seed scripts run outside the Nest/Winston logging context
    console.log(`[seed] auth: ensured admin bootstrap account (${seedAdminEmail}).`);
  } else {
    // eslint-disable-next-line no-console
    console.log(
      '[seed] auth: SEED_ADMIN_EMAIL/SEED_ADMIN_PASSWORD not set — skipping admin bootstrap.',
    );
  }

  //
  // Example of the convention a future module follows:
  //
  // === skills module ===
  // await prisma.skillCategory.upsert({
  //   where: { slug: 'programming' },
  //   update: {},
  //   create: { name: 'Programming', slug: 'programming' },
  // });
  //
  // === gamification module (badges catalogue) ===
  // await prisma.badge.upsert({
  //   where: { code: 'FIRST_EXCHANGE' },
  //   update: {},
  //   create: { code: 'FIRST_EXCHANGE', name: 'First Exchange', ... },
  // });
}

main()
  .catch((error: unknown) => {
    // eslint-disable-next-line no-console
    console.error('[seed] Failed:', error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
