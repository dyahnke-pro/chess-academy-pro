// THE ONE WAY A COACH LINE REACHES THE VOICE (David 2026-09-24: "everything
// built needs to be deterministic, worded by the dna, and handed to LLM").
//
// Every line the Learn surface speaks is computed and worded in code; this hands
// it through `voiceFacts` — the single G0 chokepoint — before the voice. With
// `preferRaw` the chokepoint speaks the computed prose as-is (it only strips
// internal labels and eye-notation), so no model is asked and nothing can drift;
// the day a phrasing pass is wanted, it is switched on HERE, once, for all of
// them. `forced` is REQUIRED so no call site inherits a voice-toggle posture it
// never chose. Gate: `src/test/speakComputedOnly.test.ts`.
import { voiceFacts } from './coachApi';
import { voiceService } from './voiceService';

export async function speakComputed(
  text: string,
  opts: { forced: boolean; intent: string },
): Promise<void> {
  if (!text.trim()) return;
  let voiced = text;
  try {
    voiced = (await voiceFacts(text, { preferRaw: true, intent: opts.intent })) ?? text;
  } catch {
    voiced = text;
  }
  if (!voiced.trim()) return;
  return opts.forced ? voiceService.speakForced(voiced) : voiceService.speak(voiced);
}
