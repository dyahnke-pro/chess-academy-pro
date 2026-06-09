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

import { existsSync, readFileSync } from 'node:fs';

// Each secret has a canonical name + accepted ALIASES. The Vercel project env
// (and env configs synced from it) name the same keys with VITE_ prefixes
// (VITE_DEEPSEEK_API_KEY) or bespoke labels (Read_key_PostHog); without the
// alias list this reporter wrongly cried "NOT set" for keys that were present
// under another name (the 2026-06-09 false alarm). Presence = ANY alias set.
const SECRETS = [
  { env: 'DEEPSEEK_KEY', aliases: ['VITE_DEEPSEEK_API_KEY', 'DEEPSEEK_API_KEY'], use: 'primary coach/brain LLM (client → api.deepseek.com); bakes into the build' },
  { env: 'ANTHROPIC_KEY', aliases: ['VITE_ANTHROPIC_API_KEY', 'ANTHROPIC_API_KEY'], use: 'fallback LLM provider' },
  { env: 'AUDIT_STREAM_SECRET', aliases: [], use: 'x-audit-secret for GET /api/audit-stream (gate G2)' },
  { env: 'VERCEL_TOKEN', aliases: [], use: 'Vercel API/CLI auth — deploy + manage project settings (e.g. Ignored Build Step to disable preview builds)' },
  { env: 'POSTHOG_API_KEY', aliases: ['Read_key_PostHog', 'PostHog_Read_API_KEY', 'POSTHOG_READ_API_KEY'], use: 'PostHog personal API key (read scopes) — query product analytics via `node scripts/posthog-query.mjs`; DO NOT ask David for it, it lives in the env config' },
];

const isSet = (name) => Boolean(process.env[name] && process.env[name].trim());

const present = [];
const missing = [];
for (const s of SECRETS) {
  const found = [s.env, ...(s.aliases ?? [])].find(isSet);
  if (found) present.push({ ...s, foundAs: found });
  else missing.push(s);
}

const localEnv = ['.env.local', '.env'].filter((f) => existsSync(f));

const lines = ['── session secrets ──'];
if (present.length) {
  lines.push(`available in env (use freely, do not ask): ${present.map((s) => s.foundAs === s.env ? s.env : `${s.env} (as ${s.foundAs})`).join(', ')}`);
}
if (missing.length) {
  lines.push(`NOT set: ${missing.map((s) => s.env).join(', ')}`);
  lines.push('  → set these once in the Claude Code environment env-var config (web UI) so they persist across sessions; until then they must be passed inline.');
}
if (localEnv.length) lines.push(`local env file present: ${localEnv.join(', ')} (vite dev reads it)`);

// Auto-install the git pre-push hook on every fresh container. .git/hooks/ is
// gitignored, so each new clone starts WITHOUT the hook — which is exactly how a
// build-breaking commit (e.g. the 2026-05-31 gambit unused-var) reached main:
// the session pushed without running ship-check. Installing it here makes the
// gate un-skippable by default in every web session. Idempotent + best-effort.
try {
  if (existsSync('.git') && !existsSync('.git/hooks/pre-push')) {
    const { execSync } = await import('node:child_process');
    execSync('node scripts/install-git-hooks.mjs', { stdio: 'ignore' });
    lines.push('git pre-push hook: installed (ship-check now runs before every push)');
  } else if (existsSync('.git/hooks/pre-push')) {
    lines.push('git pre-push hook: present (ship-check gates every push)');
  }
} catch {
  lines.push('git pre-push hook: install skipped (run `npm run install-hooks` to gate pushes)');
}

// Dependency-completeness guard. The sandbox `npm install` intermittently
// SKIPS a declared dep — e.g. @capacitor/app, a native plugin npm omits on an
// ERESOLVE — leaving it in package.json but absent from node_modules. eslint's
// type-aware rules then see that plugin's whole API as `any` and emit phantom
// `no-unsafe-*` ERRORS, which fail ship-check and force --no-verify pushes
// (the 2026-06-01 "10 errors in useAndroidBackButton" false alarm). Detect
// declared deps missing from node_modules and reconcile so every session
// starts from a complete install. Fast: a no-op when complete; skipped
// entirely when node_modules isn't there yet (the setup step owns that).
try {
  if (existsSync('node_modules') && existsSync('package.json')) {
    const pkg = JSON.parse(readFileSync('package.json', 'utf8'));
    const declared = { ...(pkg.dependencies ?? {}), ...(pkg.devDependencies ?? {}) };
    const missing = Object.keys(declared).filter(
      (name) => !existsSync(`node_modules/${name}/package.json`),
    );
    if (missing.length) {
      const { execSync } = await import('node:child_process');
      // Many missing → a fresh/half-built tree: full reconcile. A few missing
      // → the targeted skip-bug: install just those by exact spec (proven to
      // pull in deps the bulk install dropped).
      const cmd = missing.length > 20
        ? 'npm install --no-audit --no-fund'
        : `npm install ${missing.map((n) => `${n}@${declared[n]}`).join(' ')} --no-save --no-audit --no-fund`;
      execSync(cmd, { stdio: 'ignore' });
      const still = missing.filter((name) => !existsSync(`node_modules/${name}/package.json`));
      const head = missing.slice(0, 6).join(', ') + (missing.length > 6 ? '…' : '');
      lines.push(
        `deps: reconciled ${missing.length - still.length}/${missing.length} missing (${head})` +
        (still.length ? ` — STILL missing: ${still.join(', ')}` : ''),
      );
    }
  }
} catch (e) {
  lines.push(`deps: completeness check skipped (${String(e?.message ?? e).slice(0, 80)})`);
}

console.log(lines.join('\n'));
