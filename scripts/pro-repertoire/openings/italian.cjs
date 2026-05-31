// Italian (GothamChess) — deepen the 3 middlegame plans to real 8-ply lines.
// Two plans shared one anchor (duplicate) — re-pointed to distinct crushing wins.
const fs = require('fs');
const grPath = 'scripts/pro-repertoire/grounded/plan-lines.json';
// One-time: the two duplicate-position plans were re-pointed to distinct candidate
// wins; the picks are now baked into the tracked grounded file. Re-apply only if the
// (gitignored) candidates file is present AND the grounded file hasn't been fixed yet.
const candPath = 'audit-reports/grounded-plan-candidates.json';
if (fs.existsSync(candPath)) {
  const cand = require('../../../' + candPath);
  const gr = JSON.parse(fs.readFileSync(grPath, 'utf8'));
  gr['mp-progothamchess-italian-twoknights-kside'] = { ...cand['mp-progothamchess-italian-twoknights-kside'][4] };
  gr['mp-progothamchess-italian-evans-style'] = { ...cand['mp-progothamchess-italian-evans-style'][2] };
  fs.writeFileSync(grPath, JSON.stringify(gr, null, 2));
}

const { apply } = require('../apply-plan-narration.cjs');

const narr = {
  'mp-progothamchess-italian-evans-bigcenter': {
    title: 'Evans Gambit: the d4 Big-Centre Crashes Through',
    intro: 'A real GothamChess win vs MiningMathGamer. The Evans pawn buys a huge centre; here it detonates — White is up a piece and mating.',
    overview: 'The Evans Gambit hands back a pawn for a roaring centre and lead in development. A real GothamChess win (vs MiningMathGamer): Qh5 turns up the heat, the e-pawn rips the centre open, and White collects a piece while Black’s king is stuck. Completely winning (~+4.7).',
    pieceManeuvers: [{ piece: 'Bishop', route: 'Bg5xe7 wins the knight', explanation: 'With the centre torn open, the g5-bishop grabs the e7-knight and White is a clean piece up.' }],
    pawnBreaks: [{ move: 'e5xd6 en passant', explanation: 'exd6 prises the centre open while Black’s king is still in the middle.', fen: '' }],
    strategicThemes: ['Trade the gambit pawn for a mobile centre and a development lead.', 'Open lines at the uncastled king before he can consolidate.'],
    endgameTransitions: ['No endgame needed — the attack decides in the middlegame.'],
    greenArrowIdx: [0, 6],
    annotations: [
      'Qh5 — the queen swings over, hitting f7 and h7 while the king sits in the centre.',
      '…Bxf2+ — Black grabs a pawn with check, but it only peels open his own king.',
      'Kxf2 — the king calmly takes; it’s Black’s king that’s in real danger.',
      '…d5 — trying to slam the door on the c4-bishop.',
      'exd6 — en passant! the centre is ripped open against the stranded king.',
      '…O-O — Black finally tucks the king away, but the lines are already open.',
      'Bxe7 — the bishop scoops up the knight; White is a whole piece ahead.',
      '…Qe8 — Black hits the e7-bishop, but White is already winning easily.',
    ],
    cues: ['Qh5 — hit f7 and h7', 'Bxf2+ — Black opens his own king', 'Kxf2 — king takes, stays safe', 'd5 — shut out the bishop', 'exd6 — rip the centre open', 'O-O — too late to hide', 'Bxe7 — win the piece', 'Qe8 — White is winning'],
  },
  'mp-progothamchess-italian-twoknights-kside': {
    title: 'Two Knights: the Kingside Demolition',
    intro: 'A real GothamChess win vs Mr_RoBoT018. Trade off the defenders, prise open the pawn cover, and the king is hunted in the centre.',
    overview: 'Against the Two Knights, White builds the big pawn centre and then strikes at Black’s king cover. A real GothamChess win (vs Mr_RoBoT018): Bxe6 and Bxf6 strip the pawns, Qh5+ chases the king into the open, and the centre cracks. Clearly winning (~+3.7).',
    pieceManeuvers: [{ piece: 'Queen', route: 'Qd1-h5+ hunts the king', explanation: 'Once the cover is gone, the queen lands on h5 with check and the king is exposed.' }],
    pawnBreaks: [{ move: 'f4xe5 central break', explanation: 'fxe5 tears the centre open against a king with no shelter.', fen: '' }],
    strategicThemes: ['Trade off the key defenders before opening lines at the king.', 'Use f4-e4 pawns to crack the centre once the king is stuck.'],
    endgameTransitions: ['The exposed king decides things long before an endgame.'],
    greenArrowIdx: [0, 4],
    annotations: [
      'Bxe6 — trading off Black’s good bishop and shattering the pawns in front of his king.',
      '…fxe6 — recapturing, but the king is left with no pawn shield.',
      'Bxf6 — removing the knight that guards the dark squares around the king.',
      '…gxf6 — the king’s cover is in tatters now.',
      'Qh5+ — the queen dives in with check; there’s no safe square.',
      '…Ke7 — the king is forced to walk out into the open.',
      'fxe5 — prising the centre wide open against the stranded king.',
      '…dxe5 — White is winning: the king is marooned in the middle.',
    ],
    cues: ['Bxe6 — wreck the pawn cover', 'fxe6 — no shield left', 'Bxf6 — remove the defender', 'gxf6 — cover in tatters', 'Qh5+ — queen hunts the king', 'Ke7 — king walks out', 'fxe5 — crack the centre', 'dxe5 — White is winning'],
  },
  'mp-progothamchess-italian-evans-style': {
    title: 'Two Knights: the Central Knight Raid',
    intro: 'A real GothamChess win vs skoularikii. The queenside knight reroutes c4-d6 to invade, then the kingside is torn open.',
    overview: 'From the same tense centre, White reroutes the a3-knight via c4 into d6 — a monster outpost that forks f7 and the queenside. A real GothamChess win (vs skoularikii): Nxd6 invades, Bxf6 strips the cover and Qg4+ finishes. Winning a piece and the attack (~+4.2).',
    pieceManeuvers: [{ piece: 'Knight', route: 'Na3-c4-d6 invasion', explanation: 'The knight reroutes through c4 to the d6 outpost, forking f7 and hitting the queenside.' }],
    pawnBreaks: [{ move: 'd4 central anchor', explanation: 'The d4-pawn anchors the centre so the knight raid and kingside attack roll unhindered.', fen: '' }],
    strategicThemes: ['Reroute the offside knight to a central outpost (d6).', 'Once the knight invades, open the king with Bxf6 and the queen.'],
    endgameTransitions: ['The extra piece settles it well before any endgame.'],
    greenArrowIdx: [0, 2],
    annotations: [
      'Nxc4 — the offside knight swings back to c4, eyeing the d6 hole.',
      '…O-O — Black castles straight into the coming raid.',
      'Nxd6 — the knight crashes into d6, forking f7 and raking the queenside.',
      '…Qb6 — counterattacking d4 and b2 to muddy the waters.',
      'Bxf6 — eliminating the knight that shields the kingside.',
      '…gxf6 — the king’s shelter is shredded.',
      'Qg4+ — the queen joins with check and the attack is decisive.',
      '…Kh8 — the king ducks away, but White is up a piece with a raging attack.',
    ],
    cues: ['Nxc4 — eye the d6 hole', 'O-O — into the storm', 'Nxd6 — knight invades, forks f7', 'Qb6 — Black muddies it', 'Bxf6 — strip the cover', 'gxf6 — shelter shredded', 'Qg4+ — attack decides', 'Kh8 — White is winning'],
  },
};

const r = apply(narr);
console.log('Italian:', JSON.stringify(r));
