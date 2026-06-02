/* eslint-disable react-refresh/only-export-components */
import { useState, useEffect, useContext, createContext } from 'react';
import { supabase } from '../utils/supabaseClient';

const AuthContext = createContext(null);
const supabaseProjectRef = import.meta.env.VITE_SUPABASE_URL?.match(/^https:\/\/([^.]+)\.supabase\.co/)?.[1];

const withTimeout = (promise, ms, message) => {
  let timeoutId;
  const timeout = new Promise((_, reject) => {
    timeoutId = setTimeout(() => reject(new Error(message)), ms);
  });

  return Promise.race([promise, timeout]).finally(() => clearTimeout(timeoutId));
};

const setAuthDebug = (message) => {
  if (typeof window === 'undefined') return;
  try {
    window.sessionStorage.setItem('sailingAuthDebug', `${new Date().toLocaleTimeString()}: ${message}`);
  } catch {
    // Some mobile privacy modes block sessionStorage.
  }
};

export const clearStoredSupabaseSession = () => {
  if (!supabaseProjectRef || typeof window === 'undefined') return;

  const storageKeys = [
    `sb-${supabaseProjectRef}-auth-token`,
    `sb-${supabaseProjectRef}-auth-token-code-verifier`,
  ];

  for (const storage of [window.localStorage, window.sessionStorage]) {
    storageKeys.forEach((key) => storage.removeItem(key));

    for (let i = storage.length - 1; i >= 0; i -= 1) {
      const key = storage.key(i);
      if (key?.includes(supabaseProjectRef)) {
        storage.removeItem(key);
      }
    }
  }
};

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const loadProfile = async (userId) => {
    const { data, error } = await withTimeout(
      supabase
        .from('users')
        .select('*')
        .eq('id', userId)
        .single(),
      8000,
      'Profile loading timed out. Please refresh and try again.'
    );

    if (error && error.code !== 'PGRST116') throw error;
    return data || null;
  };

  useEffect(() => {
    const initAuth = async () => {
      const timeout = setTimeout(() => setLoading(false), 6000);
      try {
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      if (sessionError) throw sessionError;

      const sessionUser = session?.user ?? null;
      setAuthDebug(sessionUser ? `Startup session found for ${sessionUser.email}` : 'Startup found no stored session');
      setUser(sessionUser);

      if (sessionUser) {
          const profileData = await loadProfile(sessionUser.id);
          setProfile(profileData);
        }
      } catch (err) {
        setError(err.message);
      } finally {
        clearTimeout(timeout);
        setLoading(false);
      }
    };

    initAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setUser(session?.user ?? null);
        if (session?.user) {
          setTimeout(async () => {
            try {
              const profileData = await loadProfile(session.user.id);
              setProfile(profileData);
            } catch (err) {
              setError(err.message);
              setProfile(null);
            }
          }, 0);
        } else {
          setProfile(null);
        }
      }
    );

    return () => subscription?.unsubscribe();
  }, []);

  const signUp = async (email, password, userProfile) => {
    try {
      setLoading(true);
      const redirectUrl = `${window.location.origin}/Sailing/email-confirmed`;
      const { data, error: signUpError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: userProfile,
          emailRedirectTo: redirectUrl,
        },
      });

      if (signUpError) throw signUpError;

      // Supabase anti-enumeration: duplicate emails return success with
      // either no new user or an empty identities array. Detect and surface it.
      if (!data.user || (Array.isArray(data.user.identities) && data.user.identities.length === 0)) {
        const err = new Error('An account with this email already exists. Please sign in instead.');
        err.code = 'email_exists';
        throw err;
      }

      return {
        user: data.user,
        needsEmailConfirmation: !data.session,
      };
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const resendConfirmation = async (email) => {
    const redirectUrl = `${window.location.origin}/Sailing/email-confirmed`;
    const { error } = await supabase.auth.resend({
      type: 'signup',
      email,
      options: { emailRedirectTo: redirectUrl },
    });
    if (error) throw error;
  };

  const signIn = async (email, password) => {
    try {
      setUser(null);
      setProfile(null);
      await supabase.auth.signOut({ scope: 'local' }).catch(() => undefined);
      clearStoredSupabaseSession();
      const { data: { user }, error } = await withTimeout(
        supabase.auth.signInWithPassword({
          email,
          password,
        }),
        12000,
        'Sign in timed out. Please check your connection and try again.'
      );

      if (error) throw error;
      setAuthDebug(`Sign-in accepted for ${user?.email || email}`);
      const { data: { session }, error: sessionError } = await withTimeout(
        supabase.auth.getSession(),
        5000,
        'Sign in succeeded, but the browser did not keep the session. Please close and reopen the app, then try again.'
      );

      if (sessionError) throw sessionError;
      if (!session?.user) {
        setAuthDebug(`No retained session after sign-in for ${email}`);
        setUser(null);
        setProfile(null);
        clearStoredSupabaseSession();
        throw new Error('Sign in succeeded, but the browser did not keep the session. Please close and reopen the app, then try again.');
      }

      setAuthDebug(`Session retained for ${session.user.email}`);
      setUser(user);
      if (user) {
        const profileData = await loadProfile(user.id);
        setAuthDebug(profileData ? `Profile loaded for ${session.user.email}` : `No profile row for ${session.user.email}`);
        setProfile(profileData);
      }
    } catch (err) {
      setAuthDebug(`Sign-in failed: ${err.message}`);
      setUser(null);
      setProfile(null);
      clearStoredSupabaseSession();
      setError(err.message);
      throw err;
    }
  };

  const signOut = async () => {
    setLoading(false);
    setUser(null);
    setProfile(null);
    clearStoredSupabaseSession();

    const timeout = new Promise((resolve) => {
      setTimeout(() => resolve({ error: null, timedOut: true }), 5000);
    });

    const result = await Promise.race([
      supabase.auth.signOut({ scope: 'local' }),
      timeout,
    ]);

    if (result?.error) {
      setError(result.error.message);
      throw result.error;
    }

    clearStoredSupabaseSession();
  };

  const updateProfile = async (updates) => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('users')
        .update(updates)
        .eq('id', user.id)
        .select()
        .single();

      if (error) throw error;
      setProfile(data);
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthContext.Provider value={{ user, profile, loading, error, signUp, signIn, signOut, updateProfile, resendConfirmation }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
}
