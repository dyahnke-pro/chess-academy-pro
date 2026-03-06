import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const INPUT_DIR = "/tmp/chess-openings";
const FILES = ["a.tsv", "b.tsv", "c.tsv", "d.tsv", "e.tsv"];
const OUTPUT_PATH = join(
  import.meta.dirname,
  "..",
  "src",
  "data",
  "openings-lichess.json"
);

/**
 * Strip move numbers from PGN.
 * "1. e4 c5 2. Nf3 d6 3. d4" -> "e4 c5 Nf3 d6 d4"
 * Handles single-digit (1.) and multi-digit (10.) move numbers.
 */
function stripMoveNumbers(pgn) {
  return pgn
    .replace(/\d+\.\s*/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

const entries = [];

for (const file of FILES) {
  const filePath = join(INPUT_DIR, file);
  const content = readFileSync(filePath, "utf-8");
  const lines = content.split("\n").filter((line) => line.trim() !== "");

  // Skip header row (first line)
  for (let i = 1; i < lines.length; i++) {
    const parts = lines[i].split("\t");
    if (parts.length < 3) {
      console.warn(`Skipping malformed line in ${file}:${i + 1}: ${lines[i]}`);
      continue;
    }

    const [eco, name, pgn] = parts;
    entries.push({
      eco: eco.trim(),
      name: name.trim(),
      pgn: stripMoveNumbers(pgn.trim()),
    });
  }
}

// Sort by ECO code, then by name
entries.sort((a, b) => {
  const ecoCompare = a.eco.localeCompare(b.eco);
  if (ecoCompare !== 0) return ecoCompare;
  return a.name.localeCompare(b.name);
});

writeFileSync(OUTPUT_PATH, JSON.stringify(entries, null, 2) + "\n", "utf-8");

console.log(`Wrote ${entries.length} entries to ${OUTPUT_PATH}`);
