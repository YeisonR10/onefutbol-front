import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Trophy, Mail, Lock, Eye, EyeOff, ShieldCheck, AlertCircle, KeyRound, ArrowLeft } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../components/common/Toast';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [loading, setLoading] = useState(false);

  // 2FA state
  const [is2FAStep, setIs2FAStep] = useState(false);
  const [twoFACode, setTwoFACode] = useState('');
  const [challengeId, setChallengeId] = useState('');

  const { login, verify2FA, isAuthenticated } = useAuth();
  const { showToast } = useToast();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    if (isAuthenticated) {
      const origin = location.state?.from?.pathname || '/';
      navigate(origin, { replace: true });
    }
  }, [isAuthenticated, navigate, location]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMessage('');

    if (is2FAStep) {
      if (!twoFACode.trim()) {
        setErrorMessage('Por favor ingrese el código de verificación.');
        return;
      }

      setLoading(true);
      try {
        await verify2FA(twoFACode.trim(), challengeId, email.trim());
        showToast('¡Bienvenido a OneSports Security!', 'success');
        navigate('/');
      } catch (err) {
        const msg = err.message || 'Código de verificación inválido, expirado o ya utilizado.';
        setErrorMessage(msg);
        showToast(msg, 'error');
      } finally {
        setLoading(false);
      }
      return;
    }

    if (!email.trim() || !password) {
      setErrorMessage('Por favor ingrese su correo electrónico y contraseña.');
      return;
    }

    setLoading(true);
    try {
      const result = await login(email.trim(), password);
      if (result?.requires2FA) {
        setIs2FAStep(true);
        setChallengeId(result.challengeId || '');
        showToast('Código de verificación 2FA enviado al correo.', 'info');
      } else {
        showToast('¡Bienvenido a OneSports Security!', 'success');
        navigate('/');
      }
    } catch (err) {
      const msg = err.message || 'Credenciales inválidas o error en el servidor.';
      setErrorMessage(msg);
      showToast(msg, 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleBackToLogin = () => {
    setIs2FAStep(false);
    setTwoFACode('');
    setErrorMessage('');
  };

  return (
    <div
      style={{
        minHeight: '100vh',
        width: '100%',
        backgroundColor: '#0a0f1e',
        backgroundImage: `
          radial-gradient(circle at 50% 20%, rgba(34, 197, 94, 0.12) 0%, transparent 50%),
          radial-gradient(circle at 80% 80%, rgba(30, 58, 95, 0.25) 0%, transparent 40%),
          radial-gradient(circle at 20% 80%, rgba(13, 21, 38, 0.8) 0%, transparent 50%)
        `,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '24px',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {/* Decorative Pitch / Grid lines */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          backgroundImage: `
            linear-gradient(to right, rgba(30, 58, 95, 0.15) 1px, transparent 1px),
            linear-gradient(to bottom, rgba(30, 58, 95, 0.15) 1px, transparent 1px)
          `,
          backgroundSize: '40px 40px',
          pointerEvents: 'none',
          opacity: 0.6,
        }}
      />

      {/* Login Card */}
      <div
        className="animate-slide-up"
        style={{
          position: 'relative',
          width: '100%',
          maxWidth: '440px',
          backgroundColor: '#111827',
          border: '1px solid #1e3a5f',
          borderRadius: '16px',
          boxShadow: '0 25px 60px -15px rgba(0, 0, 0, 0.85), 0 0 30px rgba(34, 197, 94, 0.1)',
          padding: '40px 36px',
          zIndex: 10,
        }}
      >
        {/* Brand Header */}
        <div style={{ textAlign: 'center', marginBottom: '32px' }}>
          <div
            style={{
              width: '64px',
              height: '64px',
              borderRadius: '16px',
              background: 'linear-gradient(135deg, #22c55e 0%, #15803d 100%)',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#000000',
              boxShadow: '0 0 25px rgba(34, 197, 94, 0.45)',
              marginBottom: '16px',
            }}
          >
            {is2FAStep ? <ShieldCheck size={36} strokeWidth={2.4} /> : <Trophy size={36} strokeWidth={2.4} />}
          </div>

          <h1
            style={{
              fontSize: '1.8rem',
              fontWeight: 800,
              letterSpacing: '0.02em',
              color: '#ffffff',
              lineHeight: 1.2,
            }}
          >
            ONE<span style={{ color: 'var(--accent)' }}>SPORTS</span>
          </h1>

          <p
            style={{
              fontSize: '0.88rem',
              color: 'var(--text-secondary)',
              marginTop: '6px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px',
            }}
          >
            <ShieldCheck size={16} color="var(--accent)" />
            {is2FAStep ? 'Verificación en Dos Pasos (2FA)' : 'Plataforma de Autenticación y Control de Acceso'}
          </p>
        </div>

        {/* Error Alert */}
        {errorMessage && (
          <div
            className="animate-fade-in"
            style={{
              backgroundColor: 'rgba(239, 68, 68, 0.12)',
              border: '1px solid rgba(239, 68, 68, 0.35)',
              borderRadius: '8px',
              padding: '12px 14px',
              marginBottom: '20px',
              display: 'flex',
              alignItems: 'flex-start',
              gap: '10px',
              color: '#fca5a5',
              fontSize: '0.85rem',
            }}
          >
            <AlertCircle size={18} color="#ef4444" style={{ flexShrink: 0, marginTop: '2px' }} />
            <div style={{ flex: 1, wordBreak: 'break-word' }}>{errorMessage}</div>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {!is2FAStep ? (
            <>
              <div>
                <label htmlFor="login-email">Correo Electrónico</label>
                <div style={{ position: 'relative' }}>
                  <input
                    id="login-email"
                    type="email"
                    required
                    placeholder="ej. admin@onesports.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    autoComplete="email"
                    style={{ paddingLeft: '40px' }}
                  />
                  <Mail
                    size={18}
                    color="#64748b"
                    style={{
                      position: 'absolute',
                      left: '12px',
                      top: '50%',
                      transform: 'translateY(-50%)',
                      pointerEvents: 'none',
                    }}
                  />
                </div>
              </div>

              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <label htmlFor="login-password">Contraseña</label>
                </div>
                <div style={{ position: 'relative' }}>
                  <input
                    id="login-password"
                    type={showPassword ? 'text' : 'password'}
                    required
                    placeholder="••••••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    autoComplete="current-password"
                    style={{ paddingLeft: '40px', paddingRight: '40px' }}
                  />
                  <Lock
                    size={18}
                    color="#64748b"
                    style={{
                      position: 'absolute',
                      left: '12px',
                      top: '50%',
                      transform: 'translateY(-50%)',
                      pointerEvents: 'none',
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    style={{
                      position: 'absolute',
                      right: '12px',
                      top: '50%',
                      transform: 'translateY(-50%)',
                      background: 'transparent',
                      border: 'none',
                      color: '#64748b',
                      cursor: 'pointer',
                      display: 'flex',
                    }}
                    tabIndex="-1"
                    title={showPassword ? 'Ocultar contraseña' : 'Ver contraseña'}
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                className="btn btn-primary btn-lg"
                disabled={loading}
                style={{
                  marginTop: '8px',
                  width: '100%',
                  fontSize: '0.98rem',
                  fontWeight: 700,
                }}
              >
                {loading ? (
                  <>
                    <span className="spinner" style={{ borderTopColor: '#000' }}></span>
                    <span>Iniciando sesión...</span>
                  </>
                ) : (
                  'Iniciar sesión'
                )}
              </button>
            </>
          ) : (
            <>
              <div
                style={{
                  padding: '12px 14px',
                  backgroundColor: 'rgba(34, 197, 94, 0.08)',
                  border: '1px solid rgba(34, 197, 94, 0.25)',
                  borderRadius: '8px',
                  fontSize: '0.85rem',
                  color: '#86efac',
                  lineHeight: '1.4',
                }}
              >
                Se ha enviado un código de seguridad de 6 dígitos a tu correo electrónico. Ingrésalo a continuación para completar el acceso.
              </div>

              <div>
                <label htmlFor="login-2fa">Código de Verificación (6 dígitos)</label>
                <div style={{ position: 'relative' }}>
                  <input
                    id="login-2fa"
                    type="text"
                    required
                    maxLength={6}
                    placeholder="123456"
                    value={twoFACode}
                    onChange={(e) => setTwoFACode(e.target.value.replace(/\D/g, ''))}
                    autoComplete="one-time-code"
                    autoFocus
                    style={{
                      paddingLeft: '40px',
                      fontSize: '1.3rem',
                      letterSpacing: '0.3em',
                      textAlign: 'center',
                    }}
                  />
                  <KeyRound
                    size={18}
                    color="#64748b"
                    style={{
                      position: 'absolute',
                      left: '12px',
                      top: '50%',
                      transform: 'translateY(-50%)',
                      pointerEvents: 'none',
                    }}
                  />
                </div>
              </div>

              <button
                type="submit"
                className="btn btn-primary btn-lg"
                disabled={loading || twoFACode.length < 6}
                style={{
                  marginTop: '8px',
                  width: '100%',
                  fontSize: '0.98rem',
                  fontWeight: 700,
                }}
              >
                {loading ? (
                  <>
                    <span className="spinner" style={{ borderTopColor: '#000' }}></span>
                    <span>Verificando...</span>
                  </>
                ) : (
                  'Verificar código'
                )}
              </button>

              <button
                type="button"
                onClick={handleBackToLogin}
                disabled={loading}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: 'var(--text-secondary)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '6px',
                  fontSize: '0.86rem',
                  cursor: 'pointer',
                  padding: '6px',
                  marginTop: '-4px',
                }}
              >
                <ArrowLeft size={16} /> Volver a ingresar credenciales
              </button>
            </>
          )}
        </form>

        {/* Footer info */}
        <div
          style={{
            marginTop: '28px',
            paddingTop: '18px',
            borderTop: '1px solid #1e3a5f',
            textAlign: 'center',
            fontSize: '0.78rem',
            color: 'var(--text-muted)',
          }}
        >
          <span>OneSports Microservice Security &bull; Puerto 8181</span>
        </div>
      </div>
    </div>
  );
}
