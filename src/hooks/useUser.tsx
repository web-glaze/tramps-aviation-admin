import React, { createContext, useContext, useState, ReactNode, useEffect } from 'react';
import { authApi } from '../api';

interface User {
  _id: string;
  name: string;
  email: string;
  role: string;
  avatar?: string;
}

interface UserContextType {
  user: User | null;
  isAuthenticated: boolean;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
}

const UserContext = createContext<UserContextType>({} as UserContextType);

export const UserProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(() => {
    const stored = localStorage.getItem('admin_user');
    return stored ? JSON.parse(stored) : null;
  });
  const [loading, setLoading] = useState(false);

  const login = async (email: string, password: string) => {
    setLoading(true);
    try {
      const res = await authApi.login(email, password);
      const { token, user: userData } = res.data?.data || res.data;
      localStorage.setItem('admin_token', token);
      localStorage.setItem('admin_user', JSON.stringify(userData));
      setUser(userData);
    } finally {
      setLoading(false);
    }
  };

  const logout = () => {
    localStorage.removeItem('admin_token');
    localStorage.removeItem('admin_user');
    setUser(null);
  };

  return (
    <UserContext.Provider value={{ user, isAuthenticated: !!user, loading, login, logout }}>
      {children}
    </UserContext.Provider>
  );
};

export default function useUserContext() {
  return useContext(UserContext);
}
