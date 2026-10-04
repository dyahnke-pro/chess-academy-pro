import { describe, it, expect } from 'vitest';
import { Chess } from 'chess.js';
import { computePlyFacts, type PrevCaptureContext } from './pvPlayback';
import { projectedLineVoice, type ProjectedLinePly } from './projectedLineVoice';
import { opponentReplySentence } from './puzzleConceptExplanation';

const PTS: Record<string, number> = { p: 1, n: 3, b: 3, r: 5, q: 9, k: 0 };

function line(fen: string, sans: string[]): ProjectedLinePly[] {
  const c = new Chess(fen);
  let prev: PrevCaptureContext = { square: null, capturedValue: 0 };
  return sans.map((san) => {
    const fenBefore = c.fen();
    const mv = c.move(san);
    const ply: ProjectedLinePly = {
      san: mv.san, moverColor: mv.color === 'w' ? 'white' : 'black', fenBefore, fenAfter: c.fen(),
      facts: computePlyFacts(fenBefore, c.fen(), mv, prev),
    };
    prev = { square: mv.to, capturedValue: mv.captured ? PTS[mv.captured] ?? 0 : 0 };
    return ply;
  });
}

// The Tactics-tab line, as a review line for a BLACK student: Ne2+ forks the
// king and queen, the king steps aside, Nxc3 wins the queen, and the game goes
// on. The old per-ply renderer said "then they answer Kf1, the king trains on
// the knight on e2 — pressure they have to answer, Nxc3, you win the queen,
// the knight trains on the pawn on a2 — pressure they have to answer".
const FORK = '6k1/8/8/8/3n4/2Q5/P7/6K1 b - - 0 1';

describe('projectedLineVoice — a line played out for the student', () => {
  const plies = line(FORK, ['Ne2+', 'Kf1', 'Nxc3', 'Ke1']);
  const voice = projectedLineVoice(plies, 'black', { teachQuiet: true, explainTemptation: true });

  it('the student move carries its fact and the motif, once, where it lands', () => {
    expect(voice[0]).toMatch(/fork/);
    expect(voice.filter((v) => v && /fork hits two targets/i.test(v))).toHaveLength(1);
  });

  it('the forced king reply is stated plainly — no motif, no king clause, no "trains on"', () => {
    expect(voice[1]).toBe('They answer the check with Kf1.');
  });

  it('nothing is said after the line has made its point (the queen is won)', () => {
    expect(voice[2]).toMatch(/captures the queen/);
    expect(voice[3]).toBeNull();
    expect(voice.join(' ')).not.toMatch(/trains on|pressure they have to answer|steps toward safety|marches up/);
  });

  it('a reply is never credited with a motif, even when a detector says it landed one', () => {
    const forged = plies.map((p, i) => (i === 1 ? { ...p, facts: { ...p.facts, tacticLanded: 'fork' } } : p));
    const v = projectedLineVoice(forged, 'black', { teachQuiet: true, explainTemptation: true });
    expect(v[1]).toBe('They answer the check with Kf1.');
  });

  it('the seat is read per ply — "they", never we/our or a gendered pronoun', () => {
    const text = voice.filter(Boolean).join(' ');
    expect(text).not.toMatch(/\b(we|our|us|he|his|him)\b/i);
  });

  it('the keystone-only mode stays silent on a quiet student move', () => {
    const quiet = line('6k1/8/8/8/3n4/2Q5/P7/6K1 b - - 0 1', ['Kf7', 'Qc4+']);
    const v = projectedLineVoice(quiet, 'black', { teachQuiet: false, explainTemptation: false });
    expect(v[0]).toBeNull();
    expect(v[1]).toBe('They answer Qc4+.');
  });
});

describe('a take-back is only a take-back of a CAPTURE (walk over Fischer–Byrne, 2026-10-04)', () => {
  it('a pawn pushed to c5 and taken there was won, not recaptured', () => {
    const c = new Chess();
    c.move('d4'); c.move('d5'); c.move('Nf3');
    const v = projectedLineVoice(line(c.fen(), ['c5', 'dxc5']), 'black', { teachQuiet: true, explainTemptation: false });
    expect(v[1]).toBe('They take your pawn with dxc5.');
  });
});

describe('a sacrifice has not made its point yet (Morphy, Opera game)', () => {
  it('a line still down material keeps speaking the student\'s moves after the sac', () => {
    // 1.e4 e5 2.Nf3 d6 3.d4 Bg4 4.dxe5 Bxf3 5.Qxf3 dxe5 6.Bc4 Nf6 7.Qb3 Qe7
    // 8.Nc3 c6 9.Bg5 b5 — then Nxb5 cxb5 Bxb5+ Nbd7 O-O-O: a knight for two
    // pawns, the attack the point. Silence after Bxb5+ would drop O-O-O.
    const c = new Chess();
    for (const m of ['e4', 'e5', 'Nf3', 'd6', 'd4', 'Bg4', 'dxe5', 'Bxf3', 'Qxf3', 'dxe5', 'Bc4', 'Nf6', 'Qb3', 'Qe7', 'Nc3', 'c6', 'Bg5', 'b5']) c.move(m);
    const v = projectedLineVoice(line(c.fen(), ['Nxb5', 'cxb5', 'Bxb5+', 'Nbd7', 'O-O-O']), 'white', { teachQuiet: true, explainTemptation: false });
    expect(v[4]).not.toBeNull();
    expect(v[1]).toBe('They take back with cxb5.');
    expect(v[3]).toBe('They answer the check with Nbd7.');
  });
});

describe('opponentReplySentence — the one plain vocabulary for a reply', () => {
  it('a recapture on the square the student just took on is a take-back', () => {
    // 1.e4 d5 2.exd5 Qxd5 — White student takes, Black takes back.
    const c = new Chess();
    c.move('e4'); c.move('d5'); c.move('exd5');
    expect(opponentReplySentence(c.fen(), 'Qxd5', 'd5')).toBe('They take back with Qxd5.');
  });

  it('an unmoveable reply is null, never a guess', () => {
    expect(opponentReplySentence(new Chess().fen(), 'Qh5', null)).toBeNull();
  });
});
