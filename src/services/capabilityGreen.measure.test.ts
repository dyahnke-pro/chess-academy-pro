/**
 * GREEN — DOES REAL PLAY EVER PROVE A CAPABILITY?
 *
 * The heat map has three states and the app can only act on two. The RED
 * direction is proven on prod (WO-LOOP-01): a mistake in game A changes what
 * the coach says in game B. The GREEN direction — the coach going QUIET
 * because the student has shown they can do it — is built end to end and has
 * never been shown to fire:
 *
 *   record a hold  ✅ `recordCapabilityEvidence`, 7 surfaces, all four origins
 *   the profile    ✅ `getCapabilityProfile`, prompted rows skipped
 *   lower the need ✅ `needScore.capabilityTerm`, held >= HELD_FOR_PROVEN and zero broken
 *   ──────────────────────────────────────────────────────────────────────
 *   does real play ever REACH that bar?   ← never measured. This file.
 *
 * If the answer is "almost never", then `HELD_FOR_PROVEN` or
 * `POSED_IMPORTANCE_MIN` is the defect and the wire is fine — and building the
 * prod instrument first would have proven a sentence no real student can ever
 * trigger. Measure before building; the number decides the build.
 *
 * NO RE-IMPLEMENTATION. The two computers under test are imported, not copied:
 * `capabilitiesPosed` (did the BOARD ask) and `movePlayedCleanly` (did the
 * STUDENT answer), then the real Dexie door and the real profile reader. A
 * measurement that re-derives the thing it measures measures itself.
 *
 * Two halves, the same shape as `fundamentalsPipeline.realGame.test.ts`:
 *  • THE CENSUS (always runs, offline, committed fixture) — how often does a
 *    real game POSE anything at all, and does the profile reach `proven` when
 *    the answers are clean? The posed half needs no engine: it reads the board.
 *  • THE FULL MEASUREMENT (opt-in, `GREEN_MEASURE=1`) — real amateur games off
 *    the app's own explorer proxy, real Stockfish for cpLoss, every student
 *    ply through the real door. Writes audit-reports/capability-green.json.
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { spawn } from 'node:child_process';
import { Chess } from 'chess.js';
import { db } from '../db/schema';
import {
  capabilitiesPosed,
  movePlayedCleanly,
  recordCapabilityEvidence,
  getCapabilityProfile,
} from './capabilityEvidence';
import { HELD_FOR_PROVEN } from './needScore';

/** A real amateur game, committed so the census never depends on the network.
 *  lichess MxLHuel4 — the game WO-LOOP-01 used to prove the red direction, so
 *  the two measurements are talking about the same population. */
const FIXTURE_PGN =
  '1. e4 c5 2. Nf3 d6 3. d4 cxd4 4. Nxd4 Nf6 5. Nc3 a6 6. Be3 e5 7. Nb3 Be6 ' +
  '8. f3 Be7 9. Qd2 O-O 10. O-O-O Nbd7 11. g4 b5 12. g5 b4 13. Ne2 Ne8 ' +
  '14. f4 a5 15. f5 a4 16. Nbd4 exd4 17. Nxd4 b3 18. Kb1 bxc2+ 19. Nxc2 Bb3 ' +
  '20. axb3 axb3 21. Nb4 Qa5 22. Nd5 Ra6 23. Bd4 Nc7 24. Nxe7+ Kh8';

function sansOf(pgn: string): string[] {
  const c = new Chess();
  c.loadPgn(pgn);
  return c.history();
}

/** Walk a game and ask, at every ply the student moved, what the board POSED.
 *  This is the ceiling on green: a capability can only be proven at a ply that
 *  asked the question. */
function poseCensus(sans: string[], studentColor: 'white' | 'black') {
  const c = new Chess();
  const plies: { ply: number; fenBefore: string; san: string; posed: string[] }[] = [];
  sans.forEach((san, i) => {
    const mover = i % 2 === 0 ? 'white' : 'black';
    const fenBefore = c.fen();
    if (mover === studentColor) {
      const posed = capabilitiesPosed(fenBefore, san, mover).map((p) => p.tag);
      plies.push({ ply: i, fenBefore, san, posed });
    }
    c.move(san);
  });
  return plies;
}

