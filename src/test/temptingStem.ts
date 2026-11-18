// The tempting move's stem rotates over three phrasings a seat
// (`weighedMoves.temptingRefuted`, `rotateStem`); a test reads the claim,
// not which phrasing the board drew.
export const oneStem = (t: string | null | undefined): string => (t ?? '')
  .replace(/ (?:is tempting here, but it fails|looks natural, but it doesn't work|is the obvious try, but it doesn't hold up)/g, ' STEM')
  .replace(/ (?:was tempting for them, but it fails|looked natural for them, but it doesn't work|was the obvious try for them, but it doesn't hold up)/g, ' STEM-THEM');
