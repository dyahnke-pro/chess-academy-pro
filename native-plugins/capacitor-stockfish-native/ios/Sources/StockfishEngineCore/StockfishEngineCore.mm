/*
 * StockfishEngineCore.mm — vendored Stockfish 14.1 driven through a pure-C API.
 *
 * Adapted from veloce/capacitor-stockfish's Stockfish.cpp. Two changes for the
 * Capacitor-8 SPM layout:
 *   1. Output goes to a C callback (sf_output_cb) instead of importing the
 *      Swift plugin class — this breaks the SPM Swift<->ObjC++ dependency cycle.
 *   2. Classical eval is forced (Use NNUE = false) right after init, so no
 *      NNUE .nnue net file has to be embedded/bundled (built with
 *      -DNNUE_EMBEDDING_OFF). Classical SF14.1 at native ARM speed is far more
 *      than enough for coach grounding.
 */

#include <string>
#include <thread>
#include <iostream>

#include "sf/bitboard.h"
#include "sf/endgame.h"
#include "sf/position.h"
#include "sf/psqt.h"
#include "sf/search.h"
#include "sf/thread.h"
#include "sf/tt.h"
#include "sf/uci.h"
#include "sf/tune.h"
#include "sf/evaluate.h"
#include "sf/syzygy/tbprobe.h"

#include "threadbuf.h"
#include "include/StockfishEngineCore.h"

namespace {
  using namespace Stockfish;

  const std::string CMD_EXIT = "stockfish:exit";

  sf_output_cb g_cb = nullptr;
  void        *g_ctx = nullptr;
  std::thread  g_reader;

  // Redirect std::cout through a threadbuf and pump each line to the callback.
  void readStdout() {
    std::streambuf *originalOut = std::cout.rdbuf();

    threadbuf sfbuf(8, 8096);
    std::ostream sfout(&sfbuf);
    std::cout.rdbuf(sfout.rdbuf());
    std::istream sfin(&sfbuf);

    std::string sentinel;
    while (sentinel != CMD_EXIT) {
      std::string line;
      std::getline(sfin, line);
      if (line != CMD_EXIT) {
        if (g_cb) g_cb(line.c_str(), g_ctx);
      } else {
        sentinel = CMD_EXIT;
      }
    }

    std::cout.rdbuf(originalOut);
    sfbuf.close();
  }
}

extern "C" void sf_start(sf_output_cb cb, void *ctx) {
  using namespace Stockfish;

  g_cb = cb;
  g_ctx = ctx;
  g_reader = std::thread(readStdout);

  UCI::init(Options);
  Tune::init();
  PSQT::init();
  Bitboards::init();
  Position::init();
  Bitbases::init();
  Endgames::init();
  Threads.set(size_t(Options["Threads"]));
  Search::clear();
#ifndef NNUE_EMBEDDING_OFF
  Eval::NNUE::init();
#endif

  // Force classical evaluation so no NNUE net file is required. With
  // Use NNUE = false, Eval::NNUE::verify() returns early and never exits.
  UCI::command("setoption name Use NNUE value false");
}

extern "C" void sf_cmd(const char *cmd) {
  using namespace Stockfish;
  if (cmd) UCI::command(std::string(cmd));
}

extern "C" void sf_exit(void) {
  using namespace Stockfish;
  UCI::command("quit");
  sync_cout << CMD_EXIT << sync_endl;
  if (g_reader.joinable()) g_reader.join();
  Threads.set(0);
  g_cb = nullptr;
  g_ctx = nullptr;
}
