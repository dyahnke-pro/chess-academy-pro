import { describe, it, expect } from 'vitest';
import { Chess } from 'chess.js';
import { buildOpeningTheoryLecture, buildTheoryLectureBeats, resolveOpeningIdeas } from './reviewOpeningTheory';
import type { MasterPlayResult, MasterPlayMove } from '../types';

function mv(san: string, games: number, w = 0.4, d = 0.3, b = 0.3): MasterPlayMove {
  return { san, uci: '', games, white: Math.round(games * w), draws: Math.round(games * d), black: Math.round(games * b), whitePct: w, drawPct: d, blackPct: b, averageRating: 2400 };
}
function res(fen: string, moves: MasterPlayMove[]): MasterPlayResult {
  return { fen, totalGames: moves.reduce<number>((s, m) => s + Number(m.games), 0), moves, source: 'local' };
}

/** Play SANs and return the fen chain (fens[0]=start, fens[i]=after ply i). */
function chain(sans: string[]): { fens: string[]; sans: string[] } {
  const c = new Chess();
  const fens = [c.fen()];
  for (const s of sans) { c.move(s); fens.push(c.fen()); }
  return { fens, sans };
}

describe('buildOpeningTheoryLecture — grounded masters tour (David 2026-07-20)', () => {
  it('records mainline + sidelines + the played move, and flags a sideline choice', async () => {
    const { fens, sans } = chain(['e4', 'c5', 'Nf3', 'd6']);
    // Fixture keyed by position-fen prefix (the service passes full fens; match on prefix).
    const byPrefix: Record<string, MasterPlayMove[]> = {
      'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w': [mv('e4', 600), mv('d4', 350), mv('Nf3', 120)],
      'rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b': [mv('c5', 500), mv('e5', 400), mv('e6', 200)],
      'rnbqkbnr/pp1ppppp/8/2p5/4P3/8/PPPP1PPP/RNBQKBNR w': [mv('Nf3', 700), mv('Nc3', 200), mv('c3', 100)],
      'rnbqkbnr/pp1ppppp/8/2p5/4P3/5N2/PPPP1PPP/RNBQKB1R b': [mv('d6', 400), mv('Nc6', 380), mv('e6', 300)],
    };
    const lookup = async (fen: string): Promise<MasterPlayResult> => {
      const key = Object.keys(byPrefix).find((p) => fen.startsWith(p));
      return res(fen, key ? byPrefix[key] : []);
    };
    const lec = await buildOpeningTheoryLecture(fens, sans, 'Sicilian Defense', { lookup });
    expect(lec).not.toBeNull();
    expect(lec!.openingName).toBe('Sicilian Defense');
    expect(lec!.branches.length).toBeGreaterThanOrEqual(3);
    // Move 1: e4 is the mainline (most-played) → isMainline.
    const b1 = lec!.branches[0];
    expect(b1.mainline.san).toBe('e4');
    expect(b1.played?.san).toBe('e4');
    expect(b1.isMainline).toBe(true);
    expect(b1.sidelines.map((s) => s.san)).toContain('d4');
    // Move 2 (…d6 for Black): played d6 is the mainline here.
    const bd6 = lec!.branches.find((b) => b.played?.san === 'd6');
    expect(bd6?.isMainline).toBe(true);
    expect(bd6?.moverColor).toBe('black');
    // pct is a real share, scoreForMover in 0..1.
    expect(b1.mainline.pct).toBeGreaterThan(0);
    expect(b1.mainline.scoreForMover).toBeGreaterThan(0);
    expect(b1.mainline.scoreForMover).toBeLessThanOrEqual(1);
  });

  it('flags the DEPARTURE ply when the game leaves the book (thin/absent)', async () => {
    const { fens, sans } = chain(['e4', 'e5', 'Qh5']); // 2.Qh5 — offbeat, thin book
    const lookup = async (fen: string): Promise<MasterPlayResult> => {
      if (fen.startsWith('rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w')) return res(fen, [mv('e4', 600), mv('d4', 400)]);
      if (fen.startsWith('rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b')) return res(fen, [mv('e5', 500), mv('c5', 500)]);
      // after 1...e5, before 2.Qh5: mainline is Nf3, Qh5 not present → departure
      if (fen.startsWith('rnbqkbnr/pppp1ppp/8/4p3/4P3/8/PPPP1PPP/RNBQKBNR w')) return res(fen, [mv('Nf3', 800), mv('Bc4', 150)]);
      return res(fen, []); // everything after is off-book
    };
    const lec = await buildOpeningTheoryLecture(fens, sans, "King's Pawn", { lookup });
    expect(lec).not.toBeNull();
    expect(lec!.departurePly).toBe(3); // 2.Qh5 (ply 3) left the book
    const dep = lec!.branches.find((b) => b.leftBook);
    expect(dep?.played).toBeNull();
    expect(dep?.mainline.san).toBe('Nf3');
  });

  it('returns null when the DB is unavailable from the very first move', async () => {
    const { fens, sans } = chain(['a3', 'a6']);
    const lookup = async (fen: string): Promise<MasterPlayResult> => res(fen, []);
    expect(await buildOpeningTheoryLecture(fens, sans, 'Anderssen', { lookup })).toBeNull();
  });
});

