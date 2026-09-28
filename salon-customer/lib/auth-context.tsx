'use client';

import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { Session, User } from '@supabase/supabase-js';
import bcrypt from 'bcryptjs';
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
  googleWelcomeUser: { name?: string; email?: string } | null;
  dismissGoogleWelcome: () => void;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [loading, setLoading] = useState(true);
  const [googleWelcomeUser, setGoogleWelcomeUser] = useState<{ name?: string; email?: string } | null>(null);

  const checkGoogleWelcome = (authUser: User, cust?: Customer | null, prof?: Profile | null) => {
    if (typeof window === 'undefined') return;
    const isPending = sessionStorage.getItem('candy_rose_google_login_pending') === 'true';
    if (isPending) {
      sessionStorage.removeItem('candy_rose_google_login_pending');
      const metaName = authUser.user_metadata?.full_name || authUser.user_metadata?.name || authUser.user_metadata?.given_name || '';
      const resolvedName = metaName || cust?.full_name || cust?.name || prof?.full_name || prof?.name || '';
      const resolvedEmail = authUser.email || cust?.email || prof?.email || '';
      setGoogleWelcomeUser({
        name: resolvedName,
        email: resolvedEmail,
      });
    }
  };

  const dismissGoogleWelcome = () => {
    setGoogleWelcomeUser(null);
  };

  const loadProfile = async (userId: string, userEmail?: string, userMetadata?: any) => {
    try {
      const normalizedEmail = userEmail?.trim().toLowerCase() || '';
      let activeCust: Customer | null = null;
      let activeProf: Profile | null = null;

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

      const metaName = userMetadata?.full_name || userMetadata?.name || userMetadata?.user_name || '';
      let resolvedName = activeCust?.full_name || activeCust?.name || metaName || (normalizedEmail ? normalizedEmail.split('@')[0] : 'Customer');
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
        activeProf = {
          id: profData.id,
          name: profData.name || profData.full_name || resolvedName,
          full_name: profData.full_name || profData.name || resolvedName,
          email: profData.email || normalizedEmail,
          phone: profData.phone || resolvedPhone,
          address: profData.address || resolvedAddress,
          image_url: profData.image_url,
          avatar_url: profData.avatar_url || profData.image_url,
          role: profData.role || 'Customer',
        };
        setProfile(activeProf);
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
        activeProf = newProfile;
        setProfile(newProfile);
      }

      return { customer: activeCust, profile: activeProf };
    } catch (e) {
      console.error('Error loading customer profile:', e);
      return { customer: null, profile: null };
    }
  };

  useEffect(() => {
    let mounted = true;

    supabase.auth.getSession().then(({ data }) => {
      if (!mounted) return;
      setSession(data.session);
      if (data.session?.user) {
        loadProfile(data.session.user.id, data.session.user.email, data.session.user.user_metadata)
          .then((res) => {
            if (mounted && data.session?.user) {
              checkGoogleWelcome(data.session.user, res?.customer, res?.profile);
            }
          })
          .finally(() => mounted && setLoading(false));
      } else {
        setLoading(false);
      }
    });

    const { data: listener } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession);
      if (newSession?.user) {
        loadProfile(newSession.user.id, newSession.user.email, newSession.user.user_metadata)
          .then((res) => {
            checkGoogleWelcome(newSession.user, res?.customer, res?.profile);
          });
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

    // 1. Check if customer exists in customers table
    const { data: custRecord } = await supabase
      .from('customers')
      .select('*')
      .ilike('email', normalizedEmail)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (custRecord && custRecord.password) {
      const isMatch = bcrypt.compareSync(password, custRecord.password);
      if (!isMatch) {
        return { error: 'Invalid email or password.' };
      }

      // Customer verified via bcrypt hash
      setCustomer(custRecord as Customer);
      if (custRecord.user_id) {
        await loadProfile(custRecord.user_id, custRecord.email);
        try {
          await supabase.auth.signInWithPassword({ email: normalizedEmail, password });
        } catch (_) {}
      } else {
        const resolvedName = custRecord.full_name || custRecord.name || normalizedEmail.split('@')[0] || 'Customer';
        setProfile({
          id: custRecord.id,
          name: resolvedName,
          full_name: resolvedName,
          email: normalizedEmail,
          phone: custRecord.phone || '',
          address: custRecord.address || '',
          role: 'Customer',
        });
      }
      return { error: null };
    }

    // Fallback: If customer doesn't have bcrypt password column set yet, use supabase.auth
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

    // 4. Hash password with bcrypt and save customer record to Supabase customers table
    const hashedPassword = bcrypt.hashSync(password, 10);
    const { data: createdCust, error: custInsertError } = await supabase
      .from('customers')
      .insert({
        user_id: authData.user.id,
        name: trimmedName,
        full_name: trimmedName,
        email: normalizedEmail,
        password: hashedPassword,
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
      value={{
        session,
        user: session?.user ?? null,
        profile,
        customer,
        loading,
        signIn,
        signUp,
        signOut,
        refreshProfile,
        googleWelcomeUser,
        dismissGoogleWelcome,
      }}
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

