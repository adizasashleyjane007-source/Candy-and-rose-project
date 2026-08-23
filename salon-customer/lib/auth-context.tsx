'use client';

import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { Session, User } from '@supabase/supabase-js';
import { supabase } from './supabase';
import type { Profile, Customer } from './supabase';

type AuthContextValue = {
  session: Session | null;
  user: User | null;
  profile: Profile | null;
  customer: Customer | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: string | null }>;
  signUp: (email: string, password: string, fullName: string) => Promise<{ error: string | null }>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [loading, setLoading] = useState(true);

  const loadProfile = async (userId: string, userEmail?: string) => {
    try {
      const { data } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .maybeSingle();

      let resolvedName = userEmail?.split('@')[0] || '';
      let resolvedPhone = '';

      if (userEmail) {
        const { data: custData } = await supabase
          .from('customers')
          .select('*')
          .eq('email', userEmail)
          .order('created_at', { ascending: false })
          .limit(1);
        if (custData && custData.length > 0) {
          const activeCust = custData[0];
          setCustomer(activeCust as Customer);
          resolvedName = activeCust.name || resolvedName;
          resolvedPhone = activeCust.phone || '';
        }
      }

      if (data) {
        setProfile({
          id: data.id,
          name: data.name || data.full_name || resolvedName,
          full_name: data.name || data.full_name || resolvedName,
          email: data.email || userEmail,
          phone: data.phone || resolvedPhone,
          image_url: data.image_url,
          avatar_url: data.avatar_url || data.image_url,
          role: data.role,
        });
      } else {
        // Auto-create missing profile record
        const newProfile = {
          id: userId,
          name: resolvedName,
          email: userEmail || '',
          phone: resolvedPhone || null,
          role: 'Customer'
        };
        await supabase.from('profiles').upsert(newProfile);
        setProfile({
          id: userId,
          name: resolvedName,
          full_name: resolvedName,
          email: userEmail || '',
          phone: resolvedPhone,
        });
      }
    } catch (e) {
      console.error('Error loading profile:', e);
    }
  };

  useEffect(() => {
    let mounted = true;

    supabase.auth.getSession().then(({ data }) => {
      if (!mounted) return;
      setSession(data.session);
      if (data.session?.user) {
        loadProfile(data.session.user.id, data.session.user.email).finally(() => mounted && setLoading(false));
      } else {
        setLoading(false);
      }
    });

    const { data: listener } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession);
      if (newSession?.user) {
        loadProfile(newSession.user.id, newSession.user.email);
      } else {
        setProfile(null);
        setCustomer(null);
      }
    });

    return () => {
      mounted = false;
      listener.subscription.unsubscribe();
    };
  }, []);

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return { error: error?.message || null };
  };

  const signUp = async (email: string, password: string, fullName: string) => {
    const { data, error } = await supabase.auth.signUp({ email, password });
    if (error) return { error: error.message };
    if (data.user) {
      try {
        await supabase.from('profiles').upsert({
          id: data.user.id,
          name: fullName,
          email: email,
          role: 'Customer',
        });

        const { data: existingCust } = await supabase
          .from('customers')
          .select('id')
          .eq('email', email)
          .maybeSingle();

        if (!existingCust) {
          await supabase.from('customers').insert({
            name: fullName,
            email: email,
            status: 'Active',
            membership_type: 'New',
          });
        }
      } catch (err) {
        console.error('Error creating profile/customer record:', err);
      }

      // Send welcome email notification
      try {
        await fetch('/api/send-welcome', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, name: fullName }),
        });
      } catch (emailErr) {
        console.error('Error sending welcome email:', emailErr);
      }
    }
    return { error: null };
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setProfile(null);
    setCustomer(null);
  };

  const refreshProfile = async () => {
    if (session?.user) await loadProfile(session.user.id, session.user.email);
  };

  return (
    <AuthContext.Provider
      value={{ session, user: session?.user ?? null, profile, customer, loading, signIn, signUp, signOut, refreshProfile }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
