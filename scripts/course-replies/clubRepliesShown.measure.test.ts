// MEASURE (opt-in: CLUB_SHOWN=1): how many of the club-reply lines the app
// fetches are shown on a tab, and why the rest are not — the reply tree's own
// placement (`clubRepliesOnTab`) run over every chapter of every opening with
// a file, against the curated replies and the games' replies (read off the
// stored trees on disk, as the page reads them). Writes
// audit-reports/club-replies-shown.json.
import { describe, it, expect, vi } from 'vitest';
import { readFileSync, readdirSync, existsSync, writeFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { Chess } from 'chess.js';
import { positionOf } from '../../src/utils/samePosition';
import { buildCourse } from '../../src/services/openingCourse';
import { replyFloorPly, tabLineSans } from '../../src/services/builtReplies';
import { clubRepliesOnTab, type ClubReplyRecord } from '../../src/services/clubReplies';
import { replyIdentity } from '../../src/services/replyIdentity';
import { sublinesForOpening } from '../../src/services/openingCourse';
import { builtRepliesFor } from '../../src/services/builtReplies';
import type { OpeningRecord } from '../../src/types';
import type { ChapterSubline } from '../../src/services/openingCourse';

// The page reads /data/* over the network; here the same files from disk.
vi.mock('../../src/services/dataFile', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../../src/services/dataFile')>()),
  loadDataJson: async (path: string): Promise<unknown> => {
    const { readFileSync: read, existsSync: exists } = await import('node:fs');
    const file = `${process.cwd()}/public${path}`;
    return exists(file) ? JSON.parse(read(file, 'utf8')) : null;
  },
}));

const root = process.cwd();
const DIR = join(root, 'public/data/club-replies');
const arr = (raw: unknown): OpeningRecord[] => (Array.isArray(raw) ? raw : ((raw as { openings?: OpeningRecord[] }).openings ?? [])) as OpeningRecord[];
const records = new Map<string, OpeningRecord>();
for (const f of ['repertoire', 'gambits', 'anti-openings', 'pro-repertoires']) {
  for (const o of arr(JSON.parse(readFileSync(join(root, `src/data/${f}.json`), 'utf8')))) if (o?.id) records.set(o.id, o);
}

describe.runIf(process.env.CLUB_SHOWN === '1')('club replies shown on a tab', () => {
  it('measures', async () => {
    const files = existsSync(DIR) ? readdirSync(DIR).filter((n) => n.endsWith('.json') && n !== 'index.json') : [];
    const report: Record<string, { lines: number; shown: number; notShown: string[]; neverPlaced: string[] }> = {};
    let lines = 0;
    let shown = 0;
    let inside = 0;
    let hiddenByGames = 0;
    for (const n of files) {
      const file = JSON.parse(readFileSync(join(DIR, n), 'utf8')) as { openingId: string; replies: ClubReplyRecord[] };
      const opening = records.get(file.openingId);
      if (!opening) continue;
      const reserved = new Set(Object.entries(sublinesForOpening(opening.id)).flatMap(([tab, list]) => list.map((s) => replyIdentity({ ...s, tab: Number(tab) }))));
      const seen = new Set<string>();
      const nested = new Set<string>();
      const placedWithoutGames = new Set<string>();
      for (const chapter of buildCourse(opening).chapters) {
        const games = (await builtRepliesFor(opening, chapter.lineIndex))
          .filter((r) => !chapter.sublines.some((c) => c.atPly === r.atPly && c.triggerMove === r.triggerMove))
          .map((r): ChapterSubline => ({ ...r, tab: chapter.lineIndex }));
        const base = {
          records: file.replies,
          tabLine: tabLineSans(opening, chapter.lineIndex),
          lineIndex: chapter.lineIndex,
          from: replyFloorPly(opening, chapter.lineIndex),
          anchors: chapter.sublines,
          reserved,
          studentBand: '1400,1600',
          faced: null,
        };
        const boardOf = (x: ChapterSubline): string => {
          const c = new Chess();
          for (const san of x.moves.slice(0, x.atPly)) c.move(san);
          return `${positionOf(c.fen())}|${x.triggerMove}`;
        };
        for (const x of clubRepliesOnTab({ ...base, shown: chapter.sublines })) placedWithoutGames.add(boardOf(x));
        const rows = clubRepliesOnTab({ ...base, shown: [...chapter.sublines, ...games] });
        for (const x of rows) {
          const c = new Chess();
          for (const san of x.moves.slice(0, x.atPly)) c.move(san);
          seen.add(`${positionOf(c.fen())}|${x.triggerMove}`);
          if (x.via) nested.add(`${positionOf(c.fen())}|${x.triggerMove}`);
        }
      }
      const notShown = file.replies.filter((r) => !seen.has(`${r.board}|${r.san}`)).map((r) => `${r.san} @ ${r.board}`);
      // Not placed even before the games' replies: on no tab's line past its
      // floor and inside no reply the tab shows.
      const neverPlaced = file.replies.filter((r) => !placedWithoutGames.has(`${r.board}|${r.san}`)).map((r) => `${r.san} @ ${r.board}`);
      report[file.openingId] = { lines: file.replies.length, shown: file.replies.length - notShown.length, notShown, neverPlaced };
      lines += file.replies.length;
      shown += file.replies.length - notShown.length;
      inside += nested.size;
      hiddenByGames += [...placedWithoutGames].filter((k) => !seen.has(k)).length;
    }
    mkdirSync(join(root, 'audit-reports'), { recursive: true });
    writeFileSync(join(root, 'audit-reports/club-replies-shown.json'), JSON.stringify({ lines, shown, inside, hiddenByGames, openings: report }, null, 1));
    console.log(`[club-shown] ${shown} of ${lines} lines shown on a tab, ${inside} of them inside another reply; ${hiddenByGames} repeat a games reply`);
    expect(lines).toBeGreaterThan(0);
  }, 600_000);
});
