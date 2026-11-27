// FILE: src/context/AuthContext.jsx
import { createContext, useState, useEffect, useCallback } from 'react';
import {
  createUserWithEmailAndPassword,
  deleteUser,
  onAuthStateChanged,
  sendPasswordResetEmail,
  signInAnonymously,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut,
  updateProfile,
} from 'firebase/auth';
import { auth, db, googleProvider } from '../firebase';
import { deleteReviewsOfUser } from '../services/firestoreWrites';

// eslint-disable-next-line react-refresh/only-export-components
export const AuthContext = createContext();

// Same limit as firestore.rules (reviews.userName must equal the token name).
const DISPLAY_NAME_MAX_LENGTH = 80;
// Firebase requires a recent sign-in for deleteUser (about five minutes).
const RECENT_LOGIN_WINDOW_MS = 5 * 60 * 1000;

const UNAVAILABLE_MESSAGE = 'Diese Anmeldung ist gerade nicht verfügbar. Bitte versuche es später erneut.';
const PASSWORD_RESET_NOTICE = 'Falls zu dieser E-Mail-Adresse ein Konto existiert, haben wir dir einen Link zum Zurücksetzen des Passworts geschickt.';

// User-facing texts only; the technical error code goes to console.error.
const getAuthErrorMessage = (error) => {
  switch (error?.code) {
    case 'auth/operation-not-allowed':
    case 'auth/unauthorized-domain':
    case 'auth/admin-restricted-operation':
      return UNAVAILABLE_MESSAGE;
    case 'auth/email-already-in-use':
      return 'Diese E-Mail-Adresse wird bereits verwendet.';
    case 'auth/invalid-email':
    case 'auth/missing-email':
      return 'Bitte gib eine gültige E-Mail-Adresse ein.';
    case 'auth/weak-password':
      return 'Das Passwort ist zu schwach. Verwende mindestens 6 Zeichen.';
    case 'auth/account-exists-with-different-credential':
      return 'Zu dieser E-Mail existiert bereits ein Konto mit einer anderen Anmeldemethode.';
    case 'auth/invalid-credential':
    case 'auth/user-not-found':
    case 'auth/wrong-password':
      return 'E-Mail oder Passwort stimmen nicht.';
    case 'auth/cancelled-popup-request':
      return 'Es läuft bereits ein Anmeldeversuch. Bitte versuche es erneut.';
    case 'auth/popup-closed-by-user':
      return 'Das Google-Fenster wurde geschlossen, bevor die Anmeldung abgeschlossen war.';
    case 'auth/popup-blocked':
      return 'Der Browser hat das Google-Fenster blockiert. Bitte erlaube Pop-ups für diese Seite.';
    case 'auth/network-request-failed':
      return 'Netzwerkfehler. Bitte prüfe deine Verbindung und versuche es erneut.';
    case 'auth/too-many-requests':
      return 'Zu viele Versuche. Bitte warte kurz und versuche es erneut.';
    case 'auth/requires-recent-login':
      return 'Bitte melde dich aus Sicherheitsgründen erneut an.';
    default:
      return 'Die Anmeldung hat nicht funktioniert. Bitte versuche es erneut.';
  }
};

const truncateDisplayName = (value) => Array.from(value).slice(0, DISPLAY_NAME_MAX_LENGTH).join('');

const signedInRecently = (user) => {
  const lastSignIn = Date.parse(user?.metadata?.lastSignInTime || '');
  return Number.isFinite(lastSignIn) && Date.now() - lastSignIn < RECENT_LOGIN_WINDOW_MS;
};

const startAnonymousSession = () => signInAnonymously(auth).catch((error) => {
  console.error('Anonyme Anmeldung fehlgeschlagen:', error);
});

