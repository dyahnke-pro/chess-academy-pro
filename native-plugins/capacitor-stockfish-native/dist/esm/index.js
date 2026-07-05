import { registerPlugin } from '@capacitor/core';
const StockfishNative = registerPlugin('StockfishNative');
export * from './definitions.js';
export { StockfishNative };
