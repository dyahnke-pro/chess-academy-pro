// Depersonalize voiced narration (David 2026-08-26: "we cannot speak like it's
// coming from someone other than our coach"). The farmed voiced text is derived
// from a pro's videos and sometimes carries first-person references to THAT
// pro's own history — "which I've already played in the speedrun", "my game
// against Vidit", "I like to play this with White". The app is depersonalized:
// the voice is OUR coach teaching, never a named pro recounting their games.
//
// This strips/rewrites those markers at BUILD time (the raw transcript-derived
// source stays intact as research; only the shipped derived text is cleaned).
// Legitimate coach "I" ("I'm going to play d4" while demoing) is preserved —
// only references to a specific pro's own play/history are rewritten.
//
// Order matters: longer/more-specific patterns first.
const RULES = [
  // whole-clause removals (the personal-history tail on a teaching sentence)
  [/,?\s*which I['’]ve already played in the speedrun/gi, ''],
  [/,?\s*(?:as|like) I['’]ve (?:played|shown) (?:it )?in (?:the|my) speedrun/gi, ''],
  // title-suffix game annotation: "Scandinavian Defense (750 speedrun)"
  [/\s*\(\d[\d,]*\s+speedruns?\)/gi, ''],
  // every "speedrun(s)" reference → depersonalized "top-level play" (the pro's
  // own speedrun series must never surface). Prepositional forms first so the
  // grammar stays clean.
  // Capitalise only when the phrase LANDS at a sentence start. A blanket
  // recapitalise is unsafe here: a beat can legitimately open on SAN ("e5, and
  // after c5…") and upper-casing that would name a different square.
  [/(^|[.!?]\s+)(?:in|on|for|during)\s+(?:earlier|previous|all of our|our|these|this|the|my|a)\s+speedruns?\b/gi,
    (_m, lead) => `${lead}In top-level play`],
  [/\b(?:in|on|for|during)\s+(?:earlier|previous|all of our|our|these|this|the|my|a)\s+speedruns?\b/gi, 'in top-level play'],
  [/\b(?:this|our|the|my)\s+speedruns?\b/gi, 'in top-level play'],
  [/\b(?:earlier|previous|all of our|these)\s+speedruns?\b/gi, 'top-level play'],
  [/\bspeedruns?\b/gi, 'top-level play'],
  // The pro's own history verbs, made IMPERSONAL — never first-person plural.
  //
  // This rule used to emit "we've $1", which put the app's two locked voice
  // rules in direct conflict: depersonalise says no "I" (the pro's identity),
  // and the 2026-08-28 perspective standard says no "we/our" (the student is
  // "you", the opponent is "they"). Trading one for the other just moved the
  // violation, and because it happens at BUILD time it survived a clean source:
  // the corpus said "In earlier speedruns I've recommended", the shipped file
  // said "in top-level play we've recommended", and no source-level migration
  // could ever reach it. Passive/impersonal satisfies both rules at once.
  // ONLY the two forms that actually occur, each checked against its real
  // sentence. The first draft also mapped suggested/shown/mentioned on spec and
  // produced "is called it a cardinal sin" on a shape the corpus never uses —
  // an untested rule is how a build-time rewrite ships broken prose.
  //   "In earlier speedruns I've recommended the Nimzowitsch Advance"
  //     → "In top-level play the recommendation has been the Nimzowitsch Advance"
  //   "which on previous speedruns I've called one of the cardinal sins"
  //     → "which in top-level play is called one of the cardinal sins"
  [/\bI['’]ve recommended\b/gi, 'the recommendation has been'],
  [/\bI['’]ve called\b/gi, 'is called'],
  // "— I've played it in semi-competitive games and it…" → drop the aside
  [/[,—\s]*\bI['’]ve (?:already )?played (?:it )?in [a-z\s-]*?games?\b/gi, ''],
  [/[,—\s]*\bI['’]ve (?:already )?played (?:it|this)?\s*(?:a lot|often|many times)?\b/gi, ''],
  // "I'm going to play my real stuff, the Fantasy Variation" → "The Fantasy Variation"
  [/\bI['’]m going to play my real stuff,\s*the\b/gi, 'This is the'],
  [/\bmy real stuff\b/gi, 'the main repertoire line'],
  // "in my game against Vidit" → "in a high-level game"
  [/\bin my game against [A-Z][a-z]+\b/gi, 'in a high-level game'],
  [/\bmy game against [A-Z][a-z]+\b/gi, 'a high-level game'],
  // "A big game against a very strong player" implies the pro's own game
  [/\bA big game against a very strong player\b/gi, 'A high-level game'],
  // first-person preference/opinion → depersonalized coaching
  [/\bI feel like a lot of people\b/gi, 'A lot of players'],
  [/\bI feel like playing ambitiously and really trying to punish\b/gi, 'The ambitious try is to punish'],
  [/\bI feel like playing it\b/gi, 'it is worth playing'],
  [/\bI like to play more tactically\s*—?\s*so pick and choose from his course/gi, 'the tactical treatment is a good practical choice'],
  [/\bI like to play this with White\s*—?/gi, 'A strong practical choice with White:'],
  [/\bI like to play e4 in such positions\b/gi, 'e4 is a natural try in such positions'],
  [/\bI (?:usually|often|always|like to) play\b/gi, 'a strong practical try is'],
  // "so pick and choose from his course" — references the pro's course
  [/,?\s*so pick and choose from his course/gi, ''],
  [/\bfrom his course\b/gi, ''],
  // narration self-reference
  [/\bAs I (said|showed|mentioned)\b/gi, (_m, v) => (v === 'showed' ? 'As shown' : 'As noted')],
];

/** Clean one spoken string; returns the depersonalized text (trimmed, tidy). */
export function depersonalize(text) {
  if (typeof text !== 'string' || !text) return text;
  let out = text;
  for (const [re, rep] of RULES) out = out.replace(re, rep);
  // tidy: collapse doubled spaces / stray " ," / leading punctuation left by a removal
  out = out
    .replace(/\s{2,}/g, ' ')
    .replace(/\s+([.,;:!?])/g, '$1')
    .replace(/\(\s*\)/g, '')
    .replace(/^[\s,;:–—-]+/, '')
    .trim();
  return out;
}

// Banned markers a gate can assert are absent from shipped voiced narration.
export const PERSONAL_MARKERS = [
  /\bspeedrun\b/i,
  /\bmy real stuff\b/i,
  /\bI feel like\b/i,
  /\bmy game against\b/i,
  /\bfrom his course\b/i,
  /\bAs I (said|showed|mentioned)\b/i,
];