export const AuthProvider = ({ children }) => {
  const [currentUser, setCurrentUser] = useState(null);
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);
  const [authLoading, setAuthLoading] = useState(true);
  const [authError, setAuthError] = useState(null);
  const [authNotice, setAuthNotice] = useState(null);
  // updateProfile mutates the same User object the listener already stored, so
  // React would not re-render. Bumping this counter forces the provider (and
  // with it the new context value) to render the new display name.
  const [, setProfileVersion] = useState(0);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (!user) {
        // Every client gets an anonymous session so Firestore rules can require
        // request.auth for all writes (e.g. the barcode scanner saving products).
        // The anonymous user is NOT treated as logged in anywhere in the UI.
        setCurrentUser(null);
        signInAnonymously(auth).catch((error) => {
          console.error('Anonyme Anmeldung fehlgeschlagen:', error);
          setAuthLoading(false);
        });
        return;
      }

      setCurrentUser(user.isAnonymous ? null : user);
      if (!user.isAnonymous) {
        setAuthError(null);
      }
      setAuthLoading(false);
    });
    return unsubscribe;
  }, []);

  // A failed anonymous sign-in (offline start) is retried when the browser is
  // back online.
  useEffect(() => {
    const handleOnline = () => {
      if (!auth.currentUser) {
        startAnonymousSession();
      }
    };

    window.addEventListener('online', handleOnline);
    return () => window.removeEventListener('online', handleOnline);
  }, []);

  const clearAuthError = useCallback(() => {
    setAuthError(null);
    setAuthNotice(null);
  }, []);

  const loginWithGoogle = useCallback(async () => {
    setAuthError(null);
    setAuthNotice(null);

    try {
      await signInWithPopup(auth, googleProvider);
      setIsLoginModalOpen(false);
      return true;
    } catch (error) {
      setAuthError(getAuthErrorMessage(error));
      console.error('Login fehlgeschlagen:', error?.code, error);
      return false;
    }
  }, []);

  const registerWithEmail = useCallback(async (email, password, name) => {
    const trimmedName = truncateDisplayName(name.trim());

    if (!trimmedName) {
      setAuthError('Bitte gib deinen Namen ein.');
      return false;
    }

    if (!email.trim() || !password) {
      setAuthError('Bitte gib E-Mail und Passwort ein.');
      return false;
    }

    setAuthError(null);
    setAuthNotice(null);

    let userCredential;

    try {
      userCredential = await createUserWithEmailAndPassword(auth, email.trim(), password);
    } catch (error) {
      setAuthError(getAuthErrorMessage(error));
      console.error('Registrierung fehlgeschlagen:', error?.code, error);
      return false;
    }

    // The account exists from here on: a failing profile update must not be
    // reported as a failed registration.
    try {
      await updateProfile(userCredential.user, { displayName: trimmedName });
      // Force a token refresh so the ID token carries the new displayName as `name` claim.
      // Firestore rules compare review.userName against that claim.
      await userCredential.user.getIdToken(true);
    } catch (error) {
      console.error('Profil konnte nach der Registrierung nicht aktualisiert werden:', error?.code, error);
    }

    setCurrentUser(auth.currentUser ?? userCredential.user);
    setProfileVersion((version) => version + 1);
    setIsLoginModalOpen(false);
    return true;
  }, []);

  const loginWithEmail = useCallback(async (email, password) => {
    if (!email.trim() || !password) {
      setAuthError('Bitte gib E-Mail und Passwort ein.');
      return false;
    }

    setAuthError(null);
    setAuthNotice(null);

    try {
      await signInWithEmailAndPassword(auth, email.trim(), password);
      setIsLoginModalOpen(false);
      return true;
    } catch (error) {
      setAuthError(getAuthErrorMessage(error));
      console.error('E-Mail-Login fehlgeschlagen:', error?.code, error);
      return false;
    }
  }, []);

  // Sends the password reset mail. The notice is the same whether or not an
  // account exists, so the form does not reveal registered addresses.
  const resetPassword = useCallback(async (email) => {
    const trimmedEmail = typeof email === 'string' ? email.trim() : '';

    setAuthNotice(null);

    if (!trimmedEmail) {
      setAuthError('Bitte gib deine E-Mail-Adresse ein.');
      return false;
    }

    setAuthError(null);

    try {
      await sendPasswordResetEmail(auth, trimmedEmail);
      setAuthNotice(PASSWORD_RESET_NOTICE);
      return true;
    } catch (error) {
      console.error('Passwort-Reset fehlgeschlagen:', error?.code, error);

      if (error?.code === 'auth/user-not-found') {
        setAuthNotice(PASSWORD_RESET_NOTICE);
        return true;
      }

      setAuthError(getAuthErrorMessage(error));
      return false;
    }
  }, []);

  // Deletes the signed-in real account and all of its reviews.
  // Returns { ok: true } | { ok: false, reason: 'reauth' | 'error' }.
  const deleteAccount = useCallback(async () => {
    const user = auth.currentUser;

    if (!user || user.isAnonymous) {
      return { ok: false, reason: 'error' };
    }

    // Ask for a fresh login before deleting anything, so reviews are not
    // removed while the account deletion itself would be refused.
    if (!signedInRecently(user)) {
      return { ok: false, reason: 'reauth' };
    }

    try {
      await deleteReviewsOfUser(db, user.uid);
      await deleteUser(user);
      setAuthError(null);
      setAuthNotice(null);
      return { ok: true };
    } catch (error) {
      console.error('Konto konnte nicht gelöscht werden:', error?.code, error);

      if (error?.code === 'auth/requires-recent-login') {
        return { ok: false, reason: 'reauth' };
      }

      return { ok: false, reason: 'error' };
    }
  }, []);

  const logout = useCallback(async () => {
    try {
      setAuthError(null);
      setAuthNotice(null);
      await signOut(auth);
    } catch (error) {
      console.error('Logout fehlgeschlagen:', error);
    }
  }, []);

  // While the auth state is still loading, wait for it before deciding;
  // otherwise a returning user would briefly see the login modal.
  const requireAuth = useCallback((actionCallback) => {
    const decide = (isLoggedIn) => {
      if (isLoggedIn) {
        actionCallback();
      } else {
        setAuthError(null);
        setAuthNotice(null);
        setIsLoginModalOpen(true);
      }
    };

    if (!authLoading) {
      decide(Boolean(currentUser));
      return;
    }

    auth.authStateReady()
      .then(() => decide(Boolean(auth.currentUser && !auth.currentUser.isAnonymous)))
      .catch((error) => {
        console.error('Anmeldestatus konnte nicht ermittelt werden:', error);
        decide(false);
      });
  }, [authLoading, currentUser]);

  const value = {
    currentUser,
    authLoading,
    authError,
    authNotice,
    isLoginModalOpen,
    setIsLoginModalOpen,
    clearAuthError,
    loginWithGoogle,
    registerWithEmail,
    loginWithEmail,
    resetPassword,
    deleteAccount,
    logout,
    requireAuth,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};
