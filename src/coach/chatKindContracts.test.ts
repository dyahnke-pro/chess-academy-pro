/**
 * THE CLOSED LIST — one contract per question kind (WO-CHAT-01 P8, David
 * 2026-10-10: "How do we keep coming across an endless loop?").
 *
 * The chat takes any question, so a walk that asks new ones always finds
 * something new. The reader, though, sorts every question into a CLOSED set
 * of kinds (`CHAT_KINDS`). "Done" for the chat is: every kind answers its
 * contract. `CONTRACTS` is a `Record` over every kind, so a new kind fails to
 * compile until someone writes what its answer must contain.
 *
 * Each contract runs through the real door (`dispatchCoachTurn`) with two
 * seams only:
 *  - the READER returns the contract's reading when the code reader has none
 *    (the reader's own accuracy is the live eval's job, not this file's);
 *  - the ENGINE is real Stockfish output stored in a fixture
 *    (`__fixtures__/contractEngine.json`); a position missing from it is
 *    written to `contractEngine.missing.json` and the test fails with the
 *    command that fills it.
 *
 * Expectations are written from the BOARD and the ENGINE, never copied from
 * an answer.
 */
import { describe, it, expect, beforeEach, afterEach, afterAll, vi } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { Chess } from 'chess.js';
import type { ChatKind } from './chatTurn';

const FIX_DIR = path.join(__dirname, '__fixtures__');
const FIXTURE: Record<string, unknown> = JSON.parse(fs.readFileSync(path.join(FIX_DIR, 'contractEngine.json'), 'utf8'));
const missing = new Set<string>();
const key = (fen: string): string => fen.split(' ').slice(0, 4).join(' ');
const BY_KEY = new Map(Object.entries(FIXTURE).map(([f, a]) => [key(f), a]));
async function analyse(fen: string): Promise<unknown> {
  const a = BY_KEY.get(key(fen));
  if (!a) { missing.add(fen); throw new Error(`engine fixture has no ${fen}`); }
  return a;
}

vi.mock('../services/stockfishEngine', () => {
  const engine = {
    analyzePosition: (fen: string) => analyse(fen),
    analyzeWithBudget: (fen: string) => analyse(fen),
    queueAnalysis: (fen: string) => analyse(fen),
    holdForQuestion: <T,>(work: (e: { analyzePosition(fen: string, depth: number): Promise<unknown> }) => Promise<T>) => work({ analyzePosition: (f: string) => analyse(f) }),
    getBestMove: async (fen: string) => ((await analyse(fen)) as { bestMove: string }).bestMove,
    evalBoard: async () => '',
    initialize: async () => undefined,
    setMultiPv: () => undefined,
    isHeldForQuestion: () => false,
    isBusy: () => false,
    stop: () => undefined,
    newGame: () => undefined,
    onAnalysis: () => () => undefined,
    status: 'ready',
  };
  return { stockfishEngine: engine };
});

import { dispatchCoachTurn, setChatTurnReaderForTests, resetConversations } from './dispatchCoachTurn';

/** The boards the contracts are asked on — real positions. */
const ITALIAN = 'e4 e5 Nf3 Nc6 Bc4 Bc5 d3 h6 O-O d6 c3 Bb6 d4 Na5 Bb5+ c6 Be2 Nf6'.split(' ');
const fenAfter = (sans: readonly string[]): string => { const c = new Chess(); for (const s of sans) c.move(s); return c.fen(); };
interface Board { fen: string; history: string[]; studentColor: 'white' | 'black' }
const BOARDS = {
  /** White to move; …Nf6 hits the e4 pawn, which nothing guards. */
  italian: { fen: fenAfter(ITALIAN), history: ITALIAN, studentColor: 'white' },
  /** 0GomC: White mates in 4 (Nh6+ Kf8 Qf6+ Ke8 Bb5+ c6 Bxc6#); Black threatens …Qxg2#. */
  mate4: { fen: '6k1/p1p4p/1p2n1p1/3pQ3/3P1nN1/2PB2qP/PP4P1/6K1 w - - 18 33', history: [], studentColor: 'white' },
  /** 0Fs8O: a won king-and-pawn ending, White to move (Kd3). */
  pawns: { fen: '8/8/1p4pp/p2k1p2/P2P1P1P/4K1P1/8/8 w - - 0 35', history: [], studentColor: 'white' },
} satisfies Record<string, Board>;

