/// <reference types="vite/client" />

// Productization env vars (Phase 1+). Declared so `import.meta.env.VITE_*`
// is typed `string | undefined` instead of `any` (CLAUDE.md: no `any`).
interface ImportMetaEnv {
  /** PostHog Cloud project API key (`phc_…`). Unset → analytics no-ops. */
  readonly VITE_POSTHOG_KEY?: string;
  /** PostHog ingestion host. Defaults to US cloud when unset. */
  readonly VITE_POSTHOG_HOST?: string;
}

declare const __ANTHROPIC_KEY__: string;
declare const __DEEPSEEK_KEY__: string;
declare const __BUILD_ID__: string;
declare const __AUDIT_STREAM_URL__: string;
declare const __AUDIT_STREAM_SECRET__: string;
