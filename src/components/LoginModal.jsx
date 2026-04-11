// FILE: src/components/LoginModal.jsx
import React, { useCallback, useEffect, useState } from 'react';
import { X } from 'lucide-react';
import { useAuth } from '../context/useAuth';

export const LoginModal = () => {
  const {
    isLoginModalOpen,
    setIsLoginModalOpen,
    loginWithGoogle,
    registerWithEmail,
    loginWithEmail,
    authError,
    clearAuthError,
  } = useAuth();
  const [isRegistering, setIsRegistering] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const resetForm = useCallback(() => {
    setName('');
    setEmail('');
    setPassword('');
    setIsSubmitting(false);
    clearAuthError();
  }, [clearAuthError]);

  useEffect(() => {
    if (!isLoginModalOpen) {
      setIsRegistering(false);
      resetForm();
    }
  }, [isLoginModalOpen, resetForm]);

  const handleClose = () => {
    setIsLoginModalOpen(false);
    setIsRegistering(false);
    resetForm();
  };

  const handleToggleMode = () => {
    setIsRegistering((prev) => !prev);
    resetForm();
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setIsSubmitting(true);

    try {
      if (isRegistering) {
        await registerWithEmail(email, password, name);
      } else {
        await loginWithEmail(email, password);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleGoogleLogin = async () => {
    setIsSubmitting(true);

    try {
      await loginWithGoogle();
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isLoginModalOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-5">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
        onClick={handleClose}
      />

      {/* Modal Card */}
      <div className="relative z-10 w-full max-w-sm rounded-squircle bg-realbg p-8 shadow-2xl animate-pop-in">
        {/* Close Button */}
        <button
          onClick={handleClose}
          className="absolute top-4 right-4 w-8 h-8 flex items-center justify-center rounded-full bg-slate-100 text-slate-400 hover:bg-slate-200 hover:text-slate-600 transition-colors"
        >
          <X size={16} strokeWidth={2.5} />
        </button>

        {/* Content */}
        <div className="text-center mb-6">
          <span className="text-5xl mb-4 block">🍔</span>
          <h2 className="text-2xl font-bold text-slate-900 mb-2" style={{ fontFamily: 'Poppins, sans-serif' }}>
            Willkommen bei RealGood
          </h2>
          <p className="text-slate-500 text-sm leading-relaxed">
            Melde dich an, um Bewertungen zu posten, Hypes zu starten und dein Foodie-Profil aufzubauen.
          </p>
        </div>

        {authError && (
          <div className="mb-4 rounded-squircle border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-600">
            {authError}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-3">
          {isRegistering && (
            <div>
              <label htmlFor="auth-name" className="mb-1.5 block text-sm font-medium text-slate-600">
                Name
              </label>
              <input
                id="auth-name"
                type="text"
                value={name}
                onChange={(event) => setName(event.target.value)}
                placeholder="Wie sollen wir dich nennen?"
                className="w-full rounded-squircle border border-slate-200 bg-white px-4 py-3.5 text-base text-slate-900 placeholder:text-slate-400 focus:border-realgreen focus:outline-none focus:ring-4 focus:ring-realgreen/10"
                autoComplete="name"
              />
            </div>
          )}

          <div>
            <label htmlFor="auth-email" className="mb-1.5 block text-sm font-medium text-slate-600">
              E-Mail
            </label>
            <input
              id="auth-email"
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="name@beispiel.de"
              className="w-full rounded-squircle border border-slate-200 bg-white px-4 py-3.5 text-base text-slate-900 placeholder:text-slate-400 focus:border-realgreen focus:outline-none focus:ring-4 focus:ring-realgreen/10"
              autoComplete="email"
            />
          </div>

          <div>
            <label htmlFor="auth-password" className="mb-1.5 block text-sm font-medium text-slate-600">
              Passwort
            </label>
            <input
              id="auth-password"
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="Mindestens 6 Zeichen"
              className="w-full rounded-squircle border border-slate-200 bg-white px-4 py-3.5 text-base text-slate-900 placeholder:text-slate-400 focus:border-realgreen focus:outline-none focus:ring-4 focus:ring-realgreen/10"
              autoComplete={isRegistering ? 'new-password' : 'current-password'}
            />
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full rounded-squircle bg-realgreen px-5 py-3.5 text-sm font-semibold text-white shadow-lg shadow-emerald-500/20 transition-all hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isSubmitting ? 'Bitte warten...' : isRegistering ? 'Registrieren' : 'Einloggen'}
          </button>
        </form>

        <div className="my-5 flex items-center gap-3">
          <div className="h-px flex-1 bg-slate-200" />
          <span className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-300">ODER</span>
          <div className="h-px flex-1 bg-slate-200" />
        </div>

        <button
          type="button"
          onClick={handleGoogleLogin}
          disabled={isSubmitting}
          className="w-full bg-white border-2 border-slate-200 rounded-squircle py-3.5 flex items-center justify-center gap-3 shadow-sm transition-all hover:shadow-md hover:border-slate-300 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60"
        >
          <svg className="w-5 h-5" viewBox="0 0 24 24">
            <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
            <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
            <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
            <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
          </svg>
          <span className="font-semibold text-slate-800 text-sm tracking-wide">
            Mit Google fortfahren
          </span>
        </button>

        <button
          type="button"
          onClick={handleToggleMode}
          className="mt-4 w-full text-center text-sm text-slate-500 transition-colors hover:text-slate-700"
        >
          {isRegistering ? 'Bereits Foodie? Einloggen' : 'Noch kein Konto? Registrieren'}
        </button>
      </div>
    </div>
  );
};
