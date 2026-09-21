// Types for the audit Chromium resolver's testable surface.

/** Flags that let a page reach the loopback narration sidecar. */
export declare const LOOPBACK_SIDECAR_ARGS: readonly string[];
export declare const SANDBOX_CHROMIUM_ARGS: readonly string[];

/** The launch args every browser-driving audit must use — the proxy, the TLS
 *  1.2 pin and the sidecar allowances. Gated on `AUDIT_SANDBOX`. */
export declare function sandboxLaunchArgs(): string[];

/** Context options to pair with them (`ignoreHTTPSErrors`). */
export declare function sandboxContextOptions(): Record<string, unknown>;
