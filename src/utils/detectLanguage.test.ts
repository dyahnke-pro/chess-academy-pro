import { describe, it, expect } from 'vitest';
import {
  detectLanguage,
  SCRIPT_RANGES,
  LANG_NAME,
  LANG_NATIVE_LABEL,
  type LangCode,
} from './detectLanguage';

// The 2026-07-11 fidelity-trip cluster: English chess asks were misdetected
// as Portuguese/Italian (bare articles + the lowercased "O-O" castling
// token), forcing a pointless phrasing/translation call whose invented
// numbers the net then refused. English now competes; castling is stripped.

describe('detectLanguage — English chess asks stay English', () => {
  it('castling notation never reads as the Portuguese article', () => {
    expect(detectLanguage('Should I castle O-O or take, as Black?').code).toBe('en');
    expect(detectLanguage('is o-o-o better than o-o here').code).toBe('en');
  });

  it('English sentences with incidental foreign-looking articles stay English', () => {
    expect(detectLanguage('what about a rook lift as an alternative?').code).toBe('en');
    expect(detectLanguage('why is Nf3 better than the others, what about a bishop move').code).toBe('en');
    expect(detectLanguage('take a look at the los angeles game').code).toBe('en');
  });

  it('still detects genuine non-English asks', () => {
    expect(detectLanguage('¿Cuál es la mejor jugada en esta posición?').code).toBe('es');
    expect(detectLanguage('Quel est le meilleur coup pour les blancs ici ?').code).toBe('fr');
    expect(detectLanguage('Was ist der beste Zug, und warum ist die Dame gut?').code).toBe('de');
    expect(detectLanguage('Qual é o melhor lance para as pretas?').code).toBe('pt');
    expect(detectLanguage('Какой ход лучший?').code).toBe('ru');
  });

  it('accent fingerprints still confirm short non-English strings', () => {
    expect(detectLanguage('¿mejor?').code).toBe('es');
    expect(detectLanguage('warum äußerst?').code).toBe('de');
  });

  it('defaults to English on empty / notation-only input', () => {
    expect(detectLanguage('').code).toBe('en');
    expect(detectLanguage('Nf3 Nc6 Bb5').code).toBe('en');
    expect(detectLanguage(undefined).code).toBe('en');
  });
});

describe('detectLanguage — the script table', () => {
  // 🔒 A MISSING ROW HERE IS FOUR BUGS ON FOUR SURFACES (2026-09-19). A real
  // App Store user asked for a lesson seven times in Thai and never got one:
  // nothing downstream was broken, this function simply answered "English" and
  // every translate/route branch correctly did nothing. Nine writing systems
  // were invisible the same way.
  const SAMPLES: ReadonlyArray<readonly [LangCode, string, string]> = [
    ['th', 'Thai', 'สอนฉันเปิดเกมอิตาลี'],
    ['he', 'Hebrew', 'למד אותי'],
    ['el', 'Greek', 'Δίδαξέ μου'],
    ['bn', 'Bengali', 'আমাকে শেখান'],
    ['ta', 'Tamil', 'எனக்கு கற்றுக்கொடு'],
    ['te', 'Telugu', 'నాకు నేర్పండి'],
    ['kn', 'Kannada', 'ನನಗೆ ಕಲಿಸಿ'],
    ['ml', 'Malayalam', 'എന്നെ പഠിപ്പിക്കൂ'],
    ['gu', 'Gujarati', 'મને શીખવો'],
    ['pa', 'Punjabi', 'ਮੈਨੂੰ ਸਿਖਾਓ'],
    ['or', 'Odia', 'ମୋତେ ଶିଖାନ୍ତୁ'],
    ['si', 'Sinhala', 'මට උගන්වන්න'],
    ['lo', 'Lao', 'ສອນຂ້ອຍ'],
    ['km', 'Khmer', 'បង្រៀនខ្ញុំ'],
    ['my', 'Burmese', 'ကျွန်တော့်ကို သင်ပေးပါ'],
    ['ka', 'Georgian', 'მასწავლე'],
    ['hy', 'Armenian', 'սովորեցրու ինձ'],
    ['am', 'Amharic', 'አስተምረኝ'],
    ['dv', 'Dhivehi', 'އަހަރެންނަށް'],
    ['bo', 'Tibetan', 'ང་ལ་སློབ'],
    // The six that always worked — proof the table did not lose one.
    ['ru', 'Russian', 'какой лучший ход'],
    ['ar', 'Arabic', 'ما هو أفضل نقلة'],
    ['hi', 'Hindi', 'मुझे सिखाओ'],
    ['ko', 'Korean', '가르쳐줘'],
    ['ja', 'Japanese', 'いちばんいい手は'],
    ['zh', 'Chinese', '最好的一步棋是什么'],
  ];

  for (const [code, name, sample] of SAMPLES) {
    it(`${name} is detected, named and marked non-English`, () => {
      expect(detectLanguage(sample)).toEqual({ code, name, nonEnglish: true });
    });
  }

  it('Vietnamese is not answered as French', () => {
    // Its tone marks live in Latin Extended Additional, which the French accent
    // fingerprint would otherwise claim — so a Vietnamese ask used to be
    // translated, and replied to, in French.
    expect(detectLanguage('Dạy tôi khai cuộc Ý').code).toBe('vi');
    expect(detectLanguage('Nước đi nào tốt nhất?').code).toBe('vi');
  });

  it('Dutch, Polish and Turkish are detectable, not just choosable', () => {
    // All three were offered in the narration-language picker while being
    // impossible to detect — the same drift, in the other direction.
    expect(detectLanguage('Leer mij de beste zet voor wit').code).toBe('nl');
    expect(detectLanguage('Naucz mnie włoskiego otwarcia').code).toBe('pl');
    expect(detectLanguage('İtalyan açılışını öğret bana').code).toBe('tr');
  });

  it('no two script ranges overlap, so their ORDER is never load-bearing', () => {
    // Kana-before-Han is deliberate and does not overlap; anything else that
    // overlapped would make this table silently order-dependent, which is how a
    // future row lands in the wrong language with every test still green.
    const collisions: string[] = [];
    for (let cp = 0x0300; cp <= 0xffff; cp++) {
      const ch = String.fromCharCode(cp);
      const hits = SCRIPT_RANGES.filter(([re]) => re.test(ch)).map(([, c]) => c);
      if (hits.length > 1) collisions.push(`U+${cp.toString(16)} → ${hits.join(',')}`);
    }
    expect(collisions).toEqual([]);
  });

  it('every language the picker offers can also be named for the model', () => {
    // The picker reads LANG_NATIVE_LABEL; the model instruction reads
    // LANG_NAME. Both are Record<LangCode,…>, so this asserts the join rather
    // than the completeness TypeScript already guarantees.
    for (const code of Object.keys(LANG_NATIVE_LABEL) as LangCode[]) {
      expect(LANG_NAME[code], code).toBeTruthy();
    }
  });
});
