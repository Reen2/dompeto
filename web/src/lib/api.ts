// ===== API client for Cloudflare Dompet (single snapshot sync) =====
// GET /sync → pull snapshot, PUT /sync → push snapshot
// GET /auth/me → /auth/me

let token: string | null = null;
let userId: string | null = null;

export function setApiToken(t: string | null) {
  token = t;
  if (t) {
    try {
      const base64url = t.split('.')[1];
      const base64 = base64url.replace(/-/g, '+').replace(/_/g, '/');
      const payload = JSON.parse(atob(base64));
      userId = payload.sub ?? null;
    } catch {
      userId = null;
    }
  } else {
    userId = null;
  }
}

export function getApiToken() {
  return token;
}

export function getUserIdNow() {
  return userId;
}

export function isOnline() {
  return !!token;
}

const API_BASE = (import.meta.env.VITE_API_BASE || 'https://main.dompet-26l.pages.dev/api').replace(/\/$/, '');

async function req<T = any>(path: string, init: RequestInit = {}): Promise<T> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;
  const r = await fetch(`${API_BASE}${path}`, { ...init, headers });
  if (r.status === 401) {
    setApiToken(null);
    userId = null;
    throw new Error('SESSION_EXPIRED');
  }
  if (!r.ok) {
    const body = await r.json().catch(() => ({}));
    throw new Error(body?.error || `HTTP ${r.status}`);
  }
  return (await r.json()) as T;
}

// ----- Auth -----
export async function apiRegister(email: string, password: string, name?: string) {
  const data = await req<{ token: string; user: { id: string; email: string; name: string } }>('/auth/register', {
    method: 'POST',
    body: JSON.stringify({ email, password, name }),
  });
  setApiToken(data.token);
  return data.user;
}

export async function apiLogin(email: string, password: string) {
  const data = await req<{ token: string; user: { id: string; email: string; name: string } }>('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  });
  setApiToken(data.token);
  return data.user;
}

export async function apiMe() {
  const data = await req<{ user: { id: string; email: string; name: string } }>('/auth/me');
  return data.user;
}

export async function apiLogout() {
  setApiToken(null);
  userId = null;
}

// ----- Snapshot sync (full state) -----
export async function syncPull() {
  const data = await req<{ data: any; updated_at: string }>('/sync');
  return { data: data.data, updated_at: data.updated_at };
}

export async function syncPush(snapshot: any) {
  return req<{ ok: boolean }>('/sync', {
    method: 'PUT',
    body: JSON.stringify(snapshot),
  });
}
