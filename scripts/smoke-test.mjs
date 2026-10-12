const base = (process.env.TALENTSWAP_API_URL || 'http://localhost:4000').replace(/\/$/, '');
const paths = (process.env.TALENTSWAP_SMOKE_PATHS || '/health,/api/v1/health').split(',').map(s => s.trim()).filter(Boolean);
let failures = 0;
for (const path of paths) {
  try {
    const response = await fetch(`${base}${path}`, { signal: AbortSignal.timeout(5000) });
    if (response.status >= 500) {
      console.error(`FAIL ${path}: HTTP ${response.status}`); failures++;
    } else {
      console.log(`PASS ${path}: HTTP ${response.status}`);
    }
  } catch (error) {
    console.error(`FAIL ${path}: ${error instanceof Error ? error.message : String(error)}`); failures++;
  }
}
if (failures) process.exit(1);
