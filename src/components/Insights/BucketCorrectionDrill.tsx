/**
 * BucketCorrectionDrill — the bespoke per-bucket correction drill for the two
 * PRINCIPLE thinking-errors that don't reduce to a tactic (Step 8).
 *
 *  - wrong-side: "Which side of the board should you play on?" The correct wing
 *    is the wing the ENGINE'S BEST MOVE lands on (a–c = queenside, d–e = centre,
 *    f–h = kingside). The student's actual mistake pointed the other way.
 *  - overestimated-opponents-attack ("over-defended"): "What's the right move
 *    here?" The correct answer is the ENGINE'S BEST MOVE — which ignores the
 *    phantom threat the student wasted time defending. Picking it proves the
 *    threat was harmless.
 *
 * Both are multiple-choice over the student's OWN real mistake positions (fen +
 * the engine best), graded against code-derived truth, and feed SRS spacing via
 * recordTagDrillResult. 100% code: chess.js for legal-move distractors +
 * geometry, the bucket's static blurb for the teach. NO LLM.
 */
import { useMemo, useState } from 'react';
import { Chess } from 'chess.js';
import { ConsistentChessboard } from '../Chessboard/ConsistentChessboard';
import { resolveSanToArrow } from '../../services/arrowEngine';
import { recordTagDrillResult } from '../../services/misconceptionService';
import { getMisconceptionTag } from '../../data/misconceptionTags';
import type { BoardArrow, MisconceptionTagRecord } from '../../types';

type Wing = 'queenside' | 'center' | 'kingside';
const WING_LABEL: Record<Wing, string> = { queenside: 'Queenside', center: 'Center', kingside: 'Kingside' };

function wingOf(square: string): Wing {
  const file = square[0];
  if (file <= 'c') return 'queenside';
  if (file >= 'f') return 'kingside';
  return 'center';
}

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

interface BucketCorrectionDrillProps {
  tag: string;
  positions: MisconceptionTagRecord[];
  onDone: () => void;
}

export function BucketCorrectionDrill({ tag, positions, onDone }: BucketCorrectionDrillProps): JSX.Element {
  const [idx, setIdx] = useState(0);
  const [picked, setPicked] = useState<string | null>(null);

  // Only positions with the engine best move can be graded.
  const playable = useMemo(() => positions.filter((p) => p.fen && p.bestSan), [positions]);
  const rec = playable[idx];
  const blurb = getMisconceptionTag(tag)?.blurb ?? '';
  const isWrongSide = tag === 'wrong-side';

  // Build the question for THIS position (memoised so options don't reshuffle
  // on every render / pick).
  const question = useMemo(() => {
    const bestSan = rec?.bestSan;
    if (!rec || !bestSan) return null;
    const orientation: 'white' | 'black' = rec.fen.split(' ')[1] === 'b' ? 'black' : 'white';
    const best = resolveSanToArrow(bestSan, [rec.fen]);
    if (!best) return null;
    if (isWrongSide) {
      const correct = wingOf(best.to);
      const options: { id: string; label: string }[] = (['queenside', 'center', 'kingside'] as Wing[])
        .map((w) => ({ id: w, label: WING_LABEL[w] }));
      return { orientation, correct, options, prompt: 'Which side of the board should you play on?' };
    }
    // over-defended → find the engine's move (which ignores the threat)
    let distractors: string[] = [];
    try {
      const legal = new Chess(rec.fen).moves();
      distractors = shuffle(legal.filter((m) => m !== bestSan && m !== rec.playedSan)).slice(0, 2);
    } catch { /* no distractors */ }
    const opts = shuffle([bestSan, ...(rec.playedSan ? [rec.playedSan] : []), ...distractors]);
    return {
      orientation,
      correct: bestSan,
      options: opts.map((m) => ({ id: m, label: m })),
      prompt: "What's the right move? (ignore the threat — the engine proves it's harmless)",
    };
  }, [rec, isWrongSide]);

  if (!rec || !question) {
    return (
      <div className="rounded-lg border border-theme-border bg-theme-surface/60 p-3 text-xs text-theme-text-muted" data-testid="bucket-drill-empty">
        No drillable positions for this error yet — play or review a game and they'll appear here.
        <button onClick={onDone} className="ml-2 text-theme-accent hover:opacity-80">Close</button>
      </div>
    );
  }

  const answered = picked !== null;
  const correct = answered && picked === question.correct;
  const arrows: BoardArrow[] = answered && rec.bestSan
    ? (() => {
        const b = resolveSanToArrow(rec.bestSan, [rec.fen]);
        return b ? [{ startSquare: b.from, endSquare: b.to, color: '#22c55e' }] : [];
      })()
    : [];

  const pick = (id: string): void => {
    if (answered) return;
    setPicked(id);
    void recordTagDrillResult(tag, id === question.correct);
  };

  const next = (): void => {
    if (idx + 1 < playable.length) { setIdx(idx + 1); setPicked(null); }
    else onDone();
  };

  return (
    <div className="rounded-lg border border-theme-border bg-theme-surface/60 p-3 flex flex-col gap-2" data-testid="bucket-drill">
      <div className="text-[11px] text-theme-text-muted">
        Drill {idx + 1} / {playable.length}{rec.openingName ? ` · ${rec.openingName}` : ''}
      </div>
      <div className="w-40 mx-auto">
        <ConsistentChessboard fen={rec.fen} boardOrientation={question.orientation} arrows={arrows} />
      </div>
      <div className="text-xs font-medium text-theme-text">{question.prompt}</div>
      <div className="flex flex-wrap gap-1.5">
        {question.options.map((o) => {
          const isCorrectOpt = answered && o.id === question.correct;
          const isWrongPick = answered && o.id === picked && o.id !== question.correct;
          return (
            <button
              key={o.id}
              onClick={() => pick(o.id)}
              disabled={answered}
              className={`text-xs px-2.5 py-1.5 rounded border transition-colors ${
                isCorrectOpt ? 'border-emerald-500 bg-emerald-500/15 text-emerald-300'
                : isWrongPick ? 'border-rose-500 bg-rose-500/15 text-rose-300'
                : 'border-theme-border bg-theme-surface text-theme-text hover:border-theme-accent'
              }`}
              data-testid={`bucket-drill-option-${o.id}`}
            >
              {o.label}
            </button>
          );
        })}
      </div>
      {answered && (
        <div className="text-xs flex flex-col gap-1.5" data-testid="bucket-drill-feedback">
          <span className={correct ? 'text-emerald-400 font-medium' : 'text-rose-400 font-medium'}>
            {correct ? 'Right.' : `Not quite — ${isWrongSide ? WING_LABEL[question.correct as Wing] : question.correct}.`}
          </span>
          <span className="text-theme-text-muted italic">{blurb}</span>
          <button
            onClick={next}
            className="self-start mt-0.5 text-[11px] font-medium text-theme-accent hover:opacity-80"
            data-testid="bucket-drill-next"
          >
            {idx + 1 < playable.length ? 'Next →' : 'Done'}
          </button>
        </div>
      )}
    </div>
  );
}
