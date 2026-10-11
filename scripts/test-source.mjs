import { execFileSync } from "node:child_process";
const commands = [
  ["module sequence", ["scripts/validate-module-sequence.mjs"]],
  ["frontend transpilation/routes", ["scripts/validate-frontend.mjs"]],
  ["PWA", ["scripts/validate-pwa.mjs"]],
  ["acceptance", ["scripts/validate-acceptance.mjs"]],
];
for (const [name,args] of commands) {
  console.log(`\n=== ${name} ===`);
  execFileSync(process.execPath, args, { stdio: "inherit" });
}
console.log("\nSource-level test suite passed.");
