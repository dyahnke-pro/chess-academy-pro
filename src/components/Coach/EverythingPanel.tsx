/**
 * EverythingPanel — EVERYTHING MODE in the app (task #101; David 2026-11-04:
 * "Unlock everything right now so we can actually build a proper narration
 * plan"). Every line the coach's deciding places weighed (`everythingEvents`:
 * the moment door, Learn's turn door, the composer, Review's walk, Learn's
 * voice owner) — which computer made it, said or held, and why — under the
 * board, newest move first.
 *
 * OWNER ONLY: the server decides (`canSendMyData`, the same owner list as
 * "Send my data"). OFF until the owner taps it: while it is off nothing
 * listens, so `everythingListening()` is false and no door builds a row.
 * The buffer keeps the most recent rows for the display — it bounds a debug
 * view, never what a student hears.
 */
import { useEffect, useRef, useState } from 'react';
import { Eye, EyeOff } from 'lucide-react';
import { canSendMyData } from '../../services/dataDrop';
import { onEverything, type EverythingRow } from '../../services/everythingEvents';

const KEEP_ROWS = 300;
/** The owner's choice holds across pages for the session: turned on in Learn,
 *  Review is already listening when its walk is built. */
let wanted = false;

export function EverythingPanel(): JSX.Element | null {
  const [owner, setOwner] = useState(false);
  useEffect(() => { let live = true; void canSendMyData().then((ok) => { if (live) setOwner(ok); }); return () => { live = false; }; }, []);
  const [on, setOnState] = useState(wanted);
  const setOn = (f: (v: boolean) => boolean): void => setOnState((v) => { wanted = f(v); return wanted; });
  const [rows, setRows] = useState<readonly EverythingRow[]>([]);
  const buffer = useRef<EverythingRow[]>([]);
  useEffect(() => {
    // Listen only on the owner's device and only while it is on: anywhere
    // else no door builds a row.
    if (!on || !owner) { buffer.current = []; setRows([]); return undefined; }
    return onEverything((row) => {
      buffer.current = [...buffer.current, row].slice(-KEEP_ROWS);
      setRows(buffer.current);
    });
  }, [on, owner]);
  if (!owner) return null;
  const newest = [...rows].reverse();
  return (
    <div className="mx-2 my-1 rounded-lg border border-violet-500/30 bg-violet-500/5 text-[11px]" data-testid="everything-panel">
      <button onClick={() => setOn((v) => !v)} className="flex w-full items-center gap-2 px-2 py-1 text-violet-300" data-testid="everything-toggle">
        {on ? <EyeOff size={12} /> : <Eye size={12} />}
        <span>Everything mode {on ? `— ${rows.length} decisions` : '(off)'}</span>
      </button>
      {on && (
        <div className="max-h-64 overflow-y-auto px-2 pb-2 space-y-2" data-testid="everything-list">
          {newest.map((r) => (
            <div key={r.seq} className="border-t border-violet-500/20 pt-1">
              <div className="text-violet-300/80">
                {r.surface} · {r.door}{r.at?.ply != null ? ` · ply ${r.at.ply}` : ''}{r.at?.san ? ` · ${r.at.san}` : ''}
              </div>
              {r.lines.map((l, k) => (
                <div key={k} className={l.said ? 'text-theme-text' : 'text-theme-text-muted'} data-testid="everything-line">
                  <span className={l.said ? 'text-emerald-400' : 'text-amber-400/80'}>{l.said ? 'said' : 'held'}</span>
                  {' · '}<span className="text-violet-300">{l.computer}</span>
                  {!l.said && l.why && <span className="text-amber-400/70"> ({l.why})</span>}
                  {' — '}{l.text}
                </div>
              ))}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
