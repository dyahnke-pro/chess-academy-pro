#!/usr/bin/env node
/**
 * run-audits.mjs
 * --------------
 * Convenience runner — spawns the three audits in parallel.
 *
 *   node scripts/run-audits.mjs                         # structural only (no keys/internet)
 *   node scripts/run-audits.mjs --engine --llm          # run all three
 *
 * Each audit writes to audit-reports/<name>.{json,md} — this runner
 * just coordinates. Failures in one don't kill the others.
 */
import { spawn } from 'node:child_process';
import { resolve } from 'node:path';

const repoRoot = resolve(new URL('..', import.meta.url).pathname);
const args = new Set(process.argv.slice(2));

const scripts = [['audit-structural.mjs', true]];
if (args.has('--engine') || args.has('--all')) scripts.push(['audit-engine.mjs', true]);
if (args.has('--llm') || args.has('--all')) scripts.push(['audit-llm.mjs', true]);

console.log(`[run-audits] spawning: ${scripts.map((s) => s[0]).join(', ')}`);

await Promise.allSettled(
  scripts.map(
    ([script]) =>
      new Promise((resolveP) => {
        const child = spawn(process.execPath, [`scripts/${script}`], {
          cwd: repoRoot,
          stdio: 'inherit',
          env: process.env,
        });
        child.on('exit', (code) => {
          console.log(`[run-audits] ${script} exited ${code}`);
          resolveP({ script, code });
        });
      }),
  ),
);

console.log('[run-audits] all done. Reports: audit-reports/{structural,engine,llm}.{json,md}');
