export const config = { runtime: 'edge' };

export default function handler(req: Request): Response {
  return new Response(
    JSON.stringify({
      ok: true,
      time: new Date().toISOString(),
      method: req.method,
    }),
    {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    },
  );
}
