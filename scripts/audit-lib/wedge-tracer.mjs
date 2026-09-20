/**
 * WEDGE TRACER — names the JS call that never returns (PLAN §B #21).
 *
 * The reopened review walk sometimes pins the renderer's MAIN THREAD at 100%
 * forever. Nothing in-band can read it: `Runtime.evaluate` hangs,
 * `Debugger.pause` never lands, `Profiler.stop` cannot answer — all three are
 * served BY the blocked thread. An OS `sample` proved the thread is inside JS
 * with a STATIC stack (6534/6534 samples, one non-returning call) but Chromium
 * ships no symbols, so the frames are unreadable.
 *
 * The one channel that survives: `navigator.sendBeacon` hands its payload to
 * the BROWSER process before the call under test begins, so the breadcrumb is
 * already out of the renderer when the renderer dies. The last `enter` with no
 * matching `exit` is the culprit, and it carries the JS stack of its call site.
 *
 * Install as an init script BEFORE any app code; it patches only expensive,
 * non-interruptible entry points and only reports calls over a size floor, so
 * a normal run emits a handful of beacons.
 */
export function wedgeTracer(listenerUrl) {
  const BIG = 20000;          // characters/entries below this are never traced
  const send = (payload) => {
    try { navigator.sendBeacon(listenerUrl, JSON.stringify({ kind: 'wedge-trace', category: 'subsystem', source: 'wedgeTracer', ...payload })); } catch { /* never break the app */ }
  };
  let seq = 0;
  let depth = 0;      // only the OUTERMOST big call is traced
  let budget = 400;   // a flood would drown the signal (a global replace calls exec per match)
  const site = () => {
    try { return String(new Error().stack || '').split('\n').slice(2, 7).map((l) => l.trim()).join(' <- ').slice(0, 400); } catch { return '?'; }
  };
  /** Wrap `fn` so a call over the floor beacons enter/exit around itself. */
  const trace = (label, fn, sizeOf) => function traced(...args) {
    let size = 0;
    // `this` matters: the String.prototype sizers read the receiver's length.
    try { size = sizeOf.call(this, args) ?? 0; } catch { size = 0; }
    // An inner call is part of the outer one's cost, not a separate suspect:
    // `big.replace(/x/g, …)` invokes `RegExp.exec` once PER MATCH, which for a
    // 25k string is 50k beacons and no signal at all (measured).
    if (size < BIG || depth > 0 || budget <= 0) return fn.apply(this, args);
    const id = ++seq;
    budget -= 1;
    send({ summary: `enter#${id} ${label} size=${size}`, site: site() });
    const t0 = Date.now();
    depth += 1;
    try { return fn.apply(this, args); } finally { depth -= 1; send({ summary: `exit#${id} ${label} ${Date.now() - t0}ms` }); }
  };
  const strLen = (a) => (typeof a[0] === 'string' ? a[0].length : 0);

  JSON.stringify = trace('JSON.stringify', JSON.stringify, (a) => {
    const v = a[0];
    if (typeof v === 'string') return v.length;
    // Cheap proxy for "big object": its own key count times a constant. Never
    // walk it — walking is the very cost we are measuring.
    if (v && typeof v === 'object') return Object.keys(v).length * 1000;
    return 0;
  });
  JSON.parse = trace('JSON.parse', JSON.parse, strLen);
  if (typeof structuredClone === 'function') globalThis.structuredClone = trace('structuredClone', structuredClone, (a) => (a[0] && typeof a[0] === 'object' ? Object.keys(a[0]).length * 1000 : 0));

  const S = String.prototype;
  S.replace = trace('String.replace', S.replace, function () { return this.length; });
  S.replaceAll = trace('String.replaceAll', S.replaceAll, function () { return this.length; });
  S.split = trace('String.split', S.split, function () { return this.length; });
  S.match = trace('String.match', S.match, function () { return this.length; });
  const R = RegExp.prototype;
  R.exec = trace('RegExp.exec', R.exec, strLen);
  R.test = trace('RegExp.test', R.test, strLen);

  // A heartbeat proves the thread was alive until the traced call: the last
  // beat's timestamp brackets the wedge to within a second.
  setInterval(() => { send({ summary: `alive ${new Date().toISOString().slice(11, 19)}` }); }, 1000);
}
