# App Store Submission — Paste-Ready Checklist

Everything for the final App Store Connect session in one place. Copy-paste
the fields; do the device steps; submit. Source docs: `store-listing-copy.md`
(copy), `store-compliance-package.md` (privacy/age), `APPLE_LAUNCH_GUIDE.md`
(full walkthrough).

Status as of this build: RevenueCat ✅ · Paid Apps Agreement + banking/tax ✅ ·
code merged to main ✅ · TestFlight build (v2.8) building. Remaining = the
device-gated steps at the bottom.

---

## 1. App Store listing — paste these fields

**App Name** (≤30): `Chess Academy Pro: AI Coach`

**Subtitle** (≤30): `Trainer for openings & tactics`

**Promotional Text** (≤170):
```
Stop guessing what to study. Your AI coach watches your games, finds your weaknesses, and trains you on exactly what you need — out loud, move by move. Free for 7 days.
```

**Keywords** (≤100, no spaces):
```
puzzles,endgame,study,learn,grandmaster,stockfish,analysis,strategy,lessons,checkmate,review,improve
```

**Description:** copy the App Store description block from
`docs/store-listing-copy.md` (the "EVERYTHING INSIDE" version — hook + the five
foregrounded features + plans). Verified numbers: 3,654 openings/lines, 42
masterclasses, 15 pro repertoires, 570 model games, 15,000 puzzles.

**Support URL:** `https://chess-academy-pro.vercel.app/support`
**Privacy Policy URL:** `https://chess-academy-pro.vercel.app/privacy`
**Marketing URL** (optional): your landing page.

---

## 2. Screenshots — order + captions (1290×2796, 6.7")

Apple needs only the 6.7" set; it scales to other iPhones. Upload in this order
(first 3 show in search):

FINAL SET — all captured, all from the installed app. Upload in this order:

| # | Shot | Caption |
|---|---|---|
| 1 | IMG_4300 — Game review finds your mistake 🤖 | It watches your games and shows you exactly what to fix. |
| 2 | IMG_4314 — Weaknesses: 888 games, ranked errors 🤖 | Every game analyzed. Your leaks, ranked worst-first. |
| 3 | IMG_4307 — "Play the scandi against me" 🤖 | Or just tell your coach what to play. |
| 4 | IMG_4303 — Vienna masterclass (sublines + WLPP) | Openings that teach, not memorize. |
| 5 | IMG_4316 — Patterns: phase + tactic heatmaps | Your strengths and weaknesses, mapped over time. |
| 6 | IMG_4313 — Analysis Practice 🤖 | Train your tactical eye — explain what you see. |
| 7 | IMG_4304 — Vienna depth (model games + plans) | Real master games and the plans behind them. |
| 8 | IMG_4306 — Coach hub | One coach: learn, play, analyze. |
| 9 | IMG_4302 — Openings library | 3,654 openings, variations, and sublines. |
| 10 | 01-dashboard | Your whole training loop, one tap away. |

🤖 = AI interaction (4 here — requirement of 3 exceeded).
Bench (swap in if you want): IMG_4315 (opening win-rates), IMG_4305 (Vienna
Gambit frequency table), IMG_4309 (Tactics hub), IMG_4308 (coach playing).

---

## 3. App Privacy + Age Rating — answers (from store-compliance-package.md)

- **Age Rating:** answer the questionnaire → **9+**. Do **NOT** enter Apple's
  Kids Category (COPPA trap with third-party analytics — see compliance doc).
- **App Privacy nutrition label:** Usage Data + Diagnostics = collected, NOT
  linked to identity, NOT used for tracking. **Purchases** = collected once
  billing is live (RevenueCat). NO contacts/location/health/audio.
- **Account deletion:** N/A — no account creation in the app (BYO-Supabase sync,
  no sign-up). Apple 5.1.1(v) doesn't apply.
- **Export compliance:** standard encryption → exempt (already declared in the
  build: `ITSAppUsesNonExemptEncryption=false`).

---

## 4. Subscription review note (App Review Information)

Tell Apple: *"The app offers a 7-day free trial, then $7.99/month or $79.99/year.
The trial unlocks all features. To test: install, tap Start Free Trial on the
paywall, confirm with the sandbox account."* Attach a paywall screenshot to the
IAP for review (capture it from the paywall-ON build, step 6 below).
Add the **monthly + yearly subscriptions to the version** before submitting
(first-time IAPs submit *with* the app version).

---

## 5. THE REMAINING STEPS (device-gated — only you can do these)

1. ⬜ **Retake 2 screenshots** from the fresh TestFlight build (v2.8): the
   **Weaknesses page** (with your games) and **Analysis Practice** (from the app,
   no Safari bar). Send them — I'll confirm the final set.
2. ⬜ **Enroll in the Apple Small Business Program** (ASC → Business) — 30% → 15%.
3. ⬜ **The purchase test** — I trigger a build with `VITE_PAYWALL_ENABLED=true`
   (tell me when), you install it, start the 7-day trial with a **sandbox
   tester** account, confirm the app unlocks. Capture the paywall screenshot
   here for the IAP review.
4. ⬜ **Paste** §1 copy + upload §2 screenshots + answer §3 + add §4 note.
5. ⬜ **Add for Review → Submit.** ~24-48h.

That's the whole runway. Steps 1–5 are yours; everything else is done.
