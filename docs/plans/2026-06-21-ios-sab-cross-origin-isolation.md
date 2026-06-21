# Plan — Option A: SharedArrayBuffer / cross-origin isolation on iOS (full threaded Stockfish)

**Status:** PLAN ONLY — no code touched until this map is approved.
**Author:** Claude (2026-06-21), at David's request ("full map of EVERY SINGLE code that
will need to be changed before you start").
**Depends on / builds atop:** B (asm.js engine for iOS, shipped `aa8ef36c`). A is
*additive* — if iOS isolation fails, the resolver falls back to B's asm.js engine, so
A cannot make things worse than B.

---

## Goal
Make the iOS Capacitor WKWebView **cross-origin isolated** so `crossOriginIsolated === true`
and `SharedArrayBuffer` is available → the **multi-threaded `stockfish-18-lite` (WASM)**
engine runs on iPhone (fast, full strength, and free of the `call_indirect` trap that only
afflicts the SAB-free single build).

## Why this is the long-term fix
PostHog (2026-06-21): 192× `RuntimeError: call_indirect to a signature that does not match`
on iPhone. The SAB-free single WASM build traps on WebKit; threaded builds need SAB which the
iOS WebView lacks. Giving the WebView SAB lets the threaded build (no call_indirect bug) run.

## Cross-origin-isolation requirements (the rules we must satisfy)
1. Top-level document served with **`Cross-Origin-Opener-Policy: same-origin`** +
   **`Cross-Origin-Embedder-Policy: require-corp`**.
2. Every **cross-origin subresource** must be CORS (for `fetch`) or carry
   **`Cross-Origin-Resource-Policy`** (for `no-cors` loads like `<img>`/`<script>`).
3. Safari does **not** support `COEP: credentialless` → must use strict `require-corp`.

---

## Cross-origin inventory (what must comply) — TRIPLE-CHECKED
The Capacitor app origin is `capacitor://app.chessacademy.pro`; everything below is
cross-origin from it.

