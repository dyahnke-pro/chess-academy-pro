import { describe, it, expect } from 'vitest';
import {
  ALL_CHAT_KINDS,
  CHAT_KINDS,
  EMPTY_CONVERSATION,
  FAST_PATH_LANES,
  NEW_KINDS,
  canonicalAsk,
  fastPathLane,
  kindAgreesWithLane,
  nextConversationState,
  readSquareAnswer,
  validateChatTurn,
  type ChatKind,
  type ResolvedChatTurn,
} from './chatTurn';

// 1.e4 e5 2.Nf3 Nc6 3.Bc4 Nf6 4.Nc3 Bc5 — a normal middlegame-ish board, White to move.
const FEN = 'r1bqk2r/pppp1ppp/2n2n2/2b1p3/2B1P3/2N2N2/PPPP1PPP/R1BQK2R w KQkq - 6 5';
const HISTORY = ['e4', 'e5', 'Nf3', 'Nc6', 'Bc4', 'Nf6', 'Nc3', 'Bc5'];

describe('the kind table is closed and complete', () => {
  it('every existing lane is a kind (1-to-1), plus the new kinds, chat and unclear', () => {
    const expected = new Set<string>([
      ...FAST_PATH_LANES.filter((l) => l !== 'none'),
      ...NEW_KINDS,
      'chat', 'unclear',
    ]);
    expect(new Set(ALL_CHAT_KINDS)).toEqual(expected);
  });

  it('every existing-lane kind answers on its OWN lane', () => {
    for (const lane of FAST_PATH_LANES) {
      if (lane === 'none') continue;
      expect(CHAT_KINDS[lane as ChatKind].lane, lane).toBe(lane);
    }
  });

  it('a kind marked pending has no canonical (it cannot be served before its answerer exists)', () => {
    for (const k of ALL_CHAT_KINDS) {
      if (CHAT_KINDS[k].answerer === 'pending') expect(CHAT_KINDS[k].canonical, k).toBeNull();
    }
  });

  it('every servable kind\'s canonical question routes, through TODAY\'S fast path, to that kind\'s lane', () => {
    // The flag serves a reading by handing the fast path its canonical text —
    // so each canonical must actually land on the lane the kind claims.
    const turn = (kind: ChatKind): ResolvedChatTurn => ({
      kind,
      seat: 'me',
      topic: kind === 'concept' ? 'fork' : 'Sicilian',
      referents: [
        { type: 'piece', piece: 'n', square: 'f3', seat: 'me' },
        { type: 'move', san: 'd4' },
        { type: 'move', san: 'd3' },
      ],
    });
    const misses: string[] = [];
    for (const k of ALL_CHAT_KINDS) {
      const q = canonicalAsk(turn(k));
      if (q === null) continue;
      const lane = fastPathLane(q, { fen: FEN });
      if (lane !== CHAT_KINDS[k].lane) misses.push(`${k}: "${q}" → ${lane} (want ${CHAT_KINDS[k].lane})`);
    }
    expect(misses).toEqual([]);
  }, 30_000); // ~70 full grounding builds; generous under a loaded CI box
});

describe('the fast path — walk defect 11', () => {
  it('"why is that move better than what I played?" is the retrospective lane, not why-best-move', () => {
    expect(fastPathLane('why is that move better than what I played?', { fen: FEN })).toBe('retrospective-move');
  });
  it('a routed command wins outright', () => {
    expect(fastPathLane('take me to tactics', { routedCommand: true })).toBe('command');
  });
  it('the compare-my-move kind agrees with that lane', () => {
    expect(kindAgreesWithLane('compare-my-move', 'retrospective-move')).toBe(true);
    expect(kindAgreesWithLane('compare-my-move', 'why-best-move')).toBe(false);
  });
  it('NEGATIVE CONTROL — gibberish takes no lane', () => {
    expect(fastPathLane('zzqx blorp', { fen: FEN })).toBe('none');
  });
});

