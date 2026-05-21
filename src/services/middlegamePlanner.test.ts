import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  findPlanForOpening,
  findPlanBySubject,
  sessionFromPlan,
  resolveMiddlegameSession,
  resolveMiddlegameSessionWithFallback,
} from './middlegamePlanner';
import { stockfishEngine } from './stockfishEngine';

describe('middlegamePlanner', () => {
  it('finds an exact plan by openingId', () => {
    const plan = findPlanForOpening('italian-game');
    expect(plan).not.toBeNull();
    expect(plan?.id).toContain('italian');
  });

  it('returns null when no plan matches', () => {
    expect(findPlanForOpening('totally-made-up-opening')).toBeNull();
  });

  it('finds a plan by free-text subject', () => {
    const plan = findPlanBySubject('italian game');
    expect(plan).not.toBeNull();
  });

  it('returns null for empty subjects', () => {
    expect(findPlanBySubject('')).toBeNull();
    expect(findPlanBySubject('  ')).toBeNull();
  });

  it('builds a WalkthroughSession with a non-starting fen and middlegame kind', () => {
    const plan = findPlanForOpening('italian-game');
    expect(plan).not.toBeNull();
    const session = sessionFromPlan(plan!);
    expect(session).not.toBeNull();
    expect(session!.kind).toBe('middlegame');
    // The starting FEN is the middlegame critical position, not the
    // standard start position — this is the key invariant: board
    // context carries over from opening → middlegame.
    expect(session!.startFen).not.toContain('rnbqkbnr/pppppppp');
    expect(session!.steps.length).toBeGreaterThan(0);
    // Each step has embedded narration (no parallel array to maintain)
    for (const step of session!.steps) {
      expect(step.narration.length).toBeGreaterThan(0);
    }
  });

  it('resolveMiddlegameSession accepts subject or openingId', () => {
    const a = resolveMiddlegameSession({ openingId: 'italian-game' });
    const b = resolveMiddlegameSession({ subject: 'italian' });
    expect(a).not.toBeNull();
    expect(b).not.toBeNull();
  });

  it('resolveMiddlegameSession returns null for unknown input', () => {
    expect(resolveMiddlegameSession({ subject: 'zzzzzzz' })).toBeNull();
  });
});

// Mock the LLM call so the fallback test doesn't require a real API key.
vi.mock('./coachApi', () => ({
  getCoachChatResponse: vi.fn().mockResolvedValue(
    JSON.stringify(['Control the center.', 'Develop a knight.']),
  ),
}));

describe('resolveMiddlegameSessionWithFallback', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('returns the DB plan when a match exists (no engine call)', async () => {
    const spy = vi.spyOn(stockfishEngine, 'queueAnalysis');
    const session = await resolveMiddlegameSessionWithFallback({
      openingId: 'italian-game',
    });
    expect(session).not.toBeNull();
    expect(session!.kind).toBe('middlegame');
    expect(spy).not.toHaveBeenCalled();
  });

  it('falls back to Stockfish PV when no DB plan matches', async () => {
    vi.spyOn(stockfishEngine, 'queueAnalysis').mockResolvedValueOnce({
      bestMove: 'e2e4',
      evaluation: 20,
      isMate: false,
      mateIn: null,
      depth: 18,
      topLines: [
        {
          rank: 1,
          evaluation: 20,
          mate: null,
          // 10-ply PV starting from the standard start position.
          moves: [
            'e2e4',
            'e7e5',
            'g1f3',
            'b8c6',
            'f1b5',
            'a7a6',
            'b5a4',
            'g8f6',
            'e1g1',
            'f8e7',
          ],
        },
      ],
      nodesPerSecond: 1_000_000,
    });

    const session = await resolveMiddlegameSessionWithFallback({
      subject: 'completely-unknown-opening',
    });
    expect(session).not.toBeNull();
    expect(session!.title).toBe('Engine-suggested plan');
    expect(session!.kind).toBe('middlegame');
    expect(session!.steps.length).toBeGreaterThan(0);
    expect(session!.steps.length).toBeLessThanOrEqual(10);
  });

  it('returns null when the engine has nothing useful', async () => {
    vi.spyOn(stockfishEngine, 'queueAnalysis').mockResolvedValueOnce({
      bestMove: '',
      evaluation: 0,
      isMate: false,
      mateIn: null,
      depth: 18,
      topLines: [],
      nodesPerSecond: 0,
    });

    const session = await resolveMiddlegameSessionWithFallback({
      subject: 'unknown',
    });
    expect(session).toBeNull();
  });
});

