/**
 * audit-lock — the cross-session mutex for anything that drives a browser.
 *
 * WHY THIS EXISTS. Several worktree sessions run audits on the same Mac, and
 * two browsers (or a tsc/vitest beside one) starve each other and produce
 * timeouts that read exactly like product failures. CLAUDE.md is explicit that
 * audits run sequentially with nothing beside them. Two sessions spent
 * 2026-09-20 rediscovering, separately, that the ad-hoc `mkdir` locks they had
 * each written did not actually serialise anything.
 *
 * FOUR DEFECTS THIS ENCODES THE FIX FOR, every one of them paid for:
 *
 *  1. **A LOCK IN A SESSION SCRATCHPAD IS NOT A MUTEX.** One lived at
 *     `/private/tmp/claude-501/<session-id>/scratchpad/audit.lock` — a path no
 *     peer can see or scan. Two sessions each held their own private lock all
 *     day, and every "lock held" either reported was true only inside one
 *     session. A peer scanned the repo and /tmp for it and correctly found
 *     nothing. There is ONE path and it is `/tmp`, the only directory every
 *     session on this machine can see.
 *
 *  2. **A BARE `mkdir` HAS NO LIVENESS CHECK.** A crashed or killed run leaves
 *     the dir forever, and the next session waits on a lock whose owner is long
 *     dead — a mutex that fails closed and never recovers. So the dir carries an
 *     `owner` file (pid, label, script, ISO timestamp, session, cwd) and a
 *     contender reads it: if the pid is gone the lock is STALE and may be taken.
 *
 *  3. **NEVER REMOVE A LOCK YOU DID NOT CREATE.** One wait loop was
 *     `while (!mkdir || pgrep) { rmdir; sleep }` — when the peer's lock was an
 *     empty dir the `rmdir` succeeded and deleted it, and a chain guarding on
 *     the lock ALONE then started a browser on top of a live probe. Here the
 *     only paths that remove a lock are: releasing one whose owner is us, or
 *     stealing one PROVEN stale — and a steal is always logged with what it took
 *     it from, because a lock that quietly vanishes is the same class of problem
 *     as a guard that cannot fire.
 *
 *  4. **THE LOCK ALONE CANNOT SEE A PEER THAT NEVER TOOK IT.** What actually
 *     kept the sessions apart was the PROCESS guard. Both run here: the lock
 *     serialises chains that politely take it, `pgrep` catches one that did not.
 *     Anchor it to `^node scripts/(audit-|probe-)` — a bare
 *     `pgrep -f "scripts/audit-"` matches the waiting chain's OWN `zsh -c`
 *     command line, so the chain waits for itself forever. Three chains
 *     deadlocked exactly that way.
 *
 * PID RECYCLING. `process.kill(pid, 0)` alone is not enough: a recycled pid
 * reads as alive and we would wait forever on a stranger's process. `isAlive`
 * also confirms via `ps` that the command still looks like the shell or node
 * process that took the lock.
 *
 * SHELL USAGE — this is the primary interface, because both chains are bash and
 * a lock must be held ACROSS commands, which an in-process API cannot do. The
 * owner pid is the SHELL's `$$`, so liveness tracks the thing that really holds
 * it rather than a node process that has already exited:
 *
 *   node scripts/audit-lib/audit-lock.mjs acquire --pid $$ --label "review chain"
 *   ... run the audit ...
 *   node scripts/audit-lib/audit-lock.mjs release --pid $$
 *
 *   # release even if the audit dies — BUT READ THE ZSH TRAP WARNING BELOW:
 *   setopt POSIX_TRAPS
 *   trap 'node scripts/audit-lib/audit-lock.mjs release --pid $$' EXIT
 *
 * 🚨 **ZSH: AN `EXIT` TRAP SET INSIDE A FUNCTION FIRES WHEN THE FUNCTION
 * RETURNS, NOT WHEN THE SHELL EXITS.** At top level the trap line above is
 * correct. Wrap it in the obvious helper — which is exactly what happens once
 * two chains need it —
 *
 *     take_lock() { audit-lock.mjs acquire …; trap '… release …' EXIT; }
 *
 * and zsh releases the lock the moment `take_lock` RETURNS. The chain then runs
 * the entire audit with NO mutual exclusion while every outward sign says it
 * holds one, which is worse than holding no lock at all. Verified 2026-09-20:
 * default zsh fires the trap before the caller's next line; `setopt POSIX_TRAPS`
 * restores fire-on-shell-exit. Set that option, or set the trap at top level.
 * This is the same shape as the other instrument bugs of that day — the trap
 * answers "has this function returned" while the reader believes it answers
 * "has this shell exited".
 *
 * 🚨 **AND THE TRAP IS A COURTESY, NOT THE GUARANTEE — THE OWNER FILE IS THE
 * RECOVERY MECHANISM.** SIGKILL can never run a trap, and zsh will not reliably
 * run a TERM trap while blocked in a child, so a killed holder ALWAYS strands
 * the lock dir (measured, not assumed). What gets it back is the staleness
 * check: the next contender reads `owner`, sees the pid is gone, steals it and
 * says so. The trap only makes recovery FAST; the owner file makes it POSSIBLE.
 * Which is why an OWNERLESS dir — a bare `mkdir` with nothing written into it —
 * is not merely refused here but is UNRECOVERABLE BY CONSTRUCTION: nothing can
 * ever prove it dead, so it blocks every session until a human removes it. That
 * is still the right failure direction (waiting is visible; two overlapping runs
 * are not), but the cost is total rather than "someone waits a while".
 *
 * `acquire` blocks until it holds the lock AND no peer audit process is running,
 * then exits 0.
 *
 * ON BOUNDING THE WAIT — a deadline may end the WAIT, never the DISCIPLINE.
 * Default is unbounded, because a chain that gives up and RUNS ANYWAY is
 * strictly worse than one that waits: it manufactures the very contention the
 * lock exists to prevent, and does it silently. But unbounded is not free —
 * a session once sat 68 minutes on a wedged peer, and the cost was not the
 * waiting, it was that waiting and wedged look identical from outside. So
 * `--deadline <seconds>` ABORTS: exit 2, nothing run, nothing contending, with
 * the owner's pid/label/age and any peer processes printed so a human can see
 * which run is stuck. Exit codes: 0 held, 2 deadline, 3 release contamination.
 */

