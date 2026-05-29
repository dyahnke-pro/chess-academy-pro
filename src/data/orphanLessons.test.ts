// Orphan-Lesson Gate (David 2026-05-29, locked).
//
// Catches two failure modes that silently mis-route the UI:
//
// 1. VARIATION_LESSONS key without a matching variation in
//    pro-repertoires.json → the lesson is dead code (never reaches the
//    UI). Hit this session with Najdorf Bc4 Sozin: the LessonScript was
//    registered but pro-repertoires.json had only 3 Najdorf variations.
//
// 2. pro-repertoires.json variation without a matching VARIATION_LESSONS
//    key → falls through to the legacy WalkthroughMode (smaller board +
//    eval bar) instead of the consistent bigger-board PlayableLinePlayer.
//
// Both directions must hold. Test walks the LESSON registry +
// pro-repertoires.json and asserts every key→variation and
// variation→key pair lines up.

import { describe, it, expect } from 'vitest';
import { getAllVariationLessonKeys, getVariationLessonScript } from './lessons/index';
import proRepertoires from './pro-repertoires.json' assert { type: 'json' };

interface ProRepEntry {
  id: string;
  variations?: Array<{ name: string }>;
}

const PRO_OPENINGS: ProRepEntry[] = (proRepertoires.openings as ProRepEntry[]).filter(
  (op) => op.id.startsWith('pro-'),
);

