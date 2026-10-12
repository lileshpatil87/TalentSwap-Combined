# TalentSwap Local Demo Accounts

These are fictional demonstration accounts seeded into the local database. They are not verified identities of real people. Use only in a local development environment.

## Shared local password

`TalentSwapDemo!2026`

## Demo login IDs

| Display name | Login email |
|---|---|
| Lilesh Patil | `lilesh.patil@demo.talentswap.local` |
| Rajnandeeni Patil | `rajnandeeni.patil@demo.talentswap.local` |
| Anjali Sandanshiv | `anjali.sandanshiv@demo.talentswap.local` |
| Keval Lohar | `keval.lohar@demo.talentswap.local` |
| Sharvil Muley | `sharvil.muley@demo.talentswap.local` |
| Gitesh Yewale | `gitesh.yewale@demo.talentswap.local` |
| Omkar Gundale | `omkar.gundale@demo.talentswap.local` |
| Amol Rajput | `amol.rajput@demo.talentswap.local` |
| Rohit Darunte | `rohit.darunte@demo.talentswap.local` |
| Mira Deshmukh | `mira.deshmukh@demo.talentswap.local` |
| Aarav Kulkarni | `aarav.kulkarni@demo.talentswap.local` |

All seeded demo accounts receive a 100 SkillPoints welcome credit, linked to a ledger record. The seed script adds profiles, skills offered/wanted, sample exchange records in different statuses, related notifications, a few conversations/messages, ratings for completed examples, and community posts. These records are demonstration fixtures and should not be treated as actual user activity.

## Setup

From the monorepo root:

```powershell
corepack pnpm db:generate
corepack pnpm db:migrate
corepack pnpm db:seed
```

Demo data is seeded by default only when `NODE_ENV` is not `production`. Set `SEED_DEMO_USERS=false` to disable demo accounts. Override the shared password with `DEMO_USER_PASSWORD` before seeding if desired.

## Notes

- Run the seed command against a local development database only.
- Re-running the seed script is designed to avoid duplicating seeded users, skills, transaction IDs, and posts.
- Never deploy this shared demo password or demo identities to a public production system.
