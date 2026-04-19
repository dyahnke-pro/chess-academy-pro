# iOS native patches

Files here are copied into the Capacitor-generated `ios/` directory by
the `npm run setup:ios` script after every `npx cap sync ios`. Keeps
our custom native code out of the ephemeral `ios/` build output so
`ios/` can be regenerated from scratch without losing patches.

## Files

### `App/AppDelegate.swift`

Overrides Capacitor's default AppDelegate to configure
`AVAudioSession` for Polly TTS + Web Speech mic input. Required for
voice to work reliably on iOS when:

- A Bluetooth headset is connected (default session category silences
  Web Audio when BT audio is routed out)
- The iPhone ringer switch is flipped on (default category honours
  silent mode; `.playAndRecord` with `.defaultToSpeaker` overrides)

Without this patch, Polly TTS fails silently in those conditions and
the student sees / hears nothing. See `src/services/voiceService.ts`
for the web-side fallback chain that kicks in when Polly drops.

## Applying

Handled automatically by `npm run setup:ios` (see `package.json`):

```
npx cap add ios          # skip if ios/ already exists
npx cap sync ios         # regenerates ios/App/App/AppDelegate.swift
cp ios-patches/App/AppDelegate.swift ios/App/App/AppDelegate.swift
```

Re-run the script after every `cap sync` — the copy step idempotently
re-applies the patch.

## Adding a new patch

1. Create the file under the matching path inside `ios-patches/`
2. Update `setup:ios` in `package.json` to copy it
3. Note the reason in this README so the next developer knows why
