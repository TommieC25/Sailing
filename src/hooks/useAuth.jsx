/* eslint-disable react-refresh/only-export-components */
import { useState, useEffect, useContext, createContext } from 'react';
import { supabase } from '../utils/supabaseClient';

const AuthContext = createContext(null);
const supabaseProjectRef = import.meta.env.VITE_SUPABASE_URL?.match(/^https:\/\/([^.]+)\.supabase\.co/)?.[1];

const clearStoredSupabaseSession = () => {
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

  useEffect(() => {
    const initAuth = async () => {
      const timeout = setTimeout(() => setLoading(false), 6000);
      try {
        const { data: { user } } = await supabase.auth.getUser();
        setUser(user);

        if (user) {
          const { data, error } = await supabase
            .from('users')
            .select('*')
            .eq('id', user.id)
            .single();

          if (error && error.code !== 'PGRST116') throw error;
          setProfile(data || null);
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
      async (event, session) => {
        setUser(session?.user ?? null);
        if (session?.user) {
          const { data } = await supabase
            .from('users')
            .select('*')
            .eq('id', session.user.id)
            .single();
          setProfile(data || null);
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
      const redirectUrl = `${window.location.origin}/Sailing/login`;
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
      // an empty identities array. Detect and surface to the user.
      if (data.user && Array.isArray(data.user.identities) && data.user.identities.length === 0) {
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
    const redirectUrl = `${window.location.origin}/Sailing/login`;
    const { error } = await supabase.auth.resend({
      type: 'signup',
      email,
      options: { emailRedirectTo: redirectUrl },
    });
    if (error) throw error;
  };

  const signIn = async (email, password) => {
    try {
      setLoading(true);
      const { data: { user }, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) throw error;
      setUser(user);
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
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
