// THE IDEA SHEETS (round 9's measure, rebuilt). For each opening position a
// written note exists for (Wikibooks "Chess Opening Theory", reference only —
// `data/sources/wikibooks/`, fetched by scripts/theory/scrape-wikibooks.mjs), the
// note's IDEAS are read — plan, break, pieces, structure, trap, decision,
// move-order, gambit, endgame — and each is scored: did the theory narrator say
// an idea of that kind at that position? Micro-average, two sets:
//   core      the openings the tuning reads;
//   held-out  every opening whose first four plies hash to 0 mod 4 — NEVER
//             printed, never read while tuning, only scored.
// Each set is scored with the opening's name (the identity facts the name
// brings) and without it.
//   THEORY_SHEETS=1 [THEORY_SHEETS_EVERY=n] [THEORY_SHEETS_MISSES=kind] \
//     npx vitest run src/services/theorySheets.measure.test.ts
import { describe, it, beforeAll } from 'vitest';
import { readFileSync, existsSync, writeFileSync, mkdirSync } from 'node:fs';
import { Chess } from 'chess.js';
import { __setLocalDbForTests, masterMovesCachedSync } from './masterPlayLookup';
import { __setContinuationsForTests } from './mastersContinuation';
import { composeTheoryTurn, roadsFrom, type TheorySentenceKind } from './theoryComposer';
import { gambitDeclinedRead, choiceAheadRead, sacrificeRead, planAheadRead, gambitAcceptedRead, gambitStandingRead, namedRoadsRead, structureRead, gambitRead, endgameRead, moveOrderRead, transpositionRead, pieceJobRead, trapRead, gambitAheadRead, centreRead } from './theoryReads';
import { knownSlipsAt, knownSlipIndexNow, setKnownSlipIndexForTests } from './knownSlips';
import { openingTheoryFacts } from './openingTheory';
import { setOpeningPositions, openingAtPosition } from './openingPositions';
import { setOpeningIdentity, identityFor } from './openingIdentity';

