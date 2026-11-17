import { jsonResponse, getSql, getUserId } from './_shared';

export async function onRequestGet({ request, env }: { request: Request; env: Record<string, string> }) {
  const userId = await getUserId(request, env);
  if (!userId) return jsonResponse({ error: 'UNAUTHORIZED' }, 401);

  const sql = getSql(env);
  const rows = await sql`SELECT data, updated_at FROM snapshots WHERE user_id = ${userId}`;
  if (rows.length === 0) return jsonResponse({ data: null, updated_at: null });
  return jsonResponse({ data: rows[0].data, updated_at: rows[0].updated_at });
}

export async function onRequestPut({ request, env }: { request: Request; env: Record<string, string> }) {
  const userId = await getUserId(request, env);
  if (!userId) return jsonResponse({ error: 'UNAUTHORIZED' }, 401);

  const body = await request.json();
  const sql = getSql(env);
  await sql`
    INSERT INTO snapshots (user_id, data, updated_at)
    VALUES (${userId}, ${JSON.stringify(body)}::jsonb, now())
    ON CONFLICT (user_id) DO UPDATE SET data = excluded.data, updated_at = excluded.updated_at
  `;
  return jsonResponse({ ok: true });
}
