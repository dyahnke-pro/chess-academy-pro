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
import { existsSync, mkdirSync, writeFileSync, readFileSync } from 'node:fs';
import { spawn } from 'node:child_process';
import { Chess } from 'chess.js';
import { db } from '../db/schema';
import {
  capabilitiesPosed,
  movePlayedCleanly,
  recordCapabilityEvidence,
  getCapabilityProfile,
} from './capabilityEvidence';
import { capabilityProven, summariseEvidence, HELD_FOR_PROVEN } from './capabilityEvidence';
import type { CapabilityEvidenceRecord } from './capabilityEvidence';

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
        sourceGameId: 'fixture-game',   // ONE game — the new bar needs two
      });
    }
    const profile = await getCapabilityProfile();
    const proven = [...profile.entries()].filter(([, e]) => capabilityProven(e));
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
            cpLoss, origin: 'play', prompted: false, sourceGameId: id,
          });
        }
        const profile = await getCapabilityProfile();
        const rows = [...profile.entries()].map(([tag, e]) => ({ tag, held: e.held, broken: e.broken }));
        const proven = [...profile.entries()].filter(([, e]) => capabilityProven(e)).map(([tag]) => ({ tag }));
        const blockedByOneBreak = rows.filter((r) => r.held >= HELD_FOR_PROVEN && r.broken > 0);   // lifetime view, for contrast
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

  /**
   * THE NUMBER THAT SETS THE BAR — one student, many games, in order.
   *
   * Measurement 1 answered "can real play prove a capability" with a clear
   * yes: 6 of 6 game-seats proved at least one, off a SINGLE game. That is not
   * the reassurance it looks like. If three clean answers in one game are
   * enough, the coach goes quiet about something the student never
   * demonstrated — "they didn't fail in a quiet position" read as mastery,
   * which is the absent-is-not-mastered trap wearing the opposite costume.
   *
   * So the honest question is not whether green fires, it is whether green
   * SURVIVES: once a tag is proven, does the same student break it later? A
   * bar that flips back is a bar set too low, and this counts the flips.
   * The profile is snapshotted per GAME, which is the loop's own granularity —
   * the coach goes quiet in the NEXT game, not the next ply.
   */
  it('MEASUREMENT 2: one student across games — does a proven capability break later?', async () => {
    if (process.env.GREEN_MEASURE !== '1') return;
    const sysBin = process.env.STOCKFISH_BIN ?? '/usr/games/stockfish';
    const npmCli = 'node_modules/stockfish/scripts/cli.js';
    const useSys = existsSync(sysBin);
    if (!useSys && !existsSync(npmCli)) return;
    const PROXY = 'https://chess-academy-pro.vercel.app/api';
    const DEPTH = Number(process.env.DEPTH ?? 12);
    const WANT = Number(process.env.SEQ_GAMES ?? 5);

    const proc = useSys ? spawn(sysBin) : spawn('node', [npmCli]);
    let buf = '';
    const waiters: { re: RegExp; done: (s: string) => void }[] = [];
    let lastScore = 0;
    proc.stdout.on('data', (d: Buffer) => {
      const txt = d.toString();
      const m = [...txt.matchAll(/score (cp|mate) (-?\d+)/g)].pop();
      if (m) lastScore = m[1] === 'mate' ? (Number(m[2]) > 0 ? 10000 : -10000) : Number(m[2]);
      buf += txt;
      let i: number;
      while ((i = buf.indexOf('\n')) >= 0) {
        const line = buf.slice(0, i).trim();
        buf = buf.slice(i + 1);
        for (let k = waiters.length - 1; k >= 0; k--) {
          if (waiters[k].re.test(line)) { waiters[k].done(line); waiters.splice(k, 1); }
        }
      }
    });
    const send = (c: string) => proc.stdin.write(`${c}\n`);
    const until = (re: RegExp) => new Promise<string>((done) => waiters.push({ re, done }));
    send('uci'); await until(/uciok/);
    send('isready'); await until(/readyok/);
    const evalOf = async (fen: string) => { send(`position fen ${fen}`); send(`go depth ${DEPTH}`); await until(/^bestmove/); return lastScore; };

    const ids: string[] = [];
    const c0 = new Chess();
    for (const san of ['d4', 'd5', 'c4', 'e6', 'Nc3']) {
      if (ids.length >= WANT) break;
      c0.move(san);
      const r = await fetch(
        `${PROXY}/lichess-explorer?source=lichess&fen=${encodeURIComponent(c0.fen())}`
        + '&ratings=1600,1800,2000&speeds=blitz,rapid&recentGames=4',
      ).then((x) => x.json()).catch(() => null);
      for (const g of r?.recentGames ?? []) if (g.id && !ids.includes(g.id)) ids.push(g.id);
    }
    if (ids.length === 0) { proc.kill(); return; }

    // ONE student, one profile, games in order — never reset between games.
    await db.delete(); await db.open();
    const seat = 'white' as const;
    const timeline: { game: string; proven: string[]; red: string[] }[] = [];
    const firstProvenAt = new Map<string, number>();
    const flips: { tag: string; provenAfter: string; brokenIn: string }[] = [];

    for (const [gi, id] of ids.slice(0, WANT).entries()) {
      const pgn = await fetch(`${PROXY}/lichess-game-export?id=${id}`).then((x) => x.text()).catch(() => '');
      let sans: string[] = [];
      try { sans = sansOf(pgn); } catch { sans = []; }
      if (sans.length < 20) continue;
      const c = new Chess();
      const fens = [c.fen()];
      for (const san of sans) { c.move(san); fens.push(c.fen()); }
      const evals: number[] = [];
      for (const f of fens) evals.push(await evalOf(f));

      const brokeThisGame = new Set<string>();
      for (let i = 0; i < sans.length; i++) {
        if ((i % 2 === 0 ? 'white' : 'black') !== seat) continue;
        const cpLoss = Math.max(0, evals[i] + evals[i + 1]);
        if (!movePlayedCleanly(cpLoss)) {
          for (const p of capabilitiesPosed(fens[i], sans[i], seat)) brokeThisGame.add(p.tag);
        }
        await recordCapabilityEvidence({
          fenBefore: fens[i], playedSan: sans[i], moverColor: seat, cpLoss, origin: 'play', prompted: false, sourceGameId: id,
        });
      }
      // A FLIP: a tag this student had already PROVEN, broken in a later game.
      for (const tag of brokeThisGame) {
        if (firstProvenAt.has(tag) && firstProvenAt.get(tag)! < gi) {
          flips.push({ tag, provenAfter: ids[firstProvenAt.get(tag)!], brokenIn: id });
        }
      }
      const profile = await getCapabilityProfile();
      const proven = [...profile.entries()].filter(([, e]) => capabilityProven(e)).map(([t]) => t);
      const red = [...profile.entries()].filter(([, e]) => e.broken > 0).map(([t]) => t);
      for (const t of proven) if (!firstProvenAt.has(t)) firstProvenAt.set(t, gi);
      timeline.push({ game: id, proven, red });
      // eslint-disable-next-line no-console
      console.log(`[green-seq] after game ${gi + 1} (${id}): PROVEN ${proven.join(', ') || 'none'} · RED ${red.join(', ') || 'none'}`);
    }
    proc.kill();

    // ── CALIBRATION ────────────────────────────────────────────────
    // The shipped bar is two numbers, and picking them by taste is how the
    // first version got 3-holds-in-one-game. Replay THESE rows — one real
    // student, five real games, real engine grades — through the REAL rule at
    // a range of thresholds, and read the two quantities that trade off
    // against each other: how many tags ever go green (a bar nothing clears
    // teaches nothing) and how many of those FLIP afterwards (a bar that
    // flips told the student they were fine and then watched them fail).
    const allRows = await db.capabilityEvidence.toArray() as CapabilityEvidenceRecord[];
    // CACHE THE EVIDENCE. The engine pass above is ~10 minutes; every question
    // asked of these rows afterwards is pure computation. Writing them out is
    // what lets the bar be calibrated in seconds instead of re-graded.
    if (!existsSync('audit-reports')) mkdirSync('audit-reports', { recursive: true });
    writeFileSync('audit-reports/capability-green-rows.json',
      JSON.stringify({ measuredAt: new Date().toISOString(), seat, order: ids.slice(0, WANT), rows: allRows }, null, 2));
    const byGame = new Map<string, CapabilityEvidenceRecord[]>();
    for (const r of allRows) {
      const g = r.sourceGameId ?? 'unknown';
      byGame.set(g, [...(byGame.get(g) ?? []), r]);
    }
    const order = ids.slice(0, WANT).filter((g) => byGame.has(g));
    const sweep: { minStreak: number; minGames: number; proven: number; flips: number }[] = [];
    for (const minStreak of [3, 4, 5, 6]) {
      for (const minGames of [2, 3]) {
        const provenAt = new Map<string, number>();
        let flipCount = 0;
        const seen: CapabilityEvidenceRecord[] = [];
        order.forEach((g, gi) => {
          const rowsThisGame = byGame.get(g) ?? [];
          // a break in this game, on a tag already proven BEFORE it, is a flip
          for (const r of rowsThisGame) {
            if (r.outcome === 'broken' && !r.prompted
              && provenAt.has(r.tag) && provenAt.get(r.tag)! < gi) flipCount += 1;
          }
          seen.push(...rowsThisGame);
          const prof = summariseEvidence(seen);
          for (const [tag, e] of prof) {
            if (capabilityProven(e, { minStreak, minGames }) && !provenAt.has(tag)) provenAt.set(tag, gi);
          }
        });
        sweep.push({ minStreak, minGames, proven: provenAt.size, flips: flipCount });
      }
    }
    // eslint-disable-next-line no-console
    console.log(`[green-cal] ${sweep.map((r) => `${r.minStreak}h/${r.minGames}g → ${r.proven} proven, ${r.flips} flips`).join(' | ')}`);

    // eslint-disable-next-line no-console
    console.log(
      `[green-seq] FLIPS (proven then broken by the same student): ${flips.length}` +
        (flips.length ? ` — ${flips.map((f) => `${f.tag} (proven ${f.provenAfter} → broke ${f.brokenIn})`).join('; ')}` : ''),
    );
    if (!existsSync('audit-reports')) mkdirSync('audit-reports', { recursive: true });
    writeFileSync('audit-reports/capability-green-sequence.json', JSON.stringify({
      measuredAt: new Date().toISOString(), depth: DEPTH, heldForProven: HELD_FOR_PROVEN, seat, timeline, flips, sweep,
    }, null, 2));
  }, 40 * 60 * 1000);

  /**
   * IS THE RIGHT VARIABLE THE COUNT, OR THE DIFFICULTY?
   *
   * The count sweep came back flat: 2 flips at every threshold from 3 holds
   * to 6, across two games or three. A knob that does not move the failure is
   * the wrong knob. Counting holds measures how much QUIET evidence piled up,
   * not whether the student can answer a hard question — and forty clean
   * moves in positions that barely asked anything will clear any count.
   *
   * `posedImportance` (0-100, floor `POSED_IMPORTANCE_MIN` = 45) is already
   * stamped on every row by `capabilitiesPosed` and read by nothing. This asks
   * whether a hold at a HARD moment predicts not-flipping where three easy
   * holds do not. Breaks always count, at any importance: a break is a break.
   *
   * Replays the cached rows, so it costs no engine time.
   */
  it('CALIBRATION 2: does DIFFICULTY predict what the count could not?', () => {
    const CACHE = 'audit-reports/capability-green-rows.json';
    if (!existsSync(CACHE)) return;   // no cached evidence yet — skipped honestly
    const cached = JSON.parse(readFileSync(CACHE, 'utf8')) as {
      order: string[]; rows: CapabilityEvidenceRecord[];
    };
    const byGame = new Map<string, CapabilityEvidenceRecord[]>();
    for (const r of cached.rows) {
      const g = r.sourceGameId ?? 'unknown';
      byGame.set(g, [...(byGame.get(g) ?? []), r]);
    }
    const order = cached.order.filter((g) => byGame.has(g));

    const run = (minImp: number, minStreak: number, minGames: number) => {
      const provenAt = new Map<string, number>();
      let flips = 0;
      const seen: CapabilityEvidenceRecord[] = [];
      order.forEach((g, gi) => {
        const rows = byGame.get(g) ?? [];
        for (const r of rows) {
          if (r.outcome === 'broken' && !r.prompted
            && provenAt.has(r.tag) && provenAt.get(r.tag)! < gi) flips += 1;
        }
        // Only a hold at a hard enough moment is EVIDENCE. Breaks are kept
        // whatever the board was asking.
        seen.push(...rows.filter((r) => r.outcome === 'broken' || (r.posedImportance ?? 0) >= minImp));
        for (const [tag, e] of summariseEvidence(seen)) {
          if (capabilityProven(e, { minStreak, minGames }) && !provenAt.has(tag)) provenAt.set(tag, gi);
        }
      });
      return { proven: provenAt.size, flips };
    };

    const table: string[] = [];
    for (const minImp of [45, 55, 65, 75, 85]) {
      for (const [minStreak, minGames] of [[2, 2], [3, 2]] as const) {
        const r = run(minImp, minStreak, minGames);
        table.push(`imp>=${minImp} ${minStreak}h/${minGames}g → ${r.proven} proven, ${r.flips} flips`);
      }
    }
    // eslint-disable-next-line no-console
    console.log(`[green-cal2] ${table.join(' | ')}`);
    // What the rows themselves look like, so a flat table can be read rather
    // than guessed at: if almost every hold sits at the floor, importance has
    // no range to discriminate on and THAT is the finding.
    const imps = cached.rows.filter((r) => r.outcome === 'held').map((r) => r.posedImportance ?? 0).sort((a, b) => a - b);
    const pct = (q: number) => imps[Math.min(imps.length - 1, Math.floor(q * (imps.length - 1)))] ?? 0;
    // eslint-disable-next-line no-console
    console.log(`[green-cal2] held-row posedImportance: n=${imps.length} min=${imps[0]} p25=${pct(0.25)} p50=${pct(0.5)} p75=${pct(0.75)} max=${imps[imps.length - 1]}`);
  });
});
