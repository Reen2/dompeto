import { jsonResponse, getSql, getUserId } from '../_shared';

export async function onRequestGet({ request, env }: { request: Request; env: Record<string, string> }) {
  const userId = await getUserId(request, env);
  if (!userId) return jsonResponse({ error: 'UNAUTHORIZED' }, 401);

  const sql = getSql(env);
  const user = await sql`SELECT id, email, name FROM users WHERE id = ${userId}`;
  if (user.length === 0) return jsonResponse({ error: 'UNAUTHORIZED' }, 401);

  return jsonResponse({ user: user[0] });
}
