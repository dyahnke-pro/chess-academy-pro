#ifndef StockfishEngineCore_h
#define StockfishEngineCore_h

/*
 * Pure-C interface to the vendored Stockfish 14.1 engine.
 *
 * Deliberately C-only (no C++, no Capacitor) so the Swift plugin target can
 * depend on it without a Swift <-> C++ interop cycle. The engine emits every
 * UCI output line through `sf_output_cb`; the Swift layer forwards those to
 * the JS `output` listener. Commands go in via `sf_cmd`.
 */

#ifdef __cplusplus
extern "C" {
#endif

/* Called once per UCI output line. `line` is a NUL-terminated UTF-8 string,
 * valid only for the duration of the call. `ctx` is the opaque pointer passed
 * to sf_start (the Swift plugin instance). Invoked from the engine reader
 * thread — the callee must hop to the main/JS thread before touching the
 * WebView. */
typedef void (*sf_output_cb)(const char *line, void *ctx);

/* Boot the engine: start the stdout-reader thread, run UCI/Bitboards/etc init,
 * and force classical evaluation (Use NNUE = false) so no NNUE net file is
 * required. Idempotent-safe to call once per process; call sf_exit to tear
 * down before re-starting. */
void sf_start(sf_output_cb cb, void *ctx);

/* Feed one UCI command line to the engine (e.g. "go depth 18"). */
void sf_cmd(const char *cmd);

/* Quit the engine and join the reader thread. */
void sf_exit(void);

#ifdef __cplusplus
}
#endif

#endif /* StockfishEngineCore_h */
