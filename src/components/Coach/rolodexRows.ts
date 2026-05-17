/**
 * Rolodex row definitions
 * -----------------------
 * Canonical 8-row spec for the active rolodex card body. Order is
 * load-bearing (top-to-bottom learning arc: study → drill → games →
 * traps → blunders → coach → practice variants). PR-2 renders the
 * rows STATIC — icon + label + "—" placeholder. PR-3 wires real
 * counts and deep-link navigation from the PLUMBING-01 hooks.
 *
 * Separated from `RolodexCard.tsx` so the file there only exports
 * components (react-refresh requires this for HMR to work cleanly).
 */
import {
  BookOpen,
  Target,
  Crown,
  AlertTriangle,
  Repeat,
  GraduationCap,
  Bot,
  FastForward,
} from 'lucide-react';
import type { ComponentType } from 'react';

export type RolodexRowKey =
  | 'theory-lines'
  | 'puzzles'
  | 'gm-games'
  | 'traps'
  | 'blunders'
  | 'walkthrough'
  | 'practice-from-start'
  | 'practice-middlegame';

export interface RolodexRowDef {
  key: RolodexRowKey;
  label: string;
  Icon: ComponentType<{ size?: number; className?: string; 'aria-hidden'?: boolean }>;
}

export const ROLODEX_ROWS: readonly RolodexRowDef[] = [
  { key: 'theory-lines', label: 'Theory & Lines', Icon: BookOpen },
  { key: 'puzzles', label: 'Puzzles', Icon: Target },
  { key: 'gm-games', label: 'GM Games', Icon: Crown },
  { key: 'traps', label: 'Traps & Pitfalls', Icon: AlertTriangle },
  { key: 'blunders', label: 'Your blunders', Icon: Repeat },
  { key: 'walkthrough', label: 'Coached walkthrough', Icon: GraduationCap },
  { key: 'practice-from-start', label: 'Practice from move 1', Icon: Bot },
  { key: 'practice-middlegame', label: 'Practice middlegame', Icon: FastForward },
];
