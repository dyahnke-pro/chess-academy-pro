/**
 * Build-time validation: ensures Stockfish WASM files exist in public/stockfish/.
 * Run before every build and deploy to catch missing files early.
 *
 * Usage: node validate-stockfish.cjs
 * Exit code 0 = OK, 1 = missing files.
 */
const fs = require('fs');
const path = require('path');

const STOCKFISH_DIR = path.join(__dirname, 'public', 'stockfish');
const REQUIRED_FILES = [
  { name: 'stockfish-18-lite-single.js', minSize: 10_000 },
  { name: 'stockfish-18-lite-single.wasm', minSize: 1_000_000 },
];

let ok = true;

for (const { name, minSize } of REQUIRED_FILES) {
  const filePath = path.join(STOCKFISH_DIR, name);
  if (!fs.existsSync(filePath)) {
    console.error(`MISSING: ${filePath}`);
    console.error(`  → Copy from node_modules/stockfish/bin/`);
    ok = false;
    continue;
  }
  const stat = fs.statSync(filePath);
  if (stat.size < minSize) {
    console.error(`TOO SMALL: ${filePath} (${stat.size} bytes, expected ≥${minSize})`);
    ok = false;
    continue;
  }
  console.log(`  OK: ${name} (${(stat.size / 1024 / 1024).toFixed(1)} MB)`);
}

if (!ok) {
  console.error('\nStockfish files missing or invalid!');
  console.error('Run: cp node_modules/stockfish/bin/stockfish-18-lite-single.js public/stockfish/');
  console.error('Run: cp node_modules/stockfish/bin/stockfish-18-lite-single.wasm public/stockfish/');
  process.exit(1);
}

console.log('Stockfish files validated.');
