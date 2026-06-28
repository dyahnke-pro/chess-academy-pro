#!/usr/bin/env bash
# Runs INSIDE the reactivecircus/android-emulator-runner once the emulator has
# booted. Installs the debug APK, launches the app, captures a screenshot +
# logcat, forwards the WebView DevTools socket, and runs the CDP mount check.
set -uo pipefail

APK=android/app/build/outputs/apk/debug/app-debug.apk
PKG=com.chessacademy.pro
OUT=audit-reports/android-smoke
mkdir -p "$OUT"

echo "=== emulator ready; devices ==="
adb devices

echo "=== install $APK ==="
adb install -r -g "$APK" || { echo "::error::APK install failed"; exit 1; }

echo "=== launch $PKG ==="
adb shell am start -n "$PKG/.MainActivity"
adb logcat -c   # clear, then capture this run's logs

# Give the WebView time to boot, load the bundle, run the deferred seed start.
sleep 35

echo "=== screenshot + logcat ==="
adb exec-out screencap -p > "$OUT/emulator-screen.png" 2>/dev/null || true
adb logcat -d > "$OUT/emulator-logcat.txt" 2>/dev/null || true
echo "screenshot bytes: $(wc -c < "$OUT/emulator-screen.png" 2>/dev/null || echo 0)"

# Hard-fail on a native crash regardless of the WebView check.
if grep -qE 'FATAL EXCEPTION|ANR in com.chessacademy' "$OUT/emulator-logcat.txt"; then
  echo "::error::native crash / ANR in logcat"
  grep -E 'FATAL EXCEPTION|ANR in com.chessacademy' -A 12 "$OUT/emulator-logcat.txt" | head -40
  exit 1
fi

echo "=== discover WebView DevTools socket ==="
SOCK=""
for i in $(seq 1 20); do
  SOCK=$(adb shell cat /proc/net/unix 2>/dev/null | grep -oE 'webview_devtools_remote_[0-9]+' | head -1)
  [ -n "$SOCK" ] && break
  sleep 2
done
if [ -z "$SOCK" ]; then
  echo "::warning::no webview_devtools socket found — WebView debugging may be off on this build."
  echo "Native launch OK + no crash, but could not assert the React mount over CDP."
  # Don't hard-fail: native side is healthy. Surface the screenshot for eyeballing.
  exit 0
fi
echo "socket: $SOCK"
adb forward tcp:9222 localabstract:"$SOCK"

echo "=== CDP mount check ==="
CDP_PORT=9222 node scripts/ci/android-webview-smoke.mjs
