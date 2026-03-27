#!/usr/bin/env bash
# Bundle annotations/ into a zip for uploading to the Colab voice pack generator.
# Usage: npm run bundle:annotations
#   or:  bash scripts/bundle-annotations.sh

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
DATA_DIR="$SCRIPT_DIR/../src/data"
OUT="$DATA_DIR/annotations.zip"

cd "$DATA_DIR"
zip -j -q "$OUT" annotations/*.json
COUNT=$(unzip -l "$OUT" | tail -1 | awk '{print $2}')
SIZE=$(du -h "$OUT" | cut -f1)
echo "Bundled $COUNT annotation files into annotations.zip ($SIZE)"
echo "Upload this to Colab alongside repertoire.json and pro-repertoires.json"
