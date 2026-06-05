# RPG capture sounds

Per-piece capture sounds for `/rpg-demo`. Today they're **synthesized** at
runtime (Web Audio) in `src/components/Rpg/rpgSfx.ts` — distinct voices per
piece, with a horse whinny when a knight (rider) is taken.

## Dropping in real recorded sounds

To replace a synth voice with a real clip (a human groan, a horse whinny, …):

1. Drop an audio file here, e.g. `whinny.mp3`, `king-groan.mp3`.
2. Map it in `CAPTURE_SAMPLES` in `rpgSfx.ts`, keyed by piece letter:
   ```ts
   const CAPTURE_SAMPLES = {
     n: '/rpg/sfx/whinny.mp3',     // knight  → horse whinny
     k: '/rpg/sfx/king-groan.mp3', // king
     // p r b q …
   };
   ```
3. Any piece without a mapped sample keeps using the synth.

Keep clips short (< ~1s), and prefer CC0 / CC-BY sources (Kenney, OpenGameArt,
freesound CC0) — credit CC-BY sources here if used.
