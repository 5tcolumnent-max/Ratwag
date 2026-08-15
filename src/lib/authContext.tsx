import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { supabase } from './supabase';
import type { Session } from '@supabase/supabase-js';

interface AuthContextType {
  session: Session | null;
  loading: boolean;
  isPasswordRecovery: boolean;
  recoveryTokenValid: boolean | null;
  signUp: (email: string, password: string) => Promise<void>;
  signIn: (email: string, password: string) => Promise<void>;
  signInWithProvider: (provider: 'google' | 'github') => Promise<void>;
  signInWithRefreshToken: (refreshToken: string) => Promise<void>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  updatePassword: (newPassword: string) => Promise<void>;
  clearPasswordRecovery: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [isPasswordRecovery, setIsPasswordRecovery] = useState(false);
  const [recoveryTokenValid, setRecoveryTokenValid] = useState<boolean | null>(null);

  useEffect(() => {
    let initialEventReceived = false;

    const markLoaded = () => {
      if (!initialEventReceived) {
        initialEventReceived = true;
        setLoading(false);
      }
    };

    const hash = window.location.hash;
    const search = window.location.search;
    const fullUrl = hash + search;
    const hasRecoveryHash = fullUrl.includes('type=recovery');
    const hasErrorHash = fullUrl.includes('error_code=') || fullUrl.includes('error=');

    if (hasErrorHash && (fullUrl.includes('type=recovery') || fullUrl.includes('otp_expired') || fullUrl.includes('access_denied'))) {
      setIsPasswordRecovery(true);
      setRecoveryTokenValid(false);
      window.history.replaceState(null, '', window.location.pathname);
      setLoading(false);
      return;
    }

    if (hasRecoveryHash && !hasErrorHash) {
      setRecoveryTokenValid(null);
    }

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'PASSWORD_RECOVERY') {
        setIsPasswordRecovery(true);
        setRecoveryTokenValid(true);
        setSession(session);
        window.history.replaceState(null, '', window.location.pathname + window.location.search);
      } else {
        setSession(session);
        if (event === 'SIGNED_OUT') {
          setIsPasswordRecovery(false);
          setRecoveryTokenValid(null);
        }
      }
      markLoaded();
    });

    const timer = setTimeout(() => {
      markLoaded();
    }, 3000);

    return () => {
      subscription.unsubscribe();
      clearTimeout(timer);
    };
  }, []);

  const signUp = async (email: string, password: string) => {
    const { error } = await supabase.auth.signUp({ email, password });
    if (error) throw error;
  };

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
  };

  const signInWithProvider = async (provider: 'google' | 'github') => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider,
      options: { redirectTo: window.location.origin },
    });
    if (error) throw error;
  };

  const signInWithRefreshToken = async (refreshToken: string) => {
    const { error } = await supabase.auth.refreshSession({ refresh_token: refreshToken });
    if (error) throw error;
  };

  const signOut = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
  };

  const resetPassword = async (email: string) => {
    const origin = window.location.origin;
    const redirectTo = `${origin}${window.location.pathname === '/' ? '' : window.location.pathname}`;
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo,
    });
    if (error) throw error;
  };

  const updatePassword = async (newPassword: string) => {
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    if (error) throw error;
  };

  const clearPasswordRecovery = () => {
    setIsPasswordRecovery(false);
    setRecoveryTokenValid(null);
  };

  return (
    <AuthContext.Provider value={{ session, loading, isPasswordRecovery, recoveryTokenValid, signUp, signIn, signInWithProvider, signInWithRefreshToken, signOut, resetPassword, updatePassword, clearPasswordRecovery }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
