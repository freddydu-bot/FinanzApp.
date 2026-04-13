import { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import './AuthPages.css';

export default function LoginPage() {
  const { login, register, isDemoMode, error: authError } = useAuth();
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState(isDemoMode ? 'carlos@demo.com' : '');
  const [password, setPassword] = useState(isDemoMode ? 'demo123' : '');
  const [displayName, setDisplayName] = useState('');
  const [loading, setLoading] = useState(false);
  const [localError, setLocalError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLocalError('');
    setLoading(true);
    try {
      if (isLogin) {
        await login(email, password);
      } else {
        await register(email, password, displayName);
      }
    } catch (err) {
      setLocalError(err.message || 'Error en la operación');
    } finally {
      setLoading(false);
    }
  };

  const handleDemoLogin = async (userType) => {
    setLoading(true);
    try {
      await login(
        userType === 'user1' ? 'carlos@demo.com' : 'maria@demo.com',
        'demo123'
      );
    } catch (err) {
      setLocalError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-page__bg">
        <div className="auth-page__orb auth-page__orb--1" />
        <div className="auth-page__orb auth-page__orb--2" />
        <div className="auth-page__orb auth-page__orb--3" />
      </div>

      <div className="auth-card glass--elevated animate-slideUp">
        <div className="auth-card__header">
          <span className="auth-card__logo">💰</span>
          <h1 className="auth-card__title">FinanzApp</h1>
          <p className="auth-card__subtitle">Control financiero para parejas</p>
        </div>

        <form onSubmit={handleSubmit} className="auth-form">
          {!isLogin && (
            <div className="form-group">
              <label htmlFor="register-name">Nombre completo</label>
              <input
                id="register-name"
                type="text"
                className="glass-input"
                placeholder="Tu nombre"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                required
              />
            </div>
          )}

          <div className="form-group">
            <label htmlFor="login-email">Correo electrónico</label>
            <input
              id="login-email"
              type="email"
              className="glass-input"
              placeholder="tu@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="login-password">Contraseña</label>
            <input
              id="login-password"
              type="password"
              className="glass-input"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>

          {(localError || authError) && (
            <div className="auth-error">
              {localError || authError}
            </div>
          )}

          <button
            type="submit"
            className="auth-btn auth-btn--primary"
            disabled={loading}
          >
            {loading ? (
              <span>⏳ Procesando...</span>
            ) : isLogin ? (
              <>
                <span>🔐 Iniciar Sesión</span>
              </>
            ) : (
              <>
                <span>👤 Crear Cuenta</span>
              </>
            )}
          </button>
        </form>

        <div className="auth-footer" style={{ marginTop: '1.5rem', textAlign: 'center' }}>
          <button 
            type="button" 
            className="glass-btn glass-btn--text" 
            onClick={() => setIsLogin(!isLogin)}
            style={{ fontSize: '0.9rem', color: 'rgba(255,255,255,0.7)' }}
          >
            {isLogin ? '¿No tienes cuenta? Regístrate' : '¿Ya tienes cuenta? Entra'}
          </button>
        </div>

        {isDemoMode && (
          <div className="auth-demo-users">
            <p className="text-sm text-secondary" style={{ marginBottom: '0.5rem', textAlign: 'center' }}>
              O accede como usuario demo:
            </p>
            <div className="auth-demo-users__grid">
              <button
                className="auth-demo-user glass-btn"
                onClick={() => handleDemoLogin('user1')}
              >
                <span className="auth-demo-user__avatar" style={{ background: 'linear-gradient(135deg, #6366f1, #8b5cf6)' }}>C</span>
                <span>Carlos</span>
              </button>
              <button
                className="auth-demo-user glass-btn"
                onClick={() => handleDemoLogin('user2')}
              >
                <span className="auth-demo-user__avatar" style={{ background: 'linear-gradient(135deg, #ec4899, #f472b6)' }}>M</span>
                <span>María</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
