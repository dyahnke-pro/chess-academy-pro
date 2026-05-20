// Session secrets reporter — the "memory" for keys so David never has to
// re-paste them. Prints which expected secrets are present in the
// environment (NAMES ONLY, never values) so a fresh session knows what
// it can use without asking.
//
// Durable store: this container is ephemeral and re-cloned every
// session, and .env*/.claude/ are gitignored — so nothing on disk
// survives. The ONLY place secrets persist across web sessions is the
// Claude Code environment's env-var config (set once in the web UI),
// which is injected into process.env for every command here. Set the
// keys below there once and they're available forever after.
//
// For LOCAL runs (David's machine) a gitignored `.env.local` is also
// honored — vite's loadEnv reads it for the dev server, and this
// reporter notes its presence.
//
// Run directly: `node scripts/session-secrets.mjs`
// Also wired as a SessionStart hook in .claude/settings.json.

import { existsSync } from 'node:fs';

const SECRETS = [
  { env: 'DEEPSEEK_KEY', use: 'primary coach/brain LLM (client → api.deepseek.com); bakes into the build' },
  { env: 'ANTHROPIC_KEY', use: 'fallback LLM provider' },
  { env: 'AUDIT_STREAM_SECRET', use: 'x-audit-secret for GET /api/audit-stream (gate G2)' },
];

const present = [];
const missing = [];
for (const s of SECRETS) {
  if (process.env[s.env] && process.env[s.env].trim()) present.push(s);
  else missing.push(s);
}

const localEnv = ['.env.local', '.env'].filter((f) => existsSync(f));

const lines = ['── session secrets ──'];
if (present.length) {
  lines.push(`available in env (use freely, do not ask): ${present.map((s) => s.env).join(', ')}`);
}
if (missing.length) {
  lines.push(`NOT set: ${missing.map((s) => s.env).join(', ')}`);
  lines.push('  → set these once in the Claude Code environment env-var config (web UI) so they persist across sessions; until then they must be passed inline.');
}
if (localEnv.length) lines.push(`local env file present: ${localEnv.join(', ')} (vite dev reads it)`);

console.log(lines.join('\n'));
