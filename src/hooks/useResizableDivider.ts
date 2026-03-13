import { useState, useCallback, useRef } from 'react';
import type { PointerEvent, RefObject } from 'react';

interface UseResizableDividerResult {
  chatPercent: number;
  rightColumnRef: RefObject<HTMLDivElement | null>;
  dividerProps: {
    onPointerDown: (e: PointerEvent<HTMLDivElement>) => void;
    onPointerMove: (e: PointerEvent<HTMLDivElement>) => void;
    onPointerUp: () => void;
  };
}

export function useResizableDivider(initialPercent: number = 60): UseResizableDividerResult {
  const [chatPercent, setChatPercent] = useState(initialPercent);
  const rightColumnRef = useRef<HTMLDivElement>(null);
  const isDraggingRef = useRef(false);

  const onPointerDown = useCallback((e: PointerEvent<HTMLDivElement>) => {
    e.preventDefault();
    isDraggingRef.current = true;
    (e.target as HTMLDivElement).setPointerCapture(e.pointerId);
  }, []);

  const onPointerMove = useCallback((e: PointerEvent<HTMLDivElement>) => {
    if (!isDraggingRef.current || !rightColumnRef.current) return;
    const rect = rightColumnRef.current.getBoundingClientRect();
    const y = e.clientY - rect.top;
    const totalHeight = rect.height;
    const moveListPercent = Math.max(15, Math.min(75, (y / totalHeight) * 100));
    setChatPercent(Math.max(25, Math.min(85, 100 - moveListPercent)));
  }, []);

  const onPointerUp = useCallback(() => {
    isDraggingRef.current = false;
  }, []);

  return {
    chatPercent,
    rightColumnRef,
    dividerProps: { onPointerDown, onPointerMove, onPointerUp },
  };
}
