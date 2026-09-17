// useStudentNeed — the surface-side handle on the OTHER half of the student
// model: not "which holes do they keep falling in" (that is `useWeaknessSignals`)
// but "does this student need teaching HERE, on this ply, in this line".
//
// Review has computed that since N2. The live surfaces never did — so the coach
// said the same thing on a line the student has played correctly five times, and
// pressed no harder on the line they keep losing. Same shape as the weakness
// hook on purpose: load once, expose a REF so async narration callbacks read the
// latest at fire-time without re-rendering the board, and stay inert until
// loaded ([] / cold reads as SPEAK, never as silence).

import { useEffect, useRef } from 'react';
import { loadStudentNeedContext } from '../services/studentNeedLoader';
import { coldStudent, type StudentNeedContext } from '../services/needScore';

export interface UseStudentNeedArgs {
  rating: number;
  studentColor: 'white' | 'black';
  openingId?: string | null;
  eco?: string | null;
  /** The line so far. Familiarity is measured against the WHOLE prefix, so this
   *  is re-read on each reload; pass the game's SANs from the start. */
  sans: readonly string[];
}

// 🔒 THIS HOOK DOES NOT DECIDE ANYTHING. Its first draft exposed a `needAt()`
// that called `computeNeed` — and `surfaceContract.scan` failed the push for it,
// correctly: a surface computing its own need is a surface deciding its own
// voice (§G4.5.15). The hook does the one thing only it can — the Dexie read —
// and hands the CONTEXT to `computePositionFacts`, which owns the verdict, the
// ply derivation and the mover guard.

export function useStudentNeed(args: UseStudentNeedArgs): React.RefObject<StudentNeedContext> {
  const { rating, studentColor, openingId, eco } = args;
  const ref = useRef<StudentNeedContext>(coldStudent(rating));
  // The line is read at FIRE time, not captured, so a mid-game reload does not
  // re-key the effect on every move.
  const sansRef = useRef<readonly string[]>(args.sans);
  sansRef.current = args.sans;

  useEffect(() => {
    let alive = true;
    void loadStudentNeedContext({ rating, sans: sansRef.current, studentColor, openingId, eco })
      .then((ctx) => { if (alive) ref.current = ctx; })
      // A failed load leaves the cold context in place — which SPEAKS. Silence
      // is never the failure mode of the student model.
      .catch(() => undefined);
    return () => { alive = false; };
    // Re-load when the opening is identified (departures + score are scoped to
    // it) — not on every ply.
  }, [rating, studentColor, openingId, eco]);

  return ref;
}
