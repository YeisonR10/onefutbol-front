/**
 * Centralized HTTP Client using native fetch.
 * Handles JWT token injection, 401 redirection, and backend error extraction.
 */

const BASE_URL = ''; // Relative path leverages Vite proxy to http://localhost:8181

async function request(endpoint, options = {}) {
  const url = endpoint.startsWith('http') ? endpoint : `${BASE_URL}${endpoint}`;
  const token = localStorage.getItem('token');

  const headers = {
    'Content-Type': 'application/json',
    ...(options.headers || {}),
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const config = {
    credentials: 'include',
    ...options,
    headers,
  };

  if (config.body && typeof config.body === 'object' && !(config.body instanceof FormData)) {
    config.body = JSON.stringify(config.body);
  }

  try {
    const response = await fetch(url, config);

    // Handle 401 Unauthorized
    if (response.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      if (window.location.pathname !== '/login') {
        window.location.href = '/login';
      }
      throw new Error('Sesión expirada o no autorizada. Por favor inicie sesión.');
    }

    // Handle 204 No Content
    if (response.status === 204) {
      return null;
    }

    // Parse JSON or text
    const contentType = response.headers.get('content-type') || '';
    let data = null;
    if (contentType.includes('application/json')) {
      data = await response.json().catch(() => null);
    } else {
      const text = await response.text().catch(() => null);
      if (text) {
        try {
          data = JSON.parse(text);
        } catch {
          data = text;
        }
      }
    }

    // Handle 202 Accepted (Two-Factor Authentication required)
    if (response.status === 202) {
      const challengeId = response.headers.get('X-2FA-Challenge-Id');
      return {
        requires2FA: true,
        challengeId,
        ...(typeof data === 'object' && data !== null ? data : {}),
      };
    }

    if (!response.ok) {
      let errorMsg = 'Error en la solicitud';
      if (data) {
        if (typeof data === 'string') {
          errorMsg = data;
        } else if (data.message) {
          errorMsg = data.message;
        } else if (data.error) {
          errorMsg = data.error;
        } else if (typeof data === 'object') {
          // Spring Boot validation errors format: { fieldName: "validation message" }
          const fieldErrors = Object.entries(data)
            .map(([field, msg]) => `${field}: ${msg}`)
            .join(' | ');
          errorMsg = fieldErrors || `Error HTTP ${response.status}`;
        }
      } else {
        errorMsg = response.statusText || `Error HTTP ${response.status}`;
      }
      throw new Error(errorMsg);
    }

    return data;
  } catch (error) {
    if (error.name === 'TypeError' && error.message.includes('fetch')) {
      throw new Error('No se pudo conectar con el servidor backend (http://localhost:8181). Verifique que esté en ejecución.');
    }
    throw error;
  }
}

export const client = {
  get: (endpoint, options) => request(endpoint, { ...options, method: 'GET' }),
  post: (endpoint, body, options) => request(endpoint, { ...options, method: 'POST', body }),
  put: (endpoint, body, options) => request(endpoint, { ...options, method: 'PUT', body }),
  patch: (endpoint, body, options) => request(endpoint, { ...options, method: 'PATCH', body }),
  delete: (endpoint, options) => request(endpoint, { ...options, method: 'DELETE' }),
};

/* Specific API Services */
export const authApi = {
  login: (credentials) => client.post('/api/auth/login', credentials),
  createOAuthState: (provider) => client.post(`/api/auth/oauth/${provider}/state`, {}),
  exchangeOAuthCode: (provider, data) => client.post(`/api/auth/oauth/${provider}`, data),
  verify2FA: (data, challengeId) =>
    client.post('/api/auth/2fa/verify', data, {
      headers: challengeId ? { 'X-2FA-Challenge-Id': challengeId } : {},
    }),
  register: (userData) => client.post('/api/auth/register', userData),
  forgotPassword: (email) => client.post('/api/auth/forgot-password', { email }),
  verifyResetCode: (email, code) => client.post('/api/auth/reset-password/verify', { email, code }),
  confirmResetPassword: (resetToken, newPassword) =>
    client.post('/api/auth/reset-password/confirm', { resetToken, newPassword }),
};

export const usersApi = {
  getAll: () => client.get('/api/users'),
  getWithoutRoles: () => client.get('/api/users/without-roles'),
  getById: (id) => client.get(`/api/users/${id}`),
  getDetail: (id) => client.get(`/api/users/${id}/detail`),
  getWithRoles: (id) => client.get(`/api/users/${id}/detail-with-roles`),
  getWithSessions: (id) => client.get(`/api/users/${id}/detail-with-sessions`),
  create: (data) => client.post('/api/users', data),
  update: (id, data) => client.put(`/api/users/${id}`, data),
  delete: (id) => client.delete(`/api/users/${id}`),
  deactivate: (id) => client.patch(`/api/users/${id}/deactivate`),
  activate: (id) => client.patch(`/api/users/${id}/activate`),
  activate2FA: (id) => client.patch(`/api/users/${id}/2fa/activate`),
  deactivate2FA: (id) => client.patch(`/api/users/${id}/2fa/desactivate`),
  updateOwnTwoFA: (enabled) => client.put('/api/users/me/2fa', { enabled }),
};

export const profileApi = {
  getByUserId: (userId) => client.get(`/api/users/${userId}/profile`),
  create: (userId, data) => client.post(`/api/users/${userId}/profile`, data),
  update: (userId, data) => client.put(`/api/users/${userId}/profile`, data),
  delete: (userId) => client.delete(`/api/users/${userId}/profile`),
};

export const rolesApi = {
  getAll: () => client.get('/api/roles'),
  getById: (id) => client.get(`/api/roles/${id}`),
  getWithPermissions: (id) => client.get(`/api/roles/${id}/detail-with-permissions`),
  create: (data) => client.post('/api/roles', data),
  update: (id, data) => client.put(`/api/roles/${id}`, data),
  delete: (id) => client.delete(`/api/roles/${id}`),
};

function normalizePermissionMethod(permission) {
  const url = permission.url?.replace(/\/+$/, '');
  if (/\/[^/]+\/2fa\/(?:activate|desactivate)$/i.test(url || '')) {
    return { ...permission, method: 'PATCH' };
  }
  return permission;
}

export const permissionsApi = {
  getAll: async () => {
    const permissions = await client.get('/api/permissions');
    return (permissions || []).map(normalizePermissionMethod);
  },
  getById: (id) => client.get(`/api/permissions/${id}`),
  create: (data) => client.post('/api/permissions', data),
  update: (id, data) => client.put(`/api/permissions/${id}`, data),
  delete: (id) => client.delete(`/api/permissions/${id}`),
};

export const rolePermissionsApi = {
  getAll: () => client.get('/api/role-permissions'),
  assign: (data) => client.post('/api/role-permissions', data),
  getByRoleId: (roleId) => client.get(`/api/role-permissions/roles/${roleId}`),
  getByPermissionId: (permId) => client.get(`/api/role-permissions/permissions/${permId}`),
  remove: (roleId, permissionId) => client.delete(`/api/role-permissions/${roleId}/${permissionId}`),
};

export const userRolesApi = {
  getAll: () => client.get('/api/user-roles'),
  assign: (data) => client.post('/api/user-roles', data),
  getByUserId: (userId) => client.get(`/api/user-roles/users/${userId}`),
  getByRoleId: (roleId) => client.get(`/api/user-roles/roles/${roleId}`),
  remove: (userId, roleId) => client.delete(`/api/user-roles/${userId}/${roleId}`),
};

export const sessionsApi = {
  getByUserId: (userId) => client.get(`/api/users/${userId}/sessions`),
  create: (userId, data) => client.post(`/api/users/${userId}/sessions`, data),
  getById: (userId, sessionId) => client.get(`/api/users/${userId}/sessions/${sessionId}`),
  update: (userId, sessionId, data) => client.put(`/api/users/${userId}/sessions/${sessionId}`, data),
  delete: (userId, sessionId) => client.delete(`/api/users/${userId}/sessions/${sessionId}`),
};

export default client;
