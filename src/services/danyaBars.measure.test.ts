import { describe, it } from 'vitest';
import { readFileSync, writeFileSync } from 'node:fs';
import { Chess } from 'chess.js';
import { moveOnlyRestates, afterCapture, NO_PREV_CAPTURE, type PrevCaptureContext } from './pvPlayback';

interface Note { id: string; lineSan: string[] | null; explains: string; teaches: string; plans: string; sources: string[]; studentSide?: string }

// DANYA'S BARS (WO-DECIDER-02): how often his videos speak on a move that only
// restates the board (a take-back, an even trade, a bare check) against every
// other kind of move, and how long a note runs. The quiet-move rule's bar is
// read off this, never typed. DANYA_BARS=1 to run.
describe.skipIf(process.env.DANYA_BARS !== '1')('danya bars', () => { it('measures', () => {
  const d = JSON.parse(readFileSync('public/data/voiced-teachings.json', 'utf8')) as { notes: Note[] };
  const byVideo = new Map<string, Note[]>();
  for (const n of d.notes) {
    if (!n.lineSan?.length) continue;
    const v = n.sources.find((s) => s.startsWith('yt:')) ?? n.id;
    (byVideo.get(v) ?? byVideo.set(v, []).get(v)!).push(n);
  }
  const cls = { restate: { plies: 0, noted: 0 }, capture: { plies: 0, noted: 0 }, check: { plies: 0, noted: 0 }, quiet: { plies: 0, noted: 0 } };
  const words: number[] = [];
  const restateNotes: string[] = [];
  let videos = 0;
  for (const [, notes] of byVideo) {
    // The game of the video: the longest line; notes on other lines (side lines) are left out.
    const main = notes.reduce((a, b) => (b.lineSan!.length > a.lineSan!.length ? b : a));
    const mainKey = main.lineSan!.join(' ');
    const onMain = notes.filter((n) => mainKey.startsWith(n.lineSan!.join(' ')));
    if (main.lineSan!.length < 20) continue;
    videos += 1;
    const notedAt = new Map<number, Note>();
    for (const n of onMain) notedAt.set(n.lineSan!.length, n);
    const c = new Chess();
    let run: PrevCaptureContext = NO_PREV_CAPTURE;
    for (let i = 0; i < main.lineSan!.length; i += 1) {
      const fen = c.fen();
      const san = main.lineSan![i];
      let mv;
      try { mv = c.move(san); } catch { break; }
      const restates = moveOnlyRestates(fen, san, run);
      const k = restates ? 'restate' : mv.captured ? 'capture' : /[+#]/.test(mv.san) ? 'check' : 'quiet';
      cls[k].plies += 1;
      const note = notedAt.get(i + 1);
      if (note) {
        cls[k].noted += 1;
        const text = [note.explains, note.teaches, note.plans].filter(Boolean).join(' ');
        words.push(text.split(/\s+/).filter(Boolean).length);
        if (restates && restateNotes.length < 25) restateNotes.push(`${san}: ${text.slice(0, 160)}`);
      }
      run = afterCapture(run, mv);
    }
  }
  words.sort((a, b) => a - b);
  const out = {
    videos,
    rates: Object.fromEntries(Object.entries(cls).map(([k, v]) => [k, { ...v, rate: +(v.noted / Math.max(1, v.plies)).toFixed(3) }])),
    words: { n: words.length, median: words[Math.floor(words.length / 2)], p90: words[Math.floor(words.length * 0.9)], mean: +(words.reduce((a, b) => a + b, 0) / Math.max(1, words.length)).toFixed(1) },
    restateNotes,
  };
  writeFileSync('audit-reports/danya-bars.json', JSON.stringify(out, null, 2));
}, 600000); });
