import { jsonResponse, getSql, signToken } from '../_shared';
import bcrypt from 'bcryptjs';

export async function onRequestPost({ request, env }: { request: Request; env: Record<string, string> }) {
  const { email, password } = await request.json();
  if (!email || !password) return jsonResponse({ error: 'INVALID_INPUT' }, 400);

  const sql = getSql(env);
  const result = await sql`SELECT id, email, password_hash, name FROM users WHERE email = ${email}`;
  if (result.length === 0) return jsonResponse({ error: 'INVALID_CREDENTIALS' }, 401);

  const user = result[0];
  const ok = await bcrypt.compare(password, user.password_hash);
  if (!ok) return jsonResponse({ error: 'INVALID_CREDENTIALS' }, 401);

  const token = await signToken({ id: user.id, email: user.email, name: user.name }, env.JWT_SECRET);
  return jsonResponse({ token, user: { id: user.id, email: user.email, name: user.name } });
}