import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { execFileSync } from 'node:child_process';

/** The ONE shared path. /tmp is the only directory every session can see. */
export const AUDIT_LOCK_PATH = process.env.AUDIT_LOCK_PATH || '/tmp/chess-academy-audit.lock';

const OWNER_FILE = 'owner';
const DEFAULT_POLL_MS = 5_000;

/** Anchored so it cannot match the waiting chain's own `zsh -c` command line. */
const AUDIT_PROCESS_PATTERN = '^node scripts/(audit-|probe-)';

function ownerPath(lockPath = AUDIT_LOCK_PATH) {
  return path.join(lockPath, OWNER_FILE);
}

function nowIso() {
  return new Date().toISOString();
}

/**
 * Is this pid still running, and does it still look like the process that took
 * the lock? The `ps` half guards pid recycling — without it a reused pid reads
 * as alive and the lock never becomes stealable.
 */
export function isAlive(pid) {
  const n = Number(pid);
  if (!Number.isInteger(n) || n <= 0) return false;
  try {
    process.kill(n, 0);
  } catch (err) {
    // ESRCH = gone. EPERM = alive but owned by another user, so still alive.
    return err && err.code === 'EPERM';
  }
  try {
    const cmd = execFileSync('ps', ['-p', String(n), '-o', 'command='], {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
    }).trim();
    if (!cmd) return false;
    // A lock owner is a shell ($$ from a chain) or a node process. Anything else
    // on this pid means the number was recycled by an unrelated program.
    return /\b(zsh|bash|sh|node)\b/.test(cmd);
  } catch {
    // ps failed but the signal probe said alive — believe the signal.
    return true;
  }
}

/** Read the owner record, or null when the lock is absent or ownerless. */
export function readAuditLockOwner(lockPath = AUDIT_LOCK_PATH) {
  try {
    const raw = fs.readFileSync(ownerPath(lockPath), 'utf8');
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === 'object' ? parsed : null;
  } catch {
    return null;
  }
}

