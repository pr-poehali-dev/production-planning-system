import { createContext, useContext, useState, useEffect, ReactNode } from 'react';

const AUTH_URL = 'https://functions.poehali.dev/fed1ef62-586b-4a9a-b23f-701bb2b39cfb';

export type Role = 'admin' | 'itr' | 'warehouse' | 'viewer';

export interface AuthUser {
  id: number;
  login: string;
  fullName: string;
  role: Role;
}

export const ROLE_LABELS: Record<Role, string> = {
  admin: 'Администратор',
  itr: 'ИТР',
  warehouse: 'Кладовщик',
  viewer: 'Наблюдатель',
};

// Какие разделы может РЕДАКТИРОВАТЬ каждая роль. admin — всё.
const EDIT_RIGHTS: Record<Role, string[]> = {
  admin: ['dashboard', 'plan', 'orders', 'resources', 'stock', 'kb', 'settings', 'admin'],
  itr: ['plan', 'orders', 'resources', 'kb'],
  warehouse: ['stock', 'kb'],
  viewer: [],
};

// Какие разделы видны в меню (просмотр доступен всем кроме admin-страницы)
const VISIBLE_SECTIONS: Record<Role, string[]> = {
  admin: ['dashboard', 'plan', 'orders', 'resources', 'stock', 'kb', 'admin'],
  itr: ['dashboard', 'plan', 'orders', 'resources', 'stock', 'kb'],
  warehouse: ['dashboard', 'plan', 'orders', 'resources', 'stock', 'kb'],
  viewer: ['dashboard', 'plan', 'orders', 'resources', 'stock', 'kb'],
};

interface AuthCtx {
  user: AuthUser | null;
  token: string | null;
  loading: boolean;
  login: (login: string, password: string) => Promise<{ ok: boolean; error?: string }>;
  logout: () => void;
  canEdit: (section: string) => boolean;
  canView: (section: string) => boolean;
  authFetch: (action: string, payload?: Record<string, unknown>) => Promise<Record<string, unknown>>;
}

const Ctx = createContext<AuthCtx | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const saved = localStorage.getItem('vasap_token');
    if (!saved) { setLoading(false); return; }
    setToken(saved);
    fetch(AUTH_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Auth-Token': saved },
      body: JSON.stringify({ action: 'verify' }),
    })
      .then((r) => r.json())
      .then((d) => {
        if (d.ok) setUser(d.user);
        else { localStorage.removeItem('vasap_token'); setToken(null); }
      })
      .catch(() => { localStorage.removeItem('vasap_token'); setToken(null); })
      .finally(() => setLoading(false));
  }, []);

  const login = async (loginName: string, password: string) => {
    try {
      const resp = await fetch(AUTH_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'login', login: loginName, password }),
      });
      const data = await resp.json();
      if (data.ok) {
        localStorage.setItem('vasap_token', data.token);
        setToken(data.token);
        setUser(data.user);
        return { ok: true };
      }
      return { ok: false, error: data.error || 'Ошибка входа' };
    } catch {
      return { ok: false, error: 'Сервер недоступен' };
    }
  };

  const logout = () => {
    if (token) {
      fetch(AUTH_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-Auth-Token': token },
        body: JSON.stringify({ action: 'logout' }),
      }).catch(() => {});
    }
    localStorage.removeItem('vasap_token');
    setToken(null);
    setUser(null);
  };

  const canEdit = (section: string) => !!user && EDIT_RIGHTS[user.role].includes(section);
  const canView = (section: string) => !!user && VISIBLE_SECTIONS[user.role].includes(section);

  const authFetch = async (action: string, payload: Record<string, unknown> = {}) => {
    const resp = await fetch(AUTH_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Auth-Token': token || '' },
      body: JSON.stringify({ action, ...payload }),
    });
    return resp.json();
  };

  return (
    <Ctx.Provider value={{ user, token, loading, login, logout, canEdit, canView, authFetch }}>
      {children}
    </Ctx.Provider>
  );
}

export function useAuth() {
  const c = useContext(Ctx);
  if (!c) throw new Error('useAuth must be used within AuthProvider');
  return c;
}
