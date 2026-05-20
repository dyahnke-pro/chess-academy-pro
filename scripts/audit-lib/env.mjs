// Minimal .env loader for audit scripts run on a local machine.
//
// In the Claude Code web environment, secrets come from the env-var
// config straight into process.env — this loader is a no-op there
// (every key is already set, and we never overwrite). On David's local
// machine, audit scripts are plain `node` (no vite), so they wouldn't
// otherwise see a gitignored .env.local. This populates process.env
// from it for any key NOT already set, so `node scripts/audit-*.mjs`
// authenticates the same way the dev server does.
//
// Side-effect import (see chromium.mjs). No external dotenv dep.

import { readFileSync, existsSync } from 'node:fs';

for (const file of ['.env.local', '.env']) {
  if (!existsSync(file)) continue;
  let text;
  try {
    text = readFileSync(file, 'utf-8');
  } catch {
    continue;
  }
  for (const raw of text.split('\n')) {
    const line = raw.trim();
    if (!line || line.startsWith('#')) continue;
    const eq = line.indexOf('=');
    if (eq === -1) continue;
    const key = line.slice(0, eq).trim();
    if (!key || process.env[key] !== undefined) continue; // env config wins
    let val = line.slice(eq + 1).trim();
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
      val = val.slice(1, -1);
    }
    process.env[key] = val;
  }
}
