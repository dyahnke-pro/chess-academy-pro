import type { SublineNarration } from '../../services/sublineLesson';

// Deep subline narration — GothamChess batch 3: Vienna Gambit, Ponziani,
// English, Fantasy Caro, Closed Sicilian (student WHITE); Pirc (student BLACK).
// Transcript-grounded, house voice, board-safe.

const V = ['concept:pos-center', 'https://www.chess.com/openings/Vienna-Game'];
const PZ = ['concept:pos-center', 'https://www.chess.com/openings/Ponziani-Opening'];
const PIR = ['concept:pos-center', 'https://en.wikipedia.org/wiki/Pirc_Defence'];
const EN = ['concept:pos-development', 'https://www.chess.com/openings/English-Opening'];
const FA = ['concept:pos-center', 'https://www.chess.com/openings/Caro-Kann-Defense-Fantasy-Variation'];
const CS = ['concept:pos-king-safety', 'https://www.chess.com/openings/Closed-Sicilian'];

export const SUBLINE_NARRATION_PRO_GOTHAM_W3: Record<string, SublineNarration> = {
  // ===== Vienna Gambit =====
  'pro-gothamchess-vienna::0::Be7@11': {
    intro: { say: "Be7 — Black develops solidly in the Gambit main line after the knight trades. Build with d4, keeping the bishop pair and the open b- and f-files; castle and press with your development lead. A pleasant, aggressive game.", sayShort: 'Be7 — d4, use the open files.' }, sources: V,
  },
  'pro-gothamchess-vienna::0::Be6@11': {
    intro: { say: "Be6 — Black develops the bishop to trade off attackers. Play d4, grabbing the centre, and keep your open files and bishop pair; develop with tempo and the initiative is yours. The Gambit's activity endures.", sayShort: 'Be6 — d4, keep the initiative.' }, sources: V,
  },
  'pro-gothamchess-vienna::0::Nc6@11': {
    intro: { say: "Nc6 — Black develops, but this lets you build unopposed. Play d4 and Bd3, seizing a huge centre and open lines; your development lead and the half-open files give a powerful attacking position. Press hard.", sayShort: 'Nc6 — d4 and Bd3, attack.' }, sources: V,
  },
  'pro-gothamchess-vienna::0::d6@5': {
    intro: { say: "d6 — Black declines the Gambit passively. Develop Nf3 and Bc4, and prepare to open the centre with fxe5 or f5; your space and the half-open f-file give an easy, aggressive game against the passive setup.", sayShort: 'd6 — develop, open the f-file.' }, sources: V,
  },
  // ===== Ponziani =====
  'pro-gothamchess-ponziani::0::d6@7': {
    intro: { say: "d6 — Black plays solidly in the Ponziani. Build your big centre with d4 and Bd3, castle, and press with the space; the c3-d4 centre gives a comfortable, surprising edge against unprepared opponents.", sayShort: 'd6 — big centre, Bd3, press.' }, sources: PZ,
  },
  'pro-gothamchess-ponziani::1::dxe4@7': {
    intro: { say: "dxe4 — Black grabs the pawn but falls behind. Nxe5 wins it back with tempo, then Bc4 develops with threats; your active pieces and Black's loose structure give a clear advantage. The greedy capture backfires.", sayShort: 'dxe4 — Nxe5, then Bc4, attack.' }, sources: PZ,
  },
  // ===== Pirc (Black) =====
  'pro-gothamchess-pirc-defense::0::e5@8': {
    intro: { say: "e5 — White grabs space with the Austrian push. Retreat the knight to d7 and counter with …c5 and …Nc6, chipping at the overextended pawns; your fianchetto bishop rakes the long diagonal. The Pirc invites the big centre precisely to strike it.", sayShort: 'e5 — retreat Nfd7, hit with c5.' }, sources: PIR,
  },
  'pro-gothamchess-pirc-defense::1::Be3@8': {
    intro: { say: "Be3 — the Classical setup, White developing solidly. Complete yours: …O-O, then …c6 and …b5, or …Nc6 and …e5 striking the centre. The Pirc absorbs the pressure and counters on the wing or in the centre — never passive.", sayShort: 'Be3 — castle, then c6-b5 or e5.' }, sources: PIR,
  },
  'pro-gothamchess-pirc-defense::1::Bg5@8': {
    intro: { say: "Bg5 — White pins toward your knight. Play …O-O and …h6 to question the bishop, then …c6, …b5 or …Nc6 and …e5. The Pirc's flexible setup meets the pin and counters. Stay active.", sayShort: 'Bg5 — castle, …h6, then counter.' }, sources: PIR,
  },
  // ===== English =====
  'pro-gothamchess-english::0::Nbd7@11': {
    intro: { say: "Nbd7 — Black sets up a King's Indian against your Botvinnik English. You have the big centre: continue d4, Be3 and castle, then press with the space and the c-file. All the ambitious plans are yours.", sayShort: 'Nbd7 — keep the big centre, press.' }, sources: EN,
  },
  'pro-gothamchess-english::2::c6@7': {
    intro: { say: "c6 — Black plays a solid Semi-Slav-ish setup against your Anti-French English. Fianchetto with b3 and Bb2, develop, and play for the central break or the queenside minority; your flexible English gives an easy, comfortable game.", sayShort: 'c6 — b3 and Bb2, flexible play.' }, sources: EN,
  },
  'pro-gothamchess-english::2::c5@7': {
    intro: { say: "c5 — Black strikes with an IQP-style break. Take cxd5 and develop with Bb5-check and Nf3; the play revolves around the isolated pawn, which you blockade and pressure. A comfortable, well-known structure.", sayShort: 'c5 — cxd5, blockade the IQP.' }, sources: EN,
  },
  // ===== Fantasy Caro =====
  'pro-gothamchess-fantasy-caro::0::Qb6@5': {
    intro: { say: "Qb6 — Black eyes b2 and d4 early. Develop Nc3 and leave b2 alone; after the central exchanges you keep your broad centre and the initiative, with Black's queen misplaced on b6. Develop with threats.", sayShort: 'Qb6 — Nc3, keep the centre.' }, sources: FA,
  },
  'pro-gothamchess-fantasy-caro::0::Bg4@9': {
    intro: { say: "Bg4 — Black pins your knight in the accepted line. Support with c3 and develop Bd3; keep your big e4-d4 centre and the open f-file, and after h3 the pin breaks. Your space and development give a clear edge.", sayShort: 'Bg4 — c3 and Bd3, keep the centre.' }, sources: FA,
  },
  // ===== Closed Sicilian =====
  'pro-gothamchess-closed-sicilian::0::e6@7': {
    intro: { say: "e6 — Black develops after the Nd4 jump. Castle, then the Grand-Prix plan: d3, f4 and a kingside pawn storm; your flexible setup and the f4-f5 lever give a straightforward, dangerous attack.", sayShort: 'e6 — castle, d3 and f4 storm.' }, sources: CS,
  },
  'pro-gothamchess-closed-sicilian::0::g6@5': {
    intro: { say: "g6 — Black fianchettos. Trade Bxc6 to double the pawns, then d3, Be3 and the kingside plan with f4; the damaged Black structure and your clean development give a comfortable positional edge.", sayShort: 'g6 — Bxc6, then d3 and f4.' }, sources: CS,
  },
  'pro-gothamchess-closed-sicilian::0::d6@9': {
    intro: { say: "d6 — Black plays solidly after the knight trades. Grab the centre with d4, develop Nc3, and press with your space; the Closed Sicilian's flexible structure gives an easy, comfortable game.", sayShort: 'd6 — d4 and Nc3, take the centre.' }, sources: CS,
  },
};
