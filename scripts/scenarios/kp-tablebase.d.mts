// Types for the exact king-and-pawn solver (`kp-tablebase.mjs`), so the
// tests that rebuild the shipped tables with it are typed.
export interface KpkTable { val: Int8Array; dtc: Uint8Array; deepest: number }
export interface PairTable { val: Int8Array; dtc: Uint8Array }

export const SQUARE_NAMES: readonly string[];
export function squareIndex(name: string): number;
export function fileOf(s: number): number;
export function rankOf(s: number): number;
export function adjacent(a: number, b: number): boolean;
export function flipRank(s: number): number;
export function kpkIndex(p: number, wk: number, bk: number, stm: 0 | 1): number;
export function kpkLegal(p: number, wk: number, bk: number, stm: 0 | 1): boolean;
export function solveKpk(): KpkTable;
export function pairIndex(wk: number, bk: number, stm: 0 | 1): number;
export function pairLegal(wp: number, wk: number, bk: number, stm: 0 | 1): boolean;
export function solvePair(kpk: KpkTable, wp: number): PairTable;
export function fenFor(pos: { wk: number; bk: number; wp?: number; bp?: number }, stm: 0 | 1, student: 'w' | 'b'): string;
