/**
 * THE LIVE SURFACES SEE THE STUDENT'S NEED — and only on the student's own ply.
 *
 * `studentWeaknesses` (Phase 1) told the live coach which holes this student
 * keeps falling in, and it RAISED what led the briefing. It could not say the
 * other thing: whether this student needs teaching HERE AT ALL. That verdict is
 * `computeNeed` — book departures in this opening, weakness match, line
 * familiarity (five correct repetitions decay it to silence), results — and
 * until now only REVIEW computed it. So the live coach repeated itself on a
 * line the student has played right five times, and pressed no harder on the
 * line they keep losing.
 *
 * 🚨 THE MOVER GUARD IS THE WHOLE CARE HERE. `computeNeed` returns
 * `speak: false` for an opponent move BY CONTRACT (needScore.ts:152) — correct
 * in review, whose walk narrates the student's moves. The live surfaces narrate
 * BOTH sides ("they answer …e6"), so passing the verdict through on an
 * opponent ply would have muted half of every game — the same shape as the
 * 2026-09-16 failure where the live gate applied to review cut a 46-ply walk to
 * six. The decider sees `need` only when the mover IS the student.
 */
import { describe, it, expect } from 'vitest';
import { decide } from './coachDecider';
import type { ImportanceSignals } from './coachDecider';

// A moment that comfortably earns voice, so the ONLY thing under test below is
// the need gate — not importance.
const LOUD: ImportanceSignals = {
  decision: { severity: 'critical', gapCp: 300 },
  cpLossCp: 220,
  threatNet: 3,
  teachingBeat: true,
  standingDanger: true,
  evalCpWhitePov: 20,
  wdl: null,
};

const bundle = {
  facts: ['Your knight on f3 is hanging.'],
  squares: new Map<string, readonly string[]>([['Your knight on f3 is hanging.', ['f3']]]),
  incoming: new Set<string>(),
  order: { rank: new Map([['Your knight on f3 is hanging.', 1]]), bar: 0 },
};

describe('the live need gate', () => {
  it('SILENCES a ply the student demonstrably does not need', () => {
    const d = decide(LOUD, { rating: 1500, weaknesses: [], need: { speak: false } }, bundle, 'interrupt');
    expect(d.speak).toBe(false);
    expect(d.reason).toBe('need');
  });

  it('SPEAKS when need clears the bar', () => {
    const d = decide(LOUD, { rating: 1500, weaknesses: [], need: { speak: true } }, bundle, 'interrupt');
    expect(d.speak).toBe(true);
  });

  it('SPEAKS when there is no need data at all — a cold student meets a teaching coach', () => {
    for (const need of [undefined, null]) {
      const d = decide(LOUD, { rating: 1500, weaknesses: [], need }, bundle, 'interrupt');
      expect(d.speak, `need=${String(need)} must not mute`).toBe(true);
    }
  });

  it('need applies on a WALK too — that is how review goes quiet on book moves', () => {
    // Posture (§G4.5.15) governs step 1 only: on a walk, IMPORTANCE ranks the
    // moment and never mutes it. Step 2 is a different question and it does
    // apply here — it is exactly what stops review "saying too much in opening
    // book moves" (David 2026-09-15). The two must not be conflated: a walk
    // silenced by importance would be the 46-plies-to-six bug; a walk silenced
    // by NEED is the feature.
    const d = decide(LOUD, { rating: 1500, weaknesses: [], need: { speak: false } }, bundle, 'walk');
    expect(d.speak).toBe(false);
    expect(d.reason).toBe('need'); // names the real decider, never blames importance
  });
});

/**
 * …AND IT REACHES THE LIVE COMPOSER. The tests above prove the DECIDER honours
 * need; these prove `computePositionFacts` — the composer every live surface
 * calls — actually carries it there, and that the mover guard holds.
 *
 * "A wire that does not fire is not a wire" (CLAUDE.md, David 2026-08-07: "I
 * don't want to run an audit and find nothing working"). Asserting the import
 * exists, or that the field is on the interface, would prove neither.
 */
