// Reads what a computed gem says on Watch (WO-ALL-OPENINGS-01 O2): the gem
// replayed from the shipped index, its line generated through the one door.
//   GEM_READ=1 npx vitest run src/services/gemNarration.read.measure.test.ts
import { describe, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const ON = process.env.GEM_READ === '1';

describe.skipIf(!ON)('a computed gem, as Watch says it', () => {
  it('prints the top gems\' lines', async () => {
    const { gemsOnLine, clubGemToPunishGem } = await import('./clubGems');
    const { gemToPlayableLine } = await import('../data/lessons/punishGems');
    const { generatedLessonFor, lessonBeatsOnLine, overlayBeats } = await import('./generatedLesson');
    const file = JSON.parse(readFileSync(join(process.cwd(), 'public/data/club-gems.json'), 'utf8')) as { boards: Parameters<typeof gemsOnLine>[0] };
    for (const line of ['e4 e5 Qh5 Nc6 Bc4', 'e4 e5 Nf3 Nc6 Bc4 Nf6 Ng5 d5 exd5 Nxd5 Nxf7 Kxf7 Qf3+', 'e4 e5 Nf3 f6 Nxe5']) {
      const sans = line.split(' ');
      for (const hit of gemsOnLine(file.boards, sans).filter((h) => h.atPly === sans.length).slice(0, 1)) {
        const gem = clubGemToPunishGem(hit, 'x');
        if (!gem) continue;
        const base = gemToPlayableLine(gem)!;
        const moves = gem.playLine.split(' ');
        const script = await generatedLessonFor({ name: 'Italian Game', eco: '', moves, openingId: 'x', color: hit.gem.by === 'white' ? 'black' : 'white', corpusNotes: false });
        const taught = script ? overlayBeats(base, lessonBeatsOnLine(script, moves), 0) : base;
        console.log(`\n${line} ${gem.inaccuracy}?? — ${gem.why}`);
        taught.moves.forEach((m, i) => { if (taught.annotations[i]) console.log(`  ${i + 1}. ${m}: ${taught.annotations[i]}`); });
      }
    }
  }, 600_000);
});
