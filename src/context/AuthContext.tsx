import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { api, secureSession, setUnauthorizedHandler } from '../services/api';
import { sessionStorage } from '../services/sessionStorage';
import type { ApiUser, AuthResponse } from '../types/api';
import { unregisterFinancePush } from '../services/pushNotifications';

interface AuthState {
  user: ApiUser | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (name: string, email: string, password: string) => Promise<void>;
  updateName: (name: string) => Promise<void>;
  signOut: () => Promise<void>;
}

const Context = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<ApiUser | null>(null);
  const [loading, setLoading] = useState(true);

  const signOut = useCallback(async () => {
    await unregisterFinancePush().catch(() => undefined);
    await Promise.all([
      sessionStorage.deleteItem(secureSession.tokenKey),
      sessionStorage.deleteItem(secureSession.userKey),
    ]);
    setUser(null);
  }, []);

  useEffect(() => {
    setUnauthorizedHandler(() => setUser(null));
    let alive = true;
    (async () => {
      try {
        const token = await sessionStorage.getItem(secureSession.tokenKey);
        if (token) {
          const response = await api.get<ApiUser>('/auth/me');
          if (alive) {
            setUser(response.data);
            await sessionStorage.setItem(secureSession.userKey, JSON.stringify(response.data));
          }
        }
      } catch {
        await signOut();
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => {
      alive = false;
      setUnauthorizedHandler(undefined);
    };
  }, [signOut]);

  const authenticate = useCallback(async (path: 'login' | 'register', payload: Record<string, string>) => {
    const { data } = await api.post<AuthResponse>(`/auth/${path}`, payload);
    await sessionStorage.setItem(secureSession.tokenKey, data.access_token);
    await sessionStorage.setItem(secureSession.userKey, JSON.stringify(data.user));
    setUser(data.user);
  }, []);

  const value = useMemo<AuthState>(() => ({
    user,
    loading,
    login: (email, password) => authenticate('login', { email: email.trim(), password }),
    register: (name, email, password) => authenticate('register', { name: name.trim(), email: email.trim(), password }),
    updateName: async (name) => {
      const { data } = await api.patch<ApiUser>('/auth/me', { name: name.trim() });
      setUser(data);
      await sessionStorage.setItem(secureSession.userKey, JSON.stringify(data));
    },
    signOut,
  }), [user, loading, authenticate, signOut]);

  return <Context.Provider value={value}>{children}</Context.Provider>;
}

export function useAuth() {
  const value = useContext(Context);
  if (!value) throw new Error('useAuth must be used inside AuthProvider.');
  return value;
}