describe('resolveOpeningIdeas — grounded, never invented', () => {
  it('returns the curated keyIdeas for an opening in the repertoire (classical)', () => {
    const ideas = resolveOpeningIdeas('Italian Game');
    expect(ideas.length).toBeGreaterThan(0);
    // real repertoire ideas mention concrete Italian themes.
    expect(ideas.join(' ').toLowerCase()).toMatch(/f7|center|centre|d4|develop|bishop/);
  });

  it('falls back to universal principles for a modern opening not in the corpus (Pirc)', () => {
    const ideas = resolveOpeningIdeas('Pirc Defense');
    expect(ideas.length).toBeGreaterThan(0);
    expect(ideas.join(' ').toLowerCase()).toMatch(/centre|center|develop|king/);
  });

  it('never returns empty (a lecture always has a plan to land on)', () => {
    expect(resolveOpeningIdeas(null).length).toBeGreaterThan(0);
    expect(resolveOpeningIdeas('Totally Made Up Opening XYZ').length).toBeGreaterThan(0);
  });
});

describe('the variation DIVE (Danya plays out the line)', () => {
  it('populates the departure mainlineDive with the masters continuation', async () => {
    // Game: 1.e4 e5 2.Bc4 (offbeat). Mainline at move 2 is Nf3; the DB has a
    // continuation after 2.Nf3, so the departure beat dives down it.
    const { fens, sans } = chain(['e4', 'e5', 'Bc4']);
    const cont = new Chess();
    cont.move('e4'); cont.move('e5'); cont.move('Nf3');
    const afterNf3 = cont.fen();
    cont.move('Nc6');
    const afterNc6 = cont.fen();
    const lookup = async (fen: string): Promise<MasterPlayResult> => {
      if (fen.startsWith('rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w')) return res(fen, [mv('e4', 600), mv('d4', 400)]);
      if (fen.startsWith('rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b')) return res(fen, [mv('e5', 500), mv('c5', 500)]);
      if (fen.startsWith('rnbqkbnr/pppp1ppp/8/4p3/4P3/8/PPPP1PPP/RNBQKBNR w')) return res(fen, [mv('Nf3', 900)]); // Bc4 absent → 2.Bc4 leaves book
      if (fen.startsWith(afterNf3.split(' ').slice(0, 1).join(' '))) return res(fen, [mv('Nc6', 700), mv('Nf6', 300)]);
      if (fen.startsWith(afterNc6.split(' ').slice(0, 1).join(' '))) return res(fen, [mv('Bb5', 400), mv('Bc4', 300)]);
      return res(fen, []);
    };
    const lec = await buildOpeningTheoryLecture(fens, sans, "King's Pawn", { lookup });
    const dep = lec!.branches.find((b) => b.leftBook);
    expect(dep).toBeTruthy();
    expect(dep!.mainlineDive.length).toBeGreaterThanOrEqual(2); // Nc6, Bb5…
    expect(dep!.diveFromFen).toBeTruthy();
    // and the beat carries the dive for the player to play out.
    const beats = buildTheoryLectureBeats(lec!);
    const depBeat = beats.find((b) => b.kind === 'departure');
    expect(depBeat!.dive?.length).toBeGreaterThanOrEqual(2);
    expect(depBeat!.fact).toMatch(/how the main line runs/i);
  });
});