interface Contract {
  board: keyof typeof BOARDS | null;
  ask: string;
  /** The reading the model reader returns when the code reader has none. */
  reading: { kind: ChatKind; referents?: unknown[]; seat?: 'me' | 'them' | null; topic?: string | null };
  /** Every one must match the answer. */
  must: RegExp[];
  mustNot?: RegExp[];
  /** Each may appear at most once — one claim, said once. */
  once?: RegExp[];
  /** The answer quotes the STUDENT's own questions ("Am I safe?"). */
  allowStudentVoice?: boolean;
}
/** A kind with no contract yet says why — visibly, never silently. */
interface Owed { owed: string }

const ALWAYS_NOT: RegExp[] = [
  /I can't verify that precisely|can't be verified precisely/,   // the stock line
  /\[\[/,                                                          // a raw tool tag (the [BOARD: …] arrow tag is the board's channel and is stripped before display)
  /(?:^|[^A-Za-z'])(?:I|I'm|I'll|I've|I'd)(?![A-Za-z'])/,           // the coach never says "I"
];

const CONTRACTS: Record<ChatKind, Contract | Owed> = {
  // ── the board: the move ──
  'best-move': { board: 'mate4', ask: "what's the best move here?", reading: { kind: 'best-move' },
    must: [/\bNh6\+/, /mate in 4 moves/] },
  'what-should-i-play': { board: 'mate4', ask: 'what should i play', reading: { kind: 'what-should-i-play' },
    must: [/\bNh6\+/, /mate/] },
  'why-best-move': { board: 'mate4', ask: 'why is Nh6+ the best move?', reading: { kind: 'why-best-move', referents: [{ type: 'move', san: 'Nh6+' }] },
    must: [/\bNh6\+/, /forced mate in 4 moves/, /Their best defence is …Kf8/] },
  'candidate-move': { board: 'mate4', ask: 'what if I play Qxc7?', reading: { kind: 'candidate-move', referents: [{ type: 'move', san: 'Qxc7' }] },
    must: [/Qxc7/, /Qxg2#/, /\bNh6\+/] },
  'best-defence': { board: 'mate4', ask: "what's their best defence?", reading: { kind: 'best-defence' },
    must: [/best defence is …Kf8/, /mate/] },
  'faster-win': { board: 'pawns', ask: 'is there a faster win?', reading: { kind: 'faster-win' },
    must: [/\bKd3\b/], mustNot: [/much worse — it gives up/] },
  mate: { board: 'mate4', ask: 'is there a forced mate?', reading: { kind: 'mate' },
    must: [/mate in 4/, /Nh6\+/] },
  // ── the board: their side ──
  threats: { board: 'mate4', ask: 'what are they threatening?', reading: { kind: 'threats', seat: 'them' },
    must: [/Qxg2#/, /mate/] },
  'what-did-their-move-change': { board: 'italian', ask: 'what did their last move do?', reading: { kind: 'what-did-their-move-change', referents: [{ type: 'their-last-move' }] },
    must: [/\bNf6\b|knight on f6/, /e4/],
    // One claim, said once: "it attacks the pawn on e4" and "they're eyeing
    // the pawn on e4" are the same fact.
    once: [/pawn on e4/] },
  // ── the board: the Italian, White to move. Engine: b4! (traps the knight on
  // a5 — b4 Nxe4 bxa5), dxe5, Nfd2. Their …Nf6 hits e4, which nothing guards. ──
  alternatives: { board: 'italian', ask: 'what else could I play here?', reading: { kind: 'alternatives' },
    must: [/\bb4\b/, /dxe5|Nfd2/] },
  'compare-moves': { board: 'italian', ask: 'b4 or dxe5?', reading: { kind: 'compare-moves', referents: [{ type: 'move', san: 'b4' }, { type: 'move', san: 'dxe5' }] },
    must: [/\bb4\b/, /dxe5/] },
  plan: { board: 'italian', ask: "what's my plan here?", reading: { kind: 'plan', seat: 'me' },
    must: [/\bb4\b|knight on a5/] },
  tactics: { board: 'italian', ask: 'are there any tactics here?', reading: { kind: 'tactics' },
    must: [/\bb4\b|knight on a5/, /e4/] },
  hint: { board: 'italian', ask: 'give me a hint', reading: { kind: 'hint' },
    must: [/.{20}/], mustNot: [/\bb4\b/] },
  method: { board: 'italian', ask: 'how should I think about this position?', reading: { kind: 'method' },
    must: [/check|capture|threat|attack/i],
    // The routine is the student's own questions ("Am I safe?"), quoted.
    allowStudentVoice: true },
  'position-assessment': { board: 'italian', ask: 'who is better here?', reading: { kind: 'position-assessment' },
    must: [/you(?:'re| are) (?:winning|clearly better|better)/i], mustNot: [/nothing is decided/i] },
  'whose-turn': { board: 'italian', ask: 'whose move is it?', reading: { kind: 'whose-turn' },
    must: [/your (?:move|turn)|you to move|you're to move|it's you/i] },
  'live-colour': { board: 'italian', ask: 'which colour am I?', reading: { kind: 'live-colour' },
    must: [/White/] },
  draw: { board: 'mate4', ask: 'is this a draw?', reading: { kind: 'draw' },
    must: [/\bno\b|not a draw|isn't a draw/i, /mate/], mustNot: [/fork in the road/] },
  endgame: { board: 'pawns', ask: 'how do I win this ending?', reading: { kind: 'endgame' },
    must: [/king|\bK[a-h][1-8]/], mustNot: [/nothing is decided/i], once: [/You're winning/] },
  positional: { board: 'italian', ask: 'where are the weak squares?', reading: { kind: 'positional', topic: 'weak squares' },
    must: [/[a-h][1-8]/] },
  'move-rating': { board: 'italian', ask: 'was my last move good?', reading: { kind: 'move-rating' },
    must: [/Be2/] },
  'retrospective-move': { board: 'italian', ask: 'why did I play Be2?', reading: { kind: 'retrospective-move', referents: [{ type: 'move', san: 'Be2' }] },
    must: [/Be2|bishop/] },
  'opponent-move': { board: 'italian', ask: 'why did they play Nf6?', reading: { kind: 'opponent-move', referents: [{ type: 'their-last-move' }] },
    must: [/Nf6|knight/, /e4/] },
  'last-move': { board: 'italian', ask: 'what was the last move?', reading: { kind: 'last-move' },
    must: [/Nf6|knight to f6/] },
  'name-opening': { board: 'italian', ask: 'what opening is this?', reading: { kind: 'name-opening' },
    must: [/Italian|Giuoco|Piano/] },
  'piece-options': { board: 'italian', ask: 'where can my bishop on e2 go?', reading: { kind: 'piece-options', referents: [{ type: 'piece', piece: 'b', square: 'e2', seat: 'me' }] },
    must: [/d3|c4|b5|a6|f1/], mustNot: [/wasn't guarding anything/] },
  'why-is-it-a-target': { board: 'italian', ask: 'why is e4 a target?', reading: { kind: 'why-is-it-a-target', referents: [{ type: 'square', square: 'e4' }] },
    must: [/e4/, /knight|f6/], mustNot: [/move 1\b/] },
  'count-attackers': { board: 'italian', ask: 'how many pieces attack e4?', reading: { kind: 'count-attackers', referents: [{ type: 'square', square: 'e4' }] },
    must: [/e4/, /\bone\b|\bonce\b|\b1\b|knight on f6/i] },
  'count-defenders': { board: 'italian', ask: 'how many pieces defend e4?', reading: { kind: 'count-defenders', referents: [{ type: 'square', square: 'e4' }] },
    must: [/e4/, /\bno\b|none|nothing|\b0\b|undefended/i] },
  'what-about-piece': { board: 'italian', ask: 'what about my bishop on e2?', reading: { kind: 'what-about-piece', referents: [{ type: 'piece', piece: 'b', square: 'e2', seat: 'me' }] },
    must: [/bishop/] },
  'is-piece-loose': { board: 'italian', ask: 'is my e4 pawn loose?', reading: { kind: 'is-piece-loose', referents: [{ type: 'piece', piece: 'p', square: 'e4', seat: 'me' }] },
    must: [/e4/, /loose|undefended|nothing guards|attacked/i] },
  'defend-piece': { board: 'italian', ask: 'how do I defend my e4 pawn?', reading: { kind: 'defend-piece', referents: [{ type: 'piece', piece: 'p', square: 'e4', seat: 'me' }] },
    must: [/e4/, /Bd3|Qc2|Re1|Nbd2|Qd3|Nfd2|b4/] },
  'win-piece': { board: 'italian', ask: 'can I win their knight on a5?', reading: { kind: 'win-piece', referents: [{ type: 'piece', piece: 'n', square: 'a5', seat: 'them' }] },
    must: [/\bb4\b/, /pawn on b2/], mustNot: [/pawn on b4/] },
  'attack-piece': { board: 'italian', ask: 'how can I attack their knight on a5?', reading: { kind: 'attack-piece', referents: [{ type: 'piece', piece: 'n', square: 'a5', seat: 'them' }] },
    must: [/\bb4\b/] },
  'material-change': { board: 'italian', ask: 'did I just lose a pawn?', reading: { kind: 'material-change' },
    must: [/\bno\b|not|level|even|equal/i] },
  'develop-next': { board: 'italian', ask: 'which piece should I bring out next?', reading: { kind: 'develop-next' },
    must: [/knight|bishop/, /b1|c1/] },
  chat: { board: null, ask: 'hello', reading: { kind: 'chat' },
    must: [/.{2}/], mustNot: [/best move/i] },
  command: { board: null, ask: 'turn the voice off', reading: { kind: 'command' },
    must: [/voice/i] },
  // ── the rest: owed, each with its reason, until written ──
  stop: { owed: 'P8 batch 2' }, 'conversational-reply': { owed: 'P8 batch 2' },
  unclear: { owed: 'P8 batch 2' }, 
  
  
  
  
  'master-play': { owed: 'P8 batch 3' }, 'player-games': { owed: 'P8 batch 3' }, 
  
  strengths: { owed: 'P8 batch 3' }, stats: { owed: 'P8 batch 3' }, 'opening-accuracy': { owed: 'P8 batch 3' },
  'opening-traps': { owed: 'P8 batch 3' }, 'review-due': { owed: 'P8 batch 3' }, 'weakness-lifecycle': { owed: 'P8 batch 3' },
  'weakness-briefing': { owed: 'P8 batch 3' }, mistakes: { owed: 'P8 batch 3' }, 'errors-by-situation': { owed: 'P8 batch 3' },
  misconceptions: { owed: 'P8 batch 3' }, 'tactics-profile': { owed: 'P8 batch 3' }, 'phase-profile': { owed: 'P8 batch 3' },
  'counter-repertoire': { owed: 'P8 batch 3' }, 'repertoire-gap': { owed: 'P8 batch 3' }, accuracy: { owed: 'P8 batch 3' },
  consistency: { owed: 'P8 batch 3' }, 'time-trouble': { owed: 'P8 batch 3' }, 'last-game': { owed: 'P8 batch 3' },
  'last-game-mistake': { owed: 'P8 batch 3' }, converting: { owed: 'P8 batch 3' }, color: { owed: 'P8 batch 3' },
  records: { owed: 'P8 batch 3' }, 'record-vs': { owed: 'P8 batch 3' }, 'puzzle-stats': { owed: 'P8 batch 3' },
  'transfer-gap': { owed: 'P8 batch 3' }, 'skill-radar': { owed: 'P8 batch 3' }, trend: { owed: 'P8 batch 3' },
  progress: { owed: 'P8 batch 3' }, 'opening-profile': { owed: 'P8 batch 3' }, 'endgame-weakness': { owed: 'P8 batch 3' },
  'training-request': { owed: 'P8 batch 3' }, concept: { owed: 'P8 batch 3' }, theory: { owed: 'P8 batch 3' },
  'teaching-method': { owed: 'P8 batch 3' }, settings: { owed: 'P8 batch 3' }, 'app-help': { owed: 'P8 batch 3' },
  'opening-identity': { owed: 'P8 batch 3' }, 'opening-existence': { owed: 'P8 batch 3' },
  'compare-my-move': { owed: 'P8 batch 2' }, 
  
  
  'explain-last': { owed: 'P8 batch 2' },
  'book-teaching': { owed: 'P8 batch 3' }, 'i-dont-know': { owed: 'P8 batch 2' }, answer: { owed: 'P8 batch 2' },
  'start-thinking-lesson': { owed: 'P8 batch 3' },
};

beforeEach(() => {
  vi.spyOn(globalThis, 'fetch').mockImplementation(async () => new Response('{}', { status: 404 }));
  resetConversations();
});
afterEach(() => { setChatTurnReaderForTests(undefined); vi.restoreAllMocks(); });
afterAll(() => {
  if (missing.size) fs.writeFileSync(path.join(FIX_DIR, 'contractEngine.missing.json'), JSON.stringify([...missing], null, 1) + '\n');
});

const written = (Object.entries(CONTRACTS) as Array<[ChatKind, Contract | Owed]>).filter((e): e is [ChatKind, Contract] => !('owed' in e[1]));

describe('every question kind answers its contract', () => {
  it.each(written)('%s', async (kind, c) => {
    setChatTurnReaderForTests(async () => ({ referents: [], seat: null, topic: null, ...c.reading }) as never);
    const b: Board | null = c.board ? BOARDS[c.board] : null;
    const a = await dispatchCoachTurn({
      surface: 'standalone-chat', ask: c.ask, origin: 'typed',
      liveState: b
        ? { surface: 'standalone-chat', fen: b.fen, whoseTurn: b.fen.split(' ')[1] === 'w' ? 'white' : 'black', studentColor: b.studentColor, moveHistory: b.history, currentRoute: '/coach/chat' }
        : { surface: 'standalone-chat', currentRoute: '/coach/chat' },
    } as never, { maxToolRoundTrips: 1 });
    // What the student reads: the bubble strips the arrow tags.
    const text = (a.text ?? '').replace(/\s*\[BOARD:[^\]]*\]/g, '').trim();
    if (missing.size) throw new Error(`engine fixture is missing ${missing.size} position(s): run node scripts/chat-contracts/gen-engine-fixture.mjs`);
    const report = `[${kind}] served=${a.servedIntent ?? '—'} answer: ${text}`;
    if (process.env.CONTRACT_LOG) console.log(report);
    expect(text.trim().length, report).toBeGreaterThan(0);
    for (const re of c.must) expect(text, report).toMatch(re);
    const always = c.allowStudentVoice ? ALWAYS_NOT.filter((re) => !re.source.includes("I'm")) : ALWAYS_NOT;
    for (const re of [...always, ...(c.mustNot ?? [])]) expect(text, report).not.toMatch(re);
    for (const re of c.once ?? []) expect(text.match(new RegExp(re.source, 'g'))?.length ?? 0, report).toBeLessThanOrEqual(1);
  }, 60_000);

  it('the owed list only shrinks', () => {
    const owed = Object.values(CONTRACTS).filter((c) => 'owed' in c).length;
    expect(owed).toBeLessThanOrEqual(49);
  });
});