type Idea = 'plan' | 'break' | 'pieces' | 'structure' | 'trap' | 'decision' | 'move-order' | 'gambit' | 'endgame';
const IDEAS: Idea[] = ['plan', 'break', 'pieces', 'structure', 'trap', 'decision', 'move-order', 'gambit', 'endgame'];
const TAGS: Record<Idea, RegExp> = {
  plan: /\b(plan|aims? to|aiming|intends?|idea (?:is|behind)|strategy|wants? to|hopes? to|goal)\b/i,
  break: /\b(break|lever|undermin\w*|strik\w* at|pawn (?:push|storm)|advanc\w+ the)\b/i,
  pieces: /\b(outpost|fianchetto|long diagonal|reroute|belongs? on|best square|good square|ideal square|eyeing|targeting|aimed at|pressure on)\b/i,
  structure: /\b(pawn structure|pawn chain|isolated|backward|doubled|hanging pawns|pawn island|open file|half-open|closed (?:centre|center|position)|locked|pawn majority|space advantage)\b/i,
  trap: /\b(trap|blunder\w*|falls? (?:for|into)|walks? into|refut\w*|loses? (?:a |the )?(?:piece|queen|pawn|material|bishop|knight|rook))\b|\d\.{1,3}\s*[A-Za-z][A-Za-z0-9+#=-]*\?/i,
  decision: /\b(alternatively|alternative|instead of|can also|may also|also possible|another (?:option|way|move)|sideline|rather than|options?|choice)\b/i,
  'move-order': /\b(transpos\w*|move[- ]order|reach(?:es)? the same|same position)\b/i,
  // Case-sensitive on "gambit": "Queen's Gambit" is a name, not an idea.
  gambit: /\b(gambit|sacrific\w*|pawn down|down a pawn|offers? (?:a|the) pawn|giv\w+ up a pawn)\b/,
  endgame: /\b(endgame|queens? (?:are |get )?(?:traded|exchanged|off)|simplif\w*)\b/i,
};
const prose = (t: string): string => t
  .replace(/\{\{[^{}]*\}\}/g, '').replace(/\{\{[\s\S]*?\n\}\}/g, '').replace(/<table[\s\S]*?<\/table>/g, '').replace(/<[^>]+>/g, '')
  .replace(/\[\[(?:[^|\]]*\|)?([^\]]*)\]\]/g, '$1').replace(/'''?/g, '')
  .split('\n').map((l) => l.trim()).filter((l) => l && !/^[=|*{}!:]/.test(l)).join(' ');
const fenOf = (sans: readonly string[]): string => { const c = new Chess(); for (const s of sans) c.move(s); return c.fen(); };
const hash = (s: string): number => { let h = 0; for (const ch of s) h = (h * 31 + ch.charCodeAt(0)) >>> 0; return h; };

interface Note { title: string; lineSan: string[]; text: string }
const KIND_IDEAS: Record<TheorySentenceKind, Idea[]> = {
  decision: ['decision'], plan: ['plan', 'break'], piece: ['pieces'], castle: [], trap: ['trap'],
  structure: ['structure'], 'move-order': ['move-order'], gambit: ['gambit'], endgame: ['endgame'],
};

describe.runIf(!!process.env.THEORY_SHEETS && existsSync('data/sources/wikibooks/wikibooks-notes.json'))('theory idea sheets', () => {
  beforeAll(() => {
    __setLocalDbForTests(JSON.parse(readFileSync('public/data/openings-masters-db.json', 'utf8')));
    if (existsSync('public/data/masters-continuations.json')) __setContinuationsForTests((JSON.parse(readFileSync('public/data/masters-continuations.json', 'utf8')) as { positions: never }).positions);
    setOpeningPositions(JSON.parse(readFileSync('public/data/opening-positions.json', 'utf8')));
    setOpeningIdentity(JSON.parse(readFileSync('public/data/opening-identity.json', 'utf8')));
    // The lecture's own index: the club slips, the curated gems where it holds none.
    setKnownSlipIndexForTests((JSON.parse(readFileSync('public/data/club-gems.json', 'utf8')) as { boards: never }).boards);
  });

  /** What the narrator says at this position, as idea kinds. */
  function said(n: Note, withName: boolean): { kinds: Set<Idea>; lines: Array<[Idea, string]> } {
    const c = new Chess();
    const history = n.lineSan.slice(0, -1);
    for (const s of history) c.move(s);
    const fenBefore = c.fen();
    const san = n.lineSan[n.lineSan.length - 1];
    const mover = c.turn();
    c.move(san);
    const fenAfter = c.fen();
    // The plan ahead: the lecture's own computer (`planAheadRead`).
    const ahead = planAheadRead({ history, san, mover, whose: 'your', movesAt: (f) => masterMovesCachedSync(f) });
    const turn = composeTheoryTurn({
      fen: fenBefore, san, mover, whose: 'your', roads: roadsFrom(masterMovesCachedSync(fenBefore)),
      plan: ahead.plan,
      piece: ahead.piece,
      structure: structureRead({ fenBefore, san, mover, prior: history.length ? { fenBefore: fenOf(history.slice(0, -1)), san: history[history.length - 1] } : null }) ?? centreRead({ fenBefore, san, mover }),
      gambit: gambitRead({ fenBefore, san, mover }) ?? sacrificeRead({ fenBefore, san, mover, movesAt: (f) => masterMovesCachedSync(f) }) ?? gambitAcceptedRead({ fenBefore, san, mover }) ?? gambitDeclinedRead({ fenBefore, san, mover }) ?? gambitAheadRead({ fen: fenAfter, movesAt: (f) => masterMovesCachedSync(f) }) ?? gambitStandingRead({ fenBefore, san, mover }),
      endgame: endgameRead({ fenBefore, san, movesAt: (f) => masterMovesCachedSync(f) }),
      moveOrder: moveOrderRead({ history: n.lineSan, student: mover }) ?? transpositionRead({ history: n.lineSan, movesAt: (f) => masterMovesCachedSync(f) }),
      pieceJob: pieceJobRead({ fenBefore, san, mover }),
      namedRoads: namedRoadsRead({ fen: fenAfter, movesAt: (f) => masterMovesCachedSync(f) }),
      choiceAhead: choiceAheadRead({ fenBefore, san, mover, movesAt: (f) => masterMovesCachedSync(f) }),
      trapSaid: trapRead({ fenBefore, san, mover, slipsAt: (f) => knownSlipsAt(knownSlipIndexNow(), f), movesAt: (f) => masterMovesCachedSync(f) }),
      said: new Set(),
    });
    const kinds = new Set<Idea>();
    const lines: Array<[Idea, string]> = [];
    for (const t of turn) for (const k of [...KIND_IDEAS[t.kind], ...(t.saysPlan ? ['plan' as Idea] : [])]) { kinds.add(k); lines.push([k, t.text]); }
    // Book alternatives at the board are the choices said.
    if (openingTheoryFacts(fenBefore, san, true).some((f) => f.kind === 'book-alternatives')) kinds.add('decision');
    if (withName) {
      const name = openingAtPosition(fenAfter)?.name ?? null;
      const f = name ? identityFor(name)?.facts : null;
      if (f) {
        if (f.gambit) kinds.add('gambit');
        if (f.aims.length) kinds.add('structure');
        if (f.plan) { kinds.add('plan'); kinds.add('break'); }
        if (f.provokes) kinds.add('decision');
      }
    }
    return { kinds, lines };
  }

  it('scores the narrator against the written notes', () => {
    const all = JSON.parse(readFileSync('data/sources/wikibooks/wikibooks-notes.json', 'utf8')) as Note[];
    const notes = all.filter((n) => n.lineSan.length >= 2 && n.lineSan.length <= 30 && prose(n.text).length >= 250);
    const every = Number(process.env.THEORY_SHEETS_EVERY ?? 1);
    const showMisses = process.env.THEORY_SHEETS_MISSES as Idea | undefined;
    type Tally = Record<string, { asked: number; said: number }>;
    const T: Record<'core' | 'held', Record<'name' | 'noname', Tally>> = { core: { name: {}, noname: {} }, held: { name: {}, noname: {} } };
    const misses: string[] = [];
    const allMisses: Record<string, string[]> = {};
    let coreBoards = 0; let silentBoards = 0;
    const dump: string[] = [];
    notes.forEach((n, i) => {
      if (i % every !== 0) return;
      const text = prose(n.text);
      const asked = IDEAS.filter((k) => TAGS[k].test(text));
      if (!asked.length) return;
      const set: 'core' | 'held' = hash(n.lineSan.slice(0, 4).join(' ')) % 4 === 0 ? 'held' : 'core';
      for (const withName of [true, false]) {
        let s: ReturnType<typeof said>;
        try { s = said(n, withName); } catch { continue; }
        const t = T[set][withName ? 'name' : 'noname'];
        if (set === 'core' && withName) {
          coreBoards += 1; if (s.lines.length === 0) silentBoards += 1;
          if (dump.length < 120 && coreBoards % 7 === 0) dump.push(`### ${n.lineSan.join(' ')}\nASKED ${asked.join(',')} | SAID ${[...s.kinds].join(',')}\n${s.lines.map(([k, l]) => `- [${k}] ${l}`).join('\n')}`);
        }
        for (const k of asked) {
          const e = (t[k] ??= { asked: 0, said: 0 });
          e.asked += 1;
          if (s.kinds.has(k)) e.said += 1;
          else if (set === 'core' && withName) {
            const m = text.match(TAGS[k]);
            const at = m?.index ?? 0;
            const row = `${n.lineSan.join(' ')} :: …${text.slice(Math.max(0, at - 120), at + 160)}…`;
            if (showMisses === k && misses.length < 25) misses.push(row);
            const list = (allMisses[k] ??= []);
            list.push(row);
          }
        }
      }
    });
    const score = (t: Tally): { overall: number; byKind: Record<string, string> } => {
      const a = Object.values(t).reduce((x, y) => x + y.asked, 0); const b = Object.values(t).reduce((x, y) => x + y.said, 0);
      return { overall: a ? Math.round((100 * b) / a) : 0, byKind: Object.fromEntries(Object.entries(t).map(([k, v]) => [k, `${Math.round((100 * v.said) / v.asked)} (${v.asked})`])) };
    };
    const report = {
      core: { withName: score(T.core.name), withoutName: score(T.core.noname) },
      heldOut: { withName: { overall: score(T.held.name).overall }, withoutName: { overall: score(T.held.noname).overall } },
      positions: notes.length,
      coreSilent: `${silentBoards} of ${coreBoards} core boards hear nothing from the composer`,
    };
    mkdirSync('audit-reports', { recursive: true });
    writeFileSync('audit-reports/theory-sheets.json', JSON.stringify(report, null, 2));
    console.log(JSON.stringify(report, null, 2));
    writeFileSync('audit-reports/theory-sheet-samples.md', dump.join('\n\n'));
    // Core misses only (the held-out set is never printed).
    writeFileSync('audit-reports/theory-sheet-misses.md', Object.entries(allMisses).map(([k, v]) => `## ${k} (${v.length})\n${v.filter((_, j) => j % Math.max(1, Math.floor(v.length / 40)) === 0).slice(0, 40).join('\n')}`).join('\n\n'));
    if (misses.length) console.log(`MISSES ${showMisses}\n${misses.join('\n')}`);
  }, 900_000);
});
