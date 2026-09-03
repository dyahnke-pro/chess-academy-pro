/**
 * THE SHIPPED ENGLISH CONTENT MUST NOT FLIP THE VOICE.
 *
 * `/api/tts` runs `detectVoiceForText` over every passage and, when it thinks
 * the text is foreign, SWAPS the voice (api/tts.ts:228). So a false positive on
 * English narration does not mispronounce a word — it reads the entire passage
 * in a foreign accent.
 *
 * This has now been reported twice by David, from two different causes:
 *
 *   2026-08-28 — a single German umlaut in a NAME (Grünfeld, König, Réti) was
 *   enough. Fixed by requiring function-word corroboration.
 *
 *   2026-09-03 — "still hearing a european accent … under the opening tab".
 *   The corroboration requirement was satisfied by plain English words sitting
 *   in the stopword lists: Turkish `at` (horse), Portuguese `no`, Italian
 *   `come`, Polish `ten`. Two occurrences cleared the bar, and ordinary chess
 *   prose says "aimed AT g7 … the queen AT f7" constantly. 75 shipped passages
 *   were affected — most of the openings tab among them.
 *
 * Both fixes were to the heuristic, and both were verified by hand against a
 * few strings. Neither would have caught the other. THIS is the check that
 * would have caught both: run the real detector over the real shipped prose and
 * require silence. A heuristic tuned only against hand-picked examples is
 * tuned against the examples someone already thought of.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { detectVoiceForText } from './ttsLang';

const DATA = resolve(__dirname, '../../src/data');

/** Speech-bearing content the coach reads aloud. */
const SPOKEN_CONTENT = [
  'repertoire.json',
  'pro-repertoires.json',
  'middlegame-plans.json',
  'common-mistakes.json',
  'opening-book-pages.json',
  'chess-concepts.json',
  'model-games.json',
  'endgame-principles.json',
  'mating-patterns.json',
  'gambit-plans.json',
  'anti-openings.json',
  'checkpoint-quizzes.json',
];

function collectStrings(node: unknown, out: string[], depth = 0): void {
  if (depth > 10) return;
  if (typeof node === 'string') {
    // Only real prose: a SAN token or an id can't carry a language signal.
    if (node.length > 25 && /\s/.test(node)) out.push(node);
    return;
  }
  if (Array.isArray(node)) {
    for (const v of node) collectStrings(v, out, depth + 1);
    return;
  }
  if (node && typeof node === 'object') {
    for (const v of Object.values(node)) collectStrings(v, out, depth + 1);
  }
}

describe('shipped English narration keeps the English voice', () => {
  it('no shipped passage is detected as a foreign language', () => {
    const offenders: string[] = [];
    let scanned = 0;

    for (const file of SPOKEN_CONTENT) {
      const path = resolve(DATA, file);
      if (!existsSync(path)) continue;
      let parsed: unknown;
      try {
        parsed = JSON.parse(readFileSync(path, 'utf8'));
      } catch {
        continue;
      }
      const strings: string[] = [];
      collectStrings(parsed, strings);
      for (const text of strings) {
        scanned += 1;
        const voice = detectVoiceForText(text);
        if (voice) offenders.push(`${file} → ${voice.languageCode}: "${text.slice(0, 140)}"`);
      }
    }

    // A gate that scans nothing passes for the wrong reason.
    expect(scanned, 'no content was scanned — the data paths moved').toBeGreaterThan(5000);
    expect(
      offenders.slice(0, 12),
      `${offenders.length} English passage(s) would be spoken in a foreign voice`,
    ).toEqual([]);
  });

  // 🔒 VACUITY GUARD. The check above is trivially satisfiable by making the
  // detector always return null — which would silently un-fix the original bug
  // it exists to support (12 languages read aloud by an American voice). Real
  // foreign sentences must still be caught, so "fixing" a failure by disabling
  // detection fails here instead.
  it('still detects genuinely foreign passages', () => {
    const cases: [string, string][] = [
      ['tr-TR', 'Bu satranç açılışında bir fil ve at ile şah çekmek için hamle yapılır.'],
      ['fr-FR', 'Le cavalier est pour contrôler le centre avec les pièces qui dans une partie.'],
      ['es-ES', '¿Por qué el caballo va al centro? Porque las piezas necesitan espacio en el tablero.'],
      ['de-DE', 'Der Läufer ist nicht gut, und das Zentrum kann eine wichtige Rolle spielen.'],
      ['ru-RU', 'Конь идёт в центр, потому что там он контролирует больше полей.'],
      ['ja-JP', 'ナイトを中央に置くと、より多くのマスを支配できます。'],
    ];
    for (const [expected, text] of cases) {
      expect(detectVoiceForText(text)?.languageCode, `should detect ${expected}: ${text}`).toBe(expected);
    }
  });
});
