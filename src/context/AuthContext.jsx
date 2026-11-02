import React, { createContext, useContext, useState, useEffect } from 'react';
import { authApi } from '../api/client';

const AuthContext = createContext(null);

function parseJwt(token) {
  try {
    const base64Url = token.split('.')[1];
    if (!base64Url) return null;
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(
      window
        .atob(base64)
        .split('')
        .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join('')
    );
    return JSON.parse(jsonPayload);
  } catch {
    return null;
  }
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    const saved = localStorage.getItem('user');
    try {
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });
  const [token, setToken] = useState(() => localStorage.getItem('token'));
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const storedToken = localStorage.getItem('token');
    const storedUser = localStorage.getItem('user');

    if (storedToken) {
      setToken(storedToken);
      if (storedUser) {
        try {
          setUser(JSON.parse(storedUser));
        } catch {
          setUser({ email: 'usuario@onesports.com', name: 'Administrador' });
        }
      } else {
        const decoded = parseJwt(storedToken);
        const email = decoded?.sub || 'admin@onesports.com';
        const fallbackUser = {
          email,
          name: email.split('@')[0].toUpperCase(),
          role: decoded?.role || 'ADMIN',
        };
        setUser(fallbackUser);
        localStorage.setItem('user', JSON.stringify(fallbackUser));
      }
    } else {
      setUser(null);
      setToken(null);
    }
    setLoading(false);
  }, []);

  const login = async (email, password) => {
    const response = await authApi.login({ email, password });
    const jwtToken = response.accessToken || response.token;
    if (!jwtToken) {
      throw new Error('No se recibió token de autenticación del servidor');
    }

    const decoded = parseJwt(jwtToken);
    const resolvedEmail = decoded?.sub || email;
    const resolvedUser = {
      email: resolvedEmail,
      name: decoded?.name || resolvedEmail.split('@')[0].toUpperCase(),
      role: decoded?.role || 'ADMIN',
      tokenType: response.tokenType || response.type || 'Bearer',
      expiresAt: response.expiresAt,
    };

    localStorage.setItem('token', jwtToken);
    localStorage.setItem('user', JSON.stringify(resolvedUser));

    setToken(jwtToken);
    setUser(resolvedUser);

    return resolvedUser;
  };

  const register = async (name, email, password) => {
    return await authApi.register({ name, email, password });
  };

  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setToken(null);
    setUser(null);
  };

  const value = {
    user,
    token,
    loading,
    isAuthenticated: !!token,
    login,
    register,
    logout,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth debe ser usado dentro de un AuthProvider');
  }
  return context;
}

