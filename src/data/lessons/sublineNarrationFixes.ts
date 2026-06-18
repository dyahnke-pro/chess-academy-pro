import type { SublineNarration } from '../../services/sublineLesson';

// SOUNDNESS FIX OVERRIDES (David 2026-06-18). When the soundness audit re-walked
// 28 flagged lines with Stockfish best moves (scripts/fix-bad-sublines.mjs), the
// move skeletons changed, so a handful of entries that carried teach-past beats
// no longer matched the board. These corrected, board-true intros override those
// stale entries (spread LAST → they win). Intro-only by design: they frame the
// deviation + the engine-best plan on the NEW sound line; deep per-move beats can
// be re-authored on the corrected lines later. Every move named below is present
// in the re-walked line in course-sublines.json.
export const SUBLINE_NARRATION_FIXES: Record<string, SublineNarration> = {
  // Stafford Gambit — White grabs with Nxf7?!; best play WINS for Black.
  'stafford-gambit::0::Nxf7@6': {
    intro: {
      say: "Nxf7?! — White snatches the rook, the greedy grab the Stafford is built to punish. Take the knight with …Kxf7 and don't fear the bare king: your enormous lead in development and the open lines flip the board. The engine confirms it — with the best moves Black is winning here. Learn this line cold; it's the whole point of the gambit.",
      sayShort: "Nxf7?! — …Kxf7, and you're winning.",
    },
    sources: ['concept:pos-initiative', 'concept:pos-development', 'https://en.wikipedia.org/wiki/Stafford_Gambit'],
  },
  'stafford-gambit::1::Nxf7@6': {
    intro: {
      say: "Nxf7?! — White snatches the rook, the greedy grab the Stafford is built to punish. Take the knight with …Kxf7 and don't fear the bare king: your enormous lead in development and the open lines flip the board. The engine confirms it — with the best moves Black is winning here. Learn this line cold; it's the whole point of the gambit.",
      sayShort: "Nxf7?! — …Kxf7, and you're winning.",
    },
    sources: ['concept:pos-initiative', 'concept:pos-development', 'https://en.wikipedia.org/wiki/Stafford_Gambit'],
  },
  // Pirc, opposite-castling race — counterattack the queenside king first.
  'pirc-defence::3::h4@12': {
    intro: {
      say: "h4 — White lights the kingside pawn storm in the opposite-castling race. Don't sit and defend: counterattack first. …b5 and …Qa5 prise open lines at White's queenside king, with …b4 to come, while your Pirc bishop on g7 backs the assault. It's a pure race — strike fast and your attack lands in time.",
      sayShort: 'h4 — race back: …b5 and …Qa5.',
    },
    sources: ['concept:pos-king-safety', 'concept:pos-initiative', 'https://en.wikipedia.org/wiki/Pirc_Defence'],
  },
  // Nimzo — accurate recapture ORDER: …Bxc3+ first, then …Qxf6.
  'nimzo-indian::3::Bxf6@8': {
    intro: {
      say: "Bxf6 — White trades the pinning bishop to dent your kingside. The accurate order is …Bxc3+ FIRST, crippling White's queenside pawns, and only then …Qxf6 to recapture. You hand over the bishop pair but keep the Nimzo's lasting trump — those doubled c-pawns to grind against — and a completely sound game. The engine calls it dead level.",
      sayShort: 'Bxf6 — …Bxc3+ first, then …Qxf6.',
    },
    sources: ['concept:pos-center', 'concept:pos-development', 'https://en.wikipedia.org/wiki/Nimzo-Indian_Defence'],
  },
  // QGD — recapture into the Carlsbad and play the classical setup.
  'qgd::6::cxd5@8': {
    intro: {
      say: "cxd5 — White clarifies into the Carlsbad structure. Recapture …exd5 and settle into the rock-solid QGD: …Be7, …c6, …O-O, with a clear plan to blunt White's minority attack. No weaknesses, smooth development — the classical, time-tested way to equalise.",
      sayShort: 'cxd5 — recapture …exd5, classic QGD.',
    },
    sources: ['concept:pos-center', 'concept:pos-development', 'https://en.wikipedia.org/wiki/Queen%27s_Gambit_Declined'],
  },
  // Slav/Semi-Slav — recapture …Qxf6, free with …dxc4 and …e5.
  'slav-defence::6::Bxf6@10': {
    intro: {
      say: "Bxf6 — White trades on f6 in this Semi-Slav-flavoured line. Recapture …Qxf6, develop …Nd7, then free the position with …dxc4 and the …e5 break. White keeps the bishop pair, but your easy development and the central break give a comfortable, fully equal game.",
      sayShort: 'Bxf6 — …Qxf6, then …dxc4 and …e5.',
    },
    sources: ['concept:pos-development', 'concept:pos-center', 'https://en.wikipedia.org/wiki/Slav_Defense'],
  },
};
