import { useState, useEffect, useContext, createContext } from 'react';
import { supabase } from '../utils/supabaseClient';

const AuthContext = createContext(null);

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

          if (error && error.code === 'PGRST116') {
            // Profile doesn't exist yet, create it from auth metadata
            const metadata = user.user_metadata || {};
            await supabase.from('users').insert([
              {
                id: user.id,
                email: user.email,
                full_name: metadata.full_name,
                gender: metadata.gender,
                user_type: metadata.user_type,
                sailing_experience: metadata.sailing_experience,
                photo_url: metadata.photo_url,
              },
            ]).select().single();
          } else if (error) {
            throw error;
          }

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
      const { data: { user }, error: signUpError } = await supabase.auth.signUp({
        email,
        password,
        options: { data: userProfile },
      });

      if (signUpError) throw signUpError;

      if (user) {
        setUser(user);
      }
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
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
    try {
      setLoading(true);
      // Manually clear state first to ensure immediate UI update
      setUser(null);
      setProfile(null);
      // Then clear Supabase session
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
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
    <AuthContext.Provider value={{ user, profile, loading, error, signUp, signIn, signOut, updateProfile }}>
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
