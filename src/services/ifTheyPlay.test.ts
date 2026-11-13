// "IF THEY X, YOU PLAY Y" ON HIS OWN GAMES (ifTheyPlay). Each board below is
// one where Danya named a reply and his answer to it in a speedrun; the read
// is Stockfish's, every legal reply at depth 10 (src/test/fixtures/
// if-they-play-danya.json — moves and scores, never his words). Before this
// computer the app said at most "keep an eye on X — their strongest try"
// (`opponentIntentFacts`): one reply, no answer.
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { Chess } from 'chess.js';
import { ifTheyPlay, treeSentence, sayable, replyReadsFromFan, baitBranch, baitSentence, repliesNotWeighed, type ReplyRead } from './ifTheyPlay';
import { turnPartOf } from './coachMoment';
import { readBoardAll } from './boardComputers';
import { moveThoughtFacts } from './moveThoughtFacts';
import { NO_PREV_CAPTURE } from './captureRun';
import { isProof } from './proof';

interface Row { video: string; ply: number; fen: string; x: string; y: string | null; read: ReplyRead[] }
const ROWS = JSON.parse(readFileSync('src/test/fixtures/if-they-play-danya.json', 'utf8')) as Row[];
const row = (video: string, ply: number): Row => {
  const r = ROWS.find((q) => q.video === video && q.ply === ply);
  if (!r) throw new Error(`no fixture ${video}@${ply}`);
  return r;
};
const moverOf = (fen: string): 'w' | 'b' => (new Chess(fen).turn() === 'w' ? 'b' : 'w');

/** The branch for his reply, said live at 1500 from the mover's seat. */
function said(r: Row, rating = 1500): { one: string | null; all: string | null } {
  const student = moverOf(r.fen);
  const t = ifTheyPlay({ fen: r.fen, replies: r.read, rating, student, seconds: [], played: null });
  if (!t) return { one: null, all: null };
  const b = t.branches.find((q) => q.reply.uci === r.x);
  const sayables = t.branches.filter((q) => sayable(t, q, student, 'live'));
  return { one: b && sayable(t, b, student, 'live') ? treeSentence(t, [b], student, 'live') : null, all: treeSentence(t, sayables, student, 'live') };
}

describe('the reply he named, and the answer he gave', () => {
  it('1rcEbI44WqE@47: the capture on e5 is met by the knight taking back, his answer', () => {
    expect(said(row('1rcEbI44WqE', 47)).one).toBe('If they take on e5, you take back with the knight.');
  });
  it('358seoKegqA@14: Bxe6 is met by the queen trade, his answer', () => {
    expect(said(row('358seoKegqA', 14)).one).toBe('If they take on e6 with the bishop, Qxd8+ trades queens.');
  });
  it('4_Ev1a1_2Mg@8: Nxe4 is met by …d5, his answer', () => {
    expect(said(row('4_Ev1a1_2Mg', 8)).one).toBe('If they take on e4, …d5 attacks their knight on e4.');
  });
  it('6WyNj23mrCc@18: …Bf5 is met by g4, his answer', () => {
    expect(said(row('6WyNj23mrCc', 18)).one).toBe('If they play …Bf5, g4 joins your queen against their bishop on f5.');
  });
  it('ILYWTV0uCio@22: Bd3 is met by …g6, his answer', () => {
    expect(said(row('ILYWTV0uCio', 22)).one).toBe('If they play Bd3, …g6 attacks their knight on h5.');
  });
  it('38QzSkFRn4E@26: Bf4 is met by the trade on f4, his answer', () => {
    expect(said(row('38QzSkFRn4E', 26)).one).toBe('If they play Bf4, …Bxf4 trades bishops.');
  });
  it('a reply that loses: the answer wins it, with the line to the blow', () => {
    expect(said(row('fGBhk9oqdbg', 22)).one).toBe('If they play …Be6, f5 wins a bishop — a trapped piece: you play f5, they castle kingside and you play fxe6.');
  });
});

