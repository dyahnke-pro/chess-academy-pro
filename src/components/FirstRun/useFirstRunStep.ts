import { useEffect, useState } from 'react';
import { getFirstRunStep, type FirstRunStep } from '../../services/firstRunJourney';

/** The first-run journey step, live (null until read). */
export function useFirstRunStep(): FirstRunStep | null {
  const [step, setStep] = useState<FirstRunStep | null>(null);
  useEffect(() => {
    let cancelled = false;
    const read = (): void => { void getFirstRunStep().then((s) => { if (!cancelled) setStep(s); }); };
    read();
    window.addEventListener('first-run-step', read);
    return () => { cancelled = true; window.removeEventListener('first-run-step', read); };
  }, []);
  return step;
}
