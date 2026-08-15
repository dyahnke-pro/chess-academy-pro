// THE COMPUTED VOICE, LANE BY LANE, PLY BY PLY, WITH A REAL ENGINE.
//
// The existing scorecard measures the CORPUS lanes; the computed lanes — plan,
// mistake, drawback, coachMistake, tactic, threat, gem, computed — are all
// engine-derived or detector-derived and none of them are exercised anywhere
// outside the app. Their unit tests are green because each one, handed the
// right inputs, produces the right sentence. That says nothing about whether
// the inputs ever arrive.
//
// So this drives the REAL producers over REAL games with a REAL Stockfish
// (the WASM build in node_modules — no binary needed) and reports, per lane:
// how often it fired, what it said, and when the package refused it, why.
//
// A REPORT, not a wall. It writes audit-reports/computed-voice-audit.json.
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { spawn, type ChildProcessWithoutNullStreams } from 'node:child_process';
import { writeFileSync, mkdirSync } from 'node:fs';
import { Chess } from 'chess.js';
import { loadFullCorpus } from '../test/loadFullCorpus';
import { backwardLook } from './backwardLook';
import { planFromUci, keySquareLine, positionReadLine, lineShapeLine, terminalReadLine } from './lookaheadPlan';
import { buildTacticsLiveContext } from './liveTacticsContext';
import { buildPlayCommentary } from './playCommentary';
import { findLivePunishment } from './gemCrushLines';
import { teachingSourceForBoard, spokenBeatText, generalizedTeaching } from './danyaTeachingService';
import { buildVoicePackage, type VoiceFact, type VoiceFactKind } from './voicePackage';
import { gradeNarrationText } from './coachAnswerGates';
import { tacticWord } from './lookaheadPlan';

const DEPTH = 12;

interface Read { evalCp: number; mate: number | null; bestUci: string | null; pv: string[] }

class Engine {
  private p: ChildProcessWithoutNullStreams;
  private buf = '';
  private waiting: ((r: Read) => void) | null = null;
  private cur: Read = { evalCp: 0, mate: null, bestUci: null, pv: [] };

  constructor() {
    this.p = spawn('node', ['node_modules/stockfish/bin/stockfish-18-lite-single.js']);
    this.p.stdout.on('data', (d: Buffer) => {
      this.buf += d.toString();
      const lines = this.buf.split('\n');
      this.buf = lines.pop() ?? '';
      for (const raw of lines) {
        const l = raw.trim();
        if (l.startsWith('info ') && l.includes(' pv ')) {
          const cp = /score cp (-?\d+)/.exec(l);
          const mate = /score mate (-?\d+)/.exec(l);
          const pv = /\bpv (.+)$/.exec(l);
          if (cp) { this.cur.evalCp = Number(cp[1]); this.cur.mate = null; }
          if (mate) { this.cur.mate = Number(mate[1]); this.cur.evalCp = Number(mate[1]) > 0 ? 30000 : -30000; }
          if (pv) this.cur.pv = pv[1].split(/\s+/).filter(Boolean);
        } else if (l.startsWith('bestmove')) {
          this.cur.bestUci = l.split(/\s+/)[1] ?? null;
          const done = this.waiting;
          this.waiting = null;
          if (done) done({ ...this.cur, pv: [...this.cur.pv] });
        }
      }
    });
    this.p.stdin.write('uci\nsetoption name MultiPV value 1\nisready\n');
  }

  /** White-relative centipawns, plus the engine's own line from `fen`. */
  async read(fen: string): Promise<Read> {
    this.cur = { evalCp: 0, mate: null, bestUci: null, pv: [] };
    const sideToMove = fen.split(' ')[1];
    const r = await new Promise<Read>((resolve) => {
      this.waiting = resolve;
      this.p.stdin.write(`position fen ${fen}\ngo depth ${DEPTH}\n`);
    });
    // UCI scores are from the side to move; every consumer here wants white.
    const flip = sideToMove === 'b' ? -1 : 1;
    return { ...r, evalCp: r.evalCp * flip, mate: r.mate === null ? null : r.mate * flip };
  }

