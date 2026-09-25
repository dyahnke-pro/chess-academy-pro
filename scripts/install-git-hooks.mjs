#!/usr/bin/env node
// Install repo-local git hooks (David 2026-05-22).
//
// Writes:
//   • `.git/hooks/pre-push`   — runs `npm run ship-check`, blocks on red.
//   • `.git/hooks/pre-commit` — runs the PLAN.md clobber guard
//                                (scripts/plan-guard.mjs), blocks a
//                                wholesale PLAN.md overwrite that doesn't
//                                archive the prior plan.
// Idempotent — re-running just rewrites the hooks with the latest content.
//
// .git/hooks/ is NOT tracked by git, so each clone needs to run this once:
//   node scripts/install-git-hooks.mjs
//
// To bypass on a specific git op (RARE; only if you understand the cost),
// pass `--no-verify`. The hooks themselves never auto-disable.

import { writeFileSync, mkdirSync, existsSync, chmodSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = join(__dirname, '..');
// The hooks live in the COMMON git dir: in a worktree `.git` is a FILE
// pointing there, and `join(REPO_ROOT, '.git/hooks')` died with ENOTDIR
// (2026-09-20) — so every worktree session that ran this installed nothing.
const GIT_COMMON_DIR = (() => {
  const r = spawnSync('git', ['rev-parse', '--git-common-dir'], { cwd: REPO_ROOT, encoding: 'utf-8' });
  const dir = (r.stdout ?? '').trim();
  if (!dir) return join(REPO_ROOT, '.git');
  return dir.startsWith('/') ? dir : join(REPO_ROOT, dir);
})();
const HOOK_PATH = join(GIT_COMMON_DIR, 'hooks/pre-push');
const PRE_COMMIT_PATH = join(GIT_COMMON_DIR, 'hooks/pre-commit');

if (!existsSync(join(REPO_ROOT, '.git'))) {
  console.error('No .git directory found — must run from inside the repo.');
  process.exit(1);
}

mkdirSync(dirname(HOOK_PATH), { recursive: true });

const HOOK_BODY = `#!/usr/bin/env bash
# pre-push hook — installed by scripts/install-git-hooks.mjs
#
# Runs the project's ship-check (typecheck + lint + content gates +
# audit-stream pull). Blocks the push on red. Bypass with
# \`git push --no-verify\` only if you know what you're doing.
#
# To re-install: \`node scripts/install-git-hooks.mjs\`

set -e

echo ""
echo "── pre-push: ship-check ──"
echo ""

# HONOUR THE GREEN WATERMARK (PLAN §B 11b, 2026-09-19): ship-check writes
# .ship-check-log/latest.json with the SHA it went green on. When that SHA is
# HEAD, a second full run here only doubles the machine load that produces
# false timeouts — skip it and push. Anything else re-runs as before.
if [ -f .ship-check-log/latest.json ]; then
  head_sha=$(git rev-parse HEAD 2>/dev/null)
  green_sha=$(node -e "try{const j=require('./.ship-check-log/latest.json');process.stdout.write(String(j.sha||j.head||''))}catch{}" 2>/dev/null)
  if [ -n "$head_sha" ] && [ "$head_sha" = "$green_sha" ]; then
    echo "✓ ship-check already green on $head_sha (watermark) — skipping the re-run."
    exit 0
  fi
fi

if ! npm run ship-check; then
  echo ""
  echo "✗ ship-check failed — push aborted."
  echo "  Fix the failures above and try again, or pass --no-verify to bypass."
  echo ""
  exit 1
fi

echo ""
echo "✓ ship-check passed — proceeding with push."
echo ""
`;

const PRE_COMMIT_BODY = `#!/usr/bin/env bash
# pre-commit hook — installed by scripts/install-git-hooks.mjs
#
# Runs the PLAN.md clobber guard: blocks a wholesale overwrite of the root
# PLAN.md that doesn't also archive the prior plan to docs/plans/ in the
# same commit (CLAUDE.md: PLAN.md is one rolling doc). Bypass with
# \`git commit --no-verify\` only if you know what you're doing.
#
# To re-install: \`node scripts/install-git-hooks.mjs\`

node scripts/plan-guard.mjs || exit 1

# The fast check: typecheck + staged lint + co-located tests, only when TS is
# staged. Catches in ~2 min what the pre-push ship-check found 10 min in.
node scripts/precommit-check.mjs
`;

writeFileSync(HOOK_PATH, HOOK_BODY);
chmodSync(HOOK_PATH, 0o755);
writeFileSync(PRE_COMMIT_PATH, PRE_COMMIT_BODY);
chmodSync(PRE_COMMIT_PATH, 0o755);

console.log('');
console.log('✓ Installed pre-push hook at .git/hooks/pre-push');
console.log('  Every `git push` now runs `npm run ship-check` and blocks on red.');
console.log('  Bypass with `git push --no-verify` (rare — use only if you understand the cost).');
console.log('');
console.log('✓ Installed pre-commit hook at .git/hooks/pre-commit');
console.log('  A wholesale PLAN.md overwrite is blocked unless the same commit archives');
console.log('  the prior plan to docs/plans/. Bypass with `git commit --no-verify`.');
console.log('  It also runs scripts/precommit-check.mjs (typecheck + staged lint + co-located tests).');
console.log('');
