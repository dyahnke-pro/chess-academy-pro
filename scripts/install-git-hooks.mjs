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
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = join(__dirname, '..');
const HOOK_PATH = join(REPO_ROOT, '.git/hooks/pre-push');
const PRE_COMMIT_PATH = join(REPO_ROOT, '.git/hooks/pre-commit');

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

node scripts/plan-guard.mjs
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
console.log('');
