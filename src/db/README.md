# Dexie schema (IndexedDB)

`schema.ts` is the single source of truth for the browser-side
database. Versions are append-only and matched to a deliberate
"bump + upgrade function" convention documented here.

## Convention

### 1. Always bump the version. Never edit an existing version.

A previously-shipped `this.version(n).stores({...})` block is part of
every installed copy of the app forever. Editing it would leave older
installs on an inconsistent schema. Instead, add a new
`this.version(n+1)...` block.

### 2. Pure additions (new table, new index, new nullable field)

Declare the next version block with the updated `stores({...})` map.
No `.upgrade()` function is needed for:

- adding a new table
- adding a new index on an existing table
- adding a new field to a row type whose absence callers already
  treat as "undefined"

### 3. Additions with defaults — use `.upgrade()`

If existing rows must be backfilled with a non-`undefined` default,
add an `.upgrade()` function. Pattern:

```ts
this.version(N).stores({ /* same shape */ }).upgrade(async (tx) => {
  await tx.table('profiles').toCollection().modify((profile: UserProfile) => {
    const prefs = profile.preferences as unknown as Record<string, unknown>;
    if (!('newField' in prefs)) {
      prefs.newField = DEFAULT_VALUE;
    }
  });
});
```

- **Guard with `if (!('newField' in x))`** so a rerun is a no-op.
- **Cast to `Record<string, unknown>`** to stay strict-mode clean when
  mutating legacy shapes.
- **Never remove fields** in an upgrade — Dexie doesn't have a
  "drop column" for index-free fields. Leave them; they become
  harmless dead data. If the field is an index, bump the version
  without it in the next `stores({...})` map.

### 4. Tests stay in sync

Any new version that touches row shapes must have a test in
`src/db/*.test.ts` that:

- writes a row in the shape of version `N-1`
- re-opens the DB at version `N`
- asserts the new field is populated

See `database.test.ts` for the shared pattern.

### 5. Sync with `syncService.ts`

`syncService.importUserData()` bulk-puts into every table. If you add
a new table in a schema version, add it to `ImportData` and the
`bulkPut` block in `syncService.ts`. Same rule for `exportUserData()`
in `dbService.ts`. A missing table in either helper silently loses
data on restore.

### 6. Bump checklist

When opening a PR that changes the schema:

- [ ] `this.version(N).stores({...})` block appended, never edited
- [ ] `.upgrade()` provided iff existing rows need new defaults
- [ ] Test writes a pre-upgrade row and asserts the upgrade
- [ ] New/changed tables surfaced in `exportUserData` and
      `syncService.importUserData`
- [ ] Type added to `EntityTable<...>` declaration at top of
      `ChessAcademyDB`

## Anti-patterns

- ❌ Editing `this.version(3).stores(...)` after it shipped
- ❌ Deleting an old `.version(n)` block to "clean up history"
- ❌ Putting a `.upgrade()` on version 1 — there's nothing to
  upgrade from
- ❌ Running DB writes from a React component's top-level render —
  Dexie's version open-upgrade happens once, on first `db.*` access;
  let it settle