describe('the tree', () => {
  it('walks the likely replies and the engine\'s best, and says what each answer proves', () => {
    const r = row('6JsSbmpj7UQ', 42);
    const { all } = said(r);
    expect(all).toContain('If they take on h6, you take back with the queen');
    expect(all).toContain('If they take on d4 with the bishop, Qxd4 wins a bishop for a pawn');
  });

  it('the reply the line goes on with is the line itself, never a branch said again', () => {
    const r = row('1rcEbI44WqE', 47);
    const student = moverOf(r.fen);
    const t = ifTheyPlay({ fen: r.fen, replies: r.read, rating: 1500, student, seconds: [], played: 'f6e5' });
    expect(t?.branches.find((b) => b.reply.uci === 'f6e5')?.played).toBe(true);
    const f = readBoardAll('ifTheyPlay', { fen: r.fen, replies: r.read, rating: 1500, student, seconds: [], played: 'f6e5', tense: 'live', liveBoard: null });
    expect(f.map((x) => x.text).join(' ')).not.toContain('take on e5');
  });

  it('after the game went on, only what a branch would have won is said', () => {
    const r = row('6JsSbmpj7UQ', 42);
    const student = moverOf(r.fen);
    const f = readBoardAll('ifTheyPlay', { fen: r.fen, replies: r.read, rating: 1500, student, seconds: [], played: 'g7h6', tense: 'past', liveBoard: null });
    // The recapture on h6 they did play is the line; the trade it would have
    // been is not said. Both captures on d4 lose a bishop for a pawn. Qxd4
    // unveils nothing (the rook on d1 stands behind its own queen): no
    // "discovered attack" (false facts class C, 2026-11-12).
    expect(f[0]?.text, 'a sentence a branch, never a spoken semicolon').toBe('Had they taken on d4 with the bishop, Qxd4 would have won a bishop for a pawn: you play Qxd4, they answer Qxd4+ and you play Rxd4. If they had taken on d4 with the queen, Qxd4 would have won a bishop for a pawn: you play Qxd4, they answer Bxd4+ and you play Rxd4.');
  });

  it('the past is said more than one way across a game (prod Review audit 2026-11-11: "if they had taken on SQ, … would have won …" three times)', () => {
    // Two branches on one board already take two phrasings; the rotation is
    // keyed on the board and the reply, so a replay says them the same way.
    const r = row('6JsSbmpj7UQ', 42);
    const student = moverOf(r.fen);
    const say = () => readBoardAll('ifTheyPlay', { fen: r.fen, replies: r.read, rating: 1500, student, seconds: [], played: 'g7h6', tense: 'past', liveBoard: null })[0]?.text ?? '';
    const t = say();
    const openers = t.split(/(?<=\.) /).map((x) => x.split(' ').slice(0, 2).join(' '));
    expect(new Set(openers).size).toBeGreaterThan(1);
    expect(say()).toBe(t);
  });

  it('a branch whose answer wins rules out that reply: the same claim as the weighed moves\' "tempting, but it fails" (prod Review 2026-11-09)', async () => {
    const { temptingKey } = await import('./conceptKey');
    const r = row('6JsSbmpj7UQ', 42);
    const student = moverOf(r.fen);
    const f = readBoardAll('ifTheyPlay', { fen: r.fen, replies: r.read, rating: 1500, student, seconds: [], played: 'g7h6', tense: 'past', liveBoard: null });
    // Both captures on d4 lose a bishop for a pawn: each is ruled out.
    const t = ifTheyPlay({ fen: r.fen, replies: r.read, rating: 1500, student, seconds: [], played: 'g7h6' })!;
    const d4 = t.branches.filter((b) => b.reply.to === 'd4' && b.kind === 'wins').map((b) => temptingKey(b.reply.uci));
    expect(d4.length).toBe(2);
    for (const k of d4) expect(f[0]?.claims).toContain(k);
  });

  it('no read, no tree — never a guess', () => {
    const r = row('1rcEbI44WqE', 47);
    expect(readBoardAll('ifTheyPlay', { fen: r.fen, replies: null, rating: 1500, student: 'w', seconds: [], played: null, tense: 'live', liveBoard: null })).toEqual([]);
    expect(ifTheyPlay({ fen: r.fen, replies: [], rating: 1500, student: 'w', seconds: [], played: null })).toBeNull();
  });

  it('a fan of White-POV lines reads as the replier\'s view, a mate folded', () => {
    const fen = row('4_Ev1a1_2Mg', 8).fen; // White to move
    const reads = replyReadsFromFan(fen, [{ evaluation: 40, mate: null, moves: ['c3e4', 'd7d5'] }, { evaluation: 0, mate: -2, moves: ['d1d2', 'd8h4'] }]);
    expect(reads[0]).toEqual({ uci: 'c3e4', cp: 40, mate: null, pv: ['c3e4', 'd7d5'] });
    expect(reads[1].mate).toBe(-2);
    expect(reads[1].cp).toBeLessThan(-2000);
  });
});

