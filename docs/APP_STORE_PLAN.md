# App Store Deployment Plan — Chess Academy Pro

**Status:** Planning  
**Date:** 2026-04-01  
**Model:** Freemium — Free (Lite) + Pro ($3.99/mo or $29.99/yr)

---

## Tier Breakdown

### Free (Lite)

| Feature | Included |
|---------|----------|
| Stockfish analysis (full engine) | Yes |
| Puzzle trainer (all puzzles, SRS) | Yes |
| Basic opening repertoire (Scholar's, Italian, London, etc.) | Yes |
| Board customization (themes, piece sets, sounds) | Yes |
| Game import/review (PGN) | Yes |
| Session tracking & stats | Yes |
| Offline mode | Yes |

### Pro ($3.99/mo · $29.99/yr)

| Feature | Included |
|---------|----------|
| Everything in Free | Yes |
| AI Coach (chat, game review, lesson generation) | Yes |
| Weakness detection & targeted training | Yes |
| Pro repertoires (Gambits tab, advanced lines) | Yes |
| Voice coaching (ElevenLabs TTS) | Yes |
| Cloud sync (Supabase backup/restore) | Yes |
| Priority support | Yes |

### Usage Limits (Pro)

- **Coach messages:** 100/day (soft cap — warn at 80, block at 100)
- **Coach context window:** Last 20 messages per conversation
- **Game analysis (AI):** 10 full game reviews/day
- **Voice TTS:** 50 utterances/day (ElevenLabs is expensive)

---

## Architecture Overview

```
┌─────────────────────────────────────┐
│         Chess Academy Pro           │
│         (iOS / Capacitor)           │
│                                     │
│  ┌─────────┐  ┌──────────────────┐  │
│  │ StoreKit│  │  Feature Gate    │  │
│  │   2     │◄─┤  (Zustand)      │  │
│  └────┬────┘  └──────┬───────────┘  │
│       │              │              │
│       │   ┌──────────▼───────────┐  │
│       │   │  Coach API Client    │  │
│       │   │  (proxy mode)       │  │
│       │   └──────────┬───────────┘  │
└───────┼──────────────┼──────────────┘
        │              │
        ▼              ▼
┌───────────────┐  ┌──────────────────────┐
│  Apple App    │  │  Supabase Edge       │
│  Store Server │  │  Function (Proxy)    │
│  (receipts)   │  │                      │
└───────────────┘  │  ┌────────────────┐  │
                   │  │ Receipt        │  │
                   │  │ Validation     │  │
                   │  └────────────────┘  │
                   │  ┌────────────────┐  │
                   │  │ Rate Limiter   │  │
                   │  └────────────────┘  │
                   │  ┌────────────────┐  │
                   │  │ DeepSeek API   │  │
                   │  │ (proxied)      │  │
                   │  └────────────────┘  │
                   └──────────────────────┘
```

---

## Component 1: Supabase Edge Function Proxy

**Purpose:** Proxy AI coach requests so API keys never touch the client.

**Location:** Separate repo or `supabase/functions/` directory (kept out of the app bundle).

### Endpoints

#### `POST /functions/v1/coach`

Proxies chat completions to DeepSeek (or Anthropic for premium analysis).

**Request:**
```typescript
interface CoachProxyRequest {
  messages: Array<{ role: 'user' | 'assistant' | 'system'; content: string }>;
  model?: 'deepseek-chat' | 'deepseek-reasoner' | 'claude-sonnet';
  max_tokens?: number;
  receipt: string;          // Base64 StoreKit receipt for validation
  device_id: string;        // Unique device identifier
}
```

**Response:** Streamed SSE, same format as DeepSeek/OpenAI chat completions.

**Server-side logic:**
1. Validate `receipt` against Apple's `/verifyReceipt` endpoint (or StoreKit 2 server API)
2. Cache receipt validation (1 hour TTL) to avoid re-validating every request
3. Check rate limits for `device_id` (100 messages/day, stored in Supabase table)
4. Proxy to DeepSeek API with server-side API key
5. Stream response back to client
6. Log usage for billing monitoring (tokens used per device per day)

#### `POST /functions/v1/coach/analyze-game`

Full game analysis endpoint (heavier, separate rate limit).

**Request:**
```typescript
interface GameAnalysisRequest {
  pgn: string;
  player_color: 'white' | 'black';
  receipt: string;
  device_id: string;
}
```

**Rate limit:** 10/day per device.

#### `GET /functions/v1/subscription/status`

Quick subscription check (cached).

**Request headers:** `Authorization: Bearer <receipt>`

**Response:**
```typescript
interface SubscriptionStatus {
  active: boolean;
  tier: 'free' | 'pro';
  expires_at: string | null;
  trial: boolean;
  usage: {
    coach_messages_today: number;
    game_analyses_today: number;
    voice_utterances_today: number;
  };
}
```

### Supabase Tables

```sql
-- Track subscription receipts (cache validation results)
CREATE TABLE subscriptions (
  device_id TEXT PRIMARY KEY,
  receipt_hash TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'free',  -- 'free', 'pro', 'trial'
  validated_at TIMESTAMPTZ NOT NULL,
  expires_at TIMESTAMPTZ,
  original_transaction_id TEXT
);

-- Track daily usage per device
CREATE TABLE daily_usage (
  id BIGSERIAL PRIMARY KEY,
  device_id TEXT NOT NULL,
  usage_date DATE NOT NULL DEFAULT CURRENT_DATE,
  coach_messages INTEGER NOT NULL DEFAULT 0,
  game_analyses INTEGER NOT NULL DEFAULT 0,
  voice_utterances INTEGER NOT NULL DEFAULT 0,
  tokens_used INTEGER NOT NULL DEFAULT 0,
  estimated_cost_cents INTEGER NOT NULL DEFAULT 0,
  UNIQUE(device_id, usage_date)
);

-- Index for fast lookups
CREATE INDEX idx_daily_usage_device_date ON daily_usage(device_id, usage_date);
```

### Environment Variables (Supabase Secrets)

```
DEEPSEEK_API_KEY=sk-...
ANTHROPIC_API_KEY=sk-ant-...
APPLE_SHARED_SECRET=...          # For receipt validation
DAILY_COACH_LIMIT=100
DAILY_ANALYSIS_LIMIT=10
DAILY_VOICE_LIMIT=50
COST_ALERT_THRESHOLD_CENTS=5000  # Alert if daily costs exceed $50
```

### Edge Function Implementation (TypeScript)

```typescript
// supabase/functions/coach/index.ts
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

serve(async (req: Request) => {
  // 1. Parse request
  const { messages, model, max_tokens, receipt, device_id } = await req.json();

  // 2. Validate subscription
  const sub = await validateReceipt(receipt, device_id);
  if (sub.status === 'free') {
    return new Response(JSON.stringify({ error: 'Pro subscription required' }), {
      status: 403,
    });
  }

  // 3. Check rate limit
  const usage = await getDailyUsage(device_id);
  if (usage.coach_messages >= DAILY_COACH_LIMIT) {
    return new Response(JSON.stringify({
      error: 'Daily limit reached',
      limit: DAILY_COACH_LIMIT,
      resets_at: getNextMidnightUTC(),
    }), { status: 429 });
  }

  // 4. Proxy to DeepSeek
  const apiKey = Deno.env.get('DEEPSEEK_API_KEY');
  const response = await fetch('https://api.deepseek.com/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: model || 'deepseek-chat',
      messages,
      max_tokens: Math.min(max_tokens || 1024, 2048),
      stream: true,
    }),
  });

  // 5. Increment usage
  await incrementUsage(device_id, 'coach_messages');

  // 6. Stream response back
  return new Response(response.body, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
    },
  });
});
```

---

## Component 2: Feature Gating (Client-Side)

**Purpose:** Control which features are available based on subscription tier.

### Zustand Store Addition

```typescript
// src/stores/subscriptionStore.ts

interface SubscriptionState {
  tier: 'free' | 'pro';
  trialActive: boolean;
  expiresAt: Date | null;
  usage: {
    coachMessagesToday: number;
    gameAnalysesToday: number;
    voiceUtterancesToday: number;
  };
  loading: boolean;

  // Actions
  checkSubscription: () => Promise<void>;
  purchasePro: (period: 'monthly' | 'annual') => Promise<boolean>;
  restorePurchases: () => Promise<void>;
}
```

### Feature Gate Component

```typescript
// src/components/common/ProFeature.tsx

interface ProFeatureProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;  // What to show free users (default: upgrade prompt)
}

export function ProFeature({ children, fallback }: ProFeatureProps): React.ReactElement {
  const tier = useSubscriptionStore((s) => s.tier);

  if (tier === 'pro') {
    return <>{children}</>;
  }

  return <>{fallback ?? <UpgradePrompt />}</>;
}
```

### Gated Features Map

```typescript
// src/services/featureGates.ts

const PRO_FEATURES = {
  aiCoach: true,           // CoachChatPage, CoachGamePage
  weaknessDetection: true, // WeaknessPage, bad habits analysis
  proRepertoires: true,    // Gambits tab, advanced opening lines
  voiceCoaching: true,     // ElevenLabs TTS
  cloudSync: true,         // Supabase backup/restore
  gameAnalysisAI: true,    // AI-powered game review (Stockfish stays free)
} as const;

export function isFeatureAvailable(feature: keyof typeof PRO_FEATURES, tier: 'free' | 'pro'): boolean {
  if (tier === 'pro') return true;
  return !PRO_FEATURES[feature];
}
```

### Where Gates Apply

| File | What to Gate |
|------|-------------|
| `CoachChatPage.tsx` | Entire page → show upgrade prompt |
| `CoachGamePage.tsx` | Entire page → show upgrade prompt |
| `WeaknessPage.tsx` | Entire page → show upgrade prompt |
| `OpeningExplorer.tsx` | Gambits tab → lock icon + upgrade prompt |
| `GameReviewPage.tsx` | "AI Analysis" button → Stockfish stays free |
| `SettingsPage.tsx` | Voice coaching toggle → upgrade prompt |
| `SyncSettingsPanel.tsx` | Cloud sync section → upgrade prompt |
| `Navigation.tsx` | Pro badge on locked items |

---

## Component 3: StoreKit 2 Integration

**Purpose:** Handle subscriptions via Apple's in-app purchase system.

### Product IDs

```
com.chessacademy.pro.monthly    — $3.99/month
com.chessacademy.pro.annual     — $29.99/year
```

### Capacitor Plugin

Use `@capawesome/capacitor-in-app-purchases` or RevenueCat's Capacitor SDK.

**RevenueCat advantages:**
- Handles receipt validation server-side (could replace custom validation)
- Dashboard for subscription analytics
- Free for < $2,500 MTR (monthly tracked revenue)
- Webhook integration with Supabase

### Integration Flow

```
1. App launch → check cached subscription status
2. If expired/unknown → call RevenueCat SDK → get entitlements
3. If Pro entitlement active → set tier='pro' in Zustand
4. If not → set tier='free', show upgrade prompts on gated features
5. On purchase tap → present StoreKit payment sheet
6. On successful purchase → RevenueCat webhook → update Supabase
7. On each coach API call → send receipt/customer ID for server validation
```

### Paywall UI

```typescript
// src/components/subscription/PaywallPage.tsx

// Full-screen paywall shown when tapping a locked feature
// - Hero section with feature preview screenshots
// - "7-day free trial" badge
// - Monthly vs Annual toggle
// - Feature comparison list (Free vs Pro)
// - "Restore Purchases" link
// - Terms & Privacy links (required by Apple)
```

---

## Component 4: Coach API Client (Proxy Mode)

**Purpose:** Modify existing coach API client to route through Supabase proxy instead of direct API calls.

### Current Flow (BYOK)
```
App → coachApi.ts → DeepSeek/Anthropic API directly (user's key)
```

### New Flow (Pro Subscription)
```
App → coachApi.ts → Supabase Edge Function → DeepSeek API (server key)
```

### Dual-Mode Support

Keep BYOK as a hidden/developer option. Default to proxy mode.

```typescript
// src/services/coachApi.ts — modified

function getCoachEndpoint(): { url: string; headers: Record<string, string> } {
  const prefs = useAppStore.getState().userPreferences;

  // Developer mode: direct API with own key (hidden setting)
  if (prefs.byokEnabled && prefs.apiKeyDecrypted) {
    return {
      url: 'https://api.deepseek.com/chat/completions',
      headers: { Authorization: `Bearer ${prefs.apiKeyDecrypted}` },
    };
  }

  // Production mode: proxy through Supabase
  return {
    url: `${SUPABASE_URL}/functions/v1/coach`,
    headers: { 'Content-Type': 'application/json' },
    // Receipt & device_id added to request body
  };
}
```

---

## Component 5: App Store Submission Checklist

### Apple Developer Account
- [ ] Enroll in Apple Developer Program ($99/yr)
- [ ] Enable Small Business Program (15% commission vs 30%)
- [ ] Set up bank account for payments

### App Store Connect Setup
- [ ] Create app record with bundle ID `com.chessacademy.pro`
- [ ] Configure in-app purchase products (monthly + annual)
- [ ] Set up subscription group "Chess Academy Pro"
- [ ] Configure free trial (7 days)
- [ ] Set pricing for all territories

### Assets Required
- [ ] App icon: 1024x1024 PNG (no alpha, no rounded corners)
- [ ] Screenshots: 6.7" iPhone (1290x2796) — 3-5 images
- [ ] Screenshots: 6.5" iPhone (1284x2778) — 3-5 images
- [ ] Screenshots: iPad 12.9" (2048x2732) — if supporting iPad
- [ ] App preview video (optional, 15-30 seconds)

### Metadata
- [ ] App name: "Chess Academy Pro"
- [ ] Subtitle (max 30 chars): "AI Chess Coach & Trainer"
- [ ] Description (max 4000 chars)
- [ ] Keywords (max 100 chars): chess,training,puzzles,openings,coach,stockfish,tactics,strategy
- [ ] Category: Education (primary), Games > Board (secondary)
- [ ] Age rating: 4+ (no objectionable content)
- [ ] Price: Free (with IAP)

### Legal
- [ ] Privacy policy URL (hosted publicly)
- [ ] Terms of service URL
- [ ] Support URL
- [ ] App Privacy nutrition labels (App Store Connect form)
  - Data collected: None (or "Identifiers: Device ID" for rate limiting)
  - Data linked to user: None
  - Tracking: None

### Technical
- [ ] Generate iOS project (`npx cap add ios && npx cap sync`)
- [ ] Configure code signing (automatic in Xcode)
- [ ] Add `ios-patches/AppDelegate.swift` with COOP/COEP headers
- [ ] Info.plist entries:
  - `NSMicrophoneUsageDescription` — "Optional voice input for chess coach"
  - `ITSAppUsesNonExemptEncryption` — `false`
- [ ] Test on physical device
- [ ] Archive and upload via Xcode Organizer

### CI/CD (Optional but Recommended)
- [ ] GitHub Actions workflow for building iOS archive
- [ ] Fastlane for automated TestFlight uploads
- [ ] Fastlane match for code signing in CI

---

## Implementation Order

### Phase 1: Backend (can build independently)
1. Set up Supabase project (or extend existing)
2. Create Edge Function for coach proxy
3. Create Edge Function for subscription status
4. Create database tables (subscriptions, daily_usage)
5. Test with curl / Postman

### Phase 2: Subscription Infrastructure
1. Set up RevenueCat account + project
2. Create IAP products in App Store Connect
3. Add RevenueCat Capacitor plugin to app
4. Build `subscriptionStore.ts`
5. Build `PaywallPage.tsx`

### Phase 3: Feature Gating
1. Create `featureGates.ts`
2. Create `ProFeature` wrapper component
3. Gate all Pro features (coach, weaknesses, gambits, voice, sync)
4. Add upgrade prompts with paywall navigation

### Phase 4: Coach API Migration
1. Modify `coachApi.ts` for dual-mode (proxy vs BYOK)
2. Remove API key requirement from onboarding for non-dev users
3. Test coach flow end-to-end through proxy

### Phase 5: Assets & Submission
1. Create production app icon (1024x1024)
2. Take App Store screenshots
3. Write privacy policy, terms, support page
4. Generate iOS project, configure signing
5. TestFlight → App Store review

---

## Cost Projections

| Users | Monthly Revenue (after Apple) | Est. API Cost | Net |
|-------|-------------------------------|---------------|-----|
| 10    | $27.90                        | ~$5           | ~$23 |
| 50    | $139.50                       | ~$25          | ~$115 |
| 100   | $279.00                       | ~$50          | ~$229 |
| 500   | $1,395.00                     | ~$200         | ~$1,195 |
| 1000  | $2,790.00                     | ~$400         | ~$2,390 |

*Assumes DeepSeek as primary model, moderate usage (~30 messages/user/day).*
*After year 1 with Small Business Program, Apple cut drops to 15%.*

---

## Risk Mitigation

| Risk | Mitigation |
|------|-----------|
| API cost spike (viral user) | Daily per-device rate limits + global cost alert |
| DeepSeek goes down | Fallback to Anthropic (higher cost, alert admin) |
| Apple rejects app | Common reasons: incomplete metadata, missing privacy policy, crash on review device. Submit early, iterate. |
| Receipt fraud | Server-side validation via Apple's StoreKit 2 API |
| Key extraction from edge function | Supabase Edge Functions run server-side (Deno), keys never reach client |