import { computePositionFacts } from './positionFacts';
import { FAMILIAR_REPS, type StudentNeedContext } from './needScore';

/** A student who has PLAYED THIS LINE RIGHT, repeatedly — the case the live
 *  coach could not see. Past cold start (so no rating prior carries it), no
 *  known holes, no book departures here, and `FAMILIAR_REPS` correct
 *  repetitions at this ply, which decays the familiarity term to nothing.
 *  LOUD_FEN is fullmove 14 with White to move, so the composer derives ply 27;
 *  `lineReps` is 0-based, hence index 26. Built from the real constants rather
 *  than a hand-picked number, so a change to the threshold moves this with it. */
const PLAYED_IT_RIGHT_FIVE_TIMES: StudentNeedContext = {
  rating: 1500,
  gamesPlayed: 40,
  signals: [],
  bookDepartures: [],
  lineReps: Array.from({ length: 40 }, (_, i) => (i === 26 ? FAMILIAR_REPS : 0)),
};

const line = (rank: number, evaluation: number) => ({ rank, evaluation, moves: [], mate: null });
// A position where the coach demonstrably HAS something to say — the same
// middlegame fixture the composer's own suite uses to prove the method beat
// fires. If this ever falls silent for an unrelated reason the "need silenced
// it" assertions below would pass vacuously, so the first test pins that.
const LOUD_FEN = 'rnbqkb1r/ppp2ppp/3p1n2/4N3/4P3/8/PPPP1PPP/RNBQKB1R w KQkq - 0 14';
const flat = {
  topLines: [line(1, 20), line(2, 15), line(3, 10)],
  evaluation: 20, isMate: false, mateIn: null, seldepth: 20, depth: 18,
  wdl: { win: 420, draw: 400, loss: 180 },
};

describe('the need gate reaches the LIVE composer', () => {
  it('speaks here with no need data — the control, so the silences below mean something', async () => {
    const r = await computePositionFacts({ posture: 'walk', fen: LOUD_FEN, moverColor: 'w', studentColor: 'w', analysis: flat });
    expect(r.clauses.length).toBeGreaterThan(0);
  });

  it('GOES QUIET on the student\'s own ply when need says they do not need it', async () => {
    const r = await computePositionFacts({
      posture: 'walk', fen: LOUD_FEN, moverColor: 'w', studentColor: 'w', analysis: flat,
      studentNeedContext: PLAYED_IT_RIGHT_FIVE_TIMES,
    });
    expect(r.clauses).toHaveLength(0);
  });

  it('🚨 STILL SPEAKS on the OPPONENT\'s ply — the guard that stops half the game going mute', async () => {
    // A DIFFERENT fixture on purpose. LOUD_FEN above is silent for a Black
    // student whatever need says (its clauses are about the side to move being
    // the student), so asserting the guard there would have passed for the
    // wrong reason — 0 === 0. This one SPEAKS with White to move and the
    // student on Black, which is what makes the assertion mean something.
    const OPP_FEN = '6kr/6pp/8/8/8/8/6PP/5K1R w - - 0 14';
    const control = await computePositionFacts({ posture: 'walk', fen: OPP_FEN, moverColor: 'w', studentColor: 'b', analysis: flat });
    expect(control.clauses.length, 'fixture must speak, or the assertion below is vacuous').toBeGreaterThan(0);

    // `computeNeed` returns speak:false for EVERY opponent move by contract
    // (needScore.ts:152). Without the mover guard this verdict would silence
    // the coach on every one of the opponent's plies — half of every game.
    const gated = await computePositionFacts({
      posture: 'walk', fen: OPP_FEN, moverColor: 'w', studentColor: 'b', analysis: flat,
      studentNeedContext: PLAYED_IT_RIGHT_FIVE_TIMES,
    });
    expect(gated.clauses.length).toBe(control.clauses.length);
  });
});
