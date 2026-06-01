// Seed the WLPP progression UNLOCKED in the live IndexedDB so an audit can
// drive every rung (Watch/Learn/Practice/Play) and the weapon GEMS without the
// runtime markRungComplete write (which intermittently stalls in the sandbox —
// CLAUDE.md G1 write-stall rule). Sets each opening's `linesUnlockedAll` to the
// main line (-1) + every variation index, which `isLineUnlockedAll` reads as
// "all rungs + weapons unlocked". READS work, so this makes the unlocked STATE
// a read. Returns {ok, updated, requested, reason} — caller should assert ok.
export async function seedUnlockedOpenings(page, ids) {
  return page.evaluate(async (ids) => {
    const ALL = [-1, 0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
    return await new Promise((resolve) => {
      let settled = false;
      const finish = (v) => { if (!settled) { settled = true; resolve(v); } };
      setTimeout(() => finish({ ok: false, reason: 'open-timeout (write-stall)' }), 15000);
      let req;
      try { req = indexedDB.open('ChessAcademyDB'); } catch (e) { return finish({ ok: false, reason: 'open-threw' }); }
      req.onerror = () => finish({ ok: false, reason: 'open-error' });
      req.onsuccess = () => {
        const db = req.result;
        if (!db.objectStoreNames.contains('openings')) { db.close(); return finish({ ok: false, reason: 'no-openings-store' }); }
        const tx = db.transaction('openings', 'readwrite');
        const store = tx.objectStore('openings');
        let updated = 0;
        for (const id of ids) {
          const g = store.get(id);
          g.onsuccess = () => { const rec = g.result; if (rec) { rec.linesUnlockedAll = ALL; store.put(rec); updated++; } };
        }
        tx.oncomplete = () => { db.close(); finish({ ok: true, updated, requested: ids.length }); };
        tx.onerror = () => { db.close(); finish({ ok: false, reason: 'tx-error' }); };
      };
    });
  }, ids);
}
