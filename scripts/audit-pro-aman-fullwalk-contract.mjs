#!/usr/bin/env node
// FULL-PLAY AUDIT CONTRACT (David 2026-05-24 rule, applied to the Aman build):
// "MET only on 3 CONSECUTIVE error-free passes; each pass touches EVERY
// function, each pass digs DEEPER; any error resets the streak." A single run
// is NOT the contract.
//
// This driver runs scripts/audit-pro-aman-full-walk.mjs repeatedly. The walk
// exits 0 when 0 FAILs, 1 otherwise. We require 3 CONSECUTIVE exit-0 runs;
// any failing run resets the streak. Each successive pass deepens via
// WALK_DEPTH (the walk reads it: 1=happy path, 2=+cold-cache/pick-before-load,
// 3=+adversarial out-of-order) — passed through env.
//
// Run: AUDIT_SANDBOX=1 node scripts/audit-pro-aman-fullwalk-contract.mjs
import { spawn } from 'node:child_process';

const MAX_ATTEMPTS = 6;       // safety cap (3 clean needed; allow a few resets)
const NEED = 3;
const env = { ...process.env };

function runPass(depth) {
  return new Promise((resolve) => {
    const p = spawn('node', ['scripts/audit-pro-aman-full-walk.mjs'], {
      env: { ...env, WALK_DEPTH: String(depth) },
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    let out = '';
    p.stdout.on('data', (d) => { out += d; process.stdout.write(d); });
    p.stderr.on('data', (d) => { out += d; process.stderr.write(d); });
    p.on('close', (code) => {
      const m = out.match(/total:\s*(\d+)\s*PASS\s*\/\s*(\d+)\s*FAIL\s*\/\s*(\d+)\s*WARN/);
      resolve({ code, pass: m ? +m[1] : null, fail: m ? +m[2] : null, warn: m ? +m[3] : null });
    });
  });
}

let clean = 0;
for (let attempt = 1; attempt <= MAX_ATTEMPTS && clean < NEED; attempt++) {
  const depth = clean + 1; // pass 1 → depth1, pass 2 → depth2, pass 3 → depth3
  console.log(`\n========== CONTRACT PASS ${attempt} (depth ${depth}, consecutive-clean ${clean}/${NEED}) ==========`);
  const r = await runPass(depth);
  if (r.code === 0 && r.fail === 0) {
    clean++;
    console.log(`\n[contract] pass ${attempt}: CLEAN (${r.pass} PASS / 0 FAIL / ${r.warn} WARN) — consecutive clean ${clean}/${NEED}`);
  } else {
    console.log(`\n[contract] pass ${attempt}: FAILED (exit ${r.code}, ${r.fail ?? '?'} FAIL) — streak reset`);
    clean = 0;
  }
}

const met = clean >= NEED;
console.log(`\n${met ? '✅ CONTRACT MET — 3 consecutive error-free full-play passes' : '❌ CONTRACT NOT MET — need 3 consecutive clean (got streak ' + clean + ')'}`);
process.exit(met ? 0 : 1);