/**
 * Describe the lock's current state without touching it.
 * `ownerless` is its own state on purpose: a bare-`mkdir` lock from an older
 * chain carries no owner, so we cannot prove it dead — and an unprovable lock is
 * treated as HELD, never stolen.
 */
export function inspectAuditLock(lockPath = AUDIT_LOCK_PATH) {
  if (!fs.existsSync(lockPath)) return { state: 'free', owner: null };
  const owner = readAuditLockOwner(lockPath);
  if (!owner || !owner.pid) return { state: 'ownerless', owner: null };
  return { state: isAlive(owner.pid) ? 'held' : 'stale', owner };
}

/**
 * Peer audit/probe processes, by the anchored pattern. Returns [] when none.
 * This is the guard that actually kept two sessions apart — keep it beside the
 * lock, never instead of it.
 */
export function auditProcessesRunning({ ignorePids = [] } = {}) {
  const ignore = new Set([process.pid, ...ignorePids].map(Number));
  let out = '';
  try {
    out = execFileSync('pgrep', ['-fl', AUDIT_PROCESS_PATTERN], {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
    });
  } catch {
    return []; // pgrep exits 1 when nothing matches
  }
  return out
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const sp = line.indexOf(' ');
      return { pid: Number(line.slice(0, sp)), command: line.slice(sp + 1) };
    })
    .filter((p) => Number.isInteger(p.pid) && !ignore.has(p.pid));
}

function writeOwner(lockPath, record) {
  fs.writeFileSync(ownerPath(lockPath), `${JSON.stringify(record, null, 2)}\n`, 'utf8');
}

/**
 * One attempt. Returns {ok:true} on success, or {ok:false, reason, detail}.
 * Never blocks, never sleeps — the waiting lives in `acquireAuditLock` so the
 * caller can log each poll.
 */
