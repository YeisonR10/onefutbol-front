import React, { useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { AlertCircle, ShieldCheck } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

export default function OAuthCallbackPage() {
  const { provider } = useParams();
  const navigate = useNavigate();
  const { loginWithOAuth } = useAuth();
  const started = useRef(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (started.current) return;
    started.current = true;

    const params = new URLSearchParams(window.location.search);
    const code = params.get('code');
    const state = params.get('state');
    const providerError = params.get('error');
    window.history.replaceState({}, document.title, window.location.pathname);

    const finishLogin = async () => {
      if (!['google', 'github'].includes(provider)) {
        throw new Error('Proveedor de autenticación no reconocido.');
      }
      if (providerError) {
        throw new Error(providerError === 'access_denied'
          ? 'Cancelaste el inicio de sesión con el proveedor.'
          : 'El proveedor no pudo completar la autenticación.');
      }

      const stateKey = `oauth_${provider}_state`;
      const verifierKey = `oauth_${provider}_verifier`;
      const savedState = sessionStorage.getItem(stateKey);
      const codeVerifier = sessionStorage.getItem(verifierKey);
      if (!code || !state || !savedState || state !== savedState || !codeVerifier) {
        throw new Error('El desafío OAuth expiró o no coincide. Intenta iniciar sesión nuevamente.');
      }

      const redirectUri = `${window.location.origin}/auth/callback/${provider}`;
      await loginWithOAuth(provider, { code, redirectUri, codeVerifier, state });
      sessionStorage.removeItem(stateKey);
      sessionStorage.removeItem(verifierKey);
      const destination = sessionStorage.getItem('oauth_return_to') || '/';
      sessionStorage.removeItem('oauth_return_to');
      navigate(destination, { replace: true });
    };

    finishLogin().catch((loginError) => {
      sessionStorage.removeItem(`oauth_${provider}_state`);
      sessionStorage.removeItem(`oauth_${provider}_verifier`);
      setError(loginError.message || 'No se pudo completar el inicio de sesión.');
    });
  }, [loginWithOAuth, navigate, provider]);

  return (
    <main style={{ minHeight: '100vh', display: 'grid', placeItems: 'center', padding: 24, background: '#0a0f1e' }}>
      <section style={{ width: '100%', maxWidth: 440, padding: 36, borderRadius: 16, background: '#111827', border: '1px solid #1e3a5f', textAlign: 'center' }}>
        <ShieldCheck size={40} color="#22c55e" style={{ marginBottom: 16 }} />
        {error ? (
          <>
            <AlertCircle size={20} color="#ef4444" />
            <h1 style={{ margin: '10px 0', fontSize: '1.2rem' }}>No se pudo iniciar sesión</h1>
            <p style={{ color: '#94a3b8', marginBottom: 20 }}>{error}</p>
            <Link className="btn btn-primary" to="/login">Volver al login</Link>
          </>
        ) : (
          <>
            <h1 style={{ marginBottom: 8, fontSize: '1.2rem' }}>Verificando tu cuenta</h1>
            <p style={{ color: '#94a3b8' }}>Estamos completando el inicio de sesión con {provider}…</p>
          </>
        )}
      </section>
    </main>
  );
}
