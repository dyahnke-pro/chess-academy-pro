// The beginner register for this student, from their record
// (`beginnerRegisterLoader`). The prior answers until the record loads, and the
// verdict follows the record as it changes.
import { useEffect, useState } from 'react';
import { beginnerRegisterNow, loadBeginnerRegister } from '../services/beginnerRegisterLoader';
import { onWeaknessModelSettled } from '../services/weaknessModelEvents';
import { useAppStore } from '../stores/appStore';

export function useBeginnerRegister(): boolean {
  const profile = useAppStore((s) => s.activeProfile);
  const [beginner, setBeginner] = useState<boolean>(() => beginnerRegisterNow());
  useEffect(() => {
    let alive = true;
    const load = (): void => { void loadBeginnerRegister().then((v) => { if (alive) setBeginner(v.beginner); }); };
    setBeginner(beginnerRegisterNow());
    load();
    const off = onWeaknessModelSettled(load);
    return () => { alive = false; off(); };
  }, [profile?.skillBand, profile?.currentRating]);
  return beginner;
}
