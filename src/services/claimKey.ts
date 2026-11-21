/** THE ONE SAY-ONCE CLAIM KEY (U2, 2026-11-21). A claim's key in the spoken
 *  ledger, namespaced with a colon `voicePackage.sayKey` never produces, so a
 *  claim can never collide with a sentence. A leaf (no imports) so the method
 *  beat, which may not import the voice package (a cycle through the deciding
 *  door), keys its habits through the same function instead of a copy. */
export const claimKey = (c: string): string => `claim:${c}`;
