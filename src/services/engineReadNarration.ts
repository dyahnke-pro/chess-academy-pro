// EVERY STOCKFISH POINT, SPOKEN — the computed tier's engine lane.
//
// David 2026-08-15: "widen the scope of our computer to capture everything
// stockfish gives us. I want every stockfish point narrated at the computed
// narration tier."
//
// 🔒 NO MODEL IS INVOLVED, BY CONSTRUCTION. David, same message: "all
// narrations need to be handed to the llm directly so it doesn't decide.
// Actually I don't think the computer tier uses the llm does it?" — it does
// not. The live lane's renderer is `voicePackage.buildVoicePackage`, which is
// deterministic (`the package survives the model's removal`). So these
// sentences are COMPOSED HERE, in code, from numbers the engine reported, and
// handed to TTS. There is no phrasing step to police because there is no
// phrasing step: the strongest possible form of G0.
//
// WHAT THIS IS NOT: a re-derivation of anything. Every number below arrived on
// a UCI `info` line and was parsed in `stockfishEngine`. Nothing here evaluates
// a position, ranks a move, or decides what is good — it turns the engine's own
// report into English.
import type { StockfishAnalysis } from '../types';

/** The student's own view of the engine's white-POV numbers. */
function forStudent(a: StockfishAnalysis, studentColor: 'white' | 'black'): {
  win: number; draw: number; loss: number;
} | null {
  if (!a.wdl) return null;
  return studentColor === 'white'
    ? { win: a.wdl.win, draw: a.wdl.draw, loss: a.wdl.loss }
    : { win: a.wdl.loss, draw: a.wdl.draw, loss: a.wdl.win };
}

/** Permille → a fraction a person actually says out loud.
 *
 *  "Three times in four" is a picture; "75.2%" is a readout, and the narration
 *  rules ban the interface voice. Deliberately coarse — the engine's precision
 *  is real but a student cannot act on the third significant figure, and
 *  claiming it would imply a confidence the search depth does not support. */
function asFraction(permille: number): string | null {
  if (permille >= 900) return 'almost always';
  if (permille >= 800) return 'four times in five';
  if (permille >= 700) return 'three times in four';
  if (permille >= 600) return 'about three times in five';
  if (permille >= 450) return 'about half the time';
  if (permille >= 300) return 'about a third of the time';
  if (permille >= 200) return 'about one time in five';
  return null;
}

export interface EngineReadLine {
  /** Spoken verbatim — the package speaks what it is given. */
  text: string;
  /** Which reading produced it, for the audit. */
  kind: 'wdl' | 'drawish' | 'sharpness';
}

/**
 * What the engine's own numbers say about this position, in English.
 *
 * Silent unless the read is worth a sentence — the narration rules' "silence is
 * acceptable", and the engine reports on every single ply, so a lane that spoke
 * every time would be the loudest thing in the app.
 */
export function engineReadLines(
  analysis: StockfishAnalysis,
  studentColor: 'white' | 'black',
  /** Readings already spoken this game, so a stable position does not get the
   *  same sentence every ply. Caller owns the set — same contract as the plan's
   *  `said`. */
  said?: Set<string>,
): EngineReadLine[] {
  const out: EngineReadLine[] = [];
  const once = (key: string, line: EngineReadLine): void => {
    if (said?.has(key)) return;
    said?.add(key);
    out.push(line);
  };

  // A MATE SCORE IS NOT A PROBABILITY. When the engine has found forced mate
  // the WDL collapses to 1000/0/0 and "you win almost always" is a comically
  // weak way to say "there is a forced mate". The mate lanes own that moment.
  if (analysis.isMate) return out;

  // ── THE OUTCOME READ ────────────────────────────────────────────────────
  const w = forStudent(analysis, studentColor);
  if (w) {
    // A BOUND IS NOT A VERDICT. `lowerbound`/`upperbound` means the search cut
    // off before proving the score, so the WDL behind it is provisional and
    // must not be spoken as though it were settled.
    const provisional = analysis.topLines[0]?.bound != null;
    if (!provisional) {
      const drawish = w.draw >= 600;
      if (drawish) {
        once('wdl-drawish', {
          kind: 'drawish',
          text: 'This is heading for a draw more often than not — if you want more than half a point, it has to come from a plan, not from the position as it stands.',
        });
      } else {
        const winFrac = asFraction(w.win);
        const lossFrac = asFraction(w.loss);
        // KEY ON THE PHRASE, NOT ON THE NUMBER BEHIND IT. Keying the raw
        // permille was already known to be wrong — it drifts every ply on a
        // stable position — and the hundreds bucket that replaced it is still
        // FINER THAN THE SENTENCE it guards: `asFraction` collapses everything
        // from 900 to 1000 into "almost always", while the bucket splits that
        // range into 9 and 10. A driven game duly said "you come out on top
        // almost always" twice (David 2026-08-18).
        //
        // The words are what the student hears, so the words are the key. This
        // also cannot drift again if `asFraction` is ever re-bucketed — the
        // same disease was fixed in `positionalRead` the same day, where the
        // derivation key likewise outlived its own sentence.
        if (winFrac && w.win >= 600) {
          once(`wdl-win-${winFrac}`, {
            kind: 'wdl',
            text: `From here you come out on top ${winFrac} — the position is doing the work, so keep it simple.`,
          });
        } else if (lossFrac && w.loss >= 600) {
          once(`wdl-loss-${lossFrac}`, {
            kind: 'wdl',
            text: `This one goes against you ${lossFrac} — you want complications, not a clean simplification.`,
          });
        }
      }
    }
  }

  // ── HOW SHARP IT IS, off the MultiPV spread ─────────────────────────────
  //
  // Three lines all within a pawn is a position with several playable ideas;
  // a top line a rook clear of the second is a position with ONE move. That is
  // the single most useful thing a student can be told before they choose, and
  // it is a SUBTRACTION of two numbers the engine already sent — no judgement.
  const lines = analysis.topLines.filter((l) => l.mate === null);
  if (lines.length >= 2) {
    const sign = studentColor === 'white' ? 1 : -1;
    const best = lines[0].evaluation * sign;
    const second = lines[1].evaluation * sign;
    const gap = best - second;
    if (gap >= 150) {
      once('sharp-only-move', {
        kind: 'sharpness',
        text: 'There is really only one move here — the next best is a long way behind it.',
      });
    } else if (lines.length >= 3 && Math.abs(best - lines[2].evaluation * sign) <= 30) {
      once('sharp-choices', {
        kind: 'sharpness',
        text: 'Three different moves hold this position about equally well, so this is a choice of plan rather than a search for the only move.',
      });
    }
  }

  return out;
}
