import { registerPlugin } from '@capacitor/core';

import type { StockfishNativePlugin } from './definitions';

/**
 * The native plugin. On web/Android this proxy exists but its methods reject
 * (there is no web impl) — callers MUST gate on Capacitor.isNativePlatform()
 * + iOS before using it; everywhere else keeps the JS engine.
 */
const StockfishNative = registerPlugin<StockfishNativePlugin>('StockfishNative');

export * from './definitions';
export { StockfishNative };
