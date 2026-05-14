/**
 * featureFlags.ts
 * ---------------
 * Single source of truth for runtime feature flags driven by Vite env vars.
 *
 * Flags are read once at module load (env vars are baked into the bundle
 * by Vite at build time, so per-deploy values are stable for the life of
 * a session).
 *
 * Per-deploy configuration in Vercel:
 *   Production (main branch)            → VITE_LEARN_SIMPLIFIED=true
 *   Preview (preview/full-experimental) → VITE_LEARN_SIMPLIFIED=false (or unset)
 *
 * The simplified Learn surface (live) hides:
 *   - Trap tiles in the line picker (proRepertoireService.findTrapTilesForCanonicalLine)
 *   - Caps sibling-extension branches at 3 instead of 6
 *     (openingDetectionService.findSiblingExtensionBranches)
 *
 * The full Learn surface (preview) keeps all of that intact so we can
 * keep iterating on the dense / experimental experience without
 * polluting what testers see on the live URL.
 */

function readBoolFlag(name: string, fallback: boolean): boolean {
  // Vite inlines `import.meta.env.VITE_*` at build time. For tests /
  // SSR we fall back to the default if the env namespace is missing.
  const env = (import.meta as unknown as { env?: Record<string, string | undefined> }).env;
  if (!env) return fallback;
  const raw = env[name];
  if (raw === undefined || raw === null || raw === '') return fallback;
  return raw === 'true' || raw === '1' || raw === 'yes';
}

/**
 * When true, the Learn-with-Coach surface is stripped back to the
 * "main line + 2-3 most popular variations" experience. Trap-line
 * forks are hidden from the line picker, sibling-extension branches
 * cap at 3.
 *
 * Defaults FALSE so behaviour is unchanged unless explicitly enabled
 * (preview branches keep the full surface; production main branch
 * sets `VITE_LEARN_SIMPLIFIED=true`).
 */
export const LEARN_SIMPLIFIED: boolean = readBoolFlag('VITE_LEARN_SIMPLIFIED', false);

/** Max sibling-extension branches surfaced at a fork point. */
export const MAX_SIBLING_BRANCHES: number = LEARN_SIMPLIFIED ? 3 : 6;
