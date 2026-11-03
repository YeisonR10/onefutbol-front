import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  Trophy,
  Mail,
  Lock,
  Eye,
  EyeOff,
  ShieldCheck,
  AlertCircle,
  KeyRound,
  ArrowLeft,
  Github,
  Chrome,
  CheckCircle2,
  RefreshCw,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../components/common/Toast';
import { authApi } from '../../api/client';

function base64Url(bytes) {
  let binary = '';
  for (const byte of new Uint8Array(bytes)) binary += String.fromCharCode(byte);
  return window.btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
}

async function createPkcePair() {
  const random = crypto.getRandomValues(new Uint8Array(32));
  const verifier = base64Url(random);
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(verifier));
  return { verifier, challenge: base64Url(digest) };
}

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [twoFA, setTwoFA] = useState(false);
  const [isRegistering, setIsRegistering] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [loading, setLoading] = useState(false);

  // 2FA state
  const [is2FAStep, setIs2FAStep] = useState(false);
  const [twoFACode, setTwoFACode] = useState('');
  const [challengeId, setChallengeId] = useState('');

  // Password Recovery state: null | 'email' | 'code' | 'new_password'
  const [recoveryStep, setRecoveryStep] = useState(null);
  const [recoveryEmail, setRecoveryEmail] = useState('');
  const [recoveryCode, setRecoveryCode] = useState('');
  const [resetToken, setResetToken] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [resendingCode, setResendingCode] = useState(false);

  const { login, verify2FA, register, isAuthenticated } = useAuth();
  const { showToast } = useToast();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    if (isAuthenticated) {
      const origin = location.state?.from?.pathname || '/';
      navigate(origin, { replace: true });
    }
  }, [isAuthenticated, navigate, location]);

  const handleStartRecovery = () => {
    setRecoveryStep('email');
    setRecoveryEmail(email.trim());
    setRecoveryCode('');
    setResetToken('');
    setNewPassword('');
    setConfirmPassword('');
    setErrorMessage('');
    setIsRegistering(false);
    setIs2FAStep(false);
  };

  const handleCancelRecovery = () => {
    setRecoveryStep(null);
    setRecoveryCode('');
    setResetToken('');
    setNewPassword('');
    setConfirmPassword('');
    setErrorMessage('');
  };

  // Enviar código de recuperación
  const handleSendRecoveryCode = async (e) => {
    e.preventDefault();
    setErrorMessage('');

    if (!recoveryEmail.trim()) {
      setErrorMessage('Por favor ingresa tu correo electrónico.');
      return;
    }

    setLoading(true);
    try {
      await authApi.forgotPassword(recoveryEmail.trim());
      showToast('Si el correo está registrado, recibirás un código de 6 dígitos.', 'info');
      setRecoveryStep('code');
    } catch (err) {
      const msg = err.message || 'Error al solicitar código de recuperación.';
      setErrorMessage(msg);
      showToast(msg, 'error');
    } finally {
      setLoading(false);
    }
  };

  // Reenviar código
  const handleResendRecoveryCode = async () => {
    setErrorMessage('');
    setResendingCode(true);
    try {
      await authApi.forgotPassword(recoveryEmail.trim());
      showToast('Código de recuperación reenviado.', 'info');
    } catch (err) {
      const msg = err.message || 'Error al reenviar el código.';
      setErrorMessage(msg);
      showToast(msg, 'error');
    } finally {
      setResendingCode(false);
    }
  };

  // Verificar código de recuperación
  const handleVerifyRecoveryCode = async (e) => {
    e.preventDefault();
    setErrorMessage('');

    if (!recoveryCode.trim() || recoveryCode.trim().length !== 6) {
      setErrorMessage('Por favor ingresa el código de 6 dígitos.');
      return;
    }

    setLoading(true);
    try {
      const data = await authApi.verifyResetCode(recoveryEmail.trim(), recoveryCode.trim());
      if (data?.resetToken) {
        setResetToken(data.resetToken);
        setRecoveryStep('new_password');
        showToast('Código verificado con éxito. Ingresa tu nueva contraseña.', 'success');
      } else {
        throw new Error('Respuesta del servidor inválida.');
      }
    } catch (err) {
      const msg = err.message || 'Código de verificación incorrecto o expirado.';
      setErrorMessage(msg);
      showToast(msg, 'error');
    } finally {
      setLoading(false);
    }
  };

  // Confirmar nueva contraseña
  const handleConfirmNewPassword = async (e) => {
    e.preventDefault();
    setErrorMessage('');

    if (!newPassword || newPassword.length < 8) {
      setErrorMessage('La contraseña debe tener al menos 8 caracteres.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setErrorMessage('Las contraseñas no coinciden.');
      return;
    }

    setLoading(true);
    try {
      await authApi.confirmResetPassword(resetToken, newPassword);
      showToast('¡Contraseña restablecida exitosamente! Ya puedes iniciar sesión.', 'success');
      setEmail(recoveryEmail);
      setPassword('');
      handleCancelRecovery();
    } catch (err) {
      const msg = err.message || 'No se pudo restablecer la contraseña. El enlace puede haber expirado.';
      setErrorMessage(msg);
      showToast(msg, 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMessage('');

    if (isRegistering) {
      if (!name.trim() || !email.trim() || !password) {
        setErrorMessage('Por favor complete el nombre, correo electrónico y contraseña.');
        return;
      }

      setLoading(true);
      try {
        await register(name.trim(), email.trim(), password, twoFA);
        showToast('Cuenta registrada correctamente. Ya puede iniciar sesión.', 'success');
        setIsRegistering(false);
        setPassword('');
      } catch (err) {
        const msg = err.message || 'No se pudo registrar la cuenta.';
        setErrorMessage(msg);
        showToast(msg, 'error');
      } finally {
        setLoading(false);
      }
      return;
    }

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

  const handleToggleRegistration = () => {
    setIsRegistering((prev) => !prev);
    setErrorMessage('');
    setPassword('');
  };

  const handleOAuthLogin = async (provider) => {
    setErrorMessage('');
    const clientId = provider === 'google'
      ? import.meta.env.VITE_GOOGLE_CLIENT_ID
      : import.meta.env.VITE_GITHUB_CLIENT_ID;
    if (!clientId) {
      setErrorMessage(`Falta configurar VITE_${provider.toUpperCase()}_CLIENT_ID en el frontend.`);
      return;
    }

    setLoading(true);
    try {
      const { state } = await authApi.createOAuthState(provider);
      const { verifier, challenge } = await createPkcePair();
      const redirectUri = `${window.location.origin}/auth/callback/${provider}`;
      sessionStorage.setItem(`oauth_${provider}_state`, state);
      sessionStorage.setItem(`oauth_${provider}_verifier`, verifier);
      sessionStorage.setItem('oauth_return_to', location.state?.from?.pathname || '/');

      const authorizationUrl = provider === 'google'
        ? new URL('https://accounts.google.com/o/oauth2/v2/auth')
        : new URL('https://github.com/login/oauth/authorize');
      const params = authorizationUrl.searchParams;
      params.set('client_id', clientId);
      params.set('redirect_uri', redirectUri);
      params.set('response_type', 'code');
      params.set('state', state);
      params.set('code_challenge', challenge);
      params.set('code_challenge_method', 'S256');
      params.set('scope', provider === 'google' ? 'openid email profile' : 'read:user user:email');
      if (provider === 'google') params.set('prompt', 'select_account');
      window.location.assign(authorizationUrl.toString());
    } catch (error) {
      const message = error.message || `No se pudo iniciar sesión con ${provider}.`;
      setErrorMessage(message);
      showToast(message, 'error');
      setLoading(false);
    }
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

      {/* Main Card */}
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
            {recoveryStep ? (
              <KeyRound size={36} strokeWidth={2.4} />
            ) : is2FAStep ? (
              <ShieldCheck size={36} strokeWidth={2.4} />
            ) : (
              <Trophy size={36} strokeWidth={2.4} />
            )}
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
            {recoveryStep
              ? 'Recuperación de Contraseña'
              : is2FAStep
                ? 'Verificación en Dos Pasos (2FA)'
                : isRegistering
                  ? 'Crear una cuenta'
                  : 'Plataforma de Autenticación y Control de Acceso'}
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

        {/* =================================================================== */}
        {/* RECOVERY FLOW                                                       */}
        {/* =================================================================== */}
        {recoveryStep ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            {/* Paso 1: Ingreso de Correo */}
            {recoveryStep === 'email' && (
              <form onSubmit={handleSendRecoveryCode} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                <div
                  style={{
                    padding: '12px 14px',
                    backgroundColor: 'rgba(59, 130, 246, 0.1)',
                    border: '1px solid rgba(59, 130, 246, 0.25)',
                    borderRadius: '8px',
                    fontSize: '0.85rem',
                    color: '#93c5fd',
                    lineHeight: '1.4',
                  }}
                >
                  Ingresa el correo electrónico asociado a tu cuenta. Te enviaremos un código de seguridad de 6 dígitos para restablecer tu contraseña.
                </div>

                <div>
                  <label htmlFor="recovery-email">Correo Electrónico Registrado</label>
                  <div style={{ position: 'relative' }}>
                    <input
                      id="recovery-email"
                      type="email"
                      required
                      placeholder="ej. usuario@onesports.com"
                      value={recoveryEmail}
                      onChange={(e) => setRecoveryEmail(e.target.value)}
                      autoComplete="email"
                      autoFocus
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

                <button
                  type="submit"
                  className="btn btn-primary btn-lg"
                  disabled={loading}
                  style={{ width: '100%', fontSize: '0.98rem', fontWeight: 700 }}
                >
                  {loading ? (
                    <>
                      <span className="spinner" style={{ borderTopColor: '#000' }}></span>
                      <span>Enviando código...</span>
                    </>
                  ) : (
                    'Enviar código de recuperación'
                  )}
                </button>

                <button
                  type="button"
                  onClick={handleCancelRecovery}
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
                  }}
                >
                  <ArrowLeft size={16} /> Volver al inicio de sesión
                </button>
              </form>
            )}

            {/* Paso 2: Ingreso de Código de 6 dígitos */}
            {recoveryStep === 'code' && (
              <form onSubmit={handleVerifyRecoveryCode} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
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
                  Hemos enviado un código de 6 dígitos al correo <strong>{recoveryEmail}</strong>. Ingrésalo a continuación para continuar.
                </div>

                <div>
                  <label htmlFor="recovery-code">Código de Verificación (6 dígitos)</label>
                  <div style={{ position: 'relative' }}>
                    <input
                      id="recovery-code"
                      type="text"
                      required
                      maxLength={6}
                      placeholder="123456"
                      value={recoveryCode}
                      onChange={(e) => setRecoveryCode(e.target.value.replace(/\D/g, ''))}
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
                  disabled={loading || recoveryCode.length < 6}
                  style={{ width: '100%', fontSize: '0.98rem', fontWeight: 700 }}
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

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '-4px' }}>
                  <button
                    type="button"
                    onClick={() => setRecoveryStep('email')}
                    disabled={loading}
                    style={{
                      background: 'transparent',
                      border: 'none',
                      color: 'var(--text-secondary)',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px',
                      fontSize: '0.82rem',
                      cursor: 'pointer',
                      padding: '4px',
                    }}
                  >
                    <ArrowLeft size={14} /> Cambiar correo
                  </button>

                  <button
                    type="button"
                    onClick={handleResendRecoveryCode}
                    disabled={resendingCode || loading}
                    style={{
                      background: 'transparent',
                      border: 'none',
                      color: 'var(--accent)',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px',
                      fontSize: '0.82rem',
                      cursor: 'pointer',
                      padding: '4px',
                    }}
                  >
                    <RefreshCw size={14} className={resendingCode ? 'spinner' : ''} />
                    {resendingCode ? 'Reenviando...' : 'Reenviar código'}
                  </button>
                </div>
              </form>
            )}

            {/* Paso 3: Ingreso de Nueva Contraseña */}
            {recoveryStep === 'new_password' && (
              <form onSubmit={handleConfirmNewPassword} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                <div
                  style={{
                    padding: '12px 14px',
                    backgroundColor: 'rgba(34, 197, 94, 0.08)',
                    border: '1px solid rgba(34, 197, 94, 0.25)',
                    borderRadius: '8px',
                    fontSize: '0.85rem',
                    color: '#86efac',
                    lineHeight: '1.4',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                  }}
                >
                  <CheckCircle2 size={18} color="var(--accent)" style={{ flexShrink: 0 }} />
                  <span>Código validado correctamente. Ingresa tu nueva contraseña para <strong>{recoveryEmail}</strong>.</span>
                </div>

                <div>
                  <label htmlFor="new-password">Nueva Contraseña (mínimo 8 caracteres)</label>
                  <div style={{ position: 'relative' }}>
                    <input
                      id="new-password"
                      type={showNewPassword ? 'text' : 'password'}
                      required
                      placeholder="••••••••••••"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      autoComplete="new-password"
                      autoFocus
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
                      onClick={() => setShowNewPassword(!showNewPassword)}
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
                      title={showNewPassword ? 'Ocultar contraseña' : 'Ver contraseña'}
                    >
                      {showNewPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                </div>

                <div>
                  <label htmlFor="confirm-password">Confirmar Nueva Contraseña</label>
                  <div style={{ position: 'relative' }}>
                    <input
                      id="confirm-password"
                      type={showNewPassword ? 'text' : 'password'}
                      required
                      placeholder="••••••••••••"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      autoComplete="new-password"
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
                  </div>
                </div>

                <button
                  type="submit"
                  className="btn btn-primary btn-lg"
                  disabled={loading || newPassword.length < 8}
                  style={{ width: '100%', fontSize: '0.98rem', fontWeight: 700 }}
                >
                  {loading ? (
                    <>
                      <span className="spinner" style={{ borderTopColor: '#000' }}></span>
                      <span>Guardando contraseña...</span>
                    </>
                  ) : (
                    'Restablecer Contraseña'
                  )}
                </button>

                <button
                  type="button"
                  onClick={handleCancelRecovery}
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
                  }}
                >
                  <ArrowLeft size={16} /> Cancelar y volver al inicio
                </button>
              </form>
            )}
          </div>
        ) : (
          /* =================================================================== */
          /* NORMAL LOGIN / REGISTRATION / 2FA FORM                              */
          /* =================================================================== */
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            {!is2FAStep ? (
              <>
                {isRegistering && (
                  <div>
                    <label htmlFor="register-name">Nombre completo</label>
                    <input
                      id="register-name"
                      type="text"
                      required
                      placeholder="Tu nombre"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      autoComplete="name"
                    />
                  </div>
                )}

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
                    <label htmlFor="login-password" style={{ margin: 0 }}>Contraseña</label>
                    {!isRegistering && (
                      <button
                        type="button"
                        onClick={handleStartRecovery}
                        style={{
                          background: 'transparent',
                          border: 'none',
                          color: 'var(--accent)',
                          cursor: 'pointer',
                          fontSize: '0.8rem',
                          padding: 0,
                        }}
                      >
                        ¿Olvidaste tu contraseña?
                      </button>
                    )}
                  </div>
                  <div style={{ position: 'relative', marginTop: '6px' }}>
                    <input
                      id="login-password"
                      type={showPassword ? 'text' : 'password'}
                      required
                      placeholder="••••••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      autoComplete={isRegistering ? 'new-password' : 'current-password'}
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

                {isRegistering && (
                  <label
                    htmlFor="register-two-fa"
                    style={{
                      display: 'flex',
                      alignItems: 'flex-start',
                      gap: '10px',
                      color: 'var(--text-secondary)',
                      fontSize: '0.86rem',
                      lineHeight: 1.4,
                      cursor: 'pointer',
                    }}
                  >
                    <input
                      id="register-two-fa"
                      type="checkbox"
                      checked={twoFA}
                      onChange={(e) => setTwoFA(e.target.checked)}
                      style={{ width: '16px', height: '16px', marginTop: '2px' }}
                    />
                    <span>Activar segundo factor de autenticación (2FA)</span>
                  </label>
                )}

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
                      <span>{isRegistering ? 'Registrando cuenta...' : 'Iniciando sesión...'}</span>
                    </>
                  ) : (
                    isRegistering ? 'Crear cuenta' : 'Iniciar sesión'
                  )}
                </button>

                {!isRegistering && (
                  <>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12, color: 'var(--text-muted)', fontSize: '0.78rem' }}>
                      <span style={{ height: 1, flex: 1, background: 'var(--border)' }} />
                      <span>O continúa con</span>
                      <span style={{ height: 1, flex: 1, background: 'var(--border)' }} />
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginTop: -8 }}>
                      <button
                        type="button"
                        className="btn btn-outline"
                        onClick={() => handleOAuthLogin('google')}
                        disabled={loading}
                        style={{ minHeight: 44, width: '100%' }}
                      >
                        <Chrome size={18} /> Google
                      </button>
                      <button
                        type="button"
                        className="btn btn-outline"
                        onClick={() => handleOAuthLogin('github')}
                        disabled={loading}
                        style={{ minHeight: 44, width: '100%' }}
                      >
                        <Github size={18} /> GitHub
                      </button>
                    </div>
                  </>
                )}

                <button
                  type="button"
                  onClick={handleToggleRegistration}
                  disabled={loading}
                  style={{
                    background: 'transparent',
                    border: 'none',
                    color: 'var(--accent)',
                    cursor: 'pointer',
                    fontSize: '0.86rem',
                    padding: '6px',
                  }}
                >
                  {isRegistering ? '¿Ya tienes una cuenta? Inicia sesión' : '¿No tienes cuenta? Regístrate'}
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
        )}

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
