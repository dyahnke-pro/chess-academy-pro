import { describe, it, expect } from 'vitest';
import { buildCausalChain } from './causalChain';
import { renderCausalChain } from './causalChainVoice';

const DAVID_GAME = ['e4', 'c5', 'Bc4', 'd6', 'Qh5', 'e6', 'd3', 'Nf6', 'Qf3', 'a6', 'Bg5', 'Be7', 'Nd2', 'Qa5', 'Nge2', 'Nxe4'];
const chain = buildCausalChain({ historySans: DAVID_GAME })!;

describe('renderCausalChain — David\'s game, student is Black', () => {
  it('null chain → empty (silent, flat list stands)', () => {
    expect(renderCausalChain(null, { register: 'review', studentColor: 'b' })).toEqual([]);
  });

  it('review register, beginner rating → full chain, correct perspective', () => {
    const lines = renderCausalChain(chain, { register: 'review', studentColor: 'b', rating: 900 });
    const text = lines.join(' ');
    // opponent (White) facts are "their", never "we/our"
    expect(text).toMatch(/their queen came out early to f3/i);
    expect(text).toMatch(/knight had to develop to e2 instead of f3/i);
    expect(text).toMatch(/bishop on g5 with nothing defending it/i);
    // the student's tactic is "You"
    expect(text).toMatch(/you played the knight to e4/i);
    expect(text).toMatch(/discovered double attack on the bishop on g5/i);
    // never first-person plural
    expect(text.toLowerCase()).not.toMatch(/\b(we|our|us)\b/);
    // full = 4 sentences
    expect(lines).toHaveLength(4);
  });

  it('medium rating → drops the displaced-defender middle link (3 sentences)', () => {
    const lines = renderCausalChain(chain, { register: 'review', studentColor: 'b', rating: 1600 });
    expect(lines).toHaveLength(3);
    const text = lines.join(' ');
    expect(text).toMatch(/their queen came out early to f3/i);
    expect(text).toMatch(/bishop on g5/i);
    expect(text).not.toMatch(/develop to e2 instead/i);
  });

  it('advanced rating → one tight line', () => {
    const lines = renderCausalChain(chain, { register: 'review', studentColor: 'b', rating: 2200 });
    expect(lines).toHaveLength(1);
    // Student is Black; the early queen is the opponent's → "Their", and Black won it.
    expect(lines[0]).toMatch(/their early queen on f3 left the bishop on g5 loose — you won it with the discovery/i);
  });

  it('learn register speaks present-tense', () => {
    const lines = renderCausalChain(chain, { register: 'learn', studentColor: 'b', rating: 900 });
    const text = lines.join(' ');
    expect(text).toMatch(/their queen is already out on f3/i);
    expect(text).toMatch(/that's the hook/i);
    expect(text.toLowerCase()).not.toMatch(/\b(we|our|us)\b/);
  });

  it('perspective flips when the STUDENT is the one punished (student = White)', () => {
    // Same game, but frame it for the White player who made the early queen.
    const lines = renderCausalChain(chain, { register: 'review', studentColor: 'w', rating: 900 });
    const text = lines.join(' ');
    expect(text).toMatch(/your queen came out early to f3/i);          // the early queen is now "yours"
    expect(text).toMatch(/your bishop on g5/i);
    expect(text).toMatch(/they played the knight to e4/i);            // opponent won it
    expect(text.toLowerCase()).not.toMatch(/\b(we|our|us)\b/);
  });
});

describe('the guards are counted, not assumed (review 2026-10-19, chesscom-1040709576 move 14)', () => {
  // White castled, so the king stopped guarding d2 — but the queen on d1 still
  // did. The review said "nothing left guarding it".
  const SANS = ["e4","c5","Nf3","Nc6","c3","d6","d4","cxd4","cxd4","Bg4","Bc4","e6","Be3","Nf6","Nc3","Nxe4","Nxe4","d5","Bd3","dxe4","Bxe4","Bb4+","Bd2","Bxf3","Bxf3","Qxd4","O-O","Qxd2"];
  it('names the guard that left as one of two and says the count', async () => {
    const { buildCausalChain } = await import('./causalChain');
    const chain = buildCausalChain({ historySans: SANS, focusPly: SANS.length } as never);
    const lines = renderCausalChain(chain, { register: 'review', studentColor: 'b', rating: 1400 } as never);
    expect(lines.join(' ')).toContain('one of the guards on d2 — two pieces attacked it and only one guarded it');
    expect(lines.join(' ')).not.toMatch(/nothing (was )?left guarding|the only piece guarding/);
  });
});
