# Android native patches

Mirror of `ios-patches/`. Files here are copied into the
Capacitor-generated `android/` directory by `npm run setup:android`
after `npx cap sync android`, so our custom native edits stay out of
the ephemeral, gitignored `android/` build output and survive a
from-scratch regen.

> **Status:** Android has never been generated or tested on a device
> (store-readiness GAP 2/3). These patches are the *intended* native
> config; they must be verified on a real Android phone before the
> Play Store build. The highest-risk surface is the WebView
> microphone — Android `WebView` does not grant `getUserMedia` / Web
> Speech mic access by default the way the patched iOS shell does.

## Files

### `app/src/main/AndroidManifest.xml`
Adds the permissions the app needs that Capacitor's default manifest
omits:
- `INTERNET` — AI coach, TTS, game import (Capacitor includes this by
  default, listed for completeness).
- `RECORD_AUDIO` — microphone for voice chat with the coach
  (`voiceInputService`, `VoiceChatMic`).
- `MODIFY_AUDIO_SETTINGS` — lets the app manage the audio route so
  streaming Polly TTS plays reliably (the Android twin of the iOS
  `AVAudioSession` patch in `ios-patches/`).

> This is a **reference fragment**, not a drop-in replacement. After
> `cap add android`, merge these `<uses-permission>` lines into the
> generated `android/app/src/main/AndroidManifest.xml` (the generated
> file also carries the `<application>`/`<activity>` block, which we
> don't override). `setup:android` does a guarded merge — see the
> script comment.

### `app/src/main/java/.../MainActivity.java`
Grants the WebView microphone permission request at runtime. Without
overriding `onPermissionRequest`, Android's WebView denies
`getUserMedia({ audio: true })` by default and voice chat silently
fails. Also requests the OS-level `RECORD_AUDIO` runtime permission on
first use.

> The package path under `java/` must match `appId`
> (`com.chessacademy.pro` → `java/com/chessacademy/pro/MainActivity.java`).
> Capacitor generates this file; copy our version over it after sync.

## Applying

```
npx cap add android      # skip if android/ already exists
npx cap sync android     # regenerates the native project
# then merge the manifest perms + copy MainActivity (see setup:android)
```

## Device QA checklist (run before any Play Store upload)
1. **Mic / voice chat** — `webkitSpeechRecognition` in the Android
   WebView. If unreliable, fall back to a native plugin
   (`@capacitor-community/speech-recognition`).
2. **Streaming TTS** — `/api/tts` → MediaSource progressive playback;
   verify codec support + autoplay-after-gesture.
3. **Stockfish WASM** worker (eval bar / analysis).
4. **IndexedDB (Dexie)** persistence + storage-quota eviction.
5. **Back button / gesture** — handled in-app by
   `useAndroidBackButton` (web layer); confirm it steps up routes and
   minimizes (not exits) at the root.
6. **Safe-area / notch insets** top and bottom.
