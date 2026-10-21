// Types for the one marketing-version reader (app-version.mjs).

/** PINNED_MARKETING_VERSION from ios/App/ci_scripts/ci_post_clone.sh. */
export declare function pinnedAppVersion(): string;

/** APP_VERSION from the environment when set, else the pinned version. */
export declare function appVersion(): string;
