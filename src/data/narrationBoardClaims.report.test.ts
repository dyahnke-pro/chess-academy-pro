// Report mode for the board-claim checker: writes every violation across the
// Openings content to audit-reports/narration-board-claims.json. Runs only
// with BOARD_CLAIMS_REPORT=1 (the gate is narrationBoardClaims.test.ts).
import { describe, it } from 'vitest';
import { writeFileSync, mkdirSync } from 'node:fs';
import { collectBoardClaimViolations } from './narrationBoardClaims.sources';

describe.runIf(process.env.BOARD_CLAIMS_REPORT === '1')('board-claim report', () => {
  it('writes the report', { timeout: 300000 }, () => {
    const rows = collectBoardClaimViolations();
    mkdirSync('audit-reports', { recursive: true });
    writeFileSync('audit-reports/narration-board-claims.json', JSON.stringify(rows, null, 1));
    console.log(`board-claim violations: ${rows.length}`);
  });
});
