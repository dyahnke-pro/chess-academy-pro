/**
 * computedMaterialTruth — the DIFFERENTIAL material-truth corpus (David
 * 2026-09-13: "make the drift impossible to reopen").
 *
 * The 2026-09-12 computed-voice deep-dive found one disease behind a whole
 * class of false coach claims: a GEOMETRY-ONLY static exchange (`seeGain`,
 * driven off `chess.attackers()`) counts a PINNED piece as a real attacker or
 * defender. That makes it lie two ways — it invents a "wins the piece" when the
 * capturer is pinned (→ "Bxc6 wins the knight" on a pinned bishop), and it
 * misses a real hang when the only defender is pinned (→ silence where the coach
 * should warn). The fix was the pin/legality-aware family in
 * positionReadingService (`legalSeeGain` / `legalSeeGainFor` /
 * `capturesWinMaterial` / `landingIsSafe`), swept across every fact-computer.
 *
 * The `boardClaimValidator` hammer test guards PIECE-ON-SQUARE truth ("knight on
 * f6" when f6 is empty). It CANNOT catch a board-LEGAL but semantically-false
 * material claim — that is this corpus's job, and nothing else covers the
 * ENSEMBLE (primitive → consumers → the live C#6 alert gate) on adversarial
 * geometry.
 *
 * NON-VACUITY CONTRACT: every DIFFERENTIAL row asserts BOTH that the honest
 * pin-aware read is correct AND that the naive geometric `seeGain` would have
 * LIED on the same board — a row where the naive read does not lie does not
 * belong here (it would prove nothing). ANCHOR rows assert the honest read does
 * NOT over-correct (it agrees with naive where there is no pin to see through).
 * If anyone reintroduces a geometry-only path, the differential rows trip.
 */
import { describe, it, expect } from 'vitest';
import { Chess } from 'chess.js';
import type { Color, Square } from 'chess.js';
import {
  seeGain,
  legalSeeGainFor,
  capturesWinMaterial,
  landingIsSafe,
  pressureCount,
  pressuredTargets,
} from './positionReadingService';
import { isCriticalThreat } from './tacticAlertService';

/** A geometry-blindness case. `naiveLies` = the direction the naive read is
 *  wrong, proving the position actually exercises the pin/legality blindness. */
interface DiffRow {
  label: string;
  fen: string;
  target: Square;
  capturer: Color;
  /** The honest, pin-aware net material the capturer wins (pawns; 0 = safe). */
  honest: number;
  /** How the naive geometric read is wrong on this board. */
  naiveLies: 'invents-a-win' | 'misses-a-hang';
}

// Every FEN + expectation below was verified against chess.js before being
// baked (never authored from imagination — G3 applies to fixtures too).
const DIFFERENTIALS: DiffRow[] = [
  {
    // White's Nd5 geometrically "attacks" Bf6, but Nd5 is pinned to Ke1 by the
    // rook on d8 — Nxf6 is illegal, so the bishop is safe. Naive: +3 ("wins the
    // bishop"). Honest: 0.
    label: 'pinned attacker (knight) — invents a win on a safe piece',
    fen: '3r2k1/8/5b2/3N4/8/8/8/3K4 w - - 0 1',
    target: 'f6',
    capturer: 'w',
    honest: 0,
    naiveLies: 'invents-a-win',
  },
  {
    // White's Re4 geometrically "attacks" Bb4, but Re4 is pinned to Ke1 by the
    // rook on e8. Naive: +3. Honest: 0.
    label: 'pinned attacker (rook) — invents a win on a safe piece',
    fen: '4r1k1/8/8/8/1b2R3/8/8/4K3 w - - 0 1',
    target: 'b4',
    capturer: 'w',
    honest: 0,
    naiveLies: 'invents-a-win',
  },
  {
    // Black's Nf5 is defended only by the g6 pawn, but g6 is pinned to Kg8 by
    // Rg1 — gxf5 is illegal, so the knight hangs to Rxf5. Naive counts the
    // pinned pawn as a defender: -2 ("safe, defended"). Honest: +3 (hangs).
    label: 'pinned defender — misses a real hang',
    fen: '6k1/8/6p1/5n2/8/8/8/5RRK w - - 0 1',
    target: 'f5',
    capturer: 'w',
    honest: 3,
    naiveLies: 'misses-a-hang',
  },
];

// Positions where there is NO pin to see through — the honest read must AGREE
// with the naive one, proving pin-awareness does not over-correct real trades.
const ANCHORS: Array<{ label: string; fen: string; target: Square; capturer: Color; honest: number }> = [
  {
    // Undefended knight — a clean hang both reads agree on.
    label: 'clean hang (undefended)',
    fen: '6k1/8/4n3/8/8/4R3/8/6K1 w - - 0 1',
    target: 'e6',
    capturer: 'w',
    honest: 3,
  },
  {
    // Knight defended by an equal-value piece (pawn f7) — an even trade, not a
    // win, both reads agree on 0.
    label: 'equal trade (defended, not winnable)',
    fen: '6k1/5p2/4n3/8/8/4B3/8/6K1 w - - 0 1',
    target: 'e6',
    capturer: 'w',
    honest: 0,
  },
];

