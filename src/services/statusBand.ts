// statusBand — the general's opening read: the game's standing crossed a band
// since the last read (better, level, worse, winning, lost). Said through the
// one registry (`boardComputers` → `statusBand`); the live read asks it there.
import { evalBand } from './evalBand';

/** STATUS bands from the student's POV (cp). The general's opening read. */
type StatusBand = 'lost' | 'worse' | 'level' | 'better' | 'winning';
const STATUS_RANK: Record<StatusBand, number> = { lost: 0, worse: 1, level: 2, better: 3, winning: 4 };
function statusBand(studentCp: number): StatusBand {
  // The one ladder (evalBand, census 2026-10-10) — this kept 90/300.
  const band = evalBand(studentCp);
  if (band === 'level') return 'level';
  if (band === 'decisive') return studentCp > 0 ? 'winning' : 'lost';
  return studentCp > 0 ? 'better' : 'worse';
}

/**
 * The STATUS band-change line (student-POV, DNA-terse, directional), or '' when
 * the assessment did not cross a band. Speaks only on a real change — the
 * "say-once standing fact" done right, so it's the general's opening read, never
 * a per-ply "you're better" drumbeat.
 */
export function statusBandChange(studentCp: number, prevStudentCp: number): string {
  const cur = statusBand(studentCp);
  const prev = statusBand(prevStudentCp);
  if (cur === prev) return '';
  const improved = STATUS_RANK[cur] > STATUS_RANK[prev];
  if (improved) {
    if (cur === 'winning') return `You're winning this now — technique from here.`;
    if (cur === 'better') return `You've taken the better side of this.`;
    return `You've clawed it back to level.`;
  }
  if (cur === 'lost') return `This has slipped away — make it as hard as you can.`;
  if (cur === 'worse') return `You've drifted to the worse side here.`;
  return `The edge is gone — it's level again.`;
}
