import { neon } from '@neondatabase/serverless';
import { SignJWT, jwtVerify } from 'jose';

export interface Env {
  DATABASE_URL: string;
  JWT_SECRET: string;
}

export function getSql(env: Env) {
  return neon(env.DATABASE_URL);
}

const enc = new TextEncoder();

export async function signToken(
  user: { id: string; email: string; name: string },
  secret: string,
) {
  return new SignJWT({ email: user.email, name: user.name })
    .setProtectedHeader({ alg: 'HS256' })
    .setSubject(user.id)
    .setIssuedAt()
    .setExpirationTime('30d')
    .sign(enc.encode(secret));
}

export async function getUserId(request: Request, env: Env): Promise<string | null> {
  const auth = request.headers.get('authorization');
  if (!auth?.startsWith('Bearer ')) return null;
  try {
    const { payload } = await jwtVerify(auth.slice(7), enc.encode(env.JWT_SECRET));
    return typeof payload.sub === 'string' ? payload.sub : null;
  } catch {
    return null;
  }
}

export function jsonResponse(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

export const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

export function withCors(res: Response) {
  for (const [k, v] of Object.entries(corsHeaders)) res.headers.set(k, v);
  return res;
}
