import React, { createContext, useState, useEffect } from 'react';
import { supabase } from '../services/supabaseClient';

export interface AuthUser {
  id: string;
  email: string;
  fullName: string;
  officeId: string;
  role: 'admin' | 'employee';
  isActive: boolean;
}

interface AuthContextType {
  user: AuthUser | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => Promise<void>;
}

export const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  login: async () => ({ success: false }),
  logout: async () => {},
});

function buildUser(authUser: any, profile: any): AuthUser | null {
  if (!authUser || !profile) return null;
  return {
    id: profile.id,
    email: authUser.email || '',
    fullName: profile.full_name || authUser.user_metadata?.full_name || 'User',
    officeId: profile.office_id,
    role: profile.role || 'employee',
    isActive: profile.is_active !== false,
  };
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchUserProfile = async (userId: string) => {
    const { data: { user: authUser } } = await supabase.auth.getUser();

    let profile: any = null;

    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .maybeSingle();

      if (!error && data) {
        profile = data;
      }
    } catch {}

    if (!profile && authUser) {
      // Auto-create profile from auth metadata if missing
      try {
        const { data: newProfile } = await supabase.from('profiles').insert({
          id: userId,
          email: authUser.email || '',
          full_name: authUser.user_metadata?.full_name || authUser.email?.split('@')[0] || 'User',
          role: authUser.user_metadata?.role || 'employee',
          office_id: authUser.user_metadata?.office_id || null,
        }).select().single();
        if (newProfile) profile = newProfile;
      } catch {}
    }

    setUser(buildUser(authUser, profile));
  };

  useEffect(() => {
    let cancelled = false;

    const restoreSession = async () => {
      setLoading(true);
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user && !cancelled) {
        await fetchUserProfile(session.user.id);
      }
      if (!cancelled) setLoading(false);
    };

    restoreSession();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      if (session?.user && !cancelled) {
        await fetchUserProfile(session.user.id);
      } else if (!cancelled) {
        setUser(null);
      }
      if (!cancelled) setLoading(false);
    });

    return () => { cancelled = true; subscription.unsubscribe(); };
  }, []);

  const login = async (email: string, password: string) => {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) return { success: false, error: error.message };
      if (data.user) await fetchUserProfile(data.user.id);
      return { success: true };
    } catch {
      return { success: false, error: 'An unexpected error occurred' };
    }
  };

  const logout = async () => {
    await supabase.auth.signOut();
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}
