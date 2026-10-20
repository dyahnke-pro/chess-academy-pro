/**
 * How long a kid chapter test waits for the puzzle to mount.
 *
 * The page swaps lesson → loading → puzzle under `AnimatePresence mode="wait"`,
 * each child with its own 0.3 s transition (which overrides the test's
 * zero-duration MotionConfig). Framer advances an animation at most 40 ms per
 * frame, so on a loaded ship-check run a chain of exits takes seconds. The
 * three chapter test files each picked their own wait (5, 8, 10 and 30 s);
 * the 30 s ones could never finish inside ship-check's 20 s test timeout.
 * One number, below that timeout.
 */
export const CHAPTER_PUZZLE_WAIT_MS = 15_000;
