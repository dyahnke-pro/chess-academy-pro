// Is a course line a GAMBIT — judged like the gambit (its own eval may be below
// a pawn for the student), never by the sound-line bar? ONE rule, read by the
// grounding builder (scripts/ci/build-grounding.cjs) and the club-reply builder
// (build-club-replies.mjs), so the two can never call one line two things.
const GAMBIT_RE = /gambit|muzio|allgaier|max.?lange|counter.?gambit|sacrifice|king'?s.?gambit|evans|smith.?mor|danish|halloween|fishing.?pole|fried.?liver|stafford/i;
// The Queen's Gambit (Declined / Accepted) is named a gambit and sacrifices
// nothing: its pawn comes back. It is judged as a sound line like any other.
const isGambitName = (s) => GAMBIT_RE.test(String(s || '').replace(/queen'?s[\s-]*gambit([\s-]*(declined|accepted))?|\bq\.?g\.?[ad]\b|\bqg[ad]\b/gi, ''));

module.exports = { GAMBIT_RE, isGambitName };
