import { ANNOTATION_MODULES } from '../data/annotations';
import type { OpeningMoveAnnotation } from '../types';

const cache = new Map<string, OpeningMoveAnnotation[]>();

export async function loadAnnotations(openingId: string): Promise<OpeningMoveAnnotation[] | null> {
  const cached = cache.get(openingId);
  if (cached) return cached;

  const loader = ANNOTATION_MODULES[openingId] as (() => Promise<{ default: { moveAnnotations: OpeningMoveAnnotation[] } }>) | undefined;
  if (!loader) return null;

  const mod = await loader();
  const annotations = mod.default.moveAnnotations;
  cache.set(openingId, annotations);
  return annotations;
}

export function clearAnnotationCache(): void {
  cache.clear();
}