describe('orphan-lesson gate — VARIATION_LESSONS ↔ pro-repertoires.json', () => {
  it('every VARIATION_LESSONS key has a matching variation in pro-repertoires.json', () => {
    const orphans: string[] = [];
    for (const key of getAllVariationLessonKeys()) {
      // Keys look like 'pro-naroditsky-kia::vs ...e5 (Reti gambit)'
      const [openingId, variationName] = key.split('::');
      if (!openingId || !variationName) {
        orphans.push(`${key} :: malformed key (expected '<openingId>::<variationName>')`);
        continue;
      }
      // Only enforce on pro-rep openings (the M-side has its own systems).
      if (!openingId.startsWith('pro-')) continue;
      const opening = PRO_OPENINGS.find((op) => op.id === openingId);
      if (!opening) {
        orphans.push(`${key} :: opening '${openingId}' not in pro-repertoires.json`);
        continue;
      }
      const variation = (opening.variations ?? []).find((v) => v.name === variationName);
      if (!variation) {
        orphans.push(
          `${key} :: variation '${variationName}' not in pro-repertoires.json variations[]. Available: [${(opening.variations ?? []).map((v) => `'${v.name}'`).join(', ')}]`,
        );
      }
    }
    expect(orphans).toEqual([]);
  });

  // Baseline of known-orphan (variation in JSON without a lesson) entries
  // grandfathered as of 2026-05-29 — Gothamchess pro-rep is a partial
  // build (variations declared but lessons not yet authored), and 3
  // Fantasy Caro sub-variations declare without scripts. This list can
  // ONLY SHRINK — new orphans cannot be added. When a lesson is
  // authored for a baseline entry, drop the entry from the set; the
  // test still passes.
  const BASELINE_MISSING_LESSONS = new Set<string>([
    'pro-gothamchess-anti-sicilian::Accelerated Pawn Storm (Carlsen-inspired)',
    'pro-gothamchess-anti-sicilian::Rossolimo 3.Bb5 e6',
    'pro-gothamchess-anti-sicilian::Rossolimo 3.Bb5 g6',
    'pro-gothamchess-caro-advance-white::Main line (vs …Bf5)',
    'pro-gothamchess-caro-advance-white::vs …c5 (Botvinnik-Carls)',
    'pro-gothamchess-caro-kann::Advance Variation 3.e5 Bf5',
    'pro-gothamchess-caro-kann::Advance Variation 3.e5 c5',
    'pro-gothamchess-caro-kann::Classical 4...Bf5 (Main Line)',
    'pro-gothamchess-caro-kann::Classical Capablanca 4...Bf5 5.Ng3 Bg6 6.h4',
    'pro-gothamchess-caro-kann::Exchange Variation 3.exd5',
    'pro-gothamchess-caro-kann::Fantasy Variation 3.f3',
    'pro-gothamchess-caro-kann::Panov-Botvinnik Attack 3.exd5 cxd5 4.c4',
    'pro-gothamchess-caro-kann::Tartakower / Two Knights 3...Nf6',
    'pro-gothamchess-caro-kann::Two Knights 2.Nc3 d5 3.Nf3 Bg4',
    'pro-gothamchess-closed-sicilian::Closed Sicilian Main',
    'pro-gothamchess-english::Anti-French (…e6)',
    'pro-gothamchess-english::Botvinnik System vs KID-setup',
    'pro-gothamchess-english::Symmetric (…c5)',
    'pro-gothamchess-english::Symmetric (…e5)',
    'pro-gothamchess-fantasy-caro::Aggressive 3...g6',
    'pro-gothamchess-fantasy-caro::Main Line 3...dxe4 4.fxe4',
    'pro-gothamchess-fantasy-caro::Solid 3...e6',
    'pro-gothamchess-french-defense::Exchange (exd5 lines)',
    'pro-gothamchess-french-defense::Rubinstein Main Line',
    'pro-gothamchess-french-defense::Tarrasch (Nd2)',
    'pro-gothamchess-italian::Evans Gambit',
    'pro-gothamchess-italian::Giuoco Piano c3-d4',
    'pro-gothamchess-italian::Slow Italian d3',
    'pro-gothamchess-kia::vs Sicilian (KIA vs …c5 + …Nf6)',
    'pro-gothamchess-kia::vs …d5 + …c5',
    'pro-gothamchess-london::Aggressive Jobava-London Hybrid',
    'pro-gothamchess-london::Standard Setup vs d5',
    "pro-gothamchess-london::vs King's Indian (Bh6 + Opposite-Side Castle Attack)",
    'pro-gothamchess-milner-barry::Anti-French 3.e5 Advance',
    'pro-gothamchess-milner-barry::Black Declines with Bd7',
    'pro-gothamchess-milner-barry::Main Gambit Line',
    'pro-gothamchess-pirc-defense::150 Attack (Be3 + f3)',
    'pro-gothamchess-pirc-defense::Austrian Attack (f4)',
    'pro-gothamchess-pirc-defense::Classical (Nf3 setup)',
    'pro-gothamchess-ponziani::3...d5 Central Counter',
    'pro-gothamchess-ponziani::Main Line 3...Nf6 4.d4',
    'pro-gothamchess-qgd::Classical 5.Bf4 Line',
    'pro-gothamchess-qgd::Exchange Variation',
    'pro-gothamchess-scandinavian::2...Nf6 Scandinavian',
    'pro-gothamchess-scandinavian::Main Line Qa5',
    'pro-gothamchess-stafford-refute::4...dxc6 5.e5 Line',
    'pro-gothamchess-stafford-refute::Main Refutation d3',
    'pro-gothamchess-trompowsky::Main line vs …e6',
    'pro-gothamchess-trompowsky::Vaganian Attack (…Ne4)',
    'pro-gothamchess-trompowsky::…d5 system',
    'pro-gothamchess-trompowsky::…g6 fianchetto',
    'pro-gothamchess-vienna::Vienna Gambit Main Line',
    'pro-gothamchess-vienna::Vienna Quiet (Bc4 + d3)',
    'pro-gothamchess-vienna::Vienna with …Nc6 + …Bc5',
    'pro-naroditsky-fantasy-caro::Black accepts with dxe4',
    'pro-naroditsky-fantasy-caro::Modern setup with g6',
    'pro-naroditsky-fantasy-caro::Qb6 pressure sideline',
  ]);

  it('every pro-rep variation in pro-repertoires.json has a matching VARIATION_LESSONS key (NEW orphans blocked; baseline shrinks only)', () => {
    const missingLessons: string[] = [];
    for (const opening of PRO_OPENINGS) {
      for (const v of opening.variations ?? []) {
        if (!getVariationLessonScript(opening.id, v.name)) {
          missingLessons.push(`${opening.id}::${v.name}`);
        }
      }
    }
    const novel = missingLessons.filter((k) => !BASELINE_MISSING_LESSONS.has(k));
    expect(novel).toEqual([]);
    // Baseline can only shrink — block growth even if all current
    // entries are still baselined.
    expect(missingLessons.length).toBeLessThanOrEqual(BASELINE_MISSING_LESSONS.size);
  });

  it('baseline orphans only shrink — every baseline entry must still be missing (no stale exemptions)', () => {
    const stale: string[] = [];
    for (const baselineKey of BASELINE_MISSING_LESSONS) {
      const [openingId, variationName] = baselineKey.split('::');
      if (getVariationLessonScript(openingId, variationName)) {
        stale.push(`${baselineKey} — lesson now exists, drop from BASELINE_MISSING_LESSONS`);
      }
    }
    expect(stale).toEqual([]);
  });
});
