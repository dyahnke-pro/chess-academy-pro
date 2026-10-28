// seatPronouns — THE ONE PRONOUN FLIP (2026-10-28). A clause written to the
// side that moved ("it let them play …exf6, winning your bishop") is said to
// the other side by swapping every seat word. Three copies did this and none
// agreed: `toObserverSeat` left "them" alone ("it let them play" to the wrong
// side), `seatTheirErrorForStudent` and `toObserverSeat` turned an object "you"
// into "they" ("it lets they take"), and `toStudentSeat` flipped possessives
// only ("it let them take your rook"). A leaf: words only.

/** Words after which "you" is an OBJECT ("it lets you", "for you"): it flips
 *  to "them", never "they". */
const OBJECT_BEFORE = new Set([
  'let', 'lets', 'letting', 'give', 'gives', 'gave', 'giving', 'leave', 'leaves', 'left', 'leaving',
  'cost', 'costs', 'costing', 'hand', 'hands', 'handed', 'allow', 'allows', 'allowed', 'allowing',
  'help', 'helps', 'helped', 'force', 'forces', 'forced', 'forcing', 'stop', 'stops', 'stopped',
  'hit', 'hits', 'punish', 'punishes', 'punished', 'beat', 'beats', 'cramp', 'cramps', 'trap', 'traps',
  'to', 'for', 'at', 'against', 'with', 'from', 'on', 'of', 'than', 'by', 'before', 'after', 'toward', 'towards', 'into', 'onto', 'over', 'behind', 'past',
]);

const SWAP: Record<string, string> = {
  your: 'their', their: 'your', yours: 'theirs', theirs: 'yours',
  yourself: 'themselves', themselves: 'yourself', them: 'you', they: 'you',
  "you're": "they're", "they're": "you're", "you've": "they've", "they've": "you've",
  "you'll": "they'll", "they'll": "you'll", "you'd": "they'd", "they'd": "you'd",
};

const SEAT_WORD = /\b(?:you(?:'re|'ve|'ll|'d)?|they(?:'re|'ve|'ll|'d)?|your|yours|yourself|their|theirs|them|themselves)\b/gi;

/** `text` said to the OTHER side of the board: every seat word swapped. */
export function toOtherSeat(text: string): string {
  return text.replace(SEAT_WORD, (word: string, offset: number, all: string) => {
    const lower = word.toLowerCase();
    let to = SWAP[lower];
    if (lower === 'you') {
      const before = /([A-Za-z]+)\W*$/.exec(all.slice(0, offset))?.[1]?.toLowerCase() ?? '';
      to = OBJECT_BEFORE.has(before) ? 'them' : 'they';
    }
    if (!to) return word;
    return word[0] === word[0].toUpperCase() ? to[0].toUpperCase() + to.slice(1) : to;
  });
}
