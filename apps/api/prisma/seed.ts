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


  // === skills module ===
  const categories = [
    ['programming','Programming'], ['design','Design'], ['languages','Languages'],
    ['music','Music'], ['business','Business'], ['marketing','Marketing'],
  ] as const;
  for (const [slug,name] of categories) await prisma.skillCategory.upsert({where:{slug},update:{name,isActive:true},create:{slug,name}});

  // === local demo users module ===
  // Demo accounts are intentionally seeded only outside staging/production.
  // Password is a shared LOCAL demo credential; never reuse it in production.
  if (process.env.NODE_ENV !== 'production' && process.env.SEED_DEMO_USERS !== 'false') {
    const demoPassword = process.env.DEMO_USER_PASSWORD ?? 'TalentSwapDemo!2026';
    const demoPasswordHash = await hash(demoPassword, 12);
    const demos = [
      { name: 'Lilesh Patil', email: 'lilesh.patil@demo.talentswap.local', headline: 'Java developer and mentor', bio: 'Enjoys helping beginners build practical Java projects.', location: 'Pune, Maharashtra', offering: ['Java Programming', 'SQL Fundamentals'], seeking: ['React Development', 'UI/UX Design'] },
      { name: 'Rajnandeeni Patil', email: 'rajnandeeni.patil@demo.talentswap.local', headline: 'UI/UX designer', bio: 'Designs clean interfaces and enjoys collaborative learning.', location: 'Pune, Maharashtra', offering: ['UI/UX Design', 'Figma'], seeking: ['JavaScript', 'Public Speaking'] },
      { name: 'Anjali Sandanshiv', email: 'anjali.sandanshiv@demo.talentswap.local', headline: 'Python and data learner', bio: 'Practices Python automation and beginner data analysis.', location: 'Nashik, Maharashtra', offering: ['Python Programming', 'Excel'], seeking: ['Web Development', 'Graphic Design'] },
      { name: 'Keval Lohar', email: 'keval.lohar@demo.talentswap.local', headline: 'Frontend developer', bio: 'Builds responsive interfaces and shares practical CSS tips.', location: 'Pune, Maharashtra', offering: ['HTML and CSS', 'React Development'], seeking: ['Java Programming', 'Video Editing'] },
      { name: 'Sharvil Muley', email: 'sharvil.muley@demo.talentswap.local', headline: 'Cloud and DevOps learner', bio: 'Interested in Linux, containers, and deployment workflows.', location: 'Mumbai, Maharashtra', offering: ['Linux Basics', 'Git and GitHub'], seeking: ['AWS Fundamentals', 'Python Programming'] },
      { name: 'Gitesh Yewale', email: 'gitesh.yewale@demo.talentswap.local', headline: 'Communication and business', bio: 'Enjoys presentation practice and learning digital tools.', location: 'Pune, Maharashtra', offering: ['Public Speaking', 'Excel'], seeking: ['UI/UX Design', 'JavaScript'] },
      { name: 'Omkar Gundale', email: 'omkar.gundale@demo.talentswap.local', headline: 'Backend developer', bio: 'Learning API design and relational database fundamentals.', location: 'Aurangabad, Maharashtra', offering: ['SQL Fundamentals', 'Node.js Basics'], seeking: ['Java Programming', 'AWS Fundamentals'] },
      { name: 'Amol Rajput', email: 'amol.rajput@demo.talentswap.local', headline: 'Creative designer', bio: 'Creates social media graphics and wants to improve frontend skills.', location: 'Nandurbar, Maharashtra', offering: ['Graphic Design', 'Canva'], seeking: ['HTML and CSS', 'Video Editing'] },
      { name: 'Rohit Darunte', email: 'rohit.darunte@demo.talentswap.local', headline: 'Web developer and learner', bio: 'Practices full-stack development through small projects.', location: 'Pune, Maharashtra', offering: ['JavaScript', 'Git and GitHub'], seeking: ['Python Programming', 'Public Speaking'] },
      { name: 'Mira Deshmukh', email: 'mira.deshmukh@demo.talentswap.local', headline: 'Language and communication coach', bio: 'Helps peers practise English conversations and presentations.', location: 'Pune, Maharashtra', offering: ['English Conversation', 'Public Speaking'], seeking: ['Graphic Design', 'Excel'] },
      { name: 'Aarav Kulkarni', email: 'aarav.kulkarni@demo.talentswap.local', headline: 'Cloud computing enthusiast', bio: 'Practices cloud basics, Linux, and deployment fundamentals.', location: 'Mumbai, Maharashtra', offering: ['AWS Fundamentals', 'Linux Basics'], seeking: ['React Development', 'SQL Fundamentals'] },
    ];
    const demoUsers: Array<{id:string; name:string; email:string; offering:string[]; seeking:string[]}> = [];
    const categorySlugs: Record<string,string> = {
      'Java Programming':'programming','SQL Fundamentals':'programming','React Development':'programming','UI/UX Design':'design','Figma':'design','Python Programming':'programming','Excel':'business','Web Development':'programming','Graphic Design':'design','HTML and CSS':'programming','Public Speaking':'business','Linux Basics':'programming','Git and GitHub':'programming','AWS Fundamentals':'programming','Video Editing':'design','JavaScript':'programming','Node.js Basics':'programming','Canva':'design','English Conversation':'languages'
    };
    for (const demo of demos) {
      const user = await prisma.user.upsert({
        where: { email: demo.email }, update: {},
        create: { email: demo.email, passwordHash: demoPasswordHash, role: 'USER', isEmailVerified: true },
      });
      const profile = await prisma.profile.upsert({
        where: { userId: user.id }, update: { displayName: demo.name, headline: demo.headline, bio: demo.bio, location: demo.location, languages: ['English', 'Marathi'], availability: 'Evenings and weekends' },
        create: { userId: user.id, displayName: demo.name, headline: demo.headline, bio: demo.bio, location: demo.location, languages: ['English', 'Marathi'], availability: 'Evenings and weekends' },
      });
      // Ledger is the source of truth. Never overwrite an existing account balance on re-seed.
      const signupKey = user.id;
      const existingCredit = await prisma.skillPointsLedger.findUnique({ where: { idempotencyKey: signupKey } });
      if (!existingCredit) {
        const latest = await prisma.skillPointsLedger.findFirst({ where: { userId: user.id }, orderBy: { sequence: 'desc' } });
        const before = latest?.balanceAfter ?? 0;
        await prisma.skillPointsLedger.create({ data: { userId: user.id, entryType: 'CREDIT', amount: 100, balanceAfter: before + 100, description: 'Welcome bonus for demo account', idempotencyKey: signupKey } });
      }
      // Categories and skills are real persisted records, linked to their owner.
      for (const title of demo.offering) {
        const slug = categorySlugs[title] ?? 'programming';
        const category = await prisma.skillCategory.findUnique({ where: { slug } });
        if (category && !(await prisma.skill.findFirst({ where: { userId: user.id, title, type: 'OFFERING' } }))) {
          await prisma.skill.create({ data: { userId: user.id, categoryId: category.id, title, description: `${title} shared through a local TalentSwap demo profile.`, proficiency: 'INTERMEDIATE', type: 'OFFERING', pointRate: 10 } });
        }
      }
      for (const title of demo.seeking) {
        const slug = categorySlugs[title] ?? 'programming';
        const category = await prisma.skillCategory.findUnique({ where: { slug } });
        if (category && !(await prisma.skill.findFirst({ where: { userId: user.id, title, type: 'SEEKING' } }))) {
          await prisma.skill.create({ data: { userId: user.id, categoryId: category.id, title, description: `Interested in learning ${title} through a peer exchange.`, proficiency: 'BEGINNER', type: 'SEEKING', pointRate: 10 } });
        }
      }
      demoUsers.push({ id: user.id, name: demo.name, email: demo.email, offering: [...demo.offering], seeking: [...demo.seeking] });
      void profile;
    }
    // Meaningful activity linked to real demo users and skill rows.
    const findSkill = async (userId: string) => prisma.skill.findFirst({ where: { userId, type: 'OFFERING', isActive: true } });
    for (let i = 0; i < Math.min(8, demoUsers.length); i++) {
      const initiator = demoUsers[i];
      const provider = demoUsers[(i + 1) % demoUsers.length];
      const skill = await findSkill(provider.id);
      if (!skill) continue;
      const status = i % 4 === 0 ? 'PENDING' : i % 4 === 1 ? 'ESCROW_HELD' : i % 4 === 2 ? 'COMPLETED' : 'CANCELLED';
      const key = `00000000-0000-4000-8000-${String(i + 1).padStart(12, '0')}`;
      let transaction = await prisma.transaction.findUnique({ where: { idempotencyKey: key } });
      if (!transaction) {
        transaction = await prisma.transaction.create({ data: { idempotencyKey: key, initiatorId: initiator.id, providerId: provider.id, skillId: skill.id, type: 'ONE_WAY', pointsHeld: 10, status, confirmationDeadline: new Date(Date.now() + 7 * 86400000), providerConfirmed: status === 'COMPLETED', recipientConfirmed: status === 'COMPLETED', completedAt: status === 'COMPLETED' ? new Date(Date.now() - i * 86400000) : null, notes: `Seeded demonstration exchange: ${skill.title}` } });
      }
      if (!(await prisma.notification.findFirst({ where: { userId: initiator.id, type: 'TRANSACTION' } }))) {
        await prisma.notification.create({ data: { userId: initiator.id, type: 'TRANSACTION', payload: { transactionId: transaction.id, status, message: `Your demo exchange is ${status.toLowerCase().replace('_',' ')}.` } } });
      }
      if (i < 4) {
        const participants = [initiator.id, provider.id];
        let convo = await prisma.conversation.findFirst({ where: { participantIds: { equals: participants } } });
        if (!convo) convo = await prisma.conversation.create({ data: { participantIds: participants, lastMessageAt: new Date() } });
        if (!(await prisma.message.findFirst({ where: { conversationId: convo.id, senderId: initiator.id } }))) {
          await prisma.message.create({ data: { conversationId: convo.id, senderId: initiator.id, content: `Hi ${provider.name.split(' ')[0]}, I would love to learn more about ${skill.title}.` } });
        }
      }
      if (status === 'COMPLETED') {
        const rating = await prisma.rating.findFirst({ where: { transactionId: transaction.id, raterId: initiator.id } });
        if (!rating) await prisma.rating.create({ data: { transactionId: transaction.id, raterId: initiator.id, rateeId: provider.id, rating: 5, feedbackText: 'Clear explanations and a helpful learning session.' } });
      }
    }
    for (const demo of demoUsers.slice(0, 6)) {
      const category = await prisma.skillCategory.findFirst({ where: { slug: 'programming' } });
      const title = `${demo.name.split(' ')[0]}'s skill-sharing note`;
      if (!(await prisma.communityPost.findFirst({ where: { authorId: demo.id, title } })) && category) {
        await prisma.communityPost.create({ data: { authorId: demo.id, title, body: `I am practising ${demo.offering[0]} and would love to connect with people learning ${demo.seeking[0]}. Let's learn together!`, postType: 'OFFER', skillCategoryId: category.id } });
      }
    }
    console.log(`[seed] demo users: ensured ${demoUsers.length} profiles, skills, wallet welcome credits, exchange history, messages, notifications, ratings, and community posts.`);
    console.log(`[seed] shared local demo password: ${demoPassword}`);
  }

  // === gamification module ===
  const badges = [
    ['FIRST_EXCHANGE','First Exchange','Complete your first exchange',10,1],
    ['XP_100','Rising Contributor','Reach 100 XP',25,100],
    ['XP_500','Community Expert','Reach 500 XP',50,500],
  ] as const;
  for (const [code,name,description,xpReward,conditionValue] of badges) await prisma.badge.upsert({where:{code},update:{name,description,xpReward,conditionValue},create:{code,name,description,xpReward,conditionType:'XP',conditionValue}});

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
