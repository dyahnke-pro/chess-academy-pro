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
import { describe, it, expect, beforeAll, beforeEach, afterEach, afterAll, vi } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { Chess } from 'chess.js';
import type { ChatKind } from './chatTurn';

const FIX_DIR = path.join(__dirname, '__fixtures__');
const FIXTURE: Record<string, unknown> = JSON.parse(fs.readFileSync(path.join(FIX_DIR, 'contractEngine.json'), 'utf8'));
const missing = new Set<string>();
/** Positions THIS test asked for and the fixture lacks — never another test's. */
let missingHere = new Set<string>();
const key = (fen: string): string => fen.split(' ').slice(0, 4).join(' ');
const BY_KEY = new Map(Object.entries(FIXTURE).map(([f, a]) => [key(f), a]));
async function analyse(fen: string): Promise<unknown> {
  const a = BY_KEY.get(key(fen));
  if (!a) { missing.add(fen); missingHere.add(fen); throw new Error(`engine fixture has no ${fen}`); }
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
import { db } from '../db/schema';
import { buildUserProfile } from '../test/factories';
import { loadEcoData, loadRepertoireData } from '../services/dataLoader';

/** The boards the contracts are asked on — real positions. */
const ITALIAN = 'e4 e5 Nf3 Nc6 Bc4 Bc5 d3 h6 O-O d6 c3 Bb6 d4 Na5 Bb5+ c6 Be2 Nf6'.split(' ');
const CARO = 'e4 c6 d4 d5 e5 Bf5'.split(' ');
const fenAfter = (sans: readonly string[]): string => { const c = new Chess(); for (const s of sans) c.move(s); return c.fen(); };
interface Board { fen: string; history: string[]; studentColor: 'white' | 'black' }
const BOARDS = {
  /** White to move; …Nf6 hits the e4 pawn, which nothing guards. */
  italian: { fen: fenAfter(ITALIAN), history: ITALIAN, studentColor: 'white' },
  /** 0GomC: White mates in 4 (Nh6+ Kf8 Qf6+ Ke8 Bb5+ c6 Bxc6#); Black threatens …Qxg2#. */
  mate4: { fen: '6k1/p1p4p/1p2n1p1/3pQ3/3P1nN1/2PB2qP/PP4P1/6K1 w - - 18 33', history: [], studentColor: 'white' },
  /** 0Fs8O: a won king-and-pawn ending, White to move (Kd3). */
  pawns: { fen: '8/8/1p4pp/p2k1p2/P2P1P1P/4K1P1/8/8 w - - 0 35', history: [], studentColor: 'white' },
  /** 00zOQ: Black's quiet …Re8! (Bd2 Qd1+ Rg1 Qxd2) wins the bishop. */
  quietRook: { fen: '2r3k1/p7/7p/1p4p1/6R1/3B1q1P/2P3RP/2B4K b - - 7 35', history: [], studentColor: 'black' },
  /** 0MOZp: Black's …Bd5+ sac — cxd5 Qxd5+ Ne4 Rxh1 Kxh1 Qxe4+ wins it back with interest. */
  bishopSac: { fen: '5n1r/3q4/ppp1b1k1/4PpN1/1PPP1Pp1/1PB1Q3/6K1/7R b - - 2 46', history: [], studentColor: 'black' },
  /** Black to move; White threatens Re8# on the back rank. */
  backRank: { fen: '6k1/5ppp/8/8/8/8/5PPP/4R1K1 b - - 0 1', history: [], studentColor: 'black' },
  /** The Caro-Kann Advance, Black to move — a line Naroditsky's games cover. */
  caro: { fen: fenAfter(CARO), history: CARO, studentColor: 'black' },
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
  /** Turns asked first on the same board, so a kind that only exists inside
   *  a conversation ("yes", "explain that", "I don't know") has one. */
  before?: Array<{ ask: string; reading: Contract['reading'] }>;
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
  // ── the student's own record, on a fresh device: the only true answer is
  // that there are no games yet — any number is a false claim. ──
  strengths: { board: null, ask: 'what am I good at?', reading: { kind: 'strengths' },
    must: [/import|upload|no games|haven't (?:played|imported)|not enough|once you|play a few|after a few|no (?:analysed|analyzed)/i], mustNot: [/\d+(?:\.\d+)?%/] },
  stats: { board: null, ask: 'what are my stats?', reading: { kind: 'stats' },
    must: [/import|upload|no games|haven't (?:played|imported)|not enough|once you|play a few|after a few|no (?:analysed|analyzed)/i], mustNot: [/\d+(?:\.\d+)?%/] },
  'opening-accuracy': { board: null, ask: 'how accurate am I in the Italian?', reading: { kind: 'opening-accuracy', topic: 'Italian' },
    must: [/import|upload|no games|haven't (?:played|imported)|not enough|once you|play a few|after a few|no (?:analysed|analyzed)/i], mustNot: [/\d+(?:\.\d+)?%/] },
  'weakness-lifecycle': { board: null, ask: 'which weaknesses have I fixed?', reading: { kind: 'weakness-lifecycle' },
    must: [/import|upload|no games|haven't (?:played|imported)|not enough|once you|play a few|after a few|no (?:analysed|analyzed)/i], mustNot: [/\d+(?:\.\d+)?%/] },
  'weakness-briefing': { board: null, ask: 'brief me on my weaknesses', reading: { kind: 'weakness-briefing' },
    must: [/import|upload|no games|haven't (?:played|imported)|not enough|once you|play a few|after a few|no (?:analysed|analyzed)/i], mustNot: [/\d+(?:\.\d+)?%/] },
  mistakes: { board: null, ask: 'what mistakes do I make?', reading: { kind: 'mistakes' },
    must: [/import|upload|no games|haven't (?:played|imported)|not enough|once you|play a few|after a few|no (?:analysed|analyzed)/i], mustNot: [/\d+(?:\.\d+)?%/] },
  'errors-by-situation': { board: null, ask: 'when do I blunder most?', reading: { kind: 'errors-by-situation' },
    must: [/import|upload|no games|haven't (?:played|imported)|not enough|once you|play a few|after a few|no (?:analysed|analyzed)/i], mustNot: [/\d+(?:\.\d+)?%/] },
  misconceptions: { board: null, ask: 'which thinking errors do I keep making?', reading: { kind: 'misconceptions' },
    must: [/import|upload|no games|haven't (?:played|imported)|not enough|once you|play a few|after a few|no (?:analysed|analyzed)/i], mustNot: [/\d+(?:\.\d+)?%/] },
  'tactics-profile': { board: null, ask: 'how good are my tactics?', reading: { kind: 'tactics-profile' },
    must: [/import|upload|no games|haven't (?:played|imported)|not enough|once you|play a few|after a few|no (?:analysed|analyzed)/i], mustNot: [/\d+(?:\.\d+)?%/] },
  'phase-profile': { board: null, ask: 'which phase am I weakest in?', reading: { kind: 'phase-profile' },
    must: [/import|upload|no games|haven't (?:played|imported)|not enough|once you|play a few|after a few|no (?:analysed|analyzed)/i], mustNot: [/\d+(?:\.\d+)?%/] },
  'repertoire-gap': { board: null, ask: 'what are the gaps in my repertoire?', reading: { kind: 'repertoire-gap' },
    must: [/import|upload|no games|haven't (?:played|imported)|not enough|once you|play a few|after a few|no (?:analysed|analyzed)/i], mustNot: [/\d+(?:\.\d+)?%/] },
  accuracy: { board: null, ask: "what's my accuracy?", reading: { kind: 'accuracy' },
    must: [/import|upload|no games|haven't (?:played|imported)|not enough|once you|play a few|after a few|no (?:analysed|analyzed)/i], mustNot: [/\d+(?:\.\d+)?%/] },
  consistency: { board: null, ask: 'how consistent am I?', reading: { kind: 'consistency' },
    must: [/import|upload|no games|haven't (?:played|imported)|not enough|once you|play a few|after a few|no (?:analysed|analyzed)/i], mustNot: [/\d+(?:\.\d+)?%/] },
  'time-trouble': { board: null, ask: 'do I play too fast?', reading: { kind: 'time-trouble' },
    must: [/import|upload|no games|haven't (?:played|imported)|not enough|once you|play a few|after a few|no (?:analysed|analyzed)/i], mustNot: [/\d+(?:\.\d+)?%/] },
  'last-game': { board: null, ask: 'how did my last game go?', reading: { kind: 'last-game' },
    must: [/import|upload|no games|haven't (?:played|imported)|not enough|once you|play a few|after a few|no (?:analysed|analyzed)/i], mustNot: [/\d+(?:\.\d+)?%/] },
  'last-game-mistake': { board: null, ask: 'what did I do wrong in my last game?', reading: { kind: 'last-game-mistake' },
    must: [/import|upload|no games|haven't (?:played|imported)|not enough|once you|play a few|after a few|no (?:analysed|analyzed)/i], mustNot: [/\d+(?:\.\d+)?%/] },
  converting: { board: null, ask: 'how well do I convert winning positions?', reading: { kind: 'converting' },
    must: [/import|upload|no games|haven't (?:played|imported)|not enough|once you|play a few|after a few|no (?:analysed|analyzed)/i], mustNot: [/\d+(?:\.\d+)?%/] },
  color: { board: null, ask: 'am I better as White or Black?', reading: { kind: 'color' },
    must: [/import|upload|no games|haven't (?:played|imported)|not enough|once you|play a few|after a few|no (?:analysed|analyzed)/i], mustNot: [/\d+(?:\.\d+)?%/] },
  records: { board: null, ask: "what's my best win?", reading: { kind: 'records' },
    must: [/import|upload|no games|haven't (?:played|imported)|not enough|once you|play a few|after a few|no (?:analysed|analyzed)/i], mustNot: [/\d+(?:\.\d+)?%/] },
  'record-vs': { board: null, ask: 'how do I score against the Sicilian?', reading: { kind: 'record-vs', topic: 'Sicilian' },
    must: [/import|upload|no games|haven't (?:played|imported)|not enough|once you|play a few|after a few|no (?:analysed|analyzed)/i], mustNot: [/\d+(?:\.\d+)?%/] },
  'puzzle-stats': { board: null, ask: "what's my puzzle rating?", reading: { kind: 'puzzle-stats' },
    must: [/haven't solved|no puzzles/i], mustNot: [/puzzle rating is \d/, /\d+(?:\.\d+)?%/] },
  'transfer-gap': { board: null, ask: 'do my puzzle skills show up in my games?', reading: { kind: 'transfer-gap' },
    must: [/import|upload|no games|haven't (?:played|imported)|not enough|once you|play a few|after a few|no (?:analysed|analyzed)/i], mustNot: [/\d+(?:\.\d+)?%/] },
  'skill-radar': { board: null, ask: 'show me my skill radar', reading: { kind: 'skill-radar' },
    must: [/import|upload|no games|haven't (?:played|imported)|not enough|once you|play a few|after a few|no (?:analysed|analyzed)/i], mustNot: [/\d+(?:\.\d+)?%/] },
  trend: { board: null, ask: "what's my rating trend?", reading: { kind: 'trend' },
    must: [/import|upload|no games|haven't (?:played|imported)|not enough|once you|play a few|after a few|no (?:analysed|analyzed)/i], mustNot: [/\d+(?:\.\d+)?%/] },
  progress: { board: null, ask: 'am I improving?', reading: { kind: 'progress' },
    must: [/import|upload|no games|haven't (?:played|imported)|not enough|once you|play a few|after a few|no (?:analysed|analyzed)/i], mustNot: [/\d+(?:\.\d+)?%/] },
  'opening-profile': { board: null, ask: "what's my best opening?", reading: { kind: 'opening-profile' },
    must: [/import|upload|no games|haven't (?:played|imported)|not enough|once you|play a few|after a few|no (?:analysed|analyzed)/i], mustNot: [/\d+(?:\.\d+)?%/] },
  'endgame-weakness': { board: null, ask: 'which endgames am I weakest at?', reading: { kind: 'endgame-weakness' },
    must: [/import|upload|no games|haven't (?:played|imported)|not enough|once you|play a few|after a few|no (?:analysed|analyzed)/i], mustNot: [/\d+(?:\.\d+)?%/] },
  'review-due': { board: null, ask: "what's due for review?", reading: { kind: 'review-due' },
    must: [/(?:no|don't have any) (?:opening )?review cards|nothing (?:is )?due/i], mustNot: [/\d+(?:\.\d+)?%/] },
  // ── knowledge: what the app knows without a board ──
  concept: { board: null, ask: 'what is a fork?', reading: { kind: 'concept', topic: 'fork' },
    must: [/fork/i, /two|both|more than one/i] },
  theory: { board: null, ask: 'how do I play against an isolated pawn?', reading: { kind: 'theory', topic: 'an isolated pawn' },
    must: [/isolated/i] },
  'opening-identity': { board: null, ask: 'what is the Caro-Kann about?', reading: { kind: 'opening-identity', topic: 'Caro-Kann' },
    must: [/Caro/] },
  'opening-existence': { board: null, ask: 'is there an opening called the Fried Liver?', reading: { kind: 'opening-existence', topic: 'Fried Liver' },
    must: [/Fried Liver Attack/, /yes|there is|it's real|is an? /i], mustNot: [/Anti-Fried/] },
  'opening-traps': { board: null, ask: 'what traps are there in the Italian?', reading: { kind: 'opening-traps', topic: 'Italian' },
    must: [/Italian|trap/i] },
  'counter-repertoire': { board: null, ask: 'what should I play against the Sicilian?', reading: { kind: 'counter-repertoire', topic: 'Sicilian' },
    must: [/Sicilian/, /Alapin|Open|Grand Prix|Rossolimo|Moscow|Smith|c3|d4|Nc3|Bb5/] },
  'training-request': { board: null, ask: 'set up some calculation training', reading: { kind: 'training-request', topic: 'calculation' },
    must: [/calculation/i] },
  settings: { board: null, ask: 'is the voice on?', reading: { kind: 'settings' },
    must: [/voice/i] },
  'app-help': { board: null, ask: 'what can you do?', reading: { kind: 'app-help' },
    must: [/.{40}/], mustNot: [/best move is/i] },
  'book-teaching': { board: null, ask: 'what does Capablanca say about rook endings?', reading: { kind: 'book-teaching', topic: 'rook endings' },
    must: [/Capablanca|rook/i] },
  // ── the conversation (asked after a turn, so the kind has one) ──
  stop: { board: 'mate4', ask: 'stop', reading: { kind: 'stop' },
    before: [{ ask: "what's the best move here?", reading: { kind: 'best-move' } }],
    must: [/^Okay\.$/], mustNot: [/not clear/i] },
  'conversational-reply': { board: 'mate4', ask: 'yes', reading: { kind: 'conversational-reply' },
    before: [{ ask: "what's the best move here?", reading: { kind: 'best-move' } }],
    must: [/^.{1,40}$/], mustNot: [/not clear/i] },
  unclear: { board: 'mate4', ask: 'blorp the zibble', reading: { kind: 'unclear' },
    must: [/another way|what you mean/i], mustNot: [/Nh6/] },
  'explain-last': { board: 'mate4', ask: 'explain that', reading: { kind: 'explain-last' },
    before: [{ ask: "what's the best move here?", reading: { kind: 'best-move' } }],
    // Each move at the position it is played from: the checks force the king,
    // and the first move keeps the reason it was given (the mate).
    must: [/Nh6\+ starts a forced mate in 4/, /Qf6\+ is check, and …Ke8 is the only reply/, /Bxc6# is mate/],
    mustNot: [/f-file|saves the bishop/] },
  'i-dont-know': { board: 'mate4', ask: "I don't know", reading: { kind: 'i-dont-know' },
    must: [/hint/i, /knight on g4/], mustNot: [/Nh6/] },
  answer: { board: 'italian', ask: 'the pawn on e4', reading: { kind: 'answer', referents: [{ type: 'square', square: 'e4' }] },
    before: [{ ask: 'what are they threatening?', reading: { kind: 'threats', seat: 'them' } }],
    must: [/^Your pawn on e4/, /knight on f6/], mustNot: [/move 1|top move/] },
  'compare-my-move': { board: 'italian', ask: 'why is Ba4 better than what I played?', reading: { kind: 'compare-my-move', referents: [{ type: 'move', san: 'Ba4' }] },
    // Engine-checked: Be2 was the top move there, so Ba4 is not better.
    must: [/Ba4/, /You played Be2/, /worse/] },
  // ── knowledge and the app ──
  'master-play': { board: 'caro', ask: 'what do masters play here?', reading: { kind: 'master-play' },
    must: [/\bNf3\b/, /\d[\d,]* games/], mustNot: [/not other players/] },
  'player-games': { board: 'caro', ask: 'how does Naroditsky play this?', reading: { kind: 'player-games', topic: 'Naroditsky' },
    must: [/Naroditsky/, /\d+ reference games/], mustNot: [/Variation \d/] },
  'teaching-method': { board: null, ask: 'how would you teach me the Sicilian?', reading: { kind: 'teaching-method', topic: 'Sicilian' },
    must: [/Watch/, /Learn/, /Practice/, /Play/] },
  'start-thinking-lesson': { board: null, ask: 'teach me how to think', reading: { kind: 'start-thinking-lesson' },
    must: [/Learn how to think/], mustNot: [/can't connect/] },
};

// The openings database every device seeds at boot (the opening kinds read it).
beforeAll(async () => { await loadRepertoireData(); await loadEcoData(); }, 240_000);

beforeEach(async () => {
  missingHere = new Set<string>();
  // Every device has its profile from boot; a fresh one, no games.
  await db.profiles.put(buildUserProfile({ id: 'main' }));
  // The app's own data files (`public/data/…`) are served from disk, as the
  // device fetches them; anything else (the network) is unreachable.
  vi.spyOn(globalThis, 'fetch').mockImplementation(async (input: RequestInfo | URL) => {
    const url = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url;
    const pathname = (() => { try { return new URL(url, 'http://local').pathname; } catch { return ''; } })();
    const file = path.join(process.cwd(), 'public', pathname);
    if (pathname.startsWith('/data/') && fs.existsSync(file)) return new Response(fs.readFileSync(file), { status: 200, headers: { 'content-type': 'application/json' } });
    return new Response('{}', { status: 404 });
  });
  resetConversations();
});
afterEach(() => { setChatTurnReaderForTests(undefined); vi.restoreAllMocks(); });
afterAll(() => {
  if (missing.size) fs.writeFileSync(path.join(FIX_DIR, 'contractEngine.missing.json'), JSON.stringify([...missing], null, 1) + '\n');
});

const written = (Object.entries(CONTRACTS) as Array<[ChatKind, Contract | Owed]>).filter((e): e is [ChatKind, Contract] => !('owed' in e[1]));


/**
 * THE HARD TIER (David 2026-10-10: "step up the difficulty"). 2000-level
 * questions on engine-checked positions. A `verify` reads the BOARD, not the
 * wording: a defence must actually stop the mate, a claimed gain must be the
 * ledger's.
 */
interface Hard extends Contract { id: string; verify?: (text: string, b: Board) => string | null }
const namedBest = (text: string): string | null => /(?:best move is|The move is|strongest (?:move )?is|play) (\S+?)[.,;—\s]/.exec(text)?.[1]?.replace(/[.,]$/, '') ?? null;
const HARD: Hard[] = [
  { id: 'quiet move, full line', board: 'quietRook', ask: "what's the best move here? walk me through the line", reading: { kind: 'best-move' },
    must: [/\bRe8\b/, /bishop/] },
  { id: 'what a sacrifice gets back', board: 'bishopSac', ask: 'what do I get if I play Bd5+?', reading: { kind: 'candidate-move', referents: [{ type: 'move', san: 'Bd5+' }] },
    must: [/Bd5\+/, /cxd5/, /ahead|win|you come out/i], mustNot: [/drops the bishop/] },
  { id: 'defend the back rank', board: 'backRank', ask: 'what should I play here?', reading: { kind: 'what-should-i-play' },
    must: [/.{10}/],
    verify: (text, b) => {
      const san = namedBest(text);
      if (!san) return 'no move named';
      const c = new Chess(b.fen);
      try { c.move(san); } catch { return `named ${san}, not legal here`; }
      return c.moves().some((m) => m.endsWith('#')) ? `${san} allows mate in one` : null;
    } },
  { id: 'the threat is named before the move', board: 'backRank', ask: 'what are they threatening?', reading: { kind: 'threats', seat: 'them' },
    must: [/Re8#/] },
  { id: 'a real gap is not "about the same"', board: 'pawns', ask: 'Kd3 or h5?', reading: { kind: 'compare-moves', referents: [{ type: 'move', san: 'Kd3' }, { type: 'move', san: 'h5' }] },
    must: [/\bKd3\b/], mustNot: [/about the same/] },
  { id: 'two questions in one', board: 'italian', ask: "what's the best move, and what are they threatening?", reading: { kind: 'best-move' },
    must: [/\bb4\b/, /e4/] },
  { id: 'a capture counted to the end', board: 'italian', ask: 'should I take on e5 with the knight?', reading: { kind: 'candidate-move', referents: [{ type: 'move', san: 'Nxe5' }] },
    // Engine-checked: after Nxe5 dxe5 b4! White wins the material back, so
    // the move is clearly WORSE (+3.0 → −0.7), not a dropped knight. The
    // answer must say worse and name the pawn that takes it — never a loss
    // the board does not have.
    must: [/Nxe5/, /d6|dxe5/, /worse/i], mustNot: [/drops the knight|lose[s]? (?:a|the|your) knight/i] },
  { id: 'why the natural capture fails', board: 'mate4', ask: 'why not Qxc7?', reading: { kind: 'candidate-move', referents: [{ type: 'move', san: 'Qxc7' }] },
    must: [/Qxg2#/] },
];

describe('the hard tier', () => {
  it.each(HARD.map((h) => [h.id, h] as const))('%s', async (_id, c) => {
    setChatTurnReaderForTests(async () => ({ referents: [], seat: null, topic: null, ...c.reading }) as never);
    const b: Board = BOARDS[c.board as keyof typeof BOARDS];
    const a = await dispatchCoachTurn({
      surface: 'standalone-chat', ask: c.ask, origin: 'typed',
      liveState: { surface: 'standalone-chat', fen: b.fen, whoseTurn: b.fen.split(' ')[1] === 'w' ? 'white' : 'black', studentColor: b.studentColor, moveHistory: b.history, currentRoute: '/coach/chat' },
    } as never, { maxToolRoundTrips: 1 });
    const text = (a.text ?? '').replace(/\s*\[BOARD:[^\]]*\]/g, '').trim();
    if (missingHere.size) throw new Error(`engine fixture is missing ${missingHere.size} position(s): run node scripts/chat-contracts/gen-engine-fixture.mjs`);
    const report = `[hard: ${c.ask}] served=${a.servedIntent ?? '—'} answer: ${text}`;
    if (process.env.CONTRACT_LOG) console.log(report);
    for (const re of c.must) expect(text, report).toMatch(re);
    for (const re of [...ALWAYS_NOT, ...(c.mustNot ?? [])]) expect(text, report).not.toMatch(re);
    const bad = c.verify?.(text, b) ?? null;
    expect(bad, report).toBeNull();
  }, 60_000);
});

describe('every question kind answers its contract', () => {
  it.each(written)('%s', async (kind, c) => {
    const b: Board | null = c.board ? BOARDS[c.board] : null;
    let liveState: Record<string, unknown> = b
      ? { surface: 'standalone-chat', fen: b.fen, whoseTurn: b.fen.split(' ')[1] === 'w' ? 'white' : 'black', studentColor: b.studentColor, moveHistory: b.history, currentRoute: '/coach/chat' }
      : { surface: 'standalone-chat', currentRoute: '/coach/chat' };
    let lastAssistantMessage: string | undefined;
    for (const turn of c.before ?? []) {
      setChatTurnReaderForTests(async () => ({ referents: [], seat: null, topic: null, ...turn.reading }) as never);
      const prior = await dispatchCoachTurn({ surface: 'standalone-chat', ask: turn.ask, origin: 'typed', liveState } as never, { maxToolRoundTrips: 1, lastAssistantMessage });
      lastAssistantMessage = prior.text;
      liveState = { ...liveState, lastCoachLine: prior.text };
    }
    setChatTurnReaderForTests(async () => ({ referents: [], seat: null, topic: null, ...c.reading }) as never);
    const a = await dispatchCoachTurn({
      surface: 'standalone-chat', ask: c.ask, origin: 'typed', liveState,
    } as never, { maxToolRoundTrips: 1, lastAssistantMessage });
    // What the student reads: the bubble strips the arrow tags.
    const text = (a.text ?? '').replace(/\s*\[BOARD:[^\]]*\]/g, '').trim();
    if (missingHere.size) throw new Error(`engine fixture is missing ${missingHere.size} position(s): run node scripts/chat-contracts/gen-engine-fixture.mjs`);
    const report = `[${kind}] served=${a.servedIntent ?? '—'} answer: ${text}`;
    if (process.env.CONTRACT_LOG) console.log(report);
    expect(text.trim().length, report).toBeGreaterThan(0);
    for (const re of c.must) expect(text, report).toMatch(re);
    const always = c.allowStudentVoice ? ALWAYS_NOT.filter((re) => !re.source.includes("I'm")) : ALWAYS_NOT;
    for (const re of [...always, ...(c.mustNot ?? [])]) expect(text, report).not.toMatch(re);
    for (const re of c.once ?? []) expect(text.match(new RegExp(re.source, 'g'))?.length ?? 0, report).toBeLessThanOrEqual(1);
  }, 60_000);

  it('no kind is owed — every kind has its contract', () => {
    const owed = Object.values(CONTRACTS).filter((c) => 'owed' in c).length;
    expect(owed).toBe(0);
  });
});