export function tryAcquireAuditLock({
  lockPath = AUDIT_LOCK_PATH,
  pid = process.pid,
  label = 'unlabelled',
  script = process.argv[1] ? path.basename(process.argv[1]) : 'unknown',
  sessionId = process.env.CLAUDE_SESSION_ID || '',
  checkProcesses = true,
  onSteal = () => {},
} = {}) {
  // The process guard runs FIRST: a peer that never took the lock is invisible
  // to the dir, and taking the lock in front of its live browser is the exact
  // contamination this helper exists to stop.
  if (checkProcesses) {
    const running = auditProcessesRunning({ ignorePids: [pid] });
    if (running.length > 0) {
      return { ok: false, reason: 'peer-process', detail: running };
    }
  }

  let made = false;
  try {
    fs.mkdirSync(lockPath);
    made = true;
  } catch (err) {
    if (err.code !== 'EEXIST') throw err;
  }

  if (!made) {
    const state = inspectAuditLock(lockPath);
    if (state.state === 'held') return { ok: false, reason: 'held', detail: state.owner };
    if (state.state === 'ownerless') {
      // Cannot prove it dead, so treat it as held. An ownerless lock is either a
      // live older-style chain or debris; guessing wrong deletes a peer's mutex.
      return { ok: false, reason: 'ownerless', detail: null };
    }
    // PROVEN stale: the recorded pid is gone. Steal by remove-then-mkdir —
    // mkdir is atomic, so if two contenders both judge it stale only one wins
    // and the other falls back to waiting.
    try {
      fs.rmSync(lockPath, { recursive: true, force: true });
      fs.mkdirSync(lockPath);
      made = true;
      onSteal(state.owner);
    } catch (err) {
      if (err.code === 'EEXIST') return { ok: false, reason: 'lost-steal-race', detail: null };
      throw err;
    }
  }

  writeOwner(lockPath, {
    pid: Number(pid),
    label,
    script,
    sessionId,
    cwd: process.cwd(),
    host: os.hostname(),
    acquiredAt: nowIso(),
  });
  return { ok: true };
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/**
 * Block until the lock is held. No timeout by default — a chain that gives up
 * and runs anyway contaminates a peer's tape, which is worse than waiting.
 * Returns a `release` function; call it in a finally.
 */
export async function acquireAuditLock({
  lockPath = AUDIT_LOCK_PATH,
  pid = process.pid,
  label = 'unlabelled',
  timeoutMs = 0,
  pollMs = DEFAULT_POLL_MS,
  log = () => {},
  ...rest
} = {}) {
  const started = Date.now();
  let waits = 0;
  for (;;) {
    const res = tryAcquireAuditLock({
      lockPath,
      pid,
      label,
      onSteal: (prev) => {
        log(
          `[audit-lock] STOLE a stale lock from pid ${prev?.pid} ` +
            `(${prev?.label || 'unlabelled'}, ${prev?.script || '?'}, held since ${prev?.acquiredAt || '?'})`,
        );
      },
      ...rest,
    });
    if (res.ok) {
      if (waits > 0) log(`[audit-lock] acquired after ${Math.round((Date.now() - started) / 1000)}s`);
      return {
        release: () => releaseAuditLock({ lockPath, pid, log }),
        waitedMs: Date.now() - started,
      };
    }

    if (waits === 0 || waits % 12 === 0) {
      if (res.reason === 'peer-process') {
        log(`[audit-lock] waiting — peer audit running: ${res.detail.map((p) => `${p.pid} ${p.command}`).join('; ')}`);
      } else if (res.reason === 'held') {
        log(
          `[audit-lock] waiting — held by pid ${res.detail?.pid} ` +
            `(${res.detail?.label || 'unlabelled'}) since ${res.detail?.acquiredAt || '?'}`,
        );
      } else {
        log(`[audit-lock] waiting — ${res.reason}`);
      }
    }
    waits += 1;

    // A DEADLINE THAT ABORTS, NEVER ONE THAT PROCEEDS. Giving up and running
    // anyway manufactures exactly the contention the lock prevents, silently.
    // But unbounded is not free either: waiting and WEDGED look identical from
    // outside, and a session once sat 68 minutes on a wedged peer unable to tell
    // which it had. So the bound ends the WAIT and kills the chain loudly,
    // naming who holds it and for how long — it never ends the discipline.
    if (timeoutMs > 0 && Date.now() - started >= timeoutMs) {
      const err = new Error(
        `audit lock not acquired within ${Math.round(timeoutMs / 1000)}s (${res.reason})`,
      );
      err.reason = res.reason;
      err.owner = readAuditLockOwner(lockPath);
      err.peers = res.reason === 'peer-process' ? res.detail : auditProcessesRunning({ ignorePids: [pid] });
      throw err;
    }
    await sleep(pollMs);
  }
}

/**
 * Release. Only removes a lock whose owner is US — never-remove-a-lock-you-did-
 * not-create.
 *
 * 🚨 A MISMATCHED OWNER IS A CONTAMINATION FINDING, NOT A NUISANCE WARNING.
 * There are only two ways it happens and both are serious: either the chain
 * double-released (a bug in the chain), or SOMEONE JUDGED US STALE AND STOLE THE
 * LOCK WHILE WE WERE ALIVE — which means our run has been racing a peer's, and
 * any tape either of us produced is contaminated. That is the same verdict the
 * wedge guard prints, reached from the other end: a liveness false positive does
 * not break the lock, it silently invalidates RESULTS. So this returns
 * `contaminated` and the CLI exits non-zero; do not let a chain sail past it.
 *
 * Returns `{ removed, contaminated, owner }`.
 */
export function releaseAuditLock({ lockPath = AUDIT_LOCK_PATH, pid = process.pid, log = () => {} } = {}) {
  if (!fs.existsSync(lockPath)) {
    return { removed: false, contaminated: false, owner: null };
  }
  const owner = readAuditLockOwner(lockPath);
  if (owner && Number(owner.pid) !== Number(pid)) {
    log(
      `[audit-lock] ⚠️ CONTAMINATED — releasing pid ${pid} but the lock is owned by pid ${owner.pid} ` +
        `(${owner.label || 'unlabelled'}, ${owner.script || '?'}, held since ${owner.acquiredAt || '?'}).\n` +
        '[audit-lock] Either this chain double-released, or a peer judged us stale and STOLE the lock while we ' +
        'were alive — in which case two runs overlapped and BOTH tapes are contaminated. Do not file results ' +
        'from this run; rerun it alone.',
    );
    return { removed: false, contaminated: true, owner };
  }
  fs.rmSync(lockPath, { recursive: true, force: true });
  return { removed: true, contaminated: false, owner };
}

// ── CLI ──────────────────────────────────────────────────────────────────────
// The shell-facing half. A bash chain holds the lock across commands, so the
// owner pid is the SHELL's `$$`, not this short-lived node process.

const isMain = process.argv[1] && import.meta.url === `file://${path.resolve(process.argv[1])}`;

if (isMain) {
  const argv = process.argv.slice(2);
  const cmd = argv[0];
  const flag = (name, fallback) => {
    const i = argv.indexOf(`--${name}`);
    return i >= 0 && argv[i + 1] ? argv[i + 1] : fallback;
  };
  const pid = Number(flag('pid', process.pid));
  const label = flag('label', 'cli');
  const log = (m) => console.log(m);

  if (cmd === 'acquire') {
    const deadlineS = Number(flag('deadline', flag('timeout', '0')));
    acquireAuditLock({
      pid,
      label,
      timeoutMs: deadlineS * 1000,
      pollMs: Number(flag('poll', '5')) * 1000,
      log,
    })
      .then(({ waitedMs }) => {
        log(`[audit-lock] HELD by pid ${pid} (${label})${waitedMs > 1000 ? ` after ${Math.round(waitedMs / 1000)}s` : ''}`);
        process.exit(0);
      })
      .catch((err) => {
        // ABORT LOUDLY — name who holds it and since when, so a human can tell a
        // long wait from a wedged owner without going digging.
        console.error(`[audit-lock] ABORTING — ${err.message}`);
        if (err.owner) {
          const heldMs = Date.parse(err.owner.acquiredAt || '') ? Date.now() - Date.parse(err.owner.acquiredAt) : null;
          console.error(
            `[audit-lock] held by pid ${err.owner.pid} (${err.owner.label || 'unlabelled'}, ${err.owner.script || '?'}) ` +
              `since ${err.owner.acquiredAt || '?'}` +
              (heldMs ? ` — ${Math.round(heldMs / 60000)} minutes` : ''),
          );
          console.error(`[audit-lock] session ${err.owner.sessionId || '?'} cwd ${err.owner.cwd || '?'}`);
        }
        for (const p of err.peers || []) console.error(`[audit-lock] peer process ${p.pid} ${p.command}`);
        console.error('[audit-lock] Nothing was run. Nothing contends. Check whether that owner is stuck.');
        process.exit(2);
      });
  } else if (cmd === 'release') {
    const { removed, contaminated } = releaseAuditLock({ pid, log });
    if (contaminated) process.exit(3);
    log(removed ? `[audit-lock] released by pid ${pid}` : '[audit-lock] nothing released');
    process.exit(0);
  } else if (cmd === 'status') {
    const state = inspectAuditLock();
    const peers = auditProcessesRunning();
    log(`lock: ${state.state}${state.owner ? ` — pid ${state.owner.pid} (${state.owner.label}) since ${state.owner.acquiredAt}` : ''}`);
    log(peers.length ? `peer audit processes:\n  ${peers.map((p) => `${p.pid} ${p.command}`).join('\n  ')}` : 'peer audit processes: none');
    process.exit(0);
  } else {
    console.error(
      'usage: audit-lock.mjs acquire|release|status [--pid N] [--label S] [--deadline SECONDS]\n' +
        '\n' +
        '  setopt POSIX_TRAPS   # zsh: an EXIT trap set INSIDE A FUNCTION fires on the\n' +
        '                       # function RETURN, releasing the lock while the audit runs\n' +
        '  node scripts/audit-lib/audit-lock.mjs acquire --pid $$ --label "my chain"\n' +
        "  trap 'node scripts/audit-lib/audit-lock.mjs release --pid $$' EXIT\n" +
        '\n' +
        '  exit 0 held · 2 deadline reached (nothing run) · 3 release owner mismatch (CONTAMINATED)',
    );
    process.exit(64);
  }
}