describe('computedMaterialTruth — differential rows (naive lies, pin-aware is honest)', () => {
  for (const row of DIFFERENTIALS) {
    it(row.label, () => {
      const naive = seeGain(new Chess(row.fen), row.target);
      const honest = legalSeeGainFor(row.fen, row.target, row.capturer);

      // 1) The honest, pin-aware read is correct.
      expect(honest).toBe(row.honest);

      // 2) NON-VACUITY: the naive geometric read genuinely lies on this board.
      if (row.naiveLies === 'invents-a-win') {
        expect(naive).toBeGreaterThan(0); // naive claims a win…
        expect(honest).toBe(0); // …that does not exist.
      } else {
        expect(naive).toBeLessThanOrEqual(0); // naive calls it safe…
        expect(honest).toBeGreaterThan(0); // …but it hangs.
      }
      expect(naive).not.toBe(honest); // the two reads must actually disagree.

      // 3) The boolean consumer reads the honest truth.
      expect(capturesWinMaterial(row.fen, row.target, row.capturer)).toBe(honest > 0);
    });
  }
});

describe('computedMaterialTruth — anchor rows (pin-awareness does not over-correct)', () => {
  for (const row of ANCHORS) {
    it(row.label, () => {
      const naive = seeGain(new Chess(row.fen), row.target);
      const honest = legalSeeGainFor(row.fen, row.target, row.capturer);
      expect(honest).toBe(row.honest);
      expect(naive).toBe(honest); // no pin to see through → the reads agree.
      expect(capturesWinMaterial(row.fen, row.target, row.capturer)).toBe(honest > 0);
    });
  }
});

describe('computedMaterialTruth — landingIsSafe honours pins', () => {
  it('a piece defended only against a PINNED recapturer is safe (naive says unsafe)', () => {
    // Black to move. White just landed a knight on d5; the c6 pawn geometrically
    // attacks it, but c6 is pinned to Kc8 by Rc1 — cxd5 is illegal, so the
    // knight is safe. Naive seeGain says the pawn wins it (+3).
    const fen = '2k5/8/2p5/3N4/8/8/8/2R4K b - - 0 1';
    expect(seeGain(new Chess(fen), 'd5')).toBeGreaterThan(0); // naive: "unsafe"
    expect(landingIsSafe(fen, 'd5')).toBe(true); // honest: safe
  });
});

describe('computedMaterialTruth — pressureCount verdict + chat "pressure" answer are pin-aware', () => {
  // The coach chat "pressure" answer (groundedAnswer) and the Danya
  // pressured-target behavior name a piece as winnable/under-pressure off
  // pressureCount's verdict. The verdict used to fall through to 'winnable' on a
  // raw geometric attacker>defender count, so a pinned attacker produced
  // "you're pressuring the bishop on f6" on a piece it can't legally take
  // (2026-09-13 sweep). The verdict is now decided by capturesWinMaterial.
  it('a pinned attacker does NOT make its geometric target "winnable"', () => {
    // White Nd5 (pinned to Ke1 by Rd8) geometrically attacks Bf6.
    const fen = '3r2k1/8/5b2/3N4/8/8/8/3K4 w - - 0 1';
    const pc = pressureCount(fen, 'f6');
    expect(pc?.attackers).toBe(1); // geometric count still sees the pinned knight…
    expect(pc?.verdict).not.toBe('winnable'); // …but the verdict is honest.
    // The chat's "you're pressuring…" set (verdict-filtered) is empty here.
    const claimed = pressuredTargets(fen, 'w').filter(
      (p) => p.verdict === 'winnable' || p.verdict === 'balanced-tension',
    );
    expect(claimed.some((p) => p.square === 'f6')).toBe(false);
  });

  it('a genuinely winnable target still reads "winnable"', () => {
    // Undefended black knight on e6, White rook bearing on it.
    const fen = '6k1/8/4n3/8/8/4R3/8/6K1 w - - 0 1';
    expect(pressureCount(fen, 'e6')?.verdict).toBe('winnable');
  });
});

describe('computedMaterialTruth — the C#6 alert gate reads the pin-aware truth', () => {
  const pattern = (type: 'pin' | 'fork') => ({ type, involvedSquares: [], description: '' });

  it('fires on a real hang the naive read would miss', () => {
    // Pinned-defender board: Black (student) actually loses the f5 knight to
    // White. isCriticalThreat must see the material win via maxMaterialWinCp.
    const fen = '6k1/8/6p1/5n2/8/8/8/5RRK w - - 0 1';
    expect(
      isCriticalThreat({ lineEval: 0, lineMate: null, pattern: pattern('fork'), fen }, 'b', false),
    ).toBe(true);
  });

  it('stays silent on a pinned attack that wins nothing (no "Watch out" noise)', () => {
    // Pinned-attacker board: White's Nd5 "attacks" Bf6 but is pinned; nothing is
    // won, so the alert must not fire even in a sharp line.
    const fen = '3r2k1/8/5b2/3N4/8/8/8/3K4 w - - 0 1';
    expect(
      isCriticalThreat({ lineEval: 0, lineMate: null, pattern: pattern('pin'), fen }, 'b', false),
    ).toBe(false);
  });
});
