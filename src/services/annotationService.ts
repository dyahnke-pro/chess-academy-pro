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
  const match = /^(variation|trap|warning)-(\d+)$/.exec(subLineKey);
  if (!match) return null;

  const type = match[1] as 'variation' | 'trap' | 'warning';
  const localIdx = parseInt(match[2], 10);

  // If subLines have type fields, do type-aware lookup
  const hasTypes = data.subLines.some((sl) => sl.type != null);
  if (hasTypes) {
    const matching = data.subLines.filter((sl) => sl.type === type);
    return matching[localIdx]?.moveAnnotations ?? null;
  }

  // Legacy fallback: subLines are ordered [variations...] only, no type field.
  // variation-N → direct index. trap/warning → not available.
  if (type !== 'variation') return null;
  return data.subLines[localIdx]?.moveAnnotations ?? null;
}

export function clearAnnotationCache(): void {
  cache.clear();
}
