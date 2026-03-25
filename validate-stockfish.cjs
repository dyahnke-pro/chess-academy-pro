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
const STOCKFISH_SRC = path.join(__dirname, 'node_modules', 'stockfish', 'bin');
const REQUIRED_FILES = [
  { name: 'stockfish-18-lite-single.js', minSize: 10_000 },
  { name: 'stockfish-18-lite-single.wasm', minSize: 1_000_000 },
];

// Ensure target directory exists
if (!fs.existsSync(STOCKFISH_DIR)) {
  fs.mkdirSync(STOCKFISH_DIR, { recursive: true });
}

let ok = true;

for (const { name, minSize } of REQUIRED_FILES) {
  const filePath = path.join(STOCKFISH_DIR, name);
  const srcPath = path.join(STOCKFISH_SRC, name);

  // Auto-copy from node_modules if missing or too small
  if (!fs.existsSync(filePath) || fs.statSync(filePath).size < minSize) {
    if (fs.existsSync(srcPath)) {
      console.log(`  COPYING: ${name} from node_modules/stockfish/bin/`);
      fs.copyFileSync(srcPath, filePath);
    }
  }

  // Validate after attempted copy
  if (!fs.existsSync(filePath)) {
    console.error(`MISSING: ${filePath}`);
    console.error(`  → Source not found at ${srcPath} either`);
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
  console.error('Ensure the stockfish package is installed: npm install stockfish');
  process.exit(1);
}

console.log('Stockfish files validated.');
