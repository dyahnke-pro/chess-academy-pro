# Shipping to TestFlight from CI (no local Xcode archive)

The TestFlight app ships the web bundle **baked in** (Capacitor, no
`server.url`), so a Vercel deploy does NOT reach phone testers — only a new
native build does. This workflow makes that build a single trigger on a macOS
runner instead of a manual Xcode archive.

**Trigger:** Actions → **iOS → TestFlight** → Run workflow. (Or a Claude Code
session can dispatch it once the secrets below exist.)

The runner does: `npm ci` → `npm run build` → `assets:generate` →
`cap add ios` + `cap sync ios` → apply the AppDelegate patch →
`fastlane ios beta` (signs, builds, uploads to TestFlight).

## One-time setup

Apple still has to mint the credentials once; after that CI is hands-off.

### 1. App Store Connect API key (auth for signing + upload)

App Store Connect → **Users and Access → Integrations → App Store Connect API**
→ generate a key with the **App Manager** role. Download the `.p8` (one-time).

Add repo secrets (Settings → Secrets and variables → Actions):

| Secret | Value |
| --- | --- |
| `APP_STORE_CONNECT_API_KEY_ID` | the key's Key ID |
| `APP_STORE_CONNECT_API_ISSUER_ID` | the Issuer ID (top of the Keys page) |
| `APP_STORE_CONNECT_API_KEY` | **base64** of the `.p8` — `base64 -i AuthKey_XXXX.p8 \| pbcopy` |

### 2. Signing via Fastlane match (run ONCE on your Mac)

`match` stores the distribution cert + appstore provisioning profile encrypted
in a **private** git repo, so CI never mints certificates.

```bash
# in this repo, on your Mac:
bundle install
# create a PRIVATE repo for the certs first (e.g. dyahnke-pro/ios-certs), then:
bundle exec fastlane match appstore \
  --git_url https://github.com/dyahnke-pro/ios-certs.git \
  --app_identifier com.chessacademy.pro
# pick a strong passphrase when prompted — that's MATCH_PASSWORD.
```

Add repo secrets:

| Secret | Value |
| --- | --- |
| `MATCH_GIT_URL` | `https://github.com/dyahnke-pro/ios-certs.git` |
| `MATCH_PASSWORD` | the passphrase you chose above |
| `MATCH_GIT_BASIC_AUTHORIZATION` | `base64` of `dyahnke-pro:<PAT>` for read access to the certs repo — `printf 'dyahnke-pro:ghp_xxx' \| base64` (a fine-grained PAT with Contents:Read on the certs repo) |

That's it. After this, every TestFlight build is: **Run workflow** → ~15 min →
the build appears in TestFlight (internal testers immediately; external groups
still need Apple's one-time Beta App Review per their rules).

## Notes / gotchas

- **`ios/` is gitignored** and regenerated each run by `cap add ios`, so the
  AppDelegate patch is re-applied every build (keep `ios-patches/` in sync per
  `ios-patches/README.md`).
- **Xcode version** is pinned in the workflow (`Xcode_16.app`); bump it when the
  macOS image deprecates it.
- **Build number** auto-increments off TestFlight's latest, so no manual bump.
- The `.ipa` is also uploaded as a workflow artifact for download/debugging.
