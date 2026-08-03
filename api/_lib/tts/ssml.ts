/**
 * SSML construction, shared by every TTS provider.
 *
 * Lifted out of `api/tts.ts` unchanged when the provider seam landed. It lives
 * here because the SSML document must be built by the PROVIDER, not by the
 * endpoint: whether a voice accepts SSML is a vendor fact. Google's Chirp3
 * voices take plain text only, so handing them a pre-built `<speak>` document
 * would have them read the markup aloud.
 *
 * Tag support differs by engine class:
 *   - GENERATIVE voices support structural tags only (<speak>, <p>, <s>, …).
 *     They infer pacing and emotion from context, so we add paragraph structure
 *     and nothing else.
 *   - NEURAL voices support prosody / break / emphasis. `<prosody rate>` and
 *     `<prosody pitch>` are tuned per personality so one voice can sound
 *     gentler for soft, clipped for drill-sergeant, and so on.
 *
 * Plain text is always a safe fallback — SSML is opt-in.
 */

/** All-ages contract (David 2026-06-28): no 'flirtatious' style. */
export type PersonalityStyle = 'default' | 'soft' | 'edgy' | 'drill-sergeant';

export const NEURAL_PROSODY_BY_STYLE: Record<PersonalityStyle, { rate: string; pitch?: string; volume?: string }> = {
  // Default: mild slowdown for warmth.
  default: { rate: '95%' },
  // Soft: gentler, slightly slower.
  soft: { rate: '92%', volume: 'soft' },
  // Edgy: faster, sharper. Slight pitch lift for cutting tone.
  edgy: { rate: '105%', pitch: '+2%' },
  // Drill sergeant: crisp, loud, no slowdown.
  'drill-sergeant': { rate: '108%', volume: 'x-loud' },
};

export function escapeForSsml(text: string): string {
  // Strip codepoints illegal in XML 1.0 BEFORE escaping. A single control char
  // or lone surrogate anywhere in the passage makes the vendor reject the whole
  // request (Polly: InvalidSsmlException => 500 => the client falls over to iOS
  // Web Speech, which is silent in a standalone PWA). The five-char escape
  // alone is NOT enough; client-side sanitizers / pasted content can introduce
  // these silent killers. Filter by codepoint, then escape the XML-five.
  let out = "";
  for (const ch of text) {
    const c = ch.codePointAt(0)!;
    // Allow tab/newline/CR; drop the rest below U+0020.
    if (c < 0x20 && c !== 0x09 && c !== 0x0a && c !== 0x0d) continue;
    // Drop the non-characters U+FFFE / U+FFFF.
    if (c === 0xfffe || c === 0xffff) continue;
    // Lone surrogates (U+D800-U+DFFF) never reach here: the for..of iterator
    // yields whole code points, so unpaired surrogates surface as U+FFFD
    // (replacement char), which is valid XML. Belt-and-suspenders: drop them.
    if (c >= 0xd800 && c <= 0xdfff) continue;
    out += ch;
  }
  return out
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

/**
 * Wrap plain coaching text in engine-appropriate SSML for natural inflection.
 *
 * @param style — optional personality string for prosody tuning. When absent,
 *   falls back to the default 'rate=95%'.
 * @param prosodyMode — '#25' decisive-beat spike, composed OVER the personality
 *   base (never a new register).
 */
export function buildSsmlForEngine(text: string, engine: string, style?: string, prosodyMode?: string): string {
  const escaped = escapeForSsml(text);
  if (engine === 'generative') {
    // Generative engines don't honor prosody — paragraph wrap is the only safe
    // enrichment. The engine handles emotion / pacing on its own. (The #25
    // spike is therefore a documented no-op here.)
    return `<speak><p>${escaped}</p></speak>`;
  }
  const personality = (style ?? 'default') as PersonalityStyle;
  const prosody = NEURAL_PROSODY_BY_STYLE[personality] ?? NEURAL_PROSODY_BY_STYLE.default;
  // Decisive-beat SPIKE (#25, David 2026-07-11 approval): a slight lift on the
  // payoff lines ("You called it", the brilliancy stems). Composed OVER the
  // personality base — rate +8 points, pitch +6%.
  let rate = prosody.rate;
  let pitch = prosody.pitch;
  if (prosodyMode === 'spike') {
    const baseRate = Number.parseInt(prosody.rate, 10);
    rate = `${Number.isFinite(baseRate) ? Math.min(baseRate + 8, 130) : 103}%`;
    pitch = '+6%';
  }
  const attrs = [
    `rate="${rate}"`,
    pitch ? `pitch="${pitch}"` : '',
    prosody.volume ? `volume="${prosody.volume}"` : '',
  ].filter(Boolean).join(' ');
  return `<speak><prosody ${attrs}><p>${escaped}</p></prosody></speak>`;
}
