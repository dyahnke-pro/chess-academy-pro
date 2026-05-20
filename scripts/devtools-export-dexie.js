// Dexie export helper for the deep-audit fixture pipeline.
//
// David: paste this entire file into the browser DevTools console
// while the app (https://chess-academy-pro.vercel.app or
// http://localhost:5173) is open and signed into your account.
// It downloads `david-games.json` — drop that file at
// `audit-reports/.fixtures/david-games.json` in the repo and the
// deep audit will use it instead of synthetic seeds.
//
// Whitelist of stores below avoids exporting:
//   - meta             (audit log noise + sample-seeded flags)
//   - openingNarrations (huge LLM-cache blob)
//   - cachedOpenings    (huge LLM-cache blob)
//
// Re-run any time your account data changes (newly imported games,
// new mistake puzzles, etc.) and re-drop the JSON.

(async () => {
  const STORES = [
    'games',
    'mistakePuzzles',
    'classifiedTactics',
    'setupPuzzles',
    'profiles',
    'openings',
    'openingWeakSpots',
    'flashcards',
  ];

  const out = await new Promise((resolve, reject) => {
    const req = indexedDB.open('ChessAcademyDB');
    req.onerror = () => reject(new Error('open failed'));
    req.onsuccess = () => {
      const db = req.result;
      const present = STORES.filter((s) => db.objectStoreNames.contains(s));
      if (present.length === 0) {
        db.close();
        reject(new Error('no whitelisted stores present — wrong DB?'));
        return;
      }
      const tx = db.transaction(present, 'readonly');
      const stores = {};
      let remaining = present.length;
      for (const s of present) {
        const r = tx.objectStore(s).getAll();
        r.onsuccess = () => {
          stores[s] = r.result;
          if (--remaining === 0) {
            db.close();
            resolve({
              exportedAt: new Date().toISOString(),
              dbVersion: db.version,
              source: location.href,
              stores,
            });
          }
        };
        r.onerror = () => {
          db.close();
          reject(new Error(`getAll failed for ${s}`));
        };
      }
    };
  });

  const counts = Object.fromEntries(
    Object.entries(out.stores).map(([k, v]) => [k, v.length]),
  );
  console.log('Dexie export — row counts:', counts);

  const blob = new Blob([JSON.stringify(out)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'david-games.json';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);

  console.log('Downloaded david-games.json. Drop it into audit-reports/.fixtures/');
})();
