// EXPERT FADE — do a strong player's IMPORTED games silence the basics from the
// first session? (David 2026-10-18: "coach explains should be algo based and
// based off of imported games that are analyzed — adjust right off the bat").
// Feeds Carlsen's own moves (treated as clean: a world champion's moves are
// near enough to the engine's) through the SAME posed-question computer the
// analysis sweep records with, and reports which skills turn GREEN after N
// games — the fade the Learn door reads. Not a gate.
// Run: EXPERT_FADE=1 npx vitest run src/services/expertFade.measure.test.ts
import { describe, it, expect } from 'vitest';
import { existsSync, readFileSync } from 'node:fs';
import { Chess } from 'chess.js';
import { capabilitiesPosed, summariseEvidence, capabilityProven, type CapabilityEvidenceRecord } from './capabilityEvidence';
import { MISCONCEPTION_TAGS } from '../data/misconceptionTags';
import { classifyMisconceptionNow } from './misconceptionClassifier';
import { classifyPhase } from './gamePhaseService';

const SRC = 'data/sources/carlsen-otb/Carlsen.pgn';
const HAVE = existsSync(SRC) && process.env.EXPERT_FADE === '1';

describe.skipIf(!HAVE)('expert fade', () => {
  it('which skills Carlsen proves within his first imported games', () => {
    const games = readFileSync(SRC, 'utf8').split(/\n(?=\[Event )/).slice(-40);
    const rows: CapabilityEvidenceRecord[] = [];
    let t = 0;
    const greenAfter = new Map<string, number>();
    games.forEach((pgn, gi) => {
      const seat = /\[White "Carlsen/.test(pgn) ? 'white' : 'black';
      const c = new Chess();
      try { c.loadPgn(pgn); } catch { return; }
      const sans = c.history();
      const b = new Chess();
      for (const san of sans) {
        const mover = b.turn() === 'w' ? 'white' : 'black';
        const fen = b.fen();
        b.move(san);
        if (mover !== seat) continue;
        for (const q of capabilitiesPosed(fen, san, mover)) {
          rows.push({ id: `${t}`, tag: q.tag, outcome: q.outcome === 'broken' ? 'broken' : 'held', fen, playedSan: san, posedImportance: q.posedImportance, recordedAt: t++, origin: 'review', prompted: false, sourceGameId: `g${gi}` } as CapabilityEvidenceRecord);
        }
      }
      const profile = summariseEvidence(rows);
      for (const [tag, e] of profile) if (capabilityProven(e) && !greenAfter.has(tag)) greenAfter.set(tag, gi + 1);
    });
    const all = MISCONCEPTION_TAGS.filter((x) => x.bucket !== 'uncategorized').map((x) => x.id);
    console.log('GREEN after N games:', JSON.stringify([...greenAfter].sort((a, b) => a[1] - b[1])));
    console.log('NEVER green in 40 games:', JSON.stringify(all.filter((x) => !greenAfter.has(x))));
    const posed = new Map<string, number>();
    for (const r of rows) posed.set(r.tag, (posed.get(r.tag) ?? 0) + 1);
    const imp = new Map<string, number[]>();
    for (const r of rows) { const a = imp.get(r.tag) ?? []; a.push(r.posedImportance); imp.set(r.tag, a); }
    console.log('importance (min/median/max):', JSON.stringify([...imp].map(([k, v]) => { v.sort((x, y) => x - y); return [k, v[0], v[Math.floor(v.length / 2)], v[v.length - 1]]; })));
    console.log('posed counts:', JSON.stringify([...posed].sort((a, b) => b[1] - a[1])));
    expect(rows.length).toBeGreaterThan(0);
  }, 600_000);
});

// FALSE GREENS — one REAL student (David's 80 chess.com games, engine d14),
// games in order: how often does a skill turn green and then break later?
// Compared with and without routine credit, so the change is measured.
describe.skipIf(!(existsSync('data/sources/acc-david/multipv-d14.json') && process.env.EXPERT_FADE === '1'))('false greens on one real student', () => {
  it('flips with and without routine credit', () => {
    interface Line { cp: number | null; mate: number | null; pv: string[] }
    interface Ply { fen: string; san: string | null; lines: Line[] }
    interface G { id: string; us: string; white: string; plies: Ply[] }
    const ATTRIB = process.env.ATTRIB === '1';
    const games = (JSON.parse(readFileSync('data/sources/acc-david/multipv-d14.json', 'utf8')) as G[]).slice().reverse();
    const cap = (l: Line | undefined): number | null => (!l ? null : l.mate !== null ? (l.mate > 0 ? 1500 : -1500) : l.cp);
    const rows: CapabilityEvidenceRecord[] = [];
    let t = 0;
    const run = (minImportance: number | undefined, routine: boolean, bar: { minStreak?: number; minGames?: number } = {}): { flips: number; greens: number } => {
      let flips = 0; let greens = 0;
      const proven = new Set<string>();
      const sub: CapabilityEvidenceRecord[] = [];
      for (const r of rows) {
        // routine off = the old rule: a sub-bar hold earns nothing.
        if (!routine && r.posedImportance < 80 && r.outcome === 'held') continue;
        sub.push(r);
        if (r.outcome === 'broken' && proven.has(r.tag)) { flips += 1; proven.delete(r.tag); }
        if (r.recordedAt % 1 === 0) {
          const e = summariseEvidence(sub, minImportance ? { minImportance } : {}).get(r.tag);
          if (e && capabilityProven(e, bar) && !proven.has(r.tag)) { proven.add(r.tag); greens += 1; }
        }
      }
      return { flips, greens };
    };
    for (const g of games) {
      const seat = g.white.toLowerCase() === g.us.toLowerCase() ? 'white' : 'black';
      for (let i = 0; i < g.plies.length - 1; i += 1) {
        const p = g.plies[i];
        if (!p.san) break;
        const mover = new Chess(p.fen).turn() === 'w' ? 'white' : 'black';
        if (mover !== seat) continue;
        const best = cap(p.lines[0]); const after = cap(g.plies[i + 1].lines[0]);
        if (best === null || after === null) continue;
        const cpLoss = Math.max(0, (best - after) * (mover === 'white' ? 1 : -1));
        const history = g.plies.slice(0, i + 1).map((x) => x.san as string);
        let slipTag: string | null = null;
        if (cpLoss >= 100) {
          const bestUci = p.lines[0]?.pv[0];
          let bestSan: string | undefined;
          try { bestSan = bestUci ? new Chess(p.fen).move({ from: bestUci.slice(0, 2), to: bestUci.slice(2, 4), promotion: bestUci[4] })?.san : undefined; } catch { bestSan = undefined; }
          slipTag = classifyMisconceptionNow({ fen: p.fen, playedSan: p.san, bestSan, historySans: history, gamePhase: classifyPhase(p.fen, { fullMove: Math.floor(i / 2) + 1 }) })?.tag ?? 'other';
        }
        for (const q of capabilitiesPosed(p.fen, p.san, mover)) {
          const brokenAny = q.outcome === 'broken' || cpLoss >= 100;
          const brokenOwn = q.outcome === 'broken' || (cpLoss >= 100 && slipTag === q.tag);
          if (ATTRIB && cpLoss >= 100 && !brokenOwn) continue;
          rows.push({ id: `${t}`, tag: q.tag, outcome: (ATTRIB ? brokenOwn : brokenAny) ? 'broken' : 'held', fen: p.fen, playedSan: p.san, posedImportance: q.posedImportance, recordedAt: t++, origin: 'review', prompted: false, sourceGameId: g.id } as CapabilityEvidenceRecord);
        }
      }
    }
    console.log('OLD (sharp only):', JSON.stringify(run(undefined, false)));
    console.log('NEW (routine half credit):', JSON.stringify(run(undefined, true)));
    for (const ms of [2, 4, 6, 8, 12]) for (const mg of [2, 3, 5]) {
      const r = run(undefined, true, { minStreak: ms, minGames: mg });
      console.log(`SWEEP streak>=${ms} games>=${mg}: greens=${r.greens} flips=${r.flips} survive=${r.greens - r.flips}`);
    }
    expect(rows.length).toBeGreaterThan(0);
  }, 900_000);
});
