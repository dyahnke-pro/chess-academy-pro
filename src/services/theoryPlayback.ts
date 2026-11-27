/**
 * THE ONE THEORY RUNNER (David, the board bar decisions, 2026-11-24: "Play
 * line becomes Theory during the opening" — "Its own composer, the same
 * button in all three places"). Review's Theory button and the board bar's
 * Theory slot on Learn and Play perform the lecture through this: each move is
 * made on the board first, then the line about it is said, voice-gated (the
 * order `lectureSequence` computes). The surface supplies only where the board
 * shows the lecture and whether the run is still alive.
 */
import type { BoardArrow } from '../types';
import {
  buildOpeningTheoryLecture, buildTheoryLectureBeats, lectureNoteSelector, lectureSequence,
  loadLectureCorpus, resolveCuratedOpeningIdeas, type LectureStep,
} from './reviewOpeningTheory';
import { reviewTheoryLookup } from './reviewOpeningsSource';
import { detectOpening } from './openingDetectionService';
import { voiceService } from './voiceService';
import { voiceFacts } from './coachApi';
import { buildVoicePackage } from './voicePackage';
import { sanToSpeech } from '../utils/sanToSpeech';

export interface LectureIo {
  /** False once the run was stopped or the surface left. */
  alive: () => boolean;
  /** Put a position on the lecture's board (a move just made: its SAN and arrow). */
  show: (fen: string, san: string | null, arrows: BoardArrow[] | null) => void;
  arrowFor: (fenBefore: string, uci: string) => BoardArrow[] | null;
  sound: (san: string) => void;
  caption: (text: string | null) => void;
}

const position = (fen: string): string => fen.split(' ').slice(0, 4).join(' ');

/** THE THEORY VIEW (Learn and Play): the game paused, the idea played forward
 *  from where the game left book — the lecture's opening line, then its steps
 *  from the board the game departed on. No departure (still in book) or none
 *  found → the whole lecture. */
export function theoryViewSteps(steps: readonly LectureStep[], departureFen: string | null): LectureStep[] {
  if (!departureFen) return [...steps];
  const at = steps.findIndex((s, i) => i > 1 && s.kind === 'position' && position(s.fen) === position(departureFen));
  if (at < 0) return [...steps];
  return [...steps.slice(0, 2), ...steps.slice(at)];
}

const sleep = (ms: number): Promise<void> => new Promise((r) => setTimeout(r, ms));

export async function performLecture(steps: readonly LectureStep[], io: LectureIo): Promise<void> {
  const waitIdle = async (maxMs = 12000): Promise<void> => {
    const start = performance.now();
    while (voiceService.isPlaying() && performance.now() - start < maxMs) {
      if (!io.alive()) return;
      await sleep(120);
    }
  };
  for (const step of steps) {
    if (!io.alive()) break;
    if (step.kind === 'position') { io.show(step.fen, null, null); continue; }
    if (step.kind === 'move') {
      await waitIdle();
      if (!io.alive()) break;
      io.show(step.fenAfter, step.san, io.arrowFor(step.fenBefore, step.uci));
      io.sound(step.san);
      await sleep(600);
      continue;
    }
    // A walked move is said by name, then its why (Danya walks theory out
    // loud: "bishop b5, a6, bishop a4…").
    const raw = step.text ? await voiceFacts(step.text, { preferRaw: true, intent: 'review-theory' }).catch(() => step.text) : '';
    const words = (raw && raw.trim()) || step.text;
    const spoken = step.moveSan ? `${sanToSpeech(step.moveSan)}.${words ? ` ${words}` : ''}` : words;
    if (!spoken) continue;
    io.caption(step.moveSan ? `${step.moveSan}${words ? ` — ${words}` : ''}` : words);
    const t0 = performance.now();
    // PACKAGED, judged against the board it is said on (the move is made).
    try { await voiceService.speakPackage(buildVoicePackage([{ kind: 'computed', text: spoken, fen: step.fen }])); } catch { /* voice off */ }
    await waitIdle();
    // MUTED-DEVICE PACING: with voice off the speak resolves at once, so hold
    // long enough to read the caption and see the position.
    const dwell = Math.min(4500, (step.moveSan && !step.text ? 1400 : 1200) + spoken.length * 22);
    const elapsed = performance.now() - t0;
    if (elapsed < dwell) await sleep(dwell - elapsed);
  }
}

/** The theory view's steps for a game: the opening named off its moves, the
 *  masters walk along the game's own boards, and the lecture from where the
 *  game left book (`theoryViewSteps`). Null when there is no lecture. */
export async function theoryLectureFor(
  boards: readonly string[], sans: readonly string[], studentColor: 'white' | 'black',
): Promise<{ openingName: string; departurePly: number | null; steps: LectureStep[] } | { openingName: string; departurePly: null; steps: null }> {
  const openingName = detectOpening([...sans])?.name ?? 'this opening';
  await loadLectureCorpus().catch(() => undefined);
  const lecture = await buildOpeningTheoryLecture([...boards], [...sans], openingName, { lookup: reviewTheoryLookup, studentColor });
  if (!lecture) return { openingName, departurePly: null, steps: null };
  const beats = buildTheoryLectureBeats(lecture, resolveCuratedOpeningIdeas(openingName, studentColor) ?? [], studentColor, lectureNoteSelector(openingName, studentColor));
  const departureFen = lecture.departurePly ? boards[lecture.departurePly - 1] ?? null : null;
  return { openingName, departurePly: lecture.departurePly ?? null, steps: theoryViewSteps(lectureSequence(beats), departureFen) };
}
