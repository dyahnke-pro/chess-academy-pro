import { describe, it, expect } from 'vitest';
import { detectOpeningTranspositional } from './openingDetectionService';

const sans = (s: string): string[] => s.split(' ').filter((t) => t && !/\d+\./.test(t));

describe('detectOpeningTranspositional — a transposition is reached in the opening, by the right side', () => {
  it('an Old Sicilian whose White plays Nc3 on move 8 and f4 on move 20 is NOT the Grand Prix (chesscom-1040709576)', () => {
    const game = sans('1. e4 c5 2. Nf3 Nc6 3. c3 d6 4. d4 cxd4 5. cxd4 Bg4 6. Bc4 e6 7. Be3 Nf6 8. Nc3 Nxe4 9. Nxe4 d5 10. Bd3 dxe4 11. Bxe4 Bb4+ 12. Bd2 Bxf3 13. Bxf3 Qxd4 14. O-O Qxd2 15. Qb3 O-O 16. Rfd1 Nd4 17. Qc4 Nxf3+ 18. gxf3 Qg5+ 19. Kh1 Bc5 20. f4 Qh5');
    expect(detectOpeningTranspositional(game)?.name).toBe('Sicilian Defense: Old Sicilian');
  });

  it('the Grand Prix by its own order is still named', () => {
    expect(detectOpeningTranspositional(sans('1. e4 c5 2. Nc3 Nc6 3. f4 g6'))?.name).toBe('Sicilian Defense: Grand Prix Attack');
  });

  it('the Grand Prix reached by another opening order is still named — that is what a transposition is', () => {
    expect(detectOpeningTranspositional(sans('1. e4 c5 2. Nc3 g6 3. f4 Bg7 4. Nf3 Nc6'))?.name).toBe('Sicilian Defense: Grand Prix Attack');
  });
});
