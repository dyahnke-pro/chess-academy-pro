/**
 * navigate_to_route — STUB. Becomes real in Phase 3 (WO-BRAIN-03,
 * home/dashboard surface migration). For BRAIN-01 it validates that
 * the requested path exists in the manifest, logs an audit entry,
 * and returns a synthetic success — no actual navigation occurs.
 */
import type { Tool } from '../../types';
import { findRoute } from '../../sources/routesManifest';
import { logAppAudit } from '../../../services/appAuditor';

export const navigateToRouteTool: Tool = {
  name: 'navigate_to_route',
  category: 'cerebrum',
  description: 'Navigate the user to a route in the app. Pass the exact path from the [App map] block. Returns success with the resolved path; the actual navigation lands when WO-BRAIN-03 wires this to react-router.',
  parameters: {
    type: 'object',
    properties: {
      path: { type: 'string', description: 'Route path (e.g. "/openings", "/coach/play").' },
    },
    required: ['path'],
  },
  // eslint-disable-next-line @typescript-eslint/require-await
  async execute(args) {
    const path = typeof args.path === 'string' ? args.path : '';
    if (!path) return { ok: false, error: 'path is required' };
    // Strict resolution: exact path OR any param-pattern match (treat
    // `/openings/:id` as matching `/openings/caro-kann`).
    const match = findRoute((r) => {
      if (r.path === path) return true;
      const pattern = r.path.replace(/:[^/]+/g, '[^/]+');
      return new RegExp(`^${pattern}$`).test(path);
    });
    if (!match) {
      return {
        ok: false,
        error: `path "${path}" not found in app manifest. Use a path from the [App map] block.`,
      };
    }
    void logAppAudit({
      kind: 'coach-brain-tool-called',
      category: 'subsystem',
      source: 'navigateToRouteTool',
      summary: `STUB navigate to ${path}`,
      details: 'BRAIN-01 stub — actual navigation lands in WO-BRAIN-03.',
    });
    return {
      ok: true,
      result: { path, resolvedTo: match.path, title: match.title, stub: true },
    };
  },
};
