/**
 * navigate_to_route — REAL (WO-BRAIN-04). Validates the requested path
 * against the app routes manifest, then invokes the surface-supplied
 * `onNavigate` callback to actually push the route via react-router.
 *
 * Path validation logic is unchanged from the BRAIN-01 stub (exact
 * match OR param-pattern match against the manifest). The new piece
 * is the callback dispatch + the audit summary now reads "navigate"
 * (not "STUB navigate") when a real callback is wired.
 *
 * If no `onNavigate` callback is wired (the surface didn't pass one),
 * the tool stays in stub mode — validates the path, logs to audit,
 * and returns synthetic success so the LLM still sees the call as
 * acknowledged. Surfaces that DO want navigation must pass
 * `onNavigate` to `coachService.ask`.
 */
import type { Tool } from '../../types';
import { findRoute } from '../../sources/routesManifest';
import { logAppAudit } from '../../../services/appAuditor';

export const navigateToRouteTool: Tool = {
  name: 'navigate_to_route',
  category: 'cerebrum',
  kind: 'write',
  description:
    'Navigate the user to a route in the app. Pass the exact path from the [App map] block. Returns success with the resolved path.',
  parameters: {
    type: 'object',
    properties: {
      path: {
        type: 'string',
        description: 'Route path (e.g. "/openings", "/coach/play").',
      },
    },
    required: ['path'],
  },
  // eslint-disable-next-line @typescript-eslint/require-await
  async execute(args, ctx) {
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

    // Invoke the surface callback if wired. A throwing callback turns
    // into a tool error so the LLM can react.
    if (ctx?.onNavigate) {
      try {
        ctx.onNavigate(path);
        void logAppAudit({
          kind: 'coach-brain-tool-called',
          category: 'subsystem',
          source: 'navigateToRouteTool',
          summary: `navigate to ${path}`,
          details: `resolvedTo=${match.path} title=${match.title}`,
        });
        return {
          ok: true,
          result: { path, resolvedTo: match.path, title: match.title },
        };
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        return { ok: false, error: `onNavigate threw: ${message}` };
      }
    }

    // No callback — fall back to stub behavior so calls from
    // unmigrated surfaces don't fail outright.
    void logAppAudit({
      kind: 'coach-brain-tool-called',
      category: 'subsystem',
      source: 'navigateToRouteTool',
      summary: `STUB navigate to ${path} (no onNavigate callback)`,
    });
    return {
      ok: true,
      result: { path, resolvedTo: match.path, title: match.title, stub: true },
    };
  },
};