// ─── Lead-the-eye verification helpers ──────────────────────────────────────
// Vision arrows + highlights must lead the eye to whatever the narration is
// talking about (David's locked NON-NEGOTIABLE). Colour language: GREEN =
// vision arrows, ORANGE = the move's two squares, YELLOW = called-out key
// squares. Two contracts per move:
//  1. Geometric legality — every (green) vision arrow must originate on a
//     non-pawn piece with a clear sight-line to its target. No aspirational
//     blocked arrows; same sees()/clearRay() gate the lessons use.
//  2. Grounding — every yellow highlight AND every vision-arrow endpoint must
//     be a square the annotation actually NAMES (bare "f5" or piece-token
//     "Nf5"). The orange move-squares are exempt — they ARE the move, not a
//     claim about the words.
type Sq = import('chess.js').Square;

function fileRank(sq: string): [number, number] {
  return [sq.charCodeAt(0) - 97, Number(sq[1]) - 1];
}

function clearRay(c: import('chess.js').Chess, from: string, to: string): boolean {
  const [ff, fr] = fileRank(from);
  const [tf, tr] = fileRank(to);
  const df = Math.sign(tf - ff);
  const dr = Math.sign(tr - fr);
  let f = ff + df;
  let r = fr + dr;
  while (f !== tf || r !== tr) {
    const sq = (String.fromCharCode(97 + f) + String(r + 1)) as Sq;
    if (c.get(sq)) return false;
    f += df;
    r += dr;
  }
  return true;
}

function sees(c: import('chess.js').Chess, from: string, to: string): boolean {
  if (from === to) return false;
  const pc = c.get(from as Sq);
  if (!pc) return false;
  const [ff, fr] = fileRank(from);
  const [tf, tr] = fileRank(to);
  const adf = Math.abs(tf - ff);
  const adr = Math.abs(tr - fr);
  switch (pc.type) {
    case 'n':
      return (adf === 1 && adr === 2) || (adf === 2 && adr === 1);
    case 'b':
      return adf === adr && adf > 0 && clearRay(c, from, to);
    case 'r':
      return ((adf === 0) !== (adr === 0)) && clearRay(c, from, to);
    case 'q':
      return (adf === adr || adf === 0 || adr === 0) && clearRay(c, from, to);
    case 'k':
      return adf <= 1 && adr <= 1 && (adf > 0 || adr > 0);
    default:
      return false;
  }
}

/** Squares an annotation names — bare ("f5") or via a piece token ("Nf5"). */
function annotationSquares(text: string): Set<string> {
  const out = new Set<string>();
  for (const m of text.matchAll(/\b([NBRQK])([a-h][1-8])\b/g)) out.add(m[2]);
  for (const m of text.matchAll(/\b([a-h][1-8])\b/g)) out.add(m[1]);
  return out;
}

interface LeadEyeLine {
  fen: string;
  moves: string[];
  annotations: string[];
  arrows?: Array<Array<{ from: string; to: string; color?: string }>>;
  highlights?: Array<Array<{ square: string; color?: string }>>;
}

async function assertLeadEye(line: LeadEyeLine, id: string): Promise<void> {
  const { Chess } = await import('chess.js');
  const c = new Chess(line.fen);
  line.moves.forEach((san, i) => {
    const mv = c.move(san);
    const named = annotationSquares(line.annotations[i] ?? '');
    // Every arrow is a GREEN vision arrow (no move arrow) — each must be a
    // legal sight-line and grounded: origin is a named piece (or the piece
    // that just moved), target is a square the annotation names.
    const arrowRow = line.arrows?.[i] ?? [];
    arrowRow.forEach((a) => {
      expect(
        sees(c, a.from, a.to),
        `${id} move ${i} (${san}): blocked/illegal vision arrow ${a.from}->${a.to}`,
      ).toBe(true);
      expect(
        named.has(a.from) || a.from === mv.to,
        `${id} move ${i} (${san}): vision arrow origin ${a.from} not named in annotation`,
      ).toBe(true);
      expect(
        named.has(a.to),
        `${id} move ${i} (${san}): vision arrow target ${a.to} not named in annotation`,
      ).toBe(true);
    });
    // Highlights must be real squares + grounded. The move's two squares
    // (orange last-move) are exempt — they ARE the move; every other
    // (yellow) highlight must be a square the annotation names.
    const hlRow = line.highlights?.[i] ?? [];
    hlRow.forEach((h) => {
      expect(/^[a-h][1-8]$/.test(h.square), `${id} move ${i}: bad highlight square ${h.square}`).toBe(true);
      expect(
        named.has(h.square) || h.square === mv.to || h.square === mv.from,
        `${id} move ${i} (${san}): highlight ${h.square} not named in annotation`,
      ).toBe(true);
    });
  });
}

