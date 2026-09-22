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
import { contextForLine, loadStudentNeedBase, type StudentNeedBase } from '../services/studentNeedLoader';
import type { StudentNeedContext } from '../services/needScore';
import { useAppStore } from '../stores/appStore';
import { DEFAULT_STUDENT_RATING } from '../services/ratingBands';
import type { OpeningKey } from '../types';
import { ecoOfKey, openingKeyFromSans } from '../services/openingKey';

export interface UseStudentNeedArgs {
  /** Defaults to the ONE adaptive estimate the store carries
   *  (`calibrateStrength` writes it at boot) — a surface never picks a rating. */
  rating?: number;
  studentColor: 'white' | 'black';
  openingId?: OpeningKey | null;
  eco?: string | null;
  /** The line so far, or a getter for it. Familiarity is measured against the
   *  WHOLE prefix AT FIRE TIME — see the note below. A getter is the honest
   *  shape for a hook whose callers hold the history in a ref or a closure. */
  sans: readonly string[] | (() => readonly string[]);
}

// 🔒 THIS HOOK DOES NOT DECIDE ANYTHING. Its first draft exposed a `needAt()`
// that called `computeNeed` — and `surfaceContract.scan` failed the push for it,
// correctly: a surface computing its own need is a surface deciding its own
// voice (§G4.5.15). The hook does the one thing only it can — the Dexie read —
// and hands the CONTEXT to `computePositionFacts`, which owns the verdict, the
// ply derivation and the mover guard.
//
// 🔴 THE LINE IS READ WHEN THE CONTEXT IS READ, NOT WHEN THE EFFECT RAN (B3,
// 2026-09-22). The first version captured `sans` into the loader call at effect
// time, keyed on rating/colour/opening — so Learn's familiarity was measured
// against the MOUNT-time history (empty), `lineReps` was `[]`, and every ply of
// every game scored unfamiliarity 50. The term that silences a line played
// right five times never once fired on the surface it was built for, with the
// comment above it promising the opposite. Now the ref's `current` is a
// GETTER: the Dexie base loads once, and the line half is derived from whatever
// `sans` says at the moment a narration callback reads it.

export function useStudentNeed(args: UseStudentNeedArgs): React.RefObject<StudentNeedContext> {
  const { studentColor } = args;
  // THE ONE KEY (A1), minted HERE from the line — not by every surface. A
  // caller that already holds the game's key passes it; every other surface
  // hands over its history and the hook resolves the opening the departure +
  // result terms scope to. Null until the line reaches a named entry — cold
  // reads as SPEAK.
  const sansNow = typeof args.sans === 'function' ? args.sans() : args.sans;
  const openingId = args.openingId !== undefined ? args.openingId : openingKeyFromSans(sansNow);
  const eco = args.eco !== undefined ? args.eco : (openingId ? ecoOfKey(openingId) : null);
  const rating = args.rating ?? useAppStore.getState().activeProfile?.currentRating ?? DEFAULT_STUDENT_RATING;
  const baseRef = useRef<StudentNeedBase | null>(null);
  const baseGenRef = useRef(0);
  const ratingRef = useRef(rating);
  ratingRef.current = rating;
  const sansRef = useRef<UseStudentNeedArgs['sans']>(args.sans);
  sansRef.current = args.sans;
  const memoRef = useRef<{ key: string; ctx: StudentNeedContext } | null>(null);
  const handleRef = useRef<React.RefObject<StudentNeedContext> | null>(null);
  if (!handleRef.current) {
    handleRef.current = {
      get current(): StudentNeedContext {
        const src = sansRef.current;
        const sans = typeof src === 'function' ? src() : src;
        const key = `${baseGenRef.current}:${ratingRef.current}:${sans.join(' ')}`;
        if (memoRef.current?.key === key) return memoRef.current.ctx;
        const ctx = contextForLine(baseRef.current, sans, ratingRef.current);
        memoRef.current = { key, ctx };
        return ctx;
      },
    };
  }

  useEffect(() => {
    let alive = true;
    void loadStudentNeedBase({ rating, studentColor, openingId, eco })
      .then((base) => {
        if (!alive) return;
        baseRef.current = base;
        baseGenRef.current += 1;
      })
      // A failed load leaves the cold context in place — which SPEAKS. Silence
      // is never the failure mode of the student model.
      .catch(() => undefined);
    return () => { alive = false; };
    // Re-load when the opening is identified (departures + score are scoped to
    // it) — not on every ply; the line half is derived on read.
  }, [rating, studentColor, openingId, eco]);

  return handleRef.current;
}