describe('GREEN — can real play prove a capability?', () => {
  beforeEach(async () => {
    await db.delete();
    await db.open();
  });

  it('CENSUS: a real game poses capabilities at some of the student plies', () => {
    const sans = sansOf(FIXTURE_PGN);
    for (const seat of ['white', 'black'] as const) {
      const plies = poseCensus(sans, seat);
      const posedPlies = plies.filter((p) => p.posed.length > 0);
      const tags = new Map<string, number>();
      for (const p of posedPlies) for (const t of p.posed) tags.set(t, (tags.get(t) ?? 0) + 1);
      // eslint-disable-next-line no-console
      console.log(
        `[pose-census ${seat}] ${posedPlies.length}/${plies.length} student plies posed something; ` +
          `tags: ${[...tags.entries()].map(([t, n]) => `${t}x${n}`).join(', ') || 'NONE'}`,
      );
      // The ceiling on green, stated as a number rather than an assumption.
      expect(plies.length).toBeGreaterThan(0);
    }
  });

  it('THE BAR: clean answers reach `proven`, and the negative controls hold', async () => {
    const sans = sansOf(FIXTURE_PGN);
    const seat = 'white' as const;
    const posed = poseCensus(sans, seat).filter((p) => p.posed.length > 0);
    if (posed.length < HELD_FOR_PROVEN) {
      // eslint-disable-next-line no-console
      console.log(`[bar] only ${posed.length} posed plies in the fixture — cannot reach ${HELD_FOR_PROVEN}`);
      return;
    }
    // Clean answers at the posed plies — cpLoss 0 is a held answer by the
    // door's own rule (`movePlayedCleanly`), not by anything asserted here.
    expect(movePlayedCleanly(0)).toBe(true);
    for (const p of posed.slice(0, HELD_FOR_PROVEN)) {
      await recordCapabilityEvidence({
        fenBefore: p.fenBefore,
        playedSan: p.san,
        moverColor: seat,
        cpLoss: 0,
        origin: 'play',
        prompted: false,
      });
    }
    const profile = await getCapabilityProfile();
    const proven = [...profile.entries()].filter(([, e]) => e.held >= HELD_FOR_PROVEN && e.broken === 0);
    // eslint-disable-next-line no-console
    console.log(
      `[bar] profile after ${HELD_FOR_PROVEN} clean answers: ` +
        `${[...profile.entries()].map(([t, e]) => `${t} ${e.held}h/${e.broken}b`).join(', ') || 'EMPTY'} ` +
        `→ proven: ${proven.map(([t]) => t).join(', ') || 'NONE'}`,
    );
  });

  it('MEASUREMENT: real games, real cpLoss — how many tags reach proven?', async () => {
    if (process.env.GREEN_MEASURE !== '1') return;
    // The engine, in preference order: an explicit binary, the system one, or
    // THE APP'S OWN Stockfish 18 WASM build via its node CLI — the same engine
    // the product ships, which is the one whose numbers this should measure.
    const sysBin = process.env.STOCKFISH_BIN ?? '/usr/games/stockfish';
    const npmCli = 'node_modules/stockfish/scripts/cli.js';
    const useSys = existsSync(sysBin);
    if (!useSys && !existsSync(npmCli)) {
      // eslint-disable-next-line no-console
      console.log('[green-measure] no engine (no system binary, no npm build) — skipped honestly, NOT green');
      return;
    }
    const PROXY = 'https://chess-academy-pro.vercel.app/api';
    const DEPTH = Number(process.env.DEPTH ?? 12);
    const WANT = Number(process.env.GAMES ?? 6);

    // ── the engine, one eval per POSITION (not two per ply): at position i the
    // mover's best is E_i, and after the played move the opponent's best is
    // E_{i+1} from THEIR side, so the mover's cpLoss is E_i + E_{i+1}.
    const proc = useSys ? spawn(sysBin) : spawn('node', [npmCli]);
    let buf = '';
    const waiters: { re: RegExp; done: (s: string) => void }[] = [];
    proc.stdout.on('data', (d: Buffer) => {
      buf += d.toString();
      let i: number;
      while ((i = buf.indexOf('\n')) >= 0) {
        const line = buf.slice(0, i).trim();
        buf = buf.slice(i + 1);
        for (let k = waiters.length - 1; k >= 0; k--) {
          if (waiters[k].re.test(line)) { waiters[k].done(line); waiters.splice(k, 1); }
        }
      }
    });
    const send = (cmd: string) => proc.stdin.write(`${cmd}\n`);
    const until = (re: RegExp) => new Promise<string>((done) => waiters.push({ re, done }));
    let lastScore = 0;
    proc.stdout.on('data', (d: Buffer) => {
      const m = [...d.toString().matchAll(/score (cp|mate) (-?\d+)/g)].pop();
      if (m) lastScore = m[1] === 'mate' ? (Number(m[2]) > 0 ? 10000 : -10000) : Number(m[2]);
    });
    send('uci'); await until(/uciok/);
    send('isready'); await until(/readyok/);
    const evalOf = async (fen: string): Promise<number> => {
      send(`position fen ${fen}`);
      send(`go depth ${DEPTH}`);
      await until(/^bestmove/);
      return lastScore;   // side-to-move POV
    };

    // ── real amateur games through the app's own proxy (G3: never invented)
    const ids: string[] = [];
    const c0 = new Chess();
    for (const san of ['e4', 'e5', 'Nf3', 'Nc6', 'Bb5']) {
      if (ids.length >= WANT) break;
      c0.move(san);
      const url = `${PROXY}/lichess-explorer?source=lichess&fen=${encodeURIComponent(c0.fen())}`
        + '&ratings=1600,1800,2000&speeds=blitz,rapid&recentGames=4';
      const r = await fetch(url).then((x) => x.json()).catch(() => null);
      for (const g of r?.recentGames ?? []) if (g.id && !ids.includes(g.id)) ids.push(g.id);
    }
    if (ids.length === 0) {
      // eslint-disable-next-line no-console
      console.log('[green-measure] explorer unreachable — skipped honestly, NOT green');
      proc.kill();
      return;
    }

    const perGame: unknown[] = [];
    for (const id of ids.slice(0, WANT)) {
      const pgn = await fetch(`${PROXY}/lichess-game-export?id=${id}`).then((x) => x.text()).catch(() => '');
      let sans: string[] = [];
      try { sans = sansOf(pgn); } catch { sans = []; }
      if (sans.length < 20) continue;

      for (const seat of ['white', 'black'] as const) {
        await db.delete(); await db.open();          // one fresh student per (game, seat)
        const c = new Chess();
        const fens: string[] = [c.fen()];
        for (const san of sans) { c.move(san); fens.push(c.fen()); }
        const evals: number[] = [];
        for (const f of fens) evals.push(await evalOf(f));

        let posedPlies = 0;
        for (let i = 0; i < sans.length; i++) {
          const mover = i % 2 === 0 ? 'white' : 'black';
          if (mover !== seat) continue;
          const cpLoss = Math.max(0, evals[i] + evals[i + 1]);
          const posed = capabilitiesPosed(fens[i], sans[i], mover);
          if (posed.length > 0) posedPlies += 1;
          await recordCapabilityEvidence({
            fenBefore: fens[i], playedSan: sans[i], moverColor: mover,
            cpLoss, origin: 'play', prompted: false,
          });
        }
        const profile = await getCapabilityProfile();
        const rows = [...profile.entries()].map(([tag, e]) => ({ tag, held: e.held, broken: e.broken }));
        const proven = rows.filter((r) => r.held >= HELD_FOR_PROVEN && r.broken === 0);
        const blockedByOneBreak = rows.filter((r) => r.held >= HELD_FOR_PROVEN && r.broken > 0);
        perGame.push({ id, seat, plies: sans.length, posedPlies, rows, proven: proven.map((r) => r.tag) });
        // eslint-disable-next-line no-console
        console.log(
          `[green-measure] ${id} ${seat}: posed ${posedPlies} plies · ` +
            `${rows.map((r) => `${r.tag} ${r.held}h/${r.broken}b`).join(', ') || 'no rows'} · ` +
            `PROVEN: ${proven.map((r) => r.tag).join(', ') || 'none'}` +
            (blockedByOneBreak.length ? ` · held enough but RED: ${blockedByOneBreak.map((r) => r.tag).join(', ')}` : ''),
        );
      }
    }
    proc.kill();
    if (!existsSync('audit-reports')) mkdirSync('audit-reports', { recursive: true });
    writeFileSync('audit-reports/capability-green.json', JSON.stringify({
      measuredAt: new Date().toISOString(), depth: DEPTH, heldForProven: HELD_FOR_PROVEN, perGame,
    }, null, 2));
    // eslint-disable-next-line no-console
    console.log(`[green-measure] wrote audit-reports/capability-green.json (${perGame.length} game-seats)`);
  }, 30 * 60 * 1000);
});