  stop(): void { try { this.p.kill(); } catch { /* already gone */ } }
}

/** Real games. Student side is whoever the coach is teaching. */
const GAMES: Array<{ name: string; student: 'white' | 'black'; sans: string[] }> = [
  { name: 'Pirc (David\'s prod game)', student: 'white',
    sans: ['e4', 'd6', 'd4', 'Nf6', 'Nc3', 'g6', 'Be3', 'Bg7', 'f4', 'c6', 'Be2', 'b5', 'a3', 'a5', 'Nf3', 'Ng4', 'Bg1', 'e5', 'fxe5', 'dxe5', 'h3', 'Nh6', 'd5', 'Qb6'] },
  { name: 'Italian', student: 'white',
    sans: ['e4', 'e5', 'Nf3', 'Nc6', 'Bc4', 'Bc5', 'c3', 'Nf6', 'd3', 'd6', 'O-O', 'O-O', 'Re1', 'a6', 'Nbd2', 'Ba7', 'Nf1', 'Ne7', 'Ng3', 'Ng6', 'd4', 'c6'] },
  { name: 'Caro-Kann', student: 'black',
    sans: ['e4', 'c6', 'd4', 'd5', 'Nc3', 'dxe4', 'Nxe4', 'Bf5', 'Ng3', 'Bg6', 'h4', 'h6', 'Nf3', 'Nd7', 'h5', 'Bh7', 'Bd3', 'Bxd3', 'Qxd3', 'e6', 'Bf4', 'Ngf6'] },
  { name: 'Legal-style tactic', student: 'black',
    sans: ['e4', 'e5', 'Nf3', 'd6', 'Bc4', 'Bg4', 'Nc3', 'g6', 'Nxe5', 'Bxd1', 'Bxf7', 'Ke7', 'Nd5'] },
];

interface LaneHit { game: string; ply: number; kind: VoiceFactKind; text: string; spoken: boolean; dropReason?: string }

