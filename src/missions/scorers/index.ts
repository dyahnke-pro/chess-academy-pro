/**
 * Loads every scorer module in this folder, so each registers itself with
 * `moveScoring` (WO-CAMPAIGN-MASTER). A lane adds a scorer by adding a file
 * here — no shared file changes. Imported once, by `coachGameEngine`.
 */
import.meta.glob(['./*.ts', '!./index.ts', '!./*.test.ts'], { eager: true });
