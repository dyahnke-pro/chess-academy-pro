// Every authored Openings-tab narration unit, fed through the board-claim
// checker. Test/tooling only — never imported by the app.
import { boardsFor, checkBoardClaims } from './narrationBoardClaims';
import plansRaw from './middlegame-plans.json';
import { GEM_NARRATION } from './lessons/punishGemNarration';
import { GAMBIT_GEM_NARRATION } from './lessons/gambitGemNarration';
import { ALL_GEMS, gemId } from './lessons/punishGems';
import type { LessonScript, MiddlegamePlan } from '../types';

export interface BoardClaimRow {
  source: string;
  unit: string;
  claim: string;
  why: string;
  text: string;
  fen: string;
}

function isLesson(v: unknown): v is LessonScript {
  return !!v && typeof v === 'object' && Array.isArray((v as LessonScript).beats)
    && typeof (v as LessonScript).openingId === 'string';
}

/** Every LessonScript exported from src/data/lessons, deduped by identity. */
export function allLessonScripts(): Array<{ file: string; lesson: LessonScript }> {
  const mods: Record<string, Record<string, unknown>> = import.meta.glob(['./lessons/*.ts', '!./lessons/*.test.ts'], { eager: true });
  const seen = new Set<LessonScript>();
  const out: Array<{ file: string; lesson: LessonScript }> = [];
  const take = (file: string, v: unknown): void => {
    if (isLesson(v) && !seen.has(v)) { seen.add(v); out.push({ file, lesson: v }); }
  };
  for (const [path, mod] of Object.entries(mods)) {
    if (path.endsWith('.test.ts')) continue;
    const file = path.replace('./lessons/', '');
    for (const v of Object.values(mod)) {
      if (isLesson(v)) take(file, v);
      else if (v && typeof v === 'object' && !Array.isArray(v)) {
        for (const inner of Object.values(v as Record<string, unknown>)) take(file, inner);
      } else if (Array.isArray(v)) {
        for (const inner of v) take(file, inner);
      }
    }
  }
  return out;
}

function check(rows: BoardClaimRow[], source: string, unit: string, moves: string[], text: string | undefined, startFen?: string): void {
  if (!text || moves.length === 0) return;
  const boards = boardsFor(moves, startFen);
  if (!boards) return;
  for (const v of checkBoardClaims(boards, text)) {
    rows.push({ source, unit, claim: v.claim, why: v.why, text, fen: boards[boards.length - 1].fen() });
  }
}

export function collectBoardClaimViolations(): BoardClaimRow[] {
  const rows: BoardClaimRow[] = [];
  for (const { file, lesson } of allLessonScripts()) {
    for (const beat of lesson.beats) {
      check(rows, file, `${lesson.openingId}#${beat.id}`, beat.moves, beat.say);
      check(rows, file, `${lesson.openingId}#${beat.id} (short)`, beat.moves, beat.sayShort);
    }
  }
  for (const plan of plansRaw as unknown as MiddlegamePlan[]) {
    plan.playableLines?.forEach((line, li) => {
      line.moves.forEach((_, i) => {
        const moves = line.moves.slice(0, i + 1);
        check(rows, 'middlegame-plans.json', `${plan.id}[${li}]#${i}`, moves, line.annotations?.[i], line.fen);
        check(rows, 'middlegame-plans.json', `${plan.id}[${li}]#${i} (cue)`, moves, line.learnCues?.[i], line.fen);
      });
    });
  }
  const gemText: Record<string, { watch: string[]; learn?: string[] }> = { ...GEM_NARRATION, ...GAMBIT_GEM_NARRATION };
  for (const gem of ALL_GEMS) {
    const n = gemText[gemId(gem)];
    if (!n) continue;
    const ply = gem.playLine.trim().split(/\s+/);
    n.watch.forEach((t, i) => check(rows, 'gem narration', `${gemId(gem)}#${i}`, ply.slice(0, i + 1), t));
    n.learn?.forEach((t, i) => check(rows, 'gem narration', `${gemId(gem)}#${i} (cue)`, ply.slice(0, i + 1), t));
  }
  return rows;
}