describe('computed voice audit', () => {
  let eng: Engine;
  beforeAll(() => { loadFullCorpus(); eng = new Engine(); });
  afterAll(() => { eng?.stop(); });

  it('drives every computed lane over real games and reports what it says', async () => {
    const hits: LaneHit[] = [];
    const perGame: Array<Record<string, unknown>> = [];
    let studentPlies = 0;
    let turnsWithAnyVoice = 0;
    let corpusOffered = 0;
    let corpusSuppressedByPv = 0;
    const utterances: Array<{ game: string; ply: number; text: string }> = [];

    for (const game of GAMES) {
      const c = new Chess();
      const history: string[] = [];
      const studentCC: 'w' | 'b' = game.student === 'white' ? 'w' : 'b';
      const sign = game.student === 'white' ? 1 : -1;
      const planSaid = new Set<string>();
      const gemSeen = new Set<string>();
      const explainers = new Set<string>();
      // THE PRODUCTION REPEAT GUARDS. Omitting these makes the harness report
      // duplicates the app would already have suppressed — a harness lying
      // about a surface is the same defect as a surface lying about a board.
      let lastTacticKey = '';
      let lastThreatKey = '';
      let lastComputedKey = '';
      const spokenTacticLines = new Set<string>();
      const spokenThreatLines = new Set<string>();
      let gameVoice = 0;

      for (let i = 0; i < game.sans.length; i += 1) {
        // Only measure a full STUDENT-move → COACH-reply turn, which is the
        // unit the packages are built around.
        if (c.turn() !== studentCC) { const m = c.move(game.sans[i]); if (!m) break; history.push(m.san); continue; }

        const fenBefore = c.fen();
        const readBefore = await eng.read(fenBefore);
        const studentMove = c.move(game.sans[i]);
        if (!studentMove) break;
        history.push(studentMove.san);
        const fenAfterStudent = c.fen();
        const readAfterStudent = await eng.read(fenAfterStudent);
        studentPlies += 1;

        const cpLoss = (readBefore.evalCp * sign) - (readAfterStudent.evalCp * sign);
        const uciSanAt = (fen: string, uci: string | null): string | null => {
          if (!uci || uci.length < 4) return null;
          try {
            return new Chess(fen).move({ from: uci.slice(0, 2), to: uci.slice(2, 4), promotion: uci.slice(4, 5) || undefined })?.san ?? null;
          } catch { return null; }
        };

        // ── THE BACKWARD LOOK on the student's own move ────────────────────
        const look = backwardLook({
          fenBefore,
          fenAfter: fenAfterStudent,
          playedSan: studentMove.san,
          bestSan: uciSanAt(fenBefore, readBefore.bestUci),
          bestPvUci: readBefore.pv,
          replyPvUci: readAfterStudent.pv,
          cpLoss,
          studentColor: game.student,
          missedMate: readBefore.mate,
          allowedMate: readAfterStudent.mate,
        });

        // ── THE COACH REPLIES ──────────────────────────────────────────────
        const coachSan = game.sans[i + 1];
        if (!coachSan) break;
        const coachMove = c.move(coachSan);
        if (!coachMove) break;
        history.push(coachMove.san);
        i += 1;
        const fenAfterReply = c.fen();
        const readAfterReply = await eng.read(fenAfterReply);

        const coachColor = game.student === 'white' ? 'black' : 'white';
        const cSign = coachColor === 'white' ? 1 : -1;
        const coachLook = backwardLook({
          fenBefore: fenAfterStudent,
          fenAfter: fenAfterReply,
          playedSan: coachMove.san,
          bestSan: uciSanAt(fenAfterStudent, readAfterStudent.bestUci),
          bestPvUci: readAfterStudent.pv,
          cpLoss: (readAfterStudent.evalCp * cSign) - (readAfterReply.evalCp * cSign),
          studentColor: coachColor,
          side: 'coach',
        });

        // ── THE PLAN, off the engine's own line from the settled board ─────
        const plan = planFromUci(fenAfterReply, readAfterReply.pv, game.student, planSaid);
        let planLine: string | null = null;
        if (plan) {
          const parts = [
            keySquareLine(plan.keySquares, planSaid),
            positionReadLine(plan.read, game.student, planSaid, fenAfterReply),
            lineShapeLine(plan.shape, planSaid),
            plan.theirs.text,
            plan.mine.text,
            plan.mine.aside,
            terminalReadLine(plan.terminal, planSaid),
          ].filter(Boolean)
            .map((t) => gradeNarrationText(t, fenAfterReply, 'audit.plan')?.trim() ?? '')
            .filter(Boolean);
          planLine = parts.join(' ') || null;
        }

        // ── THE INSTANT, FEN-ONLY LANES ────────────────────────────────────
        const AV: Record<string, number> = { n: 3, b: 3, r: 5, q: 9 };
        const NAME: Record<string, string> = { p: 'pawn', n: 'knight', b: 'bishop', r: 'rook', q: 'queen', k: 'king' };
        let tacticLine: string | null = null;
        let threatLine: string | null = null;
        let tacticKey = '';
        let threatKey = '';
        const spokenSquaresThisTurn = new Set<string>();
        try {
          const tctx = buildTacticsLiveContext(fenAfterReply, null, studentCC, 1200);
          const theirHanging = tctx.hanging.filter((h) => h.color !== studentCC && AV[h.piece] !== undefined)
            .sort((a, b) => (AV[b.piece] ?? 0) - (AV[a.piece] ?? 0));
          const myHanging = tctx.hanging.filter((h) => h.color === studentCC && AV[h.piece] !== undefined)
            .sort((a, b) => (AV[b.piece] ?? 0) - (AV[a.piece] ?? 0));
          const theirLoose = new Set(theirHanging.map((h) => h.square));
          const againstMe = tctx.immediate.filter((t) => t.side === 'opponent' && !theirLoose.has(t.squares[0] ?? ''));
          if (tctx.boardFacts?.mateInOne) {
            tacticKey = `mate1:${tctx.boardFacts.mateInOne}`;
            tacticLine = "There's a mate in one here — see if you can find it.";
          } else if (theirHanging.length > 0) {
            const p = theirHanging[0];
            tacticKey = `win:${p.piece}${p.square}`;
            tacticLine = `Their ${NAME[p.piece] ?? 'piece'} on ${p.square} has nothing defending it — there's something to win here.`;
          } else {
            const mine = tctx.immediate.filter((t) => t.side === 'student');
            const w = mine.length > 0 ? tacticWord(mine[0].type) : null;
            if (w) { tacticKey = `opp:${mine[0].type}:${mine[0].squares.join('')}`; tacticLine = `There's a ${w} here for you — have a look.`; }
          }
          if (againstMe.length > 0) {
            const t = againstMe[0];
            const ends = [t.squares[0] ?? '', t.squares[t.squares.length - 1] ?? ''];
            threatKey = `vs:${t.type}:${ends.join('')}`;
            threatLine = `Watch out — ${t.description.charAt(0).toLowerCase()}${t.description.slice(1)}.`;
          } else if (myHanging.length > 0) {
            const w = myHanging[0];
            threatKey = `hang:${w.piece}${w.square}`;
            threatLine = `Careful — your ${NAME[w.piece] ?? 'piece'} on ${w.square} is attacked and nothing's defending it.`;
          }
          // The production guards: one callout per danger, and never the same
          // sentence twice in a game.
          if (tacticLine && (tacticKey === lastTacticKey || spokenTacticLines.has(tacticLine))) tacticLine = null;
          else if (tacticLine) { lastTacticKey = tacticKey; spokenTacticLines.add(tacticLine); }
          if (threatLine && (threatKey === lastThreatKey || spokenThreatLines.has(threatLine))) threatLine = null;
          else if (threatLine) { lastThreatKey = threatKey; spokenThreatLines.add(threatLine); }
          for (const k of [tacticLine ? tacticKey : '', threatLine ? threatKey : '']) {
            for (const sq of k.match(/[a-h][1-8]/g) ?? []) spokenSquaresThisTurn.add(sq);
          }
        } catch { /* lane is a bonus */ }

        // ── THE COMPUTED READ ──────────────────────────────────────────────
        let computedLine: string | null = null;
        try {
          const beat = buildPlayCommentary({
            fen: fenAfterReply,
            studentColor: game.student,
            saidExplainers: explainers,
            // ROOT CAUSE, not the gate — the same hand-over the surface makes,
            // so a duplicate is never composed in the first place.
            skipSquares: spokenSquaresThisTurn,
          });
          if (beat) {
            if (beat.key && beat.key === lastComputedKey) computedLine = null;
            else { computedLine = beat.spoken; lastComputedKey = beat.key; }
          }
        } catch { /* bonus */ }

        // ── THE GEM ────────────────────────────────────────────────────────
        let gemLine: string | null = null;
        try {
          const gem = findLivePunishment(null, history);
          if (gem?.callout && !gemSeen.has(gem.callout)) { gemSeen.add(gem.callout); gemLine = gem.callout; }
        } catch { /* bonus */ }

        // ── ASSEMBLE, exactly as the surface does: instant, then late ──────
        const instantFacts: VoiceFact[] = [
          ...(gemLine ? [{ kind: 'gem' as const, text: gemLine, fen: fenAfterReply }] : []),
          ...(tacticLine ? [{ kind: 'tactic' as const, text: tacticLine, fen: fenAfterReply }] : []),
          ...(threatLine ? [{ kind: 'threat' as const, text: threatLine, fen: fenAfterReply }] : []),
          ...(computedLine ? [{ kind: 'computed' as const, text: computedLine, fen: fenAfterReply }] : []),
        ];
        const instant = buildVoicePackage(instantFacts);

        const lateFacts: VoiceFact[] = [
          ...(look ? [{ kind: look.kind, text: look.line, fen: fenAfterReply }] : []),
          ...(coachLook ? [{ kind: coachLook.kind, text: coachLook.line, fen: fenAfterReply }] : []),
          ...(planLine ? [{ kind: 'plan' as const, text: planLine, fen: fenAfterReply }] : []),
        ];
        // ── WHAT THE CORPUS WOULD HAVE SAID, AND WHETHER IT GOT TO ─────────
        // `pvSpoke()` stands the borrowed tier down whenever the look-ahead
        // kept anything. That rule was written for an occasional plan. Measure
        // what it actually costs: offer a real borrowed note on every turn and
        // count how often the package refuses it for that reason alone.
        let borrowedOffered = 0;
        let borrowedSuppressed = 0;
        try {
          const src = teachingSourceForBoard(history, fenAfterReply, null);
          const noteText = src ? spokenBeatText(src.note) : '';
          if (noteText) {
            borrowedOffered = 1;
            lateFacts.push({ kind: 'borrowed', text: generalizedTeaching(src!.origin, noteText), fen: fenAfterReply });
          }
        } catch { /* bonus */ }

        const late = buildVoicePackage(lateFacts, instant.spoken);
        if (borrowedOffered) {
          const d = late.dropped.find((x) => x.fact.kind === 'borrowed');
          if (d?.reason === 'the look-ahead had something about THIS board') borrowedSuppressed = 1;
        }
        corpusOffered += borrowedOffered;
        corpusSuppressedByPv += borrowedSuppressed;

        for (const pkg of [instant, late]) {
          for (const f of pkg.kept) hits.push({ game: game.name, ply: history.length, kind: f.kind, text: f.text, spoken: true });
          for (const d of pkg.dropped) hits.push({ game: game.name, ply: history.length, kind: d.fact.kind, text: d.fact.text, spoken: false, dropReason: d.reason });
        }
        const said = [instant.spoken, late.spoken].filter(Boolean).join(' ');
        if (said) { turnsWithAnyVoice += 1; gameVoice += 1; utterances.push({ game: game.name, ply: history.length, text: said }); }
      }
      perGame.push({ game: game.name, turnsWithVoice: gameVoice });
    }

    // ── SCORE ────────────────────────────────────────────────────────────
    const KINDS: VoiceFactKind[] = ['gem', 'note', 'mistake', 'coachMistake', 'drawback', 'plan', 'threat', 'tactic', 'computed'];
    const lanes = KINDS.map((k) => {
      const mine = hits.filter((h) => h.kind === k);
      const spoke = mine.filter((h) => h.spoken);
      const drops: Record<string, number> = {};
      for (const d of mine.filter((h) => !h.spoken)) drops[d.dropReason ?? '?'] = (drops[d.dropReason ?? '?'] ?? 0) + 1;
      return {
        lane: k,
        computed: mine.length,
        spoken: spoke.length,
        fireRateOfTurns: Number((spoke.length / studentPlies).toFixed(3)),
        drops,
        sample: spoke.slice(0, 2).map((h) => h.text.slice(0, 160)),
      };
    });

    const report = {
      generatedAt: new Date().toISOString().slice(0, 10),
      engine: `stockfish-18-lite-single @ depth ${DEPTH}`,
      studentTurnsMeasured: studentPlies,
      turnsWithAnyVoice,
      silentTurnRate: Number((1 - turnsWithAnyVoice / studentPlies).toFixed(3)),
      corpus: { offered: corpusOffered, suppressedByLookahead: corpusSuppressedByPv, suppressionRate: corpusOffered ? Number((corpusSuppressedByPv / corpusOffered).toFixed(3)) : 0 },
      lanes,
      perGame,
      utterances: utterances.slice(0, 40),
    };
    mkdirSync('audit-reports', { recursive: true });
    writeFileSync('audit-reports/computed-voice-audit.json', JSON.stringify(report, null, 2));
    console.log(JSON.stringify({ ...report, utterances: undefined }, null, 2));

    expect(studentPlies).toBeGreaterThan(0);
  }, 900_000);
});
