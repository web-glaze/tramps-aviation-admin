import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { authApi } from '../api';

interface User {
  id: string;
  name: string;
  email: string;
  role: string;
  designation?: string;
  permissions?: string[];
  phone?: string;
  isActive?: boolean;
  avatar?: string;
}

interface UserContextType {
  user: User | null;
  isAuthenticated: boolean;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  can: (permission?: string) => boolean;
  refreshUser: () => Promise<void>;
}

const UserContext = createContext<UserContextType>({} as UserContextType);

/** Extract a user object from any axios response shape the backend might return. */
function extractUser(res: any): User | null {
  // Try most-specific first
  const candidates = [
    res?.data?.data?.user,
    res?.data?.user,
    res?.data?.data,   // Sometimes the backend returns { data: { id, role, permissions } }
    res?.data,
  ];
  for (const c of candidates) {
    // A valid user object must at least have an id (or _id) and a role
    if (c && (c.id || c._id) && c.role) {
      return { ...c, id: c.id || c._id };
    }
  }
  return null;
}

export const UserProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(() => {
    try {
      const stored = localStorage.getItem('admin_user');
      return stored ? JSON.parse(stored) : null;
    } catch {
      return null;
    }
  });

  // Start loading=true only if a token exists, so ProtectedRoute waits for fresh data
  const [loading, setLoading] = useState(() => !!localStorage.getItem('admin_token'));

  const persistUser = (userData: User | null, token?: string | null) => {
    if (token) localStorage.setItem('admin_token', token);
    if (userData) {
      localStorage.setItem('admin_user', JSON.stringify(userData));
    } else {
      localStorage.removeItem('admin_user');
    }
    setUser(userData);
  };

  const login = async (email: string, password: string) => {
    setLoading(true);
    try {
      const res = await authApi.login(email, password);
      const payload = res.data?.data || res.data;
      const token = payload?.token || payload?.accessToken;
      const userData = extractUser(res) ?? payload?.user ?? payload;
      if (!token || !userData) throw new Error('Invalid login response');
      persistUser(userData, token);
    } finally {
      setLoading(false);
    }
  };

  const refreshUser = async () => {
    const token = localStorage.getItem('admin_token');
    if (!token) return;

    try {
      const res = await authApi.me();
      const freshUser = extractUser(res);
      if (!freshUser) return; // don't overwrite with garbage

      // Preserve permissions from localStorage if the /me endpoint doesn't return them.
      // (Some backends strip permissions from /me to save bandwidth — fall back to stored.)
      if (!freshUser.permissions || freshUser.permissions.length === 0) {
        try {
          const stored = localStorage.getItem('admin_user');
          const storedUser: User | null = stored ? JSON.parse(stored) : null;
          if (storedUser?.permissions && storedUser.permissions.length > 0) {
            freshUser.permissions = storedUser.permissions;
          }
        } catch { /* ignore */ }
      }

      persistUser(freshUser);
    } catch (err: any) {
      // Only force-logout on 401 (invalid token). Network errors / 5xx → keep existing session.
      if (err?.response?.status === 401) {
        localStorage.removeItem('admin_token');
        persistUser(null);
      }
      // Don't rethrow — let .finally() still set loading=false cleanly
    }
  };

  useEffect(() => {
    if (localStorage.getItem('admin_token')) {
      refreshUser().finally(() => setLoading(false));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const logout = () => {
    localStorage.removeItem('admin_token');
    persistUser(null);
  };

  /**
   * Permission check:
   *  - No user           → always false
   *  - role === 'admin'  → always true (super admin, no restrictions)
   *  - No permission arg → true (unguarded route)
   *  - Otherwise         → check user.permissions array
   */
  const can = (permission?: string): boolean => {
    if (!user) return false;
    if (user.role === 'admin' || user.role === 'superadmin') return true;
    if (!permission) return true;
    return (user.permissions || []).includes(permission);
  };

  return (
    <UserContext.Provider
      value={{ user, isAuthenticated: !!user, loading, login, logout, can, refreshUser }}
    >
      {children}
    </UserContext.Provider>
  );
};

export default function useUserContext() {
  return useContext(UserContext);
}
