"""Stream-decompress a multi-frame .zst (stdin → stdout). Node's zstd binding
stops at the first mid-stream skippable frame; python-zstandard reads across
frames. `pip install zstandard`. Used by build-long-puzzles.mjs --plain."""
import sys
import zstandard
r = zstandard.ZstdDecompressor(max_window_size=2**31).stream_reader(sys.stdin.buffer, read_across_frames=True)
while True:
    chunk = r.read(1 << 20)
    if not chunk:
        break
    sys.stdout.buffer.write(chunk)