describe('buildTheoryLectureBeats — grounded playable beats', () => {
  it('emits an intro + a beat per branch, with a playable UCI + grounded facts', async () => {
    const { fens, sans } = chain(['e4', 'e5', 'Qh5']);
    const lookup = async (fen: string): Promise<MasterPlayResult> => {
      if (fen.startsWith('rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w')) return res(fen, [mv('e4', 600), mv('d4', 400)]);
      if (fen.startsWith('rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b')) return res(fen, [mv('e5', 500), mv('c5', 500)]);
      if (fen.startsWith('rnbqkbnr/pppp1ppp/8/4p3/4P3/8/PPPP1PPP/RNBQKBNR w')) return res(fen, [mv('Nf3', 800), mv('Bc4', 150)]);
      return res(fen, []);
    };
    const lec = await buildOpeningTheoryLecture(fens, sans, "King's Pawn", { lookup });
    const beats = buildTheoryLectureBeats(lec!, ['fight for the centre and develop with tempo']);
    expect(beats[0].kind).toBe('intro');
    expect(beats[0].fact).toMatch(/King's Pawn/);
    expect(beats[0].fact).toMatch(/core idea/i); // the idea was woven in
    // the departure beat names the book move + says you left theory.
    const dep = beats.find((b) => b.kind === 'departure');
    expect(dep).toBeTruthy();
    expect(dep!.fact).toMatch(/leaves mainstream theory/i);
    expect(dep!.fact).toMatch(/Nf3/);
    expect(dep!.showUci).toBe('g1f3'); // the mainline move is playable on the board
    // DISTINCTIVE branch beats (departure / sideline / genuine-choice mainline)
    // carry a real percentage (grounded). The obvious opening moves fold into a
    // "standard theory" fast-forward beat that is PROSE (no stats) — Danya
    // rattles the well-known moves without lecturing each (G2, David 2026-07-23).
    expect(dep!.fact).toMatch(/\d+%/);
    expect(beats.some((b) => /standard theory|standard move/i.test(b.fact))).toBe(true);
    // the lecture ends on the PLAN (Danya always lands on the middlegame idea).
    const outro = beats.find((b) => b.kind === 'outro');
    expect(outro?.fact).toMatch(/takeaway/i);
  });

  it('explains WHY the main line is main — grounded in the data (§3)', async () => {
    // A mainline that is both most-played AND best-scoring → "both counts".
    const { fens, sans } = chain(['e4', 'e5', 'Nf3']); // 2.Nf3 IS the main line (played)
    const lookup = async (fen: string): Promise<MasterPlayResult> => {
      if (fen.startsWith('rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w')) return res(fen, [mv('e4', 600, 0.55), mv('d4', 400, 0.5)]);
      if (fen.startsWith('rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b')) return res(fen, [mv('e5', 500, 0.4, 0.3, 0.3), mv('c5', 500, 0.42, 0.28, 0.3)]);
      // after 1...e5: Nf3 most-played AND best white score, but a GENUINE choice
      // (under the ~62% consensus threshold) so it stays a distinctive mainline
      // beat that explains WHY it's main — an overwhelming move folds into the
      // fast-forward instead (G2, David 2026-07-23).
      if (fen.startsWith('rnbqkbnr/pppp1ppp/8/4p3/4P3/8/PPPP1PPP/RNBQKBNR w')) return res(fen, [mv('Nf3', 500, 0.56), mv('Bc4', 300, 0.5), mv('Nc3', 250, 0.48)]);
      return res(fen, []);
    };
    const lec = await buildOpeningTheoryLecture(fens, sans, "King's Pawn", { lookup });
    const beats = buildTheoryLectureBeats(lec!, ['fight for the centre']);
    const mainBeats = beats.filter((b) => b.kind === 'mainline' || b.kind === 'departure');
    // At least one mainline beat explains the "why it's main" from the data.
    expect(mainBeats.some((b) => /most-played and best-scoring|both counts|popular without being the top/i.test(b.fact))).toBe(true);
  });
});

describe('tabiya walk — sidelines get NARRATED dives + computed pros/cons (David 2026-07-21)', () => {
  function mkLookup(byPrefix: Record<string, MasterPlayMove[]>) {
    return async (fen: string): Promise<MasterPlayResult> => {
      const key = Object.keys(byPrefix).find((p) => fen.startsWith(p));
      return res(fen, key ? byPrefix[key] : []);
    };
  }

  it('a sideline branch carries a mainline dive with a per-step why, and the beat compares the lines from data', async () => {
    // Game plays 2.Nc3 (a sideline); the mainline is 2.Nf3. The dive must WALK
    // the Nf3 line with computed whys, and the sideline beat must state the
    // computed score comparison — never the old hardcoded "presses harder".
    const { fens, sans } = chain(['e4', 'c5', 'Nc3']);
    const byPrefix: Record<string, MasterPlayMove[]> = {
      'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w': [mv('e4', 600), mv('d4', 350)],
      'rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b': [mv('c5', 500), mv('e5', 400)],
      // Branch: mainline Nf3 (scores 0.55 for White), played sideline Nc3 (0.45).
      'rnbqkbnr/pp1ppppp/8/2p5/4P3/8/PPPP1PPP/RNBQKBNR w': [mv('Nf3', 700, 0.4, 0.3, 0.3), mv('Nc3', 200, 0.3, 0.3, 0.4)],
      // Dive nodes after 2.Nf3: …d6 then 3.d4 (enough for a 2-step dive).
      'rnbqkbnr/pp1ppppp/8/2p5/4P3/5N2/PPPP1PPP/RNBQKB1R b': [mv('d6', 400), mv('Nc6', 300)],
      'rnbqkbnr/pp2pppp/3p4/2p5/4P3/5N2/PPPP1PPP/RNBQKB1R w': [mv('d4', 350), mv('Bb5+', 100)],
    };
    const lec = await buildOpeningTheoryLecture(fens, sans, 'Sicilian Defense', { lookup: mkLookup(byPrefix) });
    expect(lec).not.toBeNull();
    const side = lec!.branches.find((b) => b.isSideline);
    expect(side).toBeDefined();
    expect(side!.mainline.san).toBe('Nf3');
    expect(side!.mainlineDive.length).toBeGreaterThanOrEqual(2);
    // Every dive step has the computed-why FIELD (null allowed on a truly quiet
    // move, but the shape must be there for the narrated walk).
    for (const step of side!.mainlineDive) expect('why' in step).toBe(true);

    const beats = buildTheoryLectureBeats(lec!);
    const sideBeat = beats.find((b) => b.kind === 'sideline');
    expect(sideBeat).toBeDefined();
    expect(sideBeat!.dive?.length).toBeGreaterThanOrEqual(2);
    // Computed comparison, not flavor: the score numbers appear in the fact.
    expect(sideBeat!.fact).toMatch(/scores|score about the same/i);
    expect(sideBeat!.fact).not.toMatch(/presses a touch harder/);
    // The walk is announced so the student knows the main line is being SHOWN.
    expect(sideBeat!.fact).toMatch(/walk you down the main line/i);
  });
});
