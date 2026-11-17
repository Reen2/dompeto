import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { apiLogin, apiMe, apiRegister, apiLogout, isOnline } from '../lib/api';

type AuthUser = { id: string; email: string; name: string };

type AuthCtx = {
  ready: boolean;
  user: AuthUser | null;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string, name: string) => Promise<void>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthCtx | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false);
  const [user, setUser] = useState<AuthUser | null>(null);

  useEffect(() => {
    let alive = true;
    (async () => {
      if (!isOnline()) {
        if (alive) setReady(true);
        return;
      }
      try {
        const u = await apiMe();
        if (alive) setUser(u);
      } catch {
        if (alive) setUser(null);
      } finally {
        if (alive) setReady(true);
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  const signIn = async (email: string, password: string) => {
    const u = await apiLogin(email, password);
    setUser(u);
  };

  const signUp = async (email: string, password: string, name: string) => {
    const u = await apiRegister(email, password, name);
    setUser(u);
  };

  const signOut = async () => {
    await apiLogout();
    setUser(null);
  };

  const value = { ready, user, signIn, signUp, signOut };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthCtx {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
