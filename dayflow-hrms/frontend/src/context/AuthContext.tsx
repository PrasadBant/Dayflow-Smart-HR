import React, { createContext, useContext, useState, useEffect } from 'react';
import type { User, Employee, Role } from '@shared/types';
import { AUTH_TOKEN_STORAGE_KEY, setAuthToken as setApiClientAuthToken } from '../api-client/client';

interface AuthContextType {
  user: User | null;
  employee: Employee | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (token: string, user: User, employee?: Employee | null) => void;
  logout: () => void;
  hasRole: (role: Role) => boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const TOKEN_KEY = AUTH_TOKEN_STORAGE_KEY;
const USER_KEY = 'dayflow_auth_user';
const EMPLOYEE_KEY = 'dayflow_auth_employee';

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [token, setToken] = useState<string | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [employee, setEmployee] = useState<Employee | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    try {
      const storedToken = localStorage.getItem(TOKEN_KEY);
      const storedUser = localStorage.getItem(USER_KEY);
      const storedEmployee = localStorage.getItem(EMPLOYEE_KEY);

      if (storedToken && storedUser) {
        setToken(storedToken);
        setUser(JSON.parse(storedUser));
        if (storedEmployee) {
          setEmployee(JSON.parse(storedEmployee));
        }
      }
    } catch (e) {
      console.error('Failed to restore auth session', e);
      localStorage.removeItem(TOKEN_KEY);
      localStorage.removeItem(USER_KEY);
      localStorage.removeItem(EMPLOYEE_KEY);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Global self-healing: client.ts dispatches this the moment ANY request
  // comes back 401 (stale token, expired, or signed by a backend instance
  // we're no longer talking to). Clearing state here — rather than leaving
  // it to whichever page happened to be open — means RequireAuth's own
  // `isAuthenticated` check redirects to /login on the very next render,
  // from anywhere in the app, with no manual retry or page-specific
  // error-handling needed.
  useEffect(() => {
    const handleAuthInvalid = () => {
      setToken(null);
      setUser(null);
      setEmployee(null);
      localStorage.removeItem(USER_KEY);
      localStorage.removeItem(EMPLOYEE_KEY);
    };
    window.addEventListener('dayflow:auth-invalid', handleAuthInvalid);
    return () => window.removeEventListener('dayflow:auth-invalid', handleAuthInvalid);
  }, []);

  const login = (newToken: string, newUser: User, newEmployee?: Employee | null) => {
    setToken(newToken);
    setUser(newUser);
    setEmployee(newEmployee || null);

    setApiClientAuthToken(newToken); // single source of truth for the api-client's token
    localStorage.setItem(USER_KEY, JSON.stringify(newUser));
    if (newEmployee) {
      localStorage.setItem(EMPLOYEE_KEY, JSON.stringify(newEmployee));
    }
  };

  const logout = () => {
    setToken(null);
    setUser(null);
    setEmployee(null);

    setApiClientAuthToken(null);
    localStorage.removeItem(USER_KEY);
    localStorage.removeItem(EMPLOYEE_KEY);
  };

  const hasRole = (role: Role): boolean => {
    return user?.role === role;
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        employee,
        token,
        isAuthenticated: !!token && !!user,
        isLoading,
        login,
        logout,
        hasRole,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