describe('the one registry', () => {
  it('is the one fact: a reply tree (said in the line\'s step), from the mover\'s seat, proven by its own moves', () => {
    const r = row('358seoKegqA', 14);
    const student = moverOf(r.fen);
    const [f] = readBoardAll('ifTheyPlay', { fen: r.fen, replies: r.read, rating: 1500, student, seconds: [], played: null, tense: 'live', liveBoard: null });
    // Its own kind since 2026-11-05 (the reply tree is M-REPLY-TREE, not a
    // bare line), still said in the line's step.
    expect(f.kind).toBe('reply-tree');
    expect(f.group).toBe('line');
    expect(f.computer).toBe('ifTheyPlay');
    expect(f.seat).toBe('student');
    expect(f.namesStudentMove).toBe(false);
    expect(isProof(f.proof)).toBe(true);
    expect(f.text).toContain('Qxd8+ trades queens');
    // From the other seat, the same tree is theirs: "they", never "you".
    const [g] = readBoardAll('ifTheyPlay', { fen: r.fen, replies: r.read, rating: 1500, student: new Chess(r.fen).turn(), seconds: [], played: null, tense: 'live', liveBoard: null });
    expect(g.seat).toBe('opponent');
    expect(g.text).toMatch(/^If you /);
  });

  it('LEARN NAMES NO MOVE UNASKED: the strong answer to the reply that came is held without its square', () => {
    const r = row('fGBhk9oqdbg', 22);
    const student = moverOf(r.fen);
    const live = new Chess(r.fen); live.move('Be6');
    const facts = readBoardAll('ifTheyPlay', { fen: r.fen, replies: r.read, rating: 1500, student, seconds: [], played: 'c8e6', tense: 'past', liveBoard: live.fen() });
    const came = facts.find((f) => f.namesStudentMove);
    expect(came?.text).toContain('f5 wins a bishop');
    // What the answer does, never the move (prod focus audit 2026-11-07:
    // "you have a strong answer here" said nothing).
    expect(came?.heldForm?.text).toBe('After their move, one move of yours wins material here — find it.');
    expect(came?.heldForm?.text).not.toMatch(/[a-h][1-8]/);
  });
});

describe('the lesson composer is handed the tree', () => {
  it('…Nc4 in his game: "if they take on e5, you take back with the knight"', () => {
    const r = row('1rcEbI44WqE', 47);
    const fenBefore = '1nkr3r/1pp1b1pp/4pp2/2P1P3/b2P4/4B2P/P2NBKP1/1R2R3 w - - 0 24';
    const facts = moveThoughtFacts({ story: false, theory: true, tense: 'now',
      fenBefore, san: 'Nc4', moverIsStudent: true, prev: NO_PREV_CAPTURE, line: null, theirLast: null, history: [], phrases: null,
      reads: { before: [], after: [], passBefore: [], passAfter: [], everyAfter: { replies: r.read, rating: 1500 } }, costCp: null,
    });
    const tree = facts.filter((f) => f.source === 'ifTheyPlay').map((f) => f.text);
    expect(tree.join(' ')).toContain('If they take on e5, you take back with the knight');
  });
});