| Resource | Type | Status under require-corp |
|---|---|---|
| `chess-academy-pro.vercel.app/api/*` (tts, llm-proxy, lichess-*, chesscom-games, audit-stream, phproxy) | `fetch` (cors) | **Already set `Access-Control-Allow-Origin`** in the api/*.ts handlers → OK, but AUDIT each (see §3) + add `Cross-Origin-Resource-Policy`. |
| `lichess.org/api`, `explorer.lichess.ovh`, `tablebase.lichess.ovh` | `fetch` (cors) | Lichess sends CORS → OK. |
| Stockfish engine workers (`/stockfish/*.js/.wasm`) | Worker (same-origin) | Same-origin → OK. Threaded build spawns pthread sub-workers (same-origin) → OK. |
| TTS audio | `fetch` bytes → MediaSource/ManagedMediaSource | NOT a cross-origin `<audio src>` — fed via fetched bytes → OK (cors on /api/tts). |
| External `<img>` | image subresource | **NONE found** — no hardcoded external `<img src>`; the many wikipedia/lichess/chesscom URLs in `src/` are citation strings in lesson `sources[]`, never loaded. |
| Fonts / CDN `<script>` | subresource | None loaded cross-origin at runtime (jsdelivr only used by node scripts, not the app). |

**Conclusion:** the only runtime cross-origin loads are `fetch()` calls, and the app's own
`/api/*` already emit CORS. So the COEP blast radius is small. The load-bearing work is the
**native header injection**, not app-wide resource surgery.

---

## THE FILE-BY-FILE CHANGE MAP

### ⚠️ §1 REALITY (researched 2026-06-21): this is an UNSOLVED Capacitor limitation
Capacitor issue **#6182 ("SharedArrayBuffer support")** is **closed, needs-reproduction, NO
accepted fix** — you cannot set top-level response headers in Capacitor iOS, and SAB needs COOP/
COEP on the initial HTML + every init asset. There is **no AppDelegate / config hook**. The ONLY
mechanism: **patch Capacitor's own native source** `node_modules/@capacitor/ios/Capacitor/
Capacitor/WebViewAssetHandler.swift` — at the `headers` dict (~line 49, currently just
`Content-Type` + `Cache-Control`) ADD:
```swift
headers["Cross-Origin-Opener-Policy"] = "same-origin"
headers["Cross-Origin-Embedder-Policy"] = "require-corp"
headers["Cross-Origin-Resource-Policy"] = "cross-origin"
```
so EVERY locally-served file carries them. Delivered via **`patch-package`** (postinstall) so it
survives `npm ci`; Capacitor 8 consumes `@capacitor/ios` from `node_modules` via SPM, so the patch
flows into `cap add ios`. **This patches a dependency's native code — invasive, must be re-verified
on every Capacitor upgrade.**

**Risk re-assessed (LOWER than feared):** all init-time resources (app JS/CSS/wasm, the Stockfish
workers) are SAME-ORIGIN (served by this same handler) → `require-corp` does NOT block them → no
white-screen at load. Cross-origin happens only at runtime (`/api/*`), already CORS+CORP (§3). And
if WKWebView still won't flip `crossOriginIsolated` on the `capacitor://` scheme → no SAB →
resolver falls back to asm (B) → no regression. Net: contained risk, degrades to B, **but the
"does WKWebView actually isolate" question is still device-verify-only.**

Setup needed: add `patch-package` devDep + `postinstall` hook + commit `patches/@capacitor+ios+8.1.0.patch`.

### 1. Native iOS — inject COOP/COEP on the served app (THE hard, uncertain part)
- **`ios-patches/App/AppDelegate.swift`** — add WKWebView setup that makes the served local
  content carry `Cross-Origin-Opener-Policy: same-origin` + `Cross-Origin-Embedder-Policy:
  require-corp`. Capacitor 8 serves local files via `CapacitorURLSchemeHandler` over the
  `capacitor://` scheme; there is **no built-in config for response headers**, so this needs a
  native override:
  - Option (i): a **custom `WKURLSchemeHandler`** (or subclass of Capacitor's) that adds the two
    headers to every local response, set on the `WKWebViewConfiguration` before the web view loads.
  - Option (ii): a tiny local-loopback/header shim. (i) is preferred.
- **`ios-patches/` (NEW file)** — if (i) needs a separate Swift class (e.g.
  `CrossOriginIsolationSchemeHandler.swift`), it lives here and is copied into `ios/App/App/` by
  the setup step.
- **`scripts/` setup:ios copy step** + **`.github/workflows/ios-testflight.yml`** — the workflow
  does `rm -rf ios && cap add ios`, regenerating the native project, then copies the AppDelegate
  patch. ANY new native file (the scheme handler) MUST be added to that copy step or it's lost on
  every CI build. **This is the #1 thing not to miss.**
- **`ios-patches/README.md`** — document the new patch so `cap sync` re-application is kept in sync.

> ⚠️ UNCERTAINTY: whether WKWebView flips `crossOriginIsolated = true` for headers served on the
> custom `capacitor://` scheme is **device-verify-only**. iOS 15.2+ supports COI, but on a custom
> scheme it must be validated on hardware. If it does NOT isolate → resolver falls back to asm (B).

### 2. App config
- **`capacitor.config.ts`** — confirm/extend the `ios` block; add any flag if Capacitor 8 exposes
  one (likely none → native patch carries it). No functional change expected beyond documentation.

### 3. Server — make every cross-origin `/api/*` response COEP-safe (low risk, mostly done)
Audit +, where missing, add `Access-Control-Allow-Origin` (echo origin) **and**
`Cross-Origin-Resource-Policy: cross-origin` to each:
- **`api/tts.ts`**, **`api/llm-proxy.ts`**, **`api/phproxy.ts`**, **`api/lichess-explorer.ts`**,
  **`api/lichess-cloud-eval.ts`**, **`api/lichess-game-export.ts`**, **`api/lichess-puzzle.ts`**,
  **`api/lichess-tablebase.ts`**, **`api/chesscom-games.ts`**, **`api/audit-stream.ts`**,
  **`api/ping.ts`** (most already set CORS — verify each; `ping`, `phproxy`, `llm-proxy` to confirm).
- **`vercel.json`** — already sets COOP+COEP on `/(.*)`. Add a `Cross-Origin-Resource-Policy:
  cross-origin` header block on `/api/(.*)` as belt-and-suspenders.

### 4. App engine selection — prefer threaded on iOS once isolated
- **`src/services/stockfishEngine.ts`** — in `resolveWorkerUrl()`, **reorder**: check
  `crossOriginIsolated && SharedArrayBuffer` FIRST (→ multi). Only if NOT isolated do we hit the
  `isIosSafari()` → asm fallback. (Today the iOS check short-circuits before the isolation check;
  it must yield to multi when SAB is genuinely present.) Keep asm as the iOS no-SAB fallback.
- **`src/services/stockfishEngine.test.ts`** — update/extend: iOS + isolated + SAB → `multi`;
  iOS + not isolated → `asm`.

### 5. App depth/perf — already correct, just verify
- **`src/services/coachGameEngine.ts`** — the `threaded` flag already keys off
  `SharedArrayBuffer && crossOriginIsolated`; once iOS is isolated it auto-uses full depth. **No
  change** — but re-verify the cap lifts on iOS post-isolation.

### 6. Build assets — already present
- Threaded engine `stockfish-18-lite.js/.wasm` already copied by `stockfish:copy`. No change.

---

## Validation (device-only; A cannot be proven from the sandbox)
1. TestFlight build → on iPhone, check PostHog:
   - `app-boot` / appBootAudit `crossOriginIsolated` → **true** (today it's false/null).
   - `stockfish_variant` → **`multi`** (today `single`/`asm`).
   - `stockfish-error` / `call_indirect` → **0**.
2. Regression sweep on device: TTS/voice still plays, coach chat works, lichess explorer loads,
   images render, no white-screen. (These are the require-corp risks.)
3. If `crossOriginIsolated` stays false → confirm graceful fallback to asm (B) — no crash.

## Risks & rollback
- **WKWebView won't isolate on custom scheme** → no SAB → falls back to asm (B). Safe.
- **A require-corp break** (some cross-origin resource lacks CORP/CORS) → that resource fails to
  load. Mitigated by §3 audit; rollback = revert the native header patch (one file).
- **Native patch lost on cap sync** → covered by §1 workflow copy step.

## Sequencing
1. §3 server CORS/CORP audit (safe, shippable independently, no behavior change).
2. §4/§5 resolver reorder (safe — only activates multi when SAB is actually present, which it
   isn't until §1 lands; until then identical to today).
3. §1 native header injection (the real change) → TestFlight → §Validation.
4. If isolated: done (multi on iPhone). If not: asm fallback stands; investigate scheme-handler.

## Triple-check addenda (second/third pass — things that COULD have been missed)
- **`vite.config.ts` ALREADY sets `COOP: same-origin` + `COEP: require-corp`** on the dev AND
  preview servers (lines ~219-227). So **the entire web side is already cross-origin isolated**
  (prod via `vercel.json`, dev/preview via vite) — that's why desktop runs multi today. **A is
  therefore PURELY the iOS-native gap + the resolver reorder.** No vite/vercel header change needed.
- **Service worker (VitePWA + workbox)** — precache is **same-origin only**
  (`globPatterns: js/css/html/ico/png/svg/woff2`), `/api/` + `/voice-packs/` are navigation-deny-
  listed, and **desktop already runs SW + COEP + multi successfully** → the SW/PWA config is proven
  COEP-compatible. **VERIFY** runtimeCaching has no cross-origin opaque (no-cors) entry; expected
  **no change**. (NB: WKWebView SW support is limited, so the SW may not even be active in the iOS
  app — web-only concern, already proven safe.)
- **CapacitorHttp / `@capacitor/http`** — **not used**; all HTTP is browser `fetch` → subject to
  COEP/CORS → covered by §3.
- **`index.html`** — no engine/worker bootstrapping, no `coi-serviceworker` shim → **no change**.
- **`lila-bridge.worker.js` / sf16-7** — only used by the `lila` variant; A uses `multi`, so N/A.

## NOT changing (verified out of scope)
- No external `<img>`/font/script surgery (none exist).
- TTS pipeline (fetch+MSE, already compliant).
- Desktop/Android engine paths (already multi / WASM-single, unaffected).