describe('the deterministic answer reader (no model)', () => {
  it('reads several squares', () => {
    expect(readSquareAnswer('c6 and e5')?.referents).toEqual([
      { type: 'square', square: 'c6' }, { type: 'square', square: 'e5' },
    ]);
  });
  it('reads a piece with its square, and a bare square after it', () => {
    expect(readSquareAnswer('the knight on c6, and e5')?.referents).toEqual([
      { type: 'piece', piece: 'n', square: 'c6', seat: null }, { type: 'square', square: 'e5' },
    ]);
  });
  it('reads a bare piece and its seat', () => {
    const t = readSquareAnswer('their rook');
    expect(t?.kind).toBe('answer');
    expect(t?.referents).toEqual([{ type: 'piece', piece: 'r', square: null, seat: 'them' }]);
  });
  it('NEGATIVE CONTROL — a question is not an answer', () => {
    expect(readSquareAnswer('why c6?')).toBeNull();
    expect(readSquareAnswer('is the knight on c6 safe')).toBeNull();
  });
});

describe('validation against the board', () => {
  const board = { fen: FEN, history: HISTORY, studentColor: 'white' as const };
  it('a piece named on a square it is not on → clarify', () => {
    const r = validateChatTurn({ kind: 'what-about-piece', seat: 'me', topic: null, referents: [{ type: 'piece', piece: 'b', square: 'e2', seat: 'me' }] }, board);
    expect(r.ok).toBe(false);
    if (!r.ok) { expect(r.reason).toBe('piece-not-there'); expect(r.clarify).toMatch(/no bishop on e2/); }
  });
  it('a piece on the wrong seat → clarify, naming whose it is', () => {
    const r = validateChatTurn({ kind: 'is-piece-loose', seat: 'me', topic: null, referents: [{ type: 'piece', piece: 'n', square: 'c6', seat: 'me' }] }, board);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.clarify).toMatch(/theirs/);
  });
  it('a move that is neither legal nor on the tape → clarify', () => {
    const r = validateChatTurn({ kind: 'candidate-move', seat: null, topic: null, referents: [{ type: 'move', san: 'Qh8' }] }, board);
    expect(r.ok).toBe(false);
  });
  it('a move already PLAYED is real (by coordinates)', () => {
    const r = validateChatTurn({ kind: 'retrospective-move', seat: null, topic: null, referents: [{ type: 'move', san: 'Nf3' }] }, board);
    expect(r.ok).toBe(true);
  });
  it('an ambiguous piece asks which one', () => {
    const r = validateChatTurn({ kind: 'what-about-piece', seat: 'me', topic: null, referents: [{ type: 'piece', piece: 'n', square: null, seat: 'me' }] }, board);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.clarify).toMatch(/Which knight — the one on c3 or the one on f3\?/);
  });
  it('"the other knight" resolves from conversation memory', () => {
    const first = validateChatTurn({ kind: 'what-about-piece', seat: 'me', topic: null, referents: [{ type: 'piece', piece: 'n', square: 'f3', seat: 'me' }] }, board);
    expect(first.ok).toBe(true);
    if (!first.ok) return;
    const memory = nextConversationState(EMPTY_CONVERSATION, first.turn, 'white');
    const other = validateChatTurn({ kind: 'is-piece-loose', seat: 'me', topic: null, referents: [{ type: 'piece', piece: 'n', square: null, seat: 'me', other: true }] }, board, memory);
    expect(other.ok).toBe(true);
    if (other.ok) expect(other.turn.referents[0]).toEqual({ type: 'piece', piece: 'n', square: 'c3', seat: 'me' });
  });
  it('"what I played" with no move of theirs → clarify; with a drill try → stands', () => {
    const fresh = { fen: 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1', history: [], studentColor: 'white' as const };
    const t = { kind: 'compare-my-move' as const, seat: 'me' as const, topic: null, referents: [{ type: 'what-i-played' as const }] };
    expect(validateChatTurn(t, fresh).ok).toBe(false);
    expect(validateChatTurn(t, { ...fresh, lastStudentAttempt: { fenBefore: fresh.fen, san: 'e4' } }).ok).toBe(true);
  });
  it('a board question with no board → clarify, never an answer from guesswork', () => {
    const r = validateChatTurn({ kind: 'best-move', seat: null, topic: null, referents: [] }, {});
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.reason).toBe('no-board');
  });
  it('NEGATIVE CONTROL — a record question needs no board', () => {
    expect(validateChatTurn({ kind: 'stats', seat: 'me', topic: null, referents: [] }, {}).ok).toBe(true);
  });
});