describe('the bait (WO-COACH-NEXT-TO-YOU-01 C4: induce mistakes)', () => {
  const treeOf = (r: Row, rating = 1500) => {
    const student = moverOf(r.fen);
    return { student, t: ifTheyPlay({ fen: r.fen, replies: r.read, rating, student, seconds: [], played: null })! };
  };
  it('a sound move whose likely reply loses is a bait: "many players at this level answer …Be6, and f5 wins a bishop"', () => {
    const { t, student } = treeOf(row('fGBhk9oqdbg', 22));
    const b = baitBranch(t, student);
    expect(b?.reply.san).toBe('Be6');
    expect(baitSentence(t, b!, student, 'live', true)).toBe('This sets a trap: many players at this level answer …Be6, and f5 wins a bishop — a trapped piece: you play f5, they castle kingside and you play fxe6.');
    // Once the game went on, with the answer still the student's to play: what
    // the reply would have lost, never the move that wins it.
    expect(baitSentence(t, b!, student, 'past', false)).toBe('That set a trap: many players at this level answer …Be6 there, and it would have lost a bishop.');
  });
  it('no bait when the move was unsound, or when no likely reply loses', () => {
    const unsound = treeOf(row('4_Ev1a1_2Mg', 8));
    expect(unsound.t.bestCp).toBeGreaterThan(50);
    expect(baitBranch(unsound.t, unsound.student)).toBeNull();
    const quiet = treeOf(row('1rcEbI44WqE', 47));
    expect(baitBranch(quiet.t, quiet.student)).toBeNull();
  });
  it('is said once: the bait fact carries the trap, and the tree no longer repeats its branch', () => {
    const r = row('fGBhk9oqdbg', 22);
    const ctx = { fen: r.fen, replies: r.read, rating: 1500, student: moverOf(r.fen), seconds: [], played: null, tense: 'live' as const, liveBoard: null };
    const [bait] = readBoardAll('baitSet', ctx);
    expect(bait).toMatchObject({ kind: 'trap-set', group: 'bait', seat: 'student' });
    expect(bait.text).toMatch(/^This sets a trap/);
    expect(turnPartOf(bait.group, bait.seat)).toBe('bait');
    for (const f of readBoardAll('ifTheyPlay', ctx)) expect(f.text).not.toMatch(/Be6/);
  });
});

describe('repliesNotWeighed — one branch, one claim', () => {
  const r = (uci: string): ReplyRead => ({ uci, cp: 0, mate: null, pv: [uci] });
  it('drops a reply the next turn weighed as tempting (Carlsen–Caruana …axb5 Qxg5)', () => {
    const said = new Map([['tempting:a4b5', 57]]);
    expect(repliesNotWeighed([r('a4b5'), r('d1g4')], said, 57).map((x) => x.uci)).toEqual(['d1g4']);
  });
  it('keeps it when that claim was said on another turn', () => {
    const said = new Map([['tempting:a4b5', 61]]);
    expect(repliesNotWeighed([r('a4b5')], said, 57).map((x) => x.uci)).toEqual(['a4b5']);
  });
});

describe('replies with one answer are said once', () => {
  it('Scotch 2.Nf3: …Nf6 and …d6 are both met by d4 — one sentence, not two', () => {
    const fen = (() => { const c = new Chess(); for (const s of ['e4', 'e5', 'Nf3']) c.move(s); return c.fen(); })();
    const read: ReplyRead[] = [
      { uci: 'g8f6', cp: -30, mate: null, pv: ['g8f6', 'd2d4', 'f6e4', 'f1d3'] },
      { uci: 'd7d6', cp: -40, mate: null, pv: ['d7d6', 'd2d4', 'e5d4', 'f3d4'] },
      { uci: 'b8c6', cp: -20, mate: null, pv: ['b8c6', 'd2d4', 'e5d4', 'f3d4'] },
    ];
    const t = ifTheyPlay({ fen, replies: read, rating: 1500, student: 'w', seconds: [], played: null });
    expect(t).not.toBeNull();
    const branches = t!.branches.filter((q) => q.reply.uci !== 'b8c6' && sayable(t!, q, 'w', 'live'));
    const all = treeSentence(t!, branches, 'w', 'live');
    expect(all).toBe('If they play …Nf6 or …d6, d4 joins your knight on f3 against their pawn on e5.');
  });
});
