// ONE PAWN, ONE CLAIM in the asked read (decision baseline 2026-11-08, chat on
// the Closed Sicilian's ending, ply 57): the plan that wins their weak pawn on
// h2 and the positional read's "Their pawn on h2 is isolated — that is a
// long-term target worth playing against" were both said; the plan already
// says the pawn is weak.
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { computePositionFacts } from './positionFacts';
import { lastMoveIfOpponent, lastMoveIfStudent } from './lastMoveOfLine';
import { analysisOf, replayPlies, type ReplayGame } from '../test/replayGame';

interface FixtureGame extends ReplayGame { id: string; rating: number }

describe('the asked read says a weak pawn once', () => {
  it('the plan that wins it, not the read that it is a target too', async () => {
    const g = (JSON.parse(readFileSync('src/test/fixtures/learn-replay-games.json', 'utf8')) as { games: FixtureGame[] }).games
      .find((x) => x.id.startsWith('sicilianClosed1000')) as FixtureGame;
    const p = replayPlies(g).find((x) => x.ply === 57);
    expect(p).toBeTruthy();
    if (!p) return;
    const sans = g.sans.slice(0, p.ply);
    const lm = lastMoveIfStudent(sans, g.studentSide, p.fenAfter);
    const om = lastMoveIfOpponent(sans, g.studentSide, p.fenAfter);
    const r = await computePositionFacts({ theory: true, namesPlayedMove: true,
      boardComputers: 'composer', posture: 'asked', fen: p.fenAfter,
      moverColor: p.mover === 'w' ? 'b' : 'w', studentColor: g.studentSide === 'white' ? 'w' : 'b',
      analysis: analysisOf(p.after),
      ...(lm ? { lastMove: lm } : {}), ...(om ? { opponentLastMove: om } : {}), history: sans,
    });
    const said = r.clauses.map((c) => c.text).join(' ');
    expect(said).toMatch(/win their weak pawn on h2/);
    expect(said).not.toMatch(/Their pawn on h2 is isolated — that is a long-term target/);
  });
});
