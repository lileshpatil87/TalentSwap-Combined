import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const web = path.join(root, "apps/web");
const fail = (message) => { console.error(`FAIL: ${message}`); process.exitCode = 1; };
const read = (file) => fs.readFileSync(file, "utf8");

const modules = ["auth","profile","skills","discover","wallet","transactions","chat","calling","notifications","documents","gamification","community","ratings","admin","settings"];
const apiNames = modules.map(x => `${x}Api`);
for (const module of modules) {
  const dir = path.join(web, "components/features", module);
  if (!fs.existsSync(dir)) fail(`missing feature directory ${module}`);
}
for (const name of apiNames) {
  const file = path.join(web, "lib/api", `${name.replace(/Api$/, "")}.ts`);
  if (!fs.existsSync(file)) fail(`missing API boundary ${file}`);
}

function walk(dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap(entry => {
    const p = path.join(dir, entry.name);
    return entry.isDirectory() ? walk(p) : [p];
  });
}
const sources = walk(web).filter(f => /\.(ts|tsx)$/.test(f) && !f.includes("node_modules"));
for (const file of sources) {
  const source = read(file);
  const normalizedFile = file.replace(/\\/g, "/");
  if (normalizedFile.endsWith("/lib/api.ts")) continue;
  if (/\bfetch\s*\(/.test(source) && !normalizedFile.endsWith("/scripts/validate-acceptance.mjs")) fail(`direct fetch outside central API wrapper: ${path.relative(root,file)}`);
}

const featurePages = {
  auth:"AuthPage.tsx", profile:"ProfilePage.tsx", skills:"SkillsPage.tsx", discover:"DiscoverPage.tsx", wallet:"WalletPage.tsx", transactions:"TransactionsPage.tsx", chat:"ChatPage.tsx", calling:"CallingPage.tsx", notifications:"NotificationsPage.tsx", documents:"DocumentsPage.tsx", gamification:"GamificationPage.tsx", community:"CommunityPage.tsx", ratings:"RatingsPage.tsx", admin:"AdminPage.tsx", settings:"SettingsPage.tsx"
};
for (const [feature, page] of Object.entries(featurePages)) {
  const source = read(path.join(web,"components/features",feature,page));
  const apiName = `${feature}Api`;
  if (!source.includes(apiName) && feature !== "auth") fail(`${feature} page does not consume its API boundary`);
}
const chat = read(path.join(web,"components/features/chat/ChatPage.tsx"));
for (const event of ["message:send","message:received"]) if (!chat.includes(event)) fail(`chat missing approved event ${event}`);
const calling = read(path.join(web,"components/features/calling/CallingPage.tsx"));
for (const event of ["call:offer","call:answer","call:ice-candidate","call:end"]) if (!calling.includes(event)) fail(`calling missing approved event ${event}`);
if (!calling.includes("getUserMedia")) fail("calling missing browser media permission flow");
const notifications = read(path.join(web,"components/features/notifications/NotificationsPage.tsx"));
if (!notifications.includes("notification:new")) fail("notifications missing approved realtime event");

for (const file of ["manifest.json","sw.js","offline.html","icon-192.png","icon-512.png"]) if (!fs.existsSync(path.join(web,"public",file))) fail(`missing PWA asset ${file}`);
if (process.env.CHECK_PACKAGING) {
  if (fs.existsSync(path.join(web,"tsconfig.tsbuildinfo"))) fail("build cache tsconfig.tsbuildinfo must not be packaged");
  for (const forbidden of ["node_modules", ".next", ".swc", ".turbo"]) if (fs.existsSync(path.join(root, forbidden))) fail(`forbidden generated artifact exists: ${forbidden}`);
}

const testFiles = walk(web).filter(f => /\.(test|spec)\.(ts|tsx|js)$/.test(f));
if (testFiles.length < 10) fail(`expected broad feature tests; found only ${testFiles.length}`);

if (!process.exitCode) console.log(`Acceptance validation passed: ${modules.length} feature API boundaries, realtime/calling contracts, PWA assets, no direct feature fetches, and ${testFiles.length} test files.`);
