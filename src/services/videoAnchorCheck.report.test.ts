// DO THE MIS-ANCHORED NOTES ACTUALLY SPEAK?
//
// Tracking the Traxler video (yt:ykmGxE9DURo) against its own corpus notes
// showed four of its seven anchored notes filed on lines that lesson never
// taught — one in the Giuoco Pianissimo, three in the 4.O-O d4 Bxd4 line,
// against the lesson's own Bc4 Nf6 Ng5. See PLAN.md.
//
// That is a defect in the DATA. Whether it is a defect the student HEARS is a
// separate question, and the difference decides how urgent it is: a note that
// every downstream gate rejects is latent, while one the selector hands over is
// live and mis-teaching today. CLAUDE.md's lesson applies in both directions —
// a wire that does not fire is not a wire, and a bug that cannot fire is not
// yet a bug.
//
// So this asks the REAL selector at each wrong anchor, exactly as the lesson
// runtime would. A REPORT, not a wall.
import { describe, it, expect, beforeAll } from 'vitest';
import { Chess } from 'chess.js';
import { loadFullCorpus } from '../test/loadFullCorpus';
import { noteAtPosition, spokenBeatText } from './danyaTeachingService';

// The four anchors the video disproved, with the line each is filed under.
const WRONG_ANCHORS: Array<{ id: string; sans: string[]; why: string }> = [
  { id: 'dt-5qk', why: 'Giuoco Pianissimo',
    sans: ['e4', 'e5', 'Nf3', 'Nc6', 'Bc4', 'Bc5', 'c3', 'Nf6', 'd3', 'd6', 'O-O'] },
  { id: 'dt-5qr', why: '4.O-O d4 Bxd4 line',
    sans: ['e4', 'e5', 'Nf3', 'Nc6', 'Bc4', 'Nf6', 'O-O', 'Bc5', 'd4', 'Bxd4', 'Nxd4', 'Nxd4', 'Bg5', 'd6'] },
  { id: 'dt-5qy', why: '4.O-O d4 Bxd4 line',
    sans: ['e4', 'e5', 'Nf3', 'Nc6', 'Bc4', 'Nf6', 'O-O', 'Bc5', 'd4', 'Bxd4', 'Nxd4', 'Nxd4', 'Bg5', 'd6'] },
  { id: 'dt-5qz', why: '4.O-O d4 Bxd4 line',
    sans: ['e4', 'e5', 'Nf3', 'Nc6', 'Bc4', 'Nf6', 'O-O', 'Bc5', 'd4', 'Bxd4', 'Nxd4', 'Nxd4'] },
];

const fenAfter = (sans: string[]): string => {
  const c = new Chess();
  for (const s of sans) c.move(s);
  return c.fen();
};

describe('video-disproved anchors', () => {
  beforeAll(() => {
    // Synchronous despite the name — the fetched corpora are loaded into the
    // module registry, not awaited.
    loadFullCorpus();
  });

  it('reports whether the selector speaks each one', () => {
    const rows: string[] = [];
    let live = 0;
    for (const a of WRONG_ANCHORS) {
      const fen = fenAfter(a.sans);
      // Ask exactly what the lesson runtime asks. `openingName` is left
      // undefined so the scope gate cannot reject it for a reason unrelated to
      // the anchor — this measures the most permissive realistic caller.
      const got = noteAtPosition(a.sans, fen, undefined);
      const spoke = got?.id === a.id;
      if (spoke) live += 1;
      rows.push(
        `${spoke ? 'SPEAKS  ' : 'silent  '} ${a.id} @ ${a.why}`
        + (got ? `  (selector returned ${got.id})` : '  (selector returned nothing)')
        + (got && spoke ? `\n     -> "${spokenBeatText(got).slice(0, 160)}"` : ''),
      );
    }
    console.log(`\nVIDEO-DISPROVED ANCHORS — ${live}/${WRONG_ANCHORS.length} speak at a position their lesson never taught\n`
      + rows.map((r) => '  ' + r).join('\n') + '\n');
    expect(WRONG_ANCHORS.length).toBe(4);
  });
});
