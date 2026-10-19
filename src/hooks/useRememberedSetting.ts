import { useCallback, useEffect, useRef, useState } from 'react';
import { recallSetting, rememberSetting } from '../services/studentMemory';

/**
 * A setting the student chose on a surface, REMEMBERED across closes
 * (persistent memory, 2026-10-19). Starts at `fallback`, takes the remembered
 * value once it is read, and writes every change. A change made before the
 * read lands wins over the read.
 */
export function useRememberedSetting<T extends string | number | boolean>(
  name: string,
  fallback: T,
): [T, (next: T | ((prev: T) => T)) => void] {
  const [value, setValue] = useState<T>(fallback);
  const touchedRef = useRef(false);
  useEffect(() => {
    let live = true;
    void recallSetting(name, fallback).then((v) => { if (live && !touchedRef.current) setValue(v); });
    return () => { live = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [name]);
  const set = useCallback((next: T | ((prev: T) => T)) => {
    touchedRef.current = true;
    setValue((prev) => {
      const v = typeof next === 'function' ? (next as (p: T) => T)(prev) : next;
      void rememberSetting(name, v);
      return v;
    });
  }, [name]);
  return [value, set];
}
