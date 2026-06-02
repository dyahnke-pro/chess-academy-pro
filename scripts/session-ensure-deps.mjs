// Session dependency guard — make sure node_modules is installed before
// any gate runs.
//
// Why this exists: web-session containers are re-cloned fresh and may not
// have run `npm ci` yet. ship-check and the pre-push hook assume deps are
// present — when they aren't, typecheck false-reds on missing react/node
// types (e.g. the react-jsx.d.ts shim's `import { JSX } from 'react'`
// can't resolve, cascading TS7026 across files) and the content gates
// can't run at all. That looks like a code bug but isn't. This guard
// installs deps once, up front, so the gates get a true signal.
//
// Fast path: when a sentinel dependency is already present, this is a
// near-instant no-op — it does NOT reinstall on every session.
//
// Wired as a SessionStart hook in .claude/settings.json (runs before the
// secrets reporter).

import { existsSync } from 'node:fs';
import { spawnSync } from 'node:child_process';

// Sentinels: a couple of deps that ship-check's typecheck needs. If either
// is missing the install is incomplete and we (re)install.
const SENTINELS = ['node_modules/vite/package.json', 'node_modules/@types/node/package.json'];

const installed = SENTINELS.every((p) => existsSync(p));

if (installed) {
  console.log('── session deps ──\nnode_modules present (gates can run).');
  process.exit(0);
}

const hasLock = existsSync('package-lock.json');
const cmd = 'npm';
const args = hasLock ? ['ci'] : ['install'];

console.log(`── session deps ──\nnode_modules incomplete — running \`${cmd} ${args.join(' ')}\` (one-time for this container)…`);

const res = spawnSync(cmd, args, { stdio: 'inherit' });

if (res.status === 0) {
  console.log('── session deps ──\ndeps installed — ship-check / pre-push gates will now get a true signal.');
  process.exit(0);
}

// Don't hard-fail session start; just flag it so the human knows gates
// may false-red until deps are sorted.
console.log(
  `── session deps ──\n\`${cmd} ${args.join(' ')}\` exited ${res.status ?? 'null'}. ` +
    'Gates may false-red on missing deps until this is resolved — run `npm ci` manually.'
);
process.exit(0);
