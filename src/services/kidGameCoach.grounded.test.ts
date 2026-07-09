import { describe, it, expect } from 'vitest';
import { getKidGroundedResponse } from './kidGameCoach';

// Kid tie-in (David: "no reason it needs to be isolated out"): a child's
// knowledge question routes through the SAME shared spine (buildQuestionGrounding
// + the shared assemblers + the voiceFacts chokepoint) as the adult coach, but
// voiced kid-safe. With no API key in the test env, voiceFacts returns the
// computed facts raw and the kid sanitizer strips any SAN — so these assert the
// grounded facts reach the child, kid-safe, deterministically (no LLM).

const START_FEN = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';
// No chess notation (SAN) may reach a child (kid #6).
const SAN_RE = /\b(O-O(?:-O)?|[KQRBN][a-h1-8]?x?[a-h][1-8](?:=[QRBN])?[+#]?|[a-h]x[a-h][1-8][+#]?)\b/;

describe('getKidGroundedResponse — kid tied into the shared spine', () => {
  it('answers a CONCEPT question from the shared concept corpus', async () => {
    const out = await getKidGroundedResponse('what is a fork?', START_FEN);
    expect(out).toBeTruthy();
    expect(out!.length).toBeGreaterThan(10);
    // grounded in the book corpus — mentions the fork idea
    expect(out!.toLowerCase()).toMatch(/fork|two|attack/);
  });

  it('never lets chess notation reach the child', async () => {
    const out = await getKidGroundedResponse('what does a pin mean?', START_FEN);
    if (out) expect(out).not.toMatch(SAN_RE);
  });

  it('answers an APP-HELP question from the route manifest', async () => {
    const out = await getKidGroundedResponse('what does the puzzles page do?', START_FEN);
    // App-help grounds on the manifest; when a route matches we get real copy.
    if (out) expect(out.length).toBeGreaterThan(10);
  });

  it('returns null for a live-BOARD question (falls back to the board path)', async () => {
    // "what should I do?" is not a concept / teaching / app-help family — the
    // caller must fall through to the tuned live-board grounding.
    const out = await getKidGroundedResponse('what should I do now?', START_FEN);
    expect(out).toBeNull();
  });

  it('returns null for chit-chat (no chess family fires)', async () => {
    const out = await getKidGroundedResponse('hi there!', START_FEN);
    expect(out).toBeNull();
  });
});
