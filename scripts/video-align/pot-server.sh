#!/bin/bash
# pot-server.sh — build and run the PO-token provider yt-dlp needs for video data.
#
# THE 2026-08-18 DIAGNOSIS, so nobody re-derives it: video downloads 403'd on
# every format while captions worked. Cause was YouTube requiring a GVS
# Proof-of-Origin token; yt-dlp's warning named it outright ("ios client https
# formats require a GVS PO Token"). Fix has FOUR parts, all required together:
#
#   1. pip3 install bgutil-ytdlp-pot-provider   (the yt-dlp plugin half)
#   2. THIS server running on :4416             (the minting half)
#   3. yt-dlp NIGHTLY (pip3 install --pre -U yt-dlp) — stable 2026.7.4 had no
#      HLS variants; the https DASH formats stay 403 even WITH a token, only
#      the m3u8 formats (602/269/229/230/231…) actually download here
#   4. --remote-components ejs:npm on every yt-dlp call (n-challenge)
#
# And the server itself needs a ONE-LINE PATCH (applied below): its axios calls
# set httpsAgent but not `proxy: false`, so axios reads HTTPS_PROXY from env and
# sends an absolute-form GET to the egress proxy instead of opening a CONNECT
# tunnel. This proxy answers 405 to non-CONNECT, the BotGuard challenge fetch
# dies, and no token can ever be minted. The upstream ProxyAgent already
# tunnels correctly; the patch just stops axios duplicating it.
#
# Even with all four, googlevideo soft-throttles this datacenter IP: fragments
# 403 individually and retries win. Download with:
#   -N 1 --fragment-retries 30 --retry-sleep fragment:exp=2:30 --limit-rate 400K
set -e
DIR=/tmp/potp
if [ ! -f "$DIR/server/build/main.js" ]; then
  rm -rf "$DIR"
  git clone --depth 1 -q https://github.com/Brainicism/bgutil-ytdlp-pot-provider.git "$DIR"
  cd "$DIR/server"
  python3 - <<'PY'
p = 'src/session_manager.ts'
s = open(p).read()
old = "                        httpsAgent: proxySpec.asDispatcher(logger),\n                    };"
new = ("                        httpsAgent: proxySpec.asDispatcher(logger),\n"
       "                        // Egress proxy accepts only CONNECT; stop axios\n"
       "                        // env-proxying on top of the tunnelling agent.\n"
       "                        proxy: false,\n                    };")
assert s.count(old) == 1, 'patch anchor not found — upstream changed, re-derive'
open(p, 'w').write(s.replace(old, new))
PY
  npm install --silent
  npx tsc
fi
if ! curl -s -m 4 http://127.0.0.1:4416/ping >/dev/null 2>&1; then
  cd "$DIR/server" && nohup node build/main.js > /tmp/potp.log 2>&1 &
  sleep 6
fi
curl -s -m 5 http://127.0.0.1:4416/ping && echo " ← POT server ready"
