import { ANNOTATION_MODULES } from '../data/annotations';
import type { OpeningMoveAnnotation, OpeningAnnotations } from '../types';

const cache = new Map<string, OpeningAnnotations>();

async function loadModule(openingId: string): Promise<OpeningAnnotations | null> {
  const cached = cache.get(openingId);
  if (cached) return cached;

  const loader = ANNOTATION_MODULES[openingId] as (() => Promise<{ default: OpeningAnnotations }>) | undefined;
  if (!loader) return null;

  const mod = await loader();
  const data = mod.default;
  cache.set(openingId, data);
  return data;
}

export async function loadAnnotations(openingId: string): Promise<OpeningMoveAnnotation[] | null> {
  const data = await loadModule(openingId);
  return data?.moveAnnotations ?? null;
}

export async function loadSubLineAnnotations(
  openingId: string,
  subLineKey: string,
): Promise<OpeningMoveAnnotation[] | null> {
  const data = await loadModule(openingId);
  if (!data?.subLines || data.subLines.length === 0) return null;

  // subLineKey format: 'variation-N', 'trap-N', 'warning-N'
  const match = /^(?:variation|trap|warning)-(\d+)$/.exec(subLineKey);
  if (!match) return null;

  const idx = parseInt(match[1], 10);
  return data.subLines[idx]?.moveAnnotations ?? null;
}

export function clearAnnotationCache(): void {
  cache.clear();
}
