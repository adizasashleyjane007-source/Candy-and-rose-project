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
  signUp: (
    email: string,
    password: string,
    fullName: string,
    phone?: string,
    address?: string
  ) => Promise<{ error: string | null }>;
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
      const normalizedEmail = userEmail?.trim().toLowerCase() || '';
      let activeCust: Customer | null = null;

      // 1. Check customer record by user_id
      const { data: custByUserId } = await supabase
        .from('customers')
        .select('*')
        .eq('user_id', userId)
        .maybeSingle();

      if (custByUserId) {
        activeCust = custByUserId as Customer;
      } else if (normalizedEmail) {
        // 2. Fallback to check customer record by email (case-insensitive)
        const { data: custByEmail } = await supabase
          .from('customers')
          .select('*')
          .ilike('email', normalizedEmail)
          .order('created_at', { ascending: false })
          .limit(1);

        if (custByEmail && custByEmail.length > 0) {
          activeCust = custByEmail[0] as Customer;
          if (!activeCust.user_id) {
            await supabase
              .from('customers')
              .update({ user_id: userId })
              .eq('id', activeCust.id);
            activeCust.user_id = userId;
          }
        }
      }

      let resolvedName = activeCust?.full_name || activeCust?.name || normalizedEmail.split('@')[0] || 'Customer';
      let resolvedPhone = activeCust?.phone || '';
      let resolvedAddress = activeCust?.address || '';

      // Auto-heal missing customer record if auth user exists
      if (!activeCust && normalizedEmail) {
        const { data: newCust } = await supabase
          .from('customers')
          .insert({
            user_id: userId,
            name: resolvedName,
            full_name: resolvedName,
            email: normalizedEmail,
            phone: resolvedPhone || null,
            address: resolvedAddress || null,
            status: 'Active',
            membership_type: 'New',
          })
          .select()
          .maybeSingle();
        if (newCust) activeCust = newCust as Customer;
      }

      if (activeCust) {
        setCustomer(activeCust);
      }

      // 3. Load or sync profiles table
      const { data: profData } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .maybeSingle();

      if (profData) {
        setProfile({
          id: profData.id,
          name: profData.name || profData.full_name || resolvedName,
          full_name: profData.full_name || profData.name || resolvedName,
          email: profData.email || normalizedEmail,
          phone: profData.phone || resolvedPhone,
          address: profData.address || resolvedAddress,
          image_url: profData.image_url,
          avatar_url: profData.avatar_url || profData.image_url,
          role: profData.role || 'Customer',
        });
      } else {
        const newProfile: Profile = {
          id: userId,
          name: resolvedName,
          full_name: resolvedName,
          email: normalizedEmail,
          phone: resolvedPhone || null,
          address: resolvedAddress || null,
          role: 'Customer',
        };
        await supabase.from('profiles').upsert(newProfile);
        setProfile(newProfile);
      }
    } catch (e) {
      console.error('Error loading customer profile:', e);
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
    const normalizedEmail = email.trim().toLowerCase();
    if (!normalizedEmail || !normalizedEmail.includes('@')) {
      return { error: 'Please enter a valid email address.' };
    }
    if (!password) {
      return { error: 'Please enter your password.' };
    }

    const { data, error } = await supabase.auth.signInWithPassword({
      email: normalizedEmail,
      password,
    });

    if (error) {
      return { error: error.message };
    }

    if (data.user) {
      await loadProfile(data.user.id, data.user.email);
    }

    return { error: null };
  };

  const signUp = async (
    email: string,
    password: string,
    fullName: string,
    phone?: string,
    address?: string
  ) => {
    const normalizedEmail = email.trim().toLowerCase();
    const trimmedName = fullName.trim();
    const trimmedPhone = phone?.trim() || '';
    const trimmedAddress = address?.trim() || '';

    // 1. Validation
    if (!trimmedName) {
      return { error: 'Please enter your full name.' };
    }
    if (!normalizedEmail || !normalizedEmail.includes('@')) {
      return { error: 'Please enter a valid email address.' };
    }
    if (!trimmedAddress) {
      return { error: 'Please enter your address.' };
    }
    if (!password || password.length < 6) {
      return { error: 'Password must be at least 6 characters long.' };
    }

    // 2. Prevent duplicate email in customers table
    const { data: existingCust } = await supabase
      .from('customers')
      .select('id, email')
      .ilike('email', normalizedEmail)
      .maybeSingle();

    if (existingCust) {
      return { error: 'This email address is already registered. Please log in instead.' };
    }

    // 3. Create Supabase Auth user
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email: normalizedEmail,
      password,
      options: {
        data: {
          full_name: trimmedName,
          phone: trimmedPhone || null,
          address: trimmedAddress || null,
        },
      },
    });

    if (authError) {
      const msg = authError.message.toLowerCase();
      if (msg.includes('already registered') || msg.includes('user already exists')) {
        return { error: 'This email address is already registered. Please log in instead.' };
      }
      return { error: authError.message };
    }

    if (!authData.user) {
      return { error: 'Registration failed. Please try again.' };
    }

    // 4. Save customer record to Supabase customers table
    const { data: createdCust, error: custInsertError } = await supabase
      .from('customers')
      .insert({
        user_id: authData.user.id,
        name: trimmedName,
        full_name: trimmedName,
        email: normalizedEmail,
        phone: trimmedPhone || null,
        address: trimmedAddress || null,
        status: 'Active',
        membership_type: 'New',
      })
      .select()
      .single();

    if (custInsertError) {
      console.error('Error saving customer record to Supabase:', custInsertError);
      if (custInsertError.message.includes('unique') || custInsertError.code === '23505') {
        return { error: 'This email address is already registered. Please log in instead.' };
      }
      return { error: 'Registration failed while saving your customer profile. Please try again.' };
    }

    // 5. Also upsert profiles table
    try {
      await supabase.from('profiles').upsert({
        id: authData.user.id,
        name: trimmedName,
        full_name: trimmedName,
        email: normalizedEmail,
        phone: trimmedPhone || null,
        address: trimmedAddress || null,
        role: 'Customer',
      });
    } catch (profErr) {
      console.error('Profile upsert warning:', profErr);
    }

    if (createdCust) {
      setCustomer(createdCust as Customer);
    }

    // 6. Send optional welcome email notification
    try {
      await fetch('/api/send-welcome', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: normalizedEmail, name: trimmedName }),
      });
    } catch (emailErr) {
      console.error('Error sending welcome email:', emailErr);
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

