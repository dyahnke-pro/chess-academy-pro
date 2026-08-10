// The coach describes both roads and asks — it never picks for the student.
//
// David 2026-08-10: "Have the coach narrate with the forward PV the two
// different paths and have the coach ask which path they want to walk down.
// This happens only when still in book/theory."
//
// The DB finds the fork; the forward line only says where each road LEADS.
// (David, on whether the engine should find forks instead: "The forward PV is
// the fork or at least can reveal it. But not necessary here I think." — that
// is the out-of-book version, and a later decision.)
import { describe, it, expect } from 'vitest';
import { Chess } from 'chess.js';
import { forkOfferAt, roadsNotTakenAt } from './forkNarration';

const fenAfter = (sans: string[]): string => {
  const b = new Chess();
  for (const s of sans) b.move(s);
  return b.fen();
};

describe('the fork offer', () => {
  it('fires at a real branch point in the theory', () => {
    // After 1.e4 c5 the Sicilian splits many ways in the DB.
    const hist = ['e4', 'c5'];
    const offer = forkOfferAt(hist, fenAfter(hist), 'black');
    expect(offer, 'no fork offered where the theory plainly splits').not.toBeNull();
    expect(offer!.roads.length).toBeGreaterThan(1);
  });

  it('ASKS — it does not choose', () => {
    const hist = ['e4', 'c5'];
    const said = forkOfferAt(hist, fenAfter(hist), 'black')!.said;
    expect(said).toMatch(/which one do you want to walk\?$/i);
    expect(said, 'the coach recommended a road').not.toMatch(/\bI'?d suggest|you should (?:play|take)|best (?:is|line)/i);
  });

  it('names each road and says where it leads', () => {
    const hist = ['e4', 'c5'];
    const offer = forkOfferAt(hist, fenAfter(hist), 'black')!;
    const described = offer.roads.filter((r) => r.preview);
    expect(described.length, 'not one road could be described').toBeGreaterThan(0);
    for (const r of described) expect(offer.said).toContain(r.name);
  });

  it('never hands over a move in the question', () => {
    // The tiles carry the moves; the prose carries the choice.
    for (const hist of [['e4', 'c5'], ['d4', 'Nf6'], ['e4', 'e5'], ['e4', 'e6']]) {
      const offer = forkOfferAt(hist, fenAfter(hist), 'black');
      if (!offer) continue;
      expect(offer.said, `a move leaked: ${offer.said}`)
        .not.toMatch(/\b[NBRQK][a-h]?[1-8]?x?[a-h][1-8]\b/);
    }
  });

  it('every road it offers is a LEGAL move in the position', () => {
    for (const hist of [['e4', 'c5'], ['d4', 'd5'], ['e4', 'e5', 'Nf3']]) {
      const fen = fenAfter(hist);
      const legal = new Set(new Chess(fen).moves());
      const offer = forkOfferAt(hist, fen, 'white');
      if (!offer) continue;
      for (const r of offer.roads) {
        expect(legal.has(r.san), `${r.san} is not legal here — the fork invented a road`).toBe(true);
      }
    }
  });
});

describe('"only in book" needs no flag', () => {
  it('goes silent once the position leaves the database', () => {
    // A deliberately silly but legal opening: off the map, so the DB has no
    // roads and the question never arises. That IS the in-book boundary — the
    // coach offers a choice exactly as long as it has real lines to offer.
    const hist = ['a4', 'h5', 'Ra3', 'Rh6', 'Rg3', 'Rb6'];
    expect(forkOfferAt(hist, fenAfter(hist), 'white')).toBeNull();
  });

  it('goes silent when there is only one continuation', () => {
    // One road is not a choice, and offering it is noise.
    const b = new Chess();
    for (const s of ['e4', 'c5', 'Nf3', 'd6', 'd4', 'cxd4', 'Nxd4', 'Nf6', 'Nc3', 'a6']) b.move(s);
    const hist = b.history();
    const offer = forkOfferAt(hist, b.fen(), 'black');
    if (offer) expect(offer.roads.length).toBeGreaterThan(1);
  });

  it('survives a malformed position without inventing anything', () => {
    expect(forkOfferAt(['e4'], 'not a fen', 'white')).toBeNull();
    expect(forkOfferAt([], '8/8/4k3/8/8/4K3/8/8 w - - 0 1', 'white')).toBeNull();
  });
});

describe('the offer is a choice, not a menu', () => {
  it('caps how many roads it puts in front of the student', () => {
    const hist = ['e4', 'c5'];
    expect(forkOfferAt(hist, fenAfter(hist), 'black', 3)!.roads.length).toBeLessThanOrEqual(3);
  });

  it('accounts for the roads it did not describe rather than hiding them', () => {
    const hist = ['e4', 'c5'];
    const offer = forkOfferAt(hist, fenAfter(hist), 'black', 3)!;
    const undescribed = offer.roads.filter((r) => !r.preview).length;
    if (undescribed > 0) expect(offer.said).toMatch(/more road/);
  });
});

describe('each road says what is DIFFERENT about it', () => {
  // Taking each road's best line produced "Sicilian: you want to win a pawn.
  // Closed Sicilian: you want to win a pawn" — both true, and useless for
  // choosing between them, which is the one thing this beat exists to do.
  const fenOf = (sans: string[]): string => {
    const b = new Chess();
    for (const s of sans) b.move(s);
    return b.fen();
  };

  it('never gives two roads the same preview', () => {
    for (const [hist, side] of [
      [['e4', 'c5'], 'black'], [['e4', 'e5'], 'white'], [['d4', 'd5'], 'white'],
      [['e4', 'e6', 'd4', 'd5'], 'black'], [['d4', 'Nf6'], 'black'], [['e4', 'c6'], 'black'],
    ] as Array<[string[], 'white' | 'black']>) {
      const offer = forkOfferAt(hist, fenOf(hist), side);
      if (!offer) continue;
      const previews = offer.roads.map((r) => r.preview).filter(Boolean);
      expect(
        new Set(previews).size,
        `after ${hist.join(' ')} two roads read identically: ${previews.join(' / ')}`,
      ).toBe(previews.length);
    }
  });

  it('falls back to a real difference rather than repeating itself', () => {
    // When a road has nothing distinctive left to say, how much theory runs
    // through it is at least a genuine difference between the options.
    const hist = ['e4', 'c5'];
    const offer = forkOfferAt(hist, fenOf(hist), 'black')!;
    for (const r of offer.roads) {
      if (r.preview.includes('named lines run through it')) {
        expect(r.lines).toBeGreaterThan(0);
      }
    }
  });
});

describe('the review form — the roads not taken', () => {
  // David 2026-08-10: "in review it will help show what the user could have
  // played. If you played x it could have won a pawn." Same machinery pointed
  // at a finished game: past tense, and compared against a move already on the
  // board rather than asking for one.
  const fenOf = (sans: string[]): string => {
    const b = new Chess();
    for (const s of sans) b.move(s);
    return b.fen();
  };

  it('names what you took, then what was there too', () => {
    const hist = ['e4', 'c5'];
    const r = roadsNotTakenAt({
      historySans: hist, fen: fenOf(hist), playedSan: 'Nf3', studentColor: 'white',
    })!;
    expect(r.said).toMatch(/^You took the /);
    expect(r.said).toContain('was there too');
  });

  it('speaks in the PAST, because the game already happened', () => {
    const hist = ['e4', 'e5'];
    const r = roadsNotTakenAt({
      historySans: hist, fen: fenOf(hist), playedSan: 'f4', studentColor: 'white',
    })!;
    expect(r.said).toMatch(/could have|would have|was there/);
    expect(r.said, `present tense in a review: ${r.said}`).not.toMatch(/\bYou want to\b|\bThey want to\b/);
  });

  it('never offers back the road you actually took', () => {
    const hist = ['e4', 'c5'];
    const r = roadsNotTakenAt({
      historySans: hist, fen: fenOf(hist), playedSan: 'Nf3', studentColor: 'white',
    })!;
    expect(r.roads.some((x) => x.san === 'Nf3'), 'the review suggested the move you played').toBe(false);
  });

  it('says nothing when the position never forked', () => {
    const hist = ['a4', 'h5', 'Ra3', 'Rh6', 'Rg3', 'Rb6'];
    expect(roadsNotTakenAt({
      historySans: hist, fen: fenOf(hist), playedSan: 'Rgg6', studentColor: 'white',
    })).toBeNull();
  });

  it('never hands over a move in the prose', () => {
    for (const [hist, played] of [
      [['e4', 'c5'], 'Nf3'], [['e4', 'e5'], 'f4'], [['e4', 'e6', 'd4', 'd5'], 'Nc3'],
    ] as Array<[string[], string]>) {
      const r = roadsNotTakenAt({
        historySans: hist, fen: fenOf(hist), playedSan: played, studentColor: 'white',
      });
      if (!r) continue;
      expect(r.said, `a move leaked: ${r.said}`).not.toMatch(/\b[NBRQK][a-h]?[1-8]?x?[a-h][1-8]\b/);
    }
  });

  it('does not scold', () => {
    // Showing the map is not second-guessing. A review that opens "you should
    // have" is a different, worse product.
    const hist = ['e4', 'c5'];
    const r = roadsNotTakenAt({
      historySans: hist, fen: fenOf(hist), playedSan: 'Nf3', studentColor: 'white',
    })!;
    expect(r.said.toLowerCase()).not.toMatch(/should have|mistake|blunder|wrong|better would/);
  });
});