describe('Ruy Lopez variation middlegame plans', () => {
  const RUY_VARIATION_PLAN_IDS = [
    'mp-ruylopez-d4',
    'mp-ruylopez-f4',
    'mp-ruylopez-marshall',
    'mp-ruylopez-berlin',
    'mp-ruylopez-open',
    'mp-ruylopez-exchange',
    'mp-ruylopez-breyer',
    'mp-ruylopez-chigorin',
    'mp-ruylopez-zaitsev',
    'mp-ruylopez-exchange-endgame',
    'mp-ruylopez-berlin-endgame',
    'mp-ruylopez-breyer-endgame',
    'mp-ruylopez-chigorin-endgame',
    'mp-ruylopez-zaitsev-endgame',
    'mp-ruylopez-open-endgame',
  ];

  for (const id of RUY_VARIATION_PLAN_IDS) {
    it(`${id}: every playable line is legal, annotated, and arrow-consistent`, async () => {
      const { Chess } = await import('chess.js');
      const plans = (await import('../data/middlegame-plans.json')).default as Array<{
        id: string;
        openingId: string;
        criticalPositionFen: string;
        playableLines: Array<{
          fen: string;
          moves: string[];
          annotations: string[];
          arrows?: Array<Array<{ from: string; to: string }>>;
        }>;
      }>;
      const plan = plans.find((p) => p.id === id);
      expect(plan, `plan ${id} missing`).toBeTruthy();
      expect(plan!.openingId).toBe('ruy-lopez');
      expect(plan!.playableLines.length).toBeGreaterThan(0);

      for (const line of plan!.playableLines) {
        expect(line.annotations.length).toBe(line.moves.length);
        const c = new Chess(line.fen);
        line.moves.forEach((san) => {
          c.move(san); // chess.js throws on an illegal move, failing the test
        });
        await assertLeadEye(line as LeadEyeLine, id);
      }
    });
  }

  it('each Ruy variation plan builds a white-oriented middlegame session', async () => {
    const plans = (await import('../data/middlegame-plans.json')).default as Array<{
      id: string;
    }>;
    for (const id of RUY_VARIATION_PLAN_IDS) {
      const plan = plans.find((p) => p.id === id);
      // sessionFromPlan takes the canonical MiddlegamePlan shape; the JSON
      // row satisfies it. Cast through unknown since the JSON import is
      // typed loosely.
      const session = sessionFromPlan(plan as unknown as Parameters<typeof sessionFromPlan>[0], {
        orientation: 'white',
      });
      expect(session, `session for ${id}`).not.toBeNull();
      expect(session!.steps.length, `steps for ${id}`).toBeGreaterThan(0);
      expect(session!.orientation).toBe('white');
    }
  });
});

describe('Pirc Defence variation middlegame plans', () => {
  const PIRC_VARIATION_PLAN_IDS = [
    'mp-pircdefence-austrian',
    'mp-pircdefence-classical',
    'mp-pircdefence-150',
    'mp-pircdefence-byrne',
    'mp-pircdefence-lion',
    'mp-pircdefence-fianchetto',
    'mp-pircdefence-czech',
    'mp-pircdefence-austrian-e5',
  ];

  for (const id of PIRC_VARIATION_PLAN_IDS) {
    it(`${id}: every playable line is legal, annotated, and arrow-consistent`, async () => {
      const { Chess } = await import('chess.js');
      const plans = (await import('../data/middlegame-plans.json')).default as Array<{
        id: string;
        openingId: string;
        criticalPositionFen: string;
        playableLines: Array<{
          fen: string;
          moves: string[];
          annotations: string[];
          arrows?: Array<Array<{ from: string; to: string }>>;
        }>;
      }>;
      const plan = plans.find((p) => p.id === id);
      expect(plan, `plan ${id} missing`).toBeTruthy();
      expect(plan!.openingId).toBe('pirc-defence');
      expect(plan!.playableLines.length).toBeGreaterThan(0);

      for (const line of plan!.playableLines) {
        expect(line.annotations.length).toBe(line.moves.length);
        const c = new Chess(line.fen);
        line.moves.forEach((san) => {
          c.move(san);
        });
        await assertLeadEye(line as LeadEyeLine, id);
      }
    });
  }

  it('each Pirc variation plan builds a black-oriented middlegame session', async () => {
    const plans = (await import('../data/middlegame-plans.json')).default as Array<{ id: string }>;
    for (const id of PIRC_VARIATION_PLAN_IDS) {
      const plan = plans.find((p) => p.id === id);
      const session = sessionFromPlan(plan as unknown as Parameters<typeof sessionFromPlan>[0], {
        orientation: 'black',
      });
      expect(session, `session for ${id}`).not.toBeNull();
      expect(session!.steps.length, `steps for ${id}`).toBeGreaterThan(0);
      expect(session!.orientation).toBe('black');
    }
  });
});
