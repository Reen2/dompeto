import { jsonResponse, getSql, signToken } from '../_shared';
import bcrypt from 'bcryptjs';

export async function onRequestPost({ request, env }: { request: Request; env: Record<string, string> }) {
  const { email, password, name } = await request.json();
  if (!email || !password) return jsonResponse({ error: 'INVALID_INPUT' }, 400);

  const sql = getSql(env);
  const exists = await sql`SELECT id FROM users WHERE email = ${email}`;
  if (exists.length > 0) return jsonResponse({ error: 'EMAIL_TAKEN' }, 409);

  const hash = await bcrypt.hash(password, 10);
  const userId = `u_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
  const displayName = name || email.split('@')[0];

  const inserted = await sql`
    INSERT INTO users (id, email, password_hash, name)
    VALUES (${userId}, ${email}, ${hash}, ${displayName})
    RETURNING id, email, name
  `;
  const user = inserted[0];

  const token = await signToken({ id: user.id, email: user.email, name: user.name }, env.JWT_SECRET);
  return jsonResponse({ token, user });
}