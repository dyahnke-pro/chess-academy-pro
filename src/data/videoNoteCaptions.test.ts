// A NOTE IS WRITTEN FROM THE CAPTIONS, SO THE CAPTIONS MUST BE THERE.
//
// David 2026-08-20: *"make sure to be getting the narrations from the
// captions"*, then *"recheck all of your work from this session to make sure
// you didnt miss any other captions."*
//
// The transcript is what tells you WHICH established idea is taught at a move —
// the prose is original, but the SELECTION of what to teach comes from the
// lesson. Without it a note is written from the board alone, which produces
// something true but arbitrary: a fact about the position rather than the point
// the teacher was making.
//
// This failed silently in the worst way. `at.mjs` reads the VTT with no
// existence check, so a missing transcript surfaced as a Node stack trace in the
// middle of a batch — indistinguishable at a glance from a tool that had nothing
// to say — and the note got written from the board. Four notes in one session
// went that way before the pattern was noticed.
//
// Shrink-only: 47 files predate this check. Each is a note set that can be
// re-grounded once its captions are banked. The number may never grow.
import { describe, it, expect } from 'vitest';
import { readdirSync, existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const NOTE_DIR = 'data/video-notes';
const VTT_DIR = 'data/video-transcripts';
const BASELINE: string[] = JSON.parse(
  readFileSync(join(process.cwd(), 'src/data/videoNoteCaptions.baseline.json'), 'utf8'),
);

describe('hand-written notes are grounded in their lesson captions', () => {
  const ids = readdirSync(NOTE_DIR).filter((f) => f.endsWith('.json')).map((f) => f.replace('.json', ''));
  const missing = ids.filter((id) => !existsSync(join(VTT_DIR, `${id}.vtt.gz`)));

  it('no NEW note file is written without its captions banked', () => {
    const fresh = missing.filter((id) => !BASELINE.includes(id));
    expect(
      fresh,
      `these note files were written with no transcript to ground them:\n${fresh.join('\n')}\n` +
      'Bank the caption track first, then write the notes.',
    ).toEqual([]);
  });

  it('the backlog only ever shrinks', () => {
    expect(missing.length).toBeLessThanOrEqual(BASELINE.length);
  });
});
