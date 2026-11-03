import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { authApi, usersApi } from '../api/client';

const AuthContext = createContext(null);

const isNumericIdentifier = (value) => /^\d+$/.test(String(value ?? ''));

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

function resolveUser(decoded, email, response = {}) {
  const responseUser = response.user || response.data?.user || response.data || response;
  const subject = decoded?.sub;
  const resolvedEmail =
    [
      responseUser.email,
      responseUser.emailAddress,
      decoded?.email,
      decoded?.preferred_username,
      subject,
      email,
    ].find((value) => typeof value === 'string' && value.includes('@')) || '';
  const name =
    [responseUser.name, responseUser.fullName, decoded?.name, decoded?.fullName, decoded?.given_name]
      .find((value) => typeof value === 'string' && value.trim() && !isNumericIdentifier(value)) ||
    resolvedEmail.split('@')[0] ||
    'Usuario';
  const id =
    responseUser.id ??
    responseUser.userId ??
    response.userId ??
    decoded?.userId ??
    decoded?.user_id ??
    decoded?.id ??
    (isNumericIdentifier(subject) ? subject : undefined);

  return {
    ...(id !== undefined ? { id } : {}),
    email: resolvedEmail,
    name,
    role: responseUser.role || decoded?.role || 'ADMIN',
    tokenType: response.tokenType || response.type || 'Bearer',
    expiresAt: response.expiresAt,
  };
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
      const decoded = parseJwt(storedToken);
      if (storedUser) {
        try {
          const savedUser = JSON.parse(storedUser);
          setUser(resolveUser(decoded, savedUser.email, savedUser));
        } catch {
          setUser({ email: 'usuario@onesports.com', name: 'Administrador' });
        }
      } else {
        const fallbackUser = resolveUser(decoded, '');
        setUser(fallbackUser);
        localStorage.setItem('user', JSON.stringify(fallbackUser));
      }
    } else {
      setUser(null);
      setToken(null);
    }
    setLoading(false);
  }, []);

  const completeLogin = (jwtToken, email, response = {}) => {
    const decoded = parseJwt(jwtToken);
    const resolvedUser = resolveUser(decoded, email, response);

    localStorage.setItem('token', jwtToken);
    localStorage.setItem('user', JSON.stringify(resolvedUser));

    setToken(jwtToken);
    setUser(resolvedUser);

    return resolvedUser;
  };

  const refreshUserProfile = useCallback(async () => {
    if (!user?.id) return;

    const response = await usersApi.getById(user.id);
    const profile = response?.user || response?.data || response;
    if (!profile?.name) {
      throw new Error('El servidor no devolvió el nombre del usuario');
    }

    const updatedUser = { ...user, ...profile, id: profile.id ?? user.id };
    setUser(updatedUser);
    localStorage.setItem('user', JSON.stringify(updatedUser));
  }, [user]);

  const login = async (email, password) => {
    const response = await authApi.login({ email, password });

    if (response?.requires2FA) {
      return {
        requires2FA: true,
        challengeId: response.challengeId,
        email,
      };
    }

    const jwtToken = response.accessToken || response.token;
    if (!jwtToken) {
      throw new Error('No se recibió token de autenticación del servidor');
    }

    return completeLogin(jwtToken, email, response);
  };

  const verify2FA = async (code, challengeId, email) => {
    const response = await authApi.verify2FA({ code }, challengeId);
    const jwtToken = response.accessToken || response.token;
    if (!jwtToken) {
      throw new Error('No se recibió token de autenticación tras verificar el código 2FA');
    }

    return completeLogin(jwtToken, email, response);
  };

  const loginWithOAuth = async (provider, payload) => {
    const response = await authApi.exchangeOAuthCode(provider, payload);
    const jwtToken = response?.accessToken || response?.token;
    if (!jwtToken) {
      throw new Error('No se recibió el token de autenticación del proveedor');
    }
    const decoded = parseJwt(jwtToken);
    return completeLogin(jwtToken, decoded?.email || '', response);
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
    refreshUserProfile,
    login,
    verify2FA,
    loginWithOAuth,
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
