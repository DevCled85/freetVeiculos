import React, { createContext, useContext, useEffect, useState, useRef, useCallback } from 'react';
import { supabase, Profile, isSupabaseConfigured } from './supabase';
import { User } from '@supabase/supabase-js';

const IDLE_TIMEOUT_MS = 5 * 60 * 1000; // 5 minutes

type AuthContextType = {
  user: User | null;
  profile: Profile | null;
  loading: boolean;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const idleTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const signOut = useCallback(async () => {
    if (idleTimer.current) clearTimeout(idleTimer.current);
    if (isSupabaseConfigured) {
      await supabase.auth.signOut();
    }
    setUser(null);
    setProfile(null);
  }, []);

  // Reset idle countdown on user activity
  const resetIdleTimer = useCallback(() => {
    if (idleTimer.current) clearTimeout(idleTimer.current);
    idleTimer.current = setTimeout(() => {
      signOut();
    }, IDLE_TIMEOUT_MS);
  }, [signOut]);

  // Attach activity listeners when logged in
  useEffect(() => {
    if (!user) return;

    const events = ['mousemove', 'keydown', 'mousedown', 'touchstart', 'scroll', 'click'];
    events.forEach(e => window.addEventListener(e, resetIdleTimer, { passive: true }));
    resetIdleTimer(); // start immediately on login

    return () => {
      events.forEach(e => window.removeEventListener(e, resetIdleTimer));
      if (idleTimer.current) clearTimeout(idleTimer.current);
    };
  }, [user, resetIdleTimer]);

  // Logout on page close / tab switch
  // Aplica a TODOS os usuários (motoristas, supervisores)
  useEffect(() => {
    const handleVisibilityChange = () => {
      // Se não estiver visível (saiu da aba ou minimizou) e estiver logado, desloga
      // O 'user' abrange qualquer cargo / perfil
      if (document.visibilityState === 'hidden' && user) {
        signOut();
      }
    };
    const handleBeforeUnload = () => {
      if (user && isSupabaseConfigured) {
        supabase.auth.signOut();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [user, signOut]);

  useEffect(() => {
    if (!isSupabaseConfigured) {
      setLoading(false);
      return;
    }

    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      if (session?.user) {
        fetchProfile(session.user.id);
      } else {
        setLoading(false);
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      if (session?.user) {
        fetchProfile(session.user.id);
      } else {
        setProfile(null);
        setLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const fetchProfile = async (userId: string) => {
    if (!isSupabaseConfigured) {
      setLoading(false);
      return;
    }
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (error) throw error;
      setProfile(data);
    } catch (error) {
      console.error('Error fetching profile:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthContext.Provider value={{ user, profile, loading, signOut }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
