'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { createClient } from '@/lib/supabase/client';
import { Profile } from '@/types/database.types';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  profile: Profile | null;
  loading: boolean;
  signInWithEmail: (email: string, password: string) => Promise<{ error: string | null }>;
  signUpWithEmail: (email: string, password: string, fullName: string) => Promise<{ error: string | null; message?: string }>;
  signInWithGoogle: () => Promise<{ error: string | null }>;
  resetPassword: (email: string) => Promise<{ error: string | null; message?: string }>;
  updatePassword: (password: string) => Promise<{ error: string | null }>;
  updateProfile: (updates: Partial<Profile>) => Promise<{ error: string | null }>;
  refreshProfile: () => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const supabase = createClient();

    async function initializeAuth() {
      try {
        const { data: { session: currentSession } } = await supabase.auth.getSession();
        setSession(currentSession);
        setUser(currentSession?.user ?? null);

        if (currentSession?.user) {
          await fetchProfile(currentSession.user.id);
        }
      } catch (err) {
        console.warn('Supabase auth initialization error:', err);
      } finally {
        setLoading(false);
      }
    }

    initializeAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, newSession) => {
        setSession(newSession);
        setUser(newSession?.user ?? null);

        if (newSession?.user) {
          await fetchProfile(newSession.user.id);
        } else {
          setProfile(null);
        }

        if (event === 'SIGNED_OUT') {
          if (typeof window !== 'undefined' && !window.location.pathname.startsWith('/login')) {
            window.location.replace('/login');
          }
        }

        setLoading(false);
      }
    );

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  async function fetchProfile(userId: string) {
    try {
      const supabase = createClient();
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (error && error.code === 'PGRST116') {
        const newProfile: Profile = {
          id: userId,
          email: user?.email || null,
          display_name: user?.user_metadata?.full_name || 'Atleta',
          weight_unit: 'kg',
          progression_pct: 2.5,
          load_step: 1.25,
          is_approved: false,
          is_admin: false,
          approved_at: null,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        };
        await supabase.from('profiles').insert(newProfile as any);
        // Re-read back to get database generated state
        const { data: refreshed } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', userId)
          .single();
        setProfile((refreshed as Profile) || newProfile);
      } else if (data) {
        setProfile(data as Profile);
      }
    } catch (e) {
      console.error('Error fetching profile:', e);
    }
  }

  const refreshProfile = async () => {
    if (user?.id) {
      await fetchProfile(user.id);
    }
  };

  const signInWithEmail = async (email: string, password: string) => {
    try {
      const supabase = createClient();
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        return { error: error.message };
      }

      return { error: null };
    } catch (err: unknown) {
      return { error: (err as Error)?.message || 'Errore durante il login' };
    }
  };

  const signUpWithEmail = async (email: string, password: string, fullName: string) => {
    try {
      const supabase = createClient();
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: fullName,
          },
          emailRedirectTo: `${window.location.origin}/auth/callback`,
        },
      });

      if (error) {
        return { error: error.message };
      }

      // Notify admins that a new user registered and requires approval
      fetch('/api/auth/notify-registration', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ displayName: fullName, email }),
      }).catch((err) => console.warn('[auth] Could not trigger admin registration push:', err));

      if (data.user && !data.session) {
        return {
          error: null,
          message: 'Ti abbiamo inviato un link di conferma per email.',
        };
      }

      return { error: null };
    } catch (err: unknown) {
      return { error: (err as Error)?.message || 'Errore durante la registrazione' };
    }
  };

  const signInWithGoogle = async () => {
    try {
      const supabase = createClient();
      const redirectUrl = `${window.location.origin}/auth/callback`;
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: redirectUrl,
          skipBrowserRedirect: true,
        },
      });

      if (error) {
        return { error: error.message };
      }

      if (data?.url) {
        window.location.href = data.url;
      }

      return { error: null };
    } catch (err: unknown) {
      return { error: (err as Error)?.message || 'Errore di connessione a Google' };
    }
  };

  const resetPassword = async (email: string) => {
    try {
      const supabase = createClient();
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      });

      if (error) {
        return { error: error.message };
      }

      return {
        error: null,
        message: 'Controlla la tua email per il link di recupero password.',
      };
    } catch (err: unknown) {
      return { error: (err as Error)?.message || 'Errore durante il recupero password' };
    }
  };

  const updatePassword = async (password: string) => {
    try {
      const supabase = createClient();
      const { error } = await supabase.auth.updateUser({
        password,
      });

      if (error) {
        return { error: error.message };
      }

      return { error: null };
    } catch (err: unknown) {
      return { error: (err as Error)?.message || 'Errore aggiornamento password' };
    }
  };

  const updateProfile = async (updates: Partial<Profile>) => {
    if (!user) return { error: 'Non autenticato' };

    try {
      const supabase = createClient();
      const { data, error } = await supabase
        .from('profiles')
        .update(updates as any)
        .eq('id', user.id)
        .select()
        .single();

      if (error) {
        return { error: error.message };
      }

      setProfile(data as Profile);
      return { error: null };
    } catch (err: unknown) {
      return { error: (err as Error)?.message || 'Errore aggiornamento profilo' };
    }
  };

  const signOut = async () => {
    try {
      // 1. Clear IndexedDB local data (offline logs, active sessions, history cache)
      try {
        const { offlineDb } = await import('@/lib/services/offlineDb');
        await offlineDb.clearAllData();
      } catch (dbErr) {
        console.warn('Could not clear IndexedDB on logout:', dbErr);
      }

      // 2. Clear Service Worker caches
      try {
        if (typeof window !== 'undefined' && 'caches' in window) {
          const keys = await caches.keys();
          await Promise.all(keys.map((k) => caches.delete(k)));
        }
        if (typeof navigator !== 'undefined' && navigator.serviceWorker?.controller) {
          navigator.serviceWorker.controller.postMessage({ type: 'CLEAR_CACHES' });
        }
      } catch (cacheErr) {
        console.warn('Could not clear caches on logout:', cacheErr);
      }

      // 3. Supabase Auth sign out
      const supabase = createClient();
      await supabase.auth.signOut();
    } catch (e) {
      console.error('Sign out error:', e);
    } finally {
      if (typeof window !== 'undefined') {
        window.location.replace('/login');
      }
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        profile,
        loading,
        signInWithEmail,
        signUpWithEmail,
        signInWithGoogle,
        resetPassword,
        updatePassword,
        updateProfile,
        refreshProfile,
        signOut,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth deve essere usato all\'interno di un AuthProvider');
  }
  return context;
}
