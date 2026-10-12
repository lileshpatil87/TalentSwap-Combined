import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const failMessages = [];
const read = (relative) => {
  const full = path.join(root, relative);
  if (!fs.existsSync(full)) {
    failMessages.push(`Missing required Phase 1 file: ${relative}`);
    return '';
  }
  return fs.readFileSync(full, 'utf8');
};
const check = (condition, message) => { if (!condition) failMessages.push(message); };

const env = read('apps/web/lib/env.ts');
const mode = read('apps/web/lib/api/mode.ts');
const profileApi = read('apps/web/lib/api/profile.ts');
const authStore = read('apps/web/store/authStore.ts');
const providers = read('apps/web/app/providers.tsx');
const dashboard = read('apps/web/app/(dashboard)/dashboard/page.tsx');
const profilePage = read('apps/web/components/features/profile/ProfilePage.tsx');
const walletController = read('apps/api/src/modules/wallet/wallet.controller.ts');
const walletService = read('apps/api/src/modules/wallet/wallet.service.ts');
const walletRepo = read('apps/api/src/modules/wallet/wallet.repository.ts');
const txService = read('apps/api/src/modules/transactions/transactions.service.ts');
const txController = read('apps/api/src/modules/transactions/transactions.controller.ts');
const adminController = read('apps/api/src/modules/admin/admin.controller.ts');
const callGateway = read('apps/api/src/modules/calling/calling.gateway.ts');
const usersController = read('apps/api/src/modules/users/users.controller.ts');
const usersService = read('apps/api/src/modules/users/users.service.ts');
const profileService = read('apps/api/src/modules/profiles/profiles.service.ts');
const profileMigration = read('apps/api/prisma/migrations/20261011000100_phase1_profile_fields/migration.sql');
const specs = read('apps/api/src/modules/profiles/profiles.service.spec.ts');
const authSpec = read('apps/api/src/modules/auth/auth.service.spec.ts');
const authStoreSpec = read('apps/web/store/authStore.test.ts');
const profileApiSpec = read('apps/web/lib/api/profile.test.ts');
const escrowIntegration = read('apps/api/test/integration/transactions.concurrency.int.spec.ts');

check(/NEXT_PUBLIC_DEMO_FALLBACK: z\.enum\(\["true", "false"\]\)\.default\("false"\)/.test(env), 'Demo fallback must default to false.');
check(/NEXT_PUBLIC_APP_ENV !== "production"/.test(mode), 'Demo fallback must be disabled in production.');
check(profileApi.includes('"/profiles/me"') && !profileApi.includes('`/users/${id}`'), 'Profile API must use the authenticated /profiles/me endpoint.');
check(authStore.includes('authApi.refresh()') && authStore.includes('user: null, accessToken: null'), 'Session hydration must refresh from the server and must not restore a demo identity.');
check(providers.includes('queryClient.clear()') && providers.includes('talentswap:auth-changed'), 'Private query cache must be cleared when authenticated identity changes.');
check(!dashboard.includes('demoUser') && !profilePage.includes('demoUser'), 'Authenticated dashboard/profile pages must not import the demo user.');
check(!walletController.includes('purchase-points') && !walletController.includes('purchasePoints'), 'Wallet controller must not expose point purchases.');
check(!fs.existsSync(path.join(root, 'apps/api/src/modules/wallet/dto/purchase-points.dto.ts')), 'Purchase-points DTO must be removed.');
check(walletRepo.includes("orderBy: { sequence: 'desc' }"), 'Wallet balance/history must use deterministic ledger sequence ordering.');
check(walletService.includes("'Serializable'") && walletService.includes('withAdvisoryLocks'), 'Financial mutations must use serializable transactions and participant locks.');
check(txService.includes('input.pointsHeld !== skill.pointRate'), 'Transaction point amount must be checked against the server-side skill rate.');
check(txService.includes("status: 'DISPUTED'") && txService.includes('async resolveDispute'), 'Disputes must be frozen and resolved through the explicit resolution path.');
const disputeBody = txService.slice(txService.indexOf('async dispute('), txService.indexOf('async escalateExpired('));
check(!disputeBody.includes('ledger.release('), 'Raising a dispute must not automatically release/refund escrow.');
check(txController.includes('service.get(id,userId)') || txController.includes('service.get(id, userId)'), 'Transaction detail endpoint must enforce participant ownership.');
check(/@Roles\(Role\.ADMIN\)[\s\S]*?resolve-dispute/.test(adminController), 'Dispute resolution must be restricted to administrators.');
check(callGateway.includes('assertParticipant(parsed.data.callId, user.sub)') && callGateway.includes('CALL_ROOM_NOT_JOINED'), 'Realtime call join/signal events must verify participant access and room membership.');
check(!usersController.includes("@Patch(':id')"), 'Generic user-record update route must not expose mass-assignment of security-sensitive fields.');
check(usersService.includes('if (actorRole !== Role.ADMIN) throw new UserOwnershipException()'), 'User service must block self-service email/role/verification/ban mutations.');
check(usersService.includes('throw new BannedUserException()'), 'Banned users must receive a specific authorization failure in active-user checks.');
check(usersService.includes('Administrators cannot deactivate their own account.'), 'Administrators must not be able to lock themselves out by self-deactivation.');
check(profileService.includes('sanitizeHtml') && profileService.includes('actorId !== userId'), 'Profile updates must enforce ownership and sanitize bio HTML.');
check(profileMigration.includes('ADD COLUMN IF NOT EXISTS') && profileMigration.includes('BIGSERIAL'), 'Phase 1 profile and ledger migration must be present and rerunnable for its added columns.');
check(specs.includes('not a demo identity') && specs.includes('ProfileOwnershipException'), 'Profile regression tests must cover real identity and ownership.');
check(authSpec.includes('{ provide: ProfilesService, useValue: profiles }') && authSpec.includes('profiles.getOrCreate'), 'Auth unit tests must provide and assert profile creation during registration.');
check(authStoreSpec.includes('replaces account identity when another user signs in') && authStoreSpec.includes('does not restore any identity when refresh fails'), 'Auth store tests must cover account switching and invalid-session hydration.');
check(profileApiSpec.includes('"/profiles/me"') && profileApiSpec.includes('authenticated user'), 'Profile API tests must cover authenticated identity routing.');
check(escrowIntegration.includes('expect(balance.available).toBe(0)') && escrowIntegration.includes('expect(balance.pending).toBe(100)'), 'Escrow concurrency integration test must assert available vs pending balance correctly.');

const docs = [
  'README.md', 'README-COMBINED.md', 'docs/architecture/TalentSwap_Proposal.md',
  'docs/architecture/TalentSwap_Specification.md', 'docs/architecture/TalentSwap_Architecture_Foundation.md',
  'DB/docs/architecture/TalentSwap_Proposal.md', 'DB/docs/architecture/TalentSwap_Specification.md',
  'DB/docs/architecture/TalentSwap_Architecture_Foundation.md',
].map(read).join('\n');
check(!/wallet\/\s+# WalletModule: balance, ledger history, point purchase/i.test(docs), 'Documentation must not list point purchase as a wallet feature.');
check(!/Stripe integration for buying points|users can buy points with real currency/i.test(docs), 'Documentation must not promise paid SkillPoints purchases.');

if (failMessages.length) {
  console.error(`Phase 1 regression validation failed (${failMessages.length}):`);
  for (const message of failMessages) console.error(` - ${message}`);
  process.exit(1);
}
console.log('Phase 1 regression validation passed: demo identity isolation, profile ownership, free-only wallet API, ledger ordering/locking, escrow/dispute safeguards, admin restrictions, and call participant authorization.');
