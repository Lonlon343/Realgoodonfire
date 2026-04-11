// FILE: src/context/AuthContext.jsx
import React, { createContext, useState, useEffect, useCallback } from 'react';
import {
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut,
  updateProfile,
} from 'firebase/auth';
import { auth, googleProvider } from '../firebase';

// eslint-disable-next-line react-refresh/only-export-components
export const AuthContext = createContext();

const getAuthErrorMessage = (error) => {
  switch (error?.code) {
    case 'auth/operation-not-allowed':
      return 'Diese Anmeldemethode ist in Firebase noch nicht aktiviert. Aktiviere Google oder E-Mail/Passwort in der Firebase Console.';
    case 'auth/unauthorized-domain':
      return 'Diese Domain ist fuer Firebase Auth noch nicht freigegeben. Fuege sie in Firebase unter Authorized domains hinzu.';
    case 'auth/email-already-in-use':
      return 'Diese E-Mail-Adresse wird bereits verwendet.';
    case 'auth/invalid-email':
      return 'Bitte gib eine gueltige E-Mail-Adresse ein.';
    case 'auth/weak-password':
      return 'Das Passwort ist zu schwach. Verwende mindestens 6 Zeichen.';
    case 'auth/account-exists-with-different-credential':
      return 'Zu dieser E-Mail existiert bereits ein Konto mit einer anderen Anmeldemethode.';
    case 'auth/invalid-credential':
    case 'auth/user-not-found':
    case 'auth/wrong-password':
      return 'E-Mail oder Passwort stimmen nicht.';
    case 'auth/cancelled-popup-request':
      return 'Es laeuft bereits ein Anmeldeversuch. Bitte versuche es erneut.';
    case 'auth/popup-closed-by-user':
      return 'Das Google-Fenster wurde geschlossen, bevor der Login abgeschlossen wurde.';
    case 'auth/popup-blocked':
      return 'Der Browser hat das Google-Popup blockiert. Bitte erlaube Popups fuer diese Seite.';
    case 'auth/network-request-failed':
      return 'Netzwerkfehler. Bitte pruefe deine Verbindung und versuche es erneut.';
    case 'auth/too-many-requests':
      return 'Zu viele Versuche. Bitte warte kurz und versuche es erneut.';
    default:
      return 'Die Anmeldung hat nicht funktioniert. Bitte versuche es erneut.';
  }
};

export const AuthProvider = ({ children }) => {
  const [currentUser, setCurrentUser] = useState(null);
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);
  const [authLoading, setAuthLoading] = useState(true);
  const [authError, setAuthError] = useState(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setCurrentUser(user);
      if (user) {
        setAuthError(null);
      }
      setAuthLoading(false);
    });
    return unsubscribe;
  }, []);

  const clearAuthError = useCallback(() => {
    setAuthError(null);
  }, []);

  const loginWithGoogle = useCallback(async () => {
    setAuthError(null);

    try {
      await signInWithPopup(auth, googleProvider);
      setIsLoginModalOpen(false);
      return true;
    } catch (error) {
      setAuthError(getAuthErrorMessage(error));
      console.error('Login fehlgeschlagen:', error);
      return false;
    }
  }, []);

  const registerWithEmail = useCallback(async (email, password, name) => {
    const trimmedName = name.trim();

    if (!trimmedName) {
      setAuthError('Bitte gib deinen Namen ein.');
      return false;
    }

    if (!email.trim() || !password) {
      setAuthError('Bitte gib E-Mail und Passwort ein.');
      return false;
    }

    setAuthError(null);

    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email.trim(), password);
      await updateProfile(userCredential.user, { displayName: trimmedName });
      setCurrentUser(auth.currentUser ?? userCredential.user);
      setIsLoginModalOpen(false);
      return true;
    } catch (error) {
      setAuthError(getAuthErrorMessage(error));
      console.error('Registrierung fehlgeschlagen:', error);
      return false;
    }
  }, []);

  const loginWithEmail = useCallback(async (email, password) => {
    if (!email.trim() || !password) {
      setAuthError('Bitte gib E-Mail und Passwort ein.');
      return false;
    }

    setAuthError(null);

    try {
      await signInWithEmailAndPassword(auth, email.trim(), password);
      setIsLoginModalOpen(false);
      return true;
    } catch (error) {
      setAuthError(getAuthErrorMessage(error));
      console.error('E-Mail-Login fehlgeschlagen:', error);
      return false;
    }
  }, []);

  const logout = useCallback(async () => {
    try {
      setAuthError(null);
      await signOut(auth);
    } catch (error) {
      console.error('Logout fehlgeschlagen:', error);
    }
  }, []);

  const requireAuth = useCallback((actionCallback) => {
    if (currentUser) {
      actionCallback();
    } else {
      setAuthError(null);
      setIsLoginModalOpen(true);
    }
  }, [currentUser]);

  const value = {
    currentUser,
    authLoading,
    authError,
    isLoginModalOpen,
    setIsLoginModalOpen,
    clearAuthError,
    loginWithGoogle,
    registerWithEmail,
    loginWithEmail,
    logout,
    requireAuth,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};
