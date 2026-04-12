import { useState, useEffect } from 'react';
import { Shield, Mail, Lock, AlertCircle, Fingerprint, CheckCircle, ArrowLeft, KeyRound, XCircle } from 'lucide-react';
import { useAuth } from '../lib/authContext';
import { supabase } from '../lib/supabase';
import {
  registerCredential,
  authenticate,
  checkBiometricSupport,
  hasSavedCredential,
  BiometricAuthError,
  PRIVILEGED_EMAIL,
  isPrivilegedUser,
  storePrivilegedSession,
  retrievePrivilegedSession,
  clearPrivilegedSession,
  getStoredCredential,
} from '../lib/BiometricAuth';

type AuthView = 'login' | 'signup' | 'forgotPassword' | 'resetPassword';

export function AuthPage() {
  const { signIn, signUp, signInWithProvider, resetPassword, updatePassword, signInWithRefreshToken, isPasswordRecovery, recoveryTokenValid, clearPasswordRecovery } = useAuth();
  const [view, setView] = useState<AuthView>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);
  const [biometricLoading, setBiometricLoading] = useState(false);
  const [oauthLoading, setOauthLoading] = useState<'google' | 'github' | null>(null);
  const [biometricAvailable, setBiometricAvailable] = useState<boolean | null>(null);
  const [autoLoginAttempted, setAutoLoginAttempted] = useState(false);

  useEffect(() => {
    checkBiometricSupport().then(({ available }) => {
      setBiometricAvailable(available);
    });

    if (isPasswordRecovery) {
      setView('resetPassword');
      return;
    }

    const hash = window.location.hash;
    const search = window.location.search;
    const fullUrl = hash + search;
    if (fullUrl.includes('type=recovery') || fullUrl.includes('error_code=') || fullUrl.includes('error=')) {
      setView('resetPassword');
      return;
    }

    attemptPrivilegedAutoLogin();
  }, [isPasswordRecovery]);

  const attemptPrivilegedAutoLogin = async () => {
    const userId = btoa(PRIVILEGED_EMAIL);
    const credential = getStoredCredential(userId);
    if (!credential) return;

    const storedToken = retrievePrivilegedSession(credential.credentialId);
    if (!storedToken) return;

    setAutoLoginAttempted(true);
    setEmail(PRIVILEGED_EMAIL);
    setBiometricLoading(true);
    setSuccess('Face recognition ready — please verify to sign in automatically.');

    try {
      const verified = await authenticate(userId);
      if (verified) {
        await signInWithRefreshToken(storedToken);
      } else {
        clearPrivilegedSession();
        setSuccess('');
        setError('Biometric verification failed. Please sign in with your password.');
      }
    } catch (err) {
      clearPrivilegedSession();
      setSuccess('');
      if (err instanceof BiometricAuthError && err.code === 'USER_CANCELLED') {
        setError('');
      } else {
        setError('Auto-login failed. Please sign in with your password.');
      }
    } finally {
      setBiometricLoading(false);
    }
  };

  const clearMessages = () => {
    setError('');
    setSuccess('');
  };

  const switchView = (next: AuthView) => {
    clearMessages();
    setPassword('');
    setConfirmPassword('');
    setView(next);
  };

  const handleLoginSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    clearMessages();
    setLoading(true);
    try {
      if (view === 'login') {
        await signIn(email, password);

        if (isPrivilegedUser(email)) {
          const userId = btoa(PRIVILEGED_EMAIL);
          const hasCredential = hasSavedCredential(userId);
          const { data } = await supabase.auth.getSession();
          const rt = data.session?.refresh_token;

          if (!hasCredential) {
            try {
              const registered = await registerCredential(userId, PRIVILEGED_EMAIL);
              if (rt) storePrivilegedSession(rt, registered.credentialId);
            } catch {
              // biometric registration failed, user is still signed in
            }
          } else if (rt) {
            const credential = getStoredCredential(userId);
            if (credential) storePrivilegedSession(rt, credential.credentialId);
          }
        }
      } else {
        await signUp(email, password);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Authentication failed');
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    clearMessages();
    setLoading(true);
    try {
      await resetPassword(email);
      setSuccess('Password reset email sent. Check your inbox and follow the link to reset your password.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to send reset email');
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    clearMessages();
    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }
    if (password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }
    setLoading(true);
    try {
      await updatePassword(password);
      setSuccess('Password updated successfully. You can now sign in with your new password.');
      setPassword('');
      setConfirmPassword('');
      setTimeout(() => {
        clearPasswordRecovery();
        switchView('login');
      }, 2500);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update password');
    } finally {
      setLoading(false);
    }
  };

  const handleBiometricLogin = async () => {
    clearMessages();
    if (!email) {
      setError('Please enter your email address before using biometric login.');
      return;
    }
    setBiometricLoading(true);
    try {
      const userId = btoa(email);
      const hasCredential = hasSavedCredential(userId);

      if (isPrivilegedUser(email)) {
        if (!hasCredential) {
          if (!password) {
            setError('No biometric credential found. Enter your password first to register your biometric.');
            setBiometricLoading(false);
            return;
          }
          await signIn(email, password);
          const registered = await registerCredential(userId, email);
          const { data } = await supabase.auth.getSession();
          const rt = data.session?.refresh_token;
          if (rt) storePrivilegedSession(rt, registered.credentialId);
          setSuccess('Face recognition registered. Future visits will sign you in automatically.');
        } else {
          const verified = await authenticate(userId);
          if (verified) {
            const credential = getStoredCredential(userId);
            if (credential) {
              const rt = retrievePrivilegedSession(credential.credentialId);
              if (rt) {
                await signInWithRefreshToken(rt);
              } else if (password) {
                await signIn(email, password);
                const { data } = await supabase.auth.getSession();
                const newRt = data.session?.refresh_token;
                if (newRt) storePrivilegedSession(newRt, credential.credentialId);
              } else {
                setError('Session expired. Enter your password once to re-link biometric access.');
              }
            }
          }
        }
      } else {
        if (!hasCredential) {
          if (!password) {
            setError('No biometric credential found. Enter your password first to register.');
            setBiometricLoading(false);
            return;
          }
          await signIn(email, password);
          await registerCredential(userId, email);
          setSuccess('Biometric registered. You can use fingerprint login next time.');
        } else {
          const verified = await authenticate(userId);
          if (verified) {
            if (!password) {
              setError('Biometric confirmed. Please enter your password to complete sign-in.');
            } else {
              await signIn(email, password);
            }
          }
        }
      }
    } catch (err) {
      if (err instanceof BiometricAuthError) {
        setError(err.message);
      } else {
        setError('Biometric authentication failed. Please try again.');
      }
    } finally {
      setBiometricLoading(false);
    }
  };

  const handleOAuthSignIn = async (provider: 'google' | 'github') => {
    clearMessages();
    setOauthLoading(provider);
    try {
      await signInWithProvider(provider);
    } catch (err) {
      setError(err instanceof Error ? err.message : `Failed to sign in with ${provider}`);
      setOauthLoading(null);
    }
  };

  const isLogin = view === 'login';

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center p-3 sm:p-4">
      <div className="w-full max-w-md">
        <div className="bg-white rounded-xl shadow-2xl overflow-hidden">
          <div className="bg-gradient-to-r from-blue-600 to-blue-700 px-6 py-6 sm:p-8">
            <div className="flex items-center justify-center gap-3 mb-2">
              <Shield className="h-7 w-7 sm:h-8 sm:w-8 text-white" />
              <h1 className="text-2xl sm:text-3xl font-bold text-white">Kingdom Guardian</h1>
            </div>
            <p className="text-blue-100 text-center text-sm">Animal Welfare Intervention System</p>
          </div>

          <div className="px-6 py-6 sm:p-8">
            {view === 'forgotPassword' && (
              <>
                <button
                  type="button"
                  onClick={() => switchView('login')}
                  className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-blue-600 transition-colors mb-5 -mt-1"
                >
                  <ArrowLeft className="h-4 w-4" />
                  Back to Sign In
                </button>

                <div className="mb-6">
                  <div className="flex items-center gap-2 mb-1">
                    <KeyRound className="h-5 w-5 text-blue-600" />
                    <h2 className="text-2xl font-bold text-gray-800">Reset Password</h2>
                  </div>
                  <p className="text-gray-600 text-sm">
                    Enter your email and we'll send you a link to reset your password.
                  </p>
                </div>

                {error && (
                  <div className="mb-5 p-4 bg-red-50 border border-red-200 rounded-lg flex items-start gap-3">
                    <AlertCircle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
                    <p className="text-red-700 text-sm">{error}</p>
                  </div>
                )}

                {success && (
                  <div className="mb-5 p-4 bg-green-50 border border-green-200 rounded-lg flex items-start gap-3">
                    <CheckCircle className="h-5 w-5 text-green-600 flex-shrink-0 mt-0.5" />
                    <p className="text-green-700 text-sm">{success}</p>
                  </div>
                )}

                {!success && (
                  <form onSubmit={handleForgotPassword} className="space-y-4">
                    <div>
                      <label htmlFor="reset-email" className="block text-sm font-semibold text-gray-700 mb-2">
                        Email Address
                      </label>
                      <div className="relative">
                        <Mail className="absolute left-3 top-3 h-5 w-5 text-gray-400" />
                        <input
                          id="reset-email"
                          type="email"
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          placeholder="your@email.com"
                          required
                          className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
                        />
                      </div>
                    </div>

                    <button
                      type="submit"
                      disabled={loading}
                      className="w-full bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white font-semibold py-2 rounded-lg transition-all transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {loading ? 'Sending...' : 'Send Reset Link'}
                    </button>
                  </form>
                )}
              </>
            )}

            {view === 'resetPassword' && (
              <>
                {recoveryTokenValid === false ? (
                  <div className="text-center py-4">
                    <div className="flex justify-center mb-4">
                      <div className="w-14 h-14 rounded-full bg-red-100 flex items-center justify-center">
                        <XCircle className="h-8 w-8 text-red-500" />
                      </div>
                    </div>
                    <h2 className="text-xl font-bold text-gray-800 mb-2">Invalid or Expired Link</h2>
                    <p className="text-gray-500 text-sm mb-6 leading-relaxed">
                      This password reset link is no longer valid. Reset links expire after 1 hour and can only be used once.
                    </p>
                    <button
                      type="button"
                      onClick={() => {
                        clearPasswordRecovery();
                        switchView('forgotPassword');
                      }}
                      className="w-full bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white font-semibold py-2 rounded-lg transition-all"
                    >
                      Request a New Link
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        clearPasswordRecovery();
                        switchView('login');
                      }}
                      className="mt-3 w-full text-sm text-gray-500 hover:text-blue-600 transition-colors"
                    >
                      Back to Sign In
                    </button>
                  </div>
                ) : (
                  <>
                    <div className="mb-6">
                      <div className="flex items-center gap-2 mb-1">
                        <KeyRound className="h-5 w-5 text-blue-600" />
                        <h2 className="text-2xl font-bold text-gray-800">Set New Password</h2>
                      </div>
                      <p className="text-gray-600 text-sm">
                        Choose a strong new password for your account.
                      </p>
                    </div>

                    {error && (
                      <div className="mb-5 p-4 bg-red-50 border border-red-200 rounded-lg flex items-start gap-3">
                        <AlertCircle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
                        <p className="text-red-700 text-sm">{error}</p>
                      </div>
                    )}

                    {success && (
                      <div className="mb-5 p-4 bg-green-50 border border-green-200 rounded-lg flex items-start gap-3">
                        <CheckCircle className="h-5 w-5 text-green-600 flex-shrink-0 mt-0.5" />
                        <p className="text-green-700 text-sm">{success}</p>
                      </div>
                    )}

                    {!success && (
                      <form onSubmit={handleResetPassword} className="space-y-4">
                        <div>
                          <label htmlFor="new-password" className="block text-sm font-semibold text-gray-700 mb-2">
                            New Password
                          </label>
                          <div className="relative">
                            <Lock className="absolute left-3 top-3 h-5 w-5 text-gray-400" />
                            <input
                              id="new-password"
                              type="password"
                              value={password}
                              onChange={(e) => setPassword(e.target.value)}
                              placeholder="••••••••"
                              required
                              minLength={6}
                              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
                            />
                          </div>
                          <p className="text-xs text-gray-500 mt-1">Minimum 6 characters</p>
                        </div>

                        <div>
                          <label htmlFor="confirm-password" className="block text-sm font-semibold text-gray-700 mb-2">
                            Confirm New Password
                          </label>
                          <div className="relative">
                            <Lock className="absolute left-3 top-3 h-5 w-5 text-gray-400" />
                            <input
                              id="confirm-password"
                              type="password"
                              value={confirmPassword}
                              onChange={(e) => setConfirmPassword(e.target.value)}
                              placeholder="••••••••"
                              required
                              minLength={6}
                              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
                            />
                          </div>
                        </div>

                        <button
                          type="submit"
                          disabled={loading}
                          className="w-full bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white font-semibold py-2 rounded-lg transition-all transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          {loading ? 'Updating...' : 'Update Password'}
                        </button>
                      </form>
                    )}
                  </>
                )}
              </>
            )}

            {(view === 'login' || view === 'signup') && (
              <>
                <div className="mb-6">
                  <h2 className="text-2xl font-bold text-gray-800 mb-2">
                    {isLogin ? 'Welcome Back' : 'Create Account'}
                  </h2>
                  <p className="text-gray-600">
                    {isLogin ? 'Log in to access the monitoring dashboard' : 'Register to get started'}
                  </p>
                </div>

                {biometricLoading && autoLoginAttempted && (
                  <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg flex items-center gap-3">
                    <Fingerprint className="h-5 w-5 text-blue-600 animate-pulse flex-shrink-0" />
                    <p className="text-blue-700 text-sm font-medium">Awaiting face recognition...</p>
                  </div>
                )}

                {error && (
                  <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-start gap-3">
                    <AlertCircle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
                    <p className="text-red-700 text-sm">{error}</p>
                  </div>
                )}

                {success && !biometricLoading && (
                  <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg flex items-start gap-3">
                    <CheckCircle className="h-5 w-5 text-green-600 flex-shrink-0 mt-0.5" />
                    <p className="text-green-700 text-sm">{success}</p>
                  </div>
                )}

                <div className="space-y-3 mb-5">
                  <button
                    type="button"
                    onClick={() => handleOAuthSignIn('google')}
                    disabled={!!oauthLoading || loading || biometricLoading}
                    className="w-full flex items-center justify-center gap-3 border border-gray-300 hover:border-gray-400 hover:bg-gray-50 text-gray-700 font-semibold py-2.5 rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {oauthLoading === 'google' ? (
                      <div className="h-5 w-5 border-2 border-gray-400 border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <svg className="h-5 w-5" viewBox="0 0 24 24">
                        <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                        <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                        <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                        <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                      </svg>
                    )}
                    {oauthLoading === 'google' ? 'Connecting...' : 'Continue with Google'}
                  </button>

                  <button
                    type="button"
                    onClick={() => handleOAuthSignIn('github')}
                    disabled={!!oauthLoading || loading || biometricLoading}
                    className="w-full flex items-center justify-center gap-3 border border-gray-300 hover:border-gray-400 hover:bg-gray-50 text-gray-700 font-semibold py-2.5 rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {oauthLoading === 'github' ? (
                      <div className="h-5 w-5 border-2 border-gray-400 border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <svg className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M12 0C5.374 0 0 5.373 0 12c0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23A11.509 11.509 0 0112 5.803c1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576C20.566 21.797 24 17.3 24 12c0-6.627-5.373-12-12-12z"/>
                      </svg>
                    )}
                    {oauthLoading === 'github' ? 'Connecting...' : 'Continue with GitHub'}
                  </button>
                </div>

                <div className="relative flex items-center mb-5">
                  <div className="flex-grow border-t border-gray-200" />
                  <span className="mx-3 text-xs text-gray-400 font-medium uppercase tracking-wider">or continue with email</span>
                  <div className="flex-grow border-t border-gray-200" />
                </div>

                <form onSubmit={handleLoginSignup} className="space-y-4">
                  <div>
                    <label htmlFor="email" className="block text-sm font-semibold text-gray-700 mb-2">
                      Email Address
                    </label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-3 h-5 w-5 text-gray-400" />
                      <input
                        id="email"
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="your@email.com"
                        required
                        className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
                      />
                    </div>
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <label htmlFor="password" className="block text-sm font-semibold text-gray-700">
                        Password
                      </label>
                      {isLogin && (
                        <button
                          type="button"
                          onClick={() => switchView('forgotPassword')}
                          className="text-xs text-blue-600 hover:text-blue-700 font-medium transition-colors"
                        >
                          Forgot password?
                        </button>
                      )}
                    </div>
                    <div className="relative">
                      <Lock className="absolute left-3 top-3 h-5 w-5 text-gray-400" />
                      <input
                        id="password"
                        type="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="••••••••"
                        required
                        minLength={6}
                        className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
                      />
                    </div>
                    {!isLogin && (
                      <p className="text-xs text-gray-500 mt-1">Minimum 6 characters</p>
                    )}
                  </div>

                  <button
                    type="submit"
                    disabled={loading || biometricLoading}
                    className="w-full bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white font-semibold py-2 rounded-lg transition-all transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {loading ? 'Loading...' : isLogin ? 'Sign In' : 'Create Account'}
                  </button>
                </form>

                {isLogin && biometricAvailable !== false && (
                  <div className="mt-4">
                    <div className="relative flex items-center my-4">
                      <div className="flex-grow border-t border-gray-200" />
                      <span className="mx-3 text-xs text-gray-400 font-medium uppercase tracking-wider">or</span>
                      <div className="flex-grow border-t border-gray-200" />
                    </div>

                    <button
                      type="button"
                      onClick={handleBiometricLogin}
                      disabled={biometricLoading || biometricAvailable === null}
                      className="w-full flex items-center justify-center gap-3 border-2 border-gray-200 hover:border-blue-400 hover:bg-blue-50 text-gray-700 hover:text-blue-700 font-semibold py-2.5 rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed group"
                    >
                      <Fingerprint
                        className={`h-5 w-5 transition-colors ${
                          biometricLoading
                            ? 'animate-pulse text-blue-500'
                            : 'text-gray-400 group-hover:text-blue-500'
                        }`}
                      />
                      {biometricLoading
                        ? 'Verifying...'
                        : biometricAvailable === null
                        ? 'Checking biometric support...'
                        : 'Face / Fingerprint Login'}
                    </button>

                    {biometricAvailable === true && (
                      <p className="text-center text-xs text-gray-400 mt-2">
                        Uses your device's face sensor or fingerprint
                      </p>
                    )}
                  </div>
                )}

                {isLogin && biometricAvailable === false && (
                  <p className="mt-4 text-center text-xs text-amber-600 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
                    Biometric login is not available on this device or browser.
                  </p>
                )}

                <div className="mt-6 pt-6 border-t border-gray-200">
                  <p className="text-gray-600 text-sm text-center">
                    {isLogin ? "Don't have an account?" : 'Already have an account?'}
                    <button
                      type="button"
                      onClick={() => switchView(isLogin ? 'signup' : 'login')}
                      className="text-blue-600 hover:text-blue-700 font-semibold ml-1 transition-colors"
                    >
                      {isLogin ? 'Sign Up' : 'Sign In'}
                    </button>
                  </p>
                </div>
              </>
            )}
          </div>
        </div>

        <p className="text-center text-gray-400 text-xs mt-6">
          Secured by Supabase Authentication
        </p>
      </div>
    </div>
  );
}
