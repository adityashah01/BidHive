import React, { useState, useEffect } from 'react';
import { api } from '../lib/api.ts';
import BidHiveLogo from './BidHiveLogo';
import { 
  User, 
  Lock, 
  Eye, 
  EyeOff, 
  ArrowLeft, 
  Mail, 
  Phone, 
  Check, 
  Star, 
  Smartphone, 
  KeyRound, 
  RefreshCw,
  AlertTriangle
} from 'lucide-react';

interface LoginProps {
  onLoginSuccess: (user: any) => void;
}

type AuthMode = 'SIGN_IN' | 'SIGN_UP' | 'FORGOT_PASSWORD' | 'RESET_PASSWORD' | 'MFA';

export default function Login({ onLoginSuccess }: LoginProps) {
  const [mode, setMode] = useState<AuthMode>('SIGN_IN');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Form Fields
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Password reset token from URL
  const [resetToken, setResetToken] = useState<string | null>(null);

  // Sliding Star Human Verification
  const [sliderValue, setSliderValue] = useState(0);
  const [humanVerified, setHumanVerified] = useState(false);

  // Two-Factor Auth State
  const [mfaUserId, setMfaUserId] = useState<string | null>(null);
  const [mfaCode, setMfaCode] = useState('');
  const [mfaTimer, setMfaTimer] = useState(300);

  // Sandbox testing helpers
  const [sandboxEmails, setSandboxEmails] = useState<any[]>([]);
  const [loadingEmails, setLoadingEmails] = useState(false);
  const [showGoogleBypass, setShowGoogleBypass] = useState(false);

  const fetchRecentEmails = async (targetEmail: string) => {
    if (!targetEmail) return;
    setLoadingEmails(true);
    try {
      const data = await api.getRecentEmails(targetEmail);
      setSandboxEmails(data || []);
    } catch (err) {
      console.error('Failed to load recent sandbox emails:', err);
    } finally {
      setLoadingEmails(false);
    }
  };

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const token = params.get('token');
      const view = params.get('view');
      if (view === 'RESET_PASSWORD' && token) {
        setResetToken(token);
        setMode('RESET_PASSWORD');
      }
    }
  }, []);

  useEffect(() => {
    if (mode !== 'MFA' || mfaTimer <= 0) return;
    const interval = setInterval(() => {
      setMfaTimer((prev) => prev - 1);
    }, 1000);
    return () => clearInterval(interval);
  }, [mode, mfaTimer]);

  const handleGoogleLogin = async () => {
    setLoading(true);
    setError(null);
    setShowGoogleBypass(false);
    try {
      const userProfile = await api.loginWithGoogle();
      onLoginSuccess(userProfile);
    } catch (err: any) {
      console.error(err);
      setError('Google Authentication failed: ' + err.message);
      if (err.message?.includes('api-key-not-valid') || err.message?.includes('API key') || err.message?.includes('auth/')) {
        setShowGoogleBypass(true);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleDemoLogin = async (mockUid: string) => {
    setLoading(true);
    setError(null);
    try {
      const userProfile = await api.loginWithDemo(mockUid);
      onLoginSuccess(userProfile);
    } catch (err: any) {
      console.error(err);
      setError('Demo Sign-In failed: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMsg(null);

    if (!name || !email || !password || !confirmPassword) {
      setError('Please fill in all required fields.');
      return;
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }
    if (password.length < 6) {
      setError('Password must be at least 6 characters long.');
      return;
    }
    if (!humanVerified) {
      setError('Please complete the sliding verification.');
      return;
    }

    setLoading(true);
    try {
      const user = await api.register({
        name,
        email,
        password,
        phoneNumber: phoneNumber || null,
      });
      setSuccessMsg('Account registered successfully!');
      setTimeout(() => {
        onLoginSuccess(user);
      }, 1200);
    } catch (err: any) {
      setError(err.message || 'Registration failed.');
      setLoading(false);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMsg(null);

    if (!email || !password) {
      setError('Email and password are required.');
      return;
    }

    setLoading(true);
    try {
      const res = await api.login({ email, password });
      if (res.requires2FA) {
        setMfaUserId(res.userId);
        setMode('MFA');
        setMfaTimer(300);
        setMfaCode('');
        setLoading(false);
      } else {
        onLoginSuccess(res);
      }
    } catch (err: any) {
      setError(err.message || 'Invalid email or password.');
      setLoading(false);
    }
  };

  const handleVerifyMFA = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!mfaUserId || !mfaCode) {
      setError('Verification code is required.');
      return;
    }

    setLoading(true);
    try {
      const user = await api.verify2FA(mfaUserId, mfaCode);
      onLoginSuccess(user);
    } catch (err: any) {
      setError(err.message || 'Invalid or expired verification code.');
      setLoading(false);
    }
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMsg(null);

    if (!email) {
      setError('Email address is required.');
      return;
    }

    setLoading(true);
    try {
      const res = await api.forgotPassword(email);
      setSuccessMsg(res.message);
      await fetchRecentEmails(email);
    } catch (err: any) {
      setError(err.message || 'Failed to send password reset link.');
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMsg(null);

    if (!resetToken) {
      setError('Missing reset token.');
      return;
    }
    if (!password || !confirmPassword) {
      setError('Both password fields are required.');
      return;
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setLoading(true);
    try {
      const res = await api.resetPassword({ token: resetToken, newPassword: password });
      setSuccessMsg(res.message);
      setTimeout(() => {
        if (typeof window !== 'undefined') {
          window.history.replaceState({}, document.title, window.location.pathname);
        }
        setMode('SIGN_IN');
      }, 2000);
    } catch (err: any) {
      setError(err.message || 'Failed to reset password.');
    } finally {
      setLoading(false);
    }
  };

  const handleSliderChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (humanVerified) return;
    const value = parseInt(e.target.value);
    setSliderValue(value);
    if (value >= 90) {
      setSliderValue(100);
      setHumanVerified(true);
    }
  };

  const handleSliderRelease = () => {
    if (humanVerified) return;
    if (sliderValue < 90) {
      let val = sliderValue;
      const interval = setInterval(() => {
        val = Math.max(0, val - 10);
        setSliderValue(val);
        if (val === 0) clearInterval(interval);
      }, 20);
    }
  };

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  return (
    <div id="login-screen" className="min-h-[85vh] bg-[#F7F7F5] flex items-center justify-center p-4 py-12">
      <div className="w-full max-w-md space-y-6">
        
        {/* Brand Header */}
        <div className="text-center">
          <BidHiveLogo variant="full" theme="light" />
        </div>

        {/* Auth Card */}
        <div className="bg-white border border-[#E5E7EB] rounded-xl p-6 sm:p-8 space-y-5 shadow-xs">
          
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-xs text-red-700 font-medium flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0 text-red-600" />
              <span>{error}</span>
            </div>
          )}

          {successMsg && (
            <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg text-xs text-emerald-700 font-medium flex items-center gap-2">
              <Check className="w-4 h-4 shrink-0 text-emerald-600" />
              <span>{successMsg}</span>
            </div>
          )}

          {/* SIGN IN */}
          {mode === 'SIGN_IN' && (
            <>
              <div className="space-y-1 text-center">
                <h2 className="text-lg font-bold text-[#18181B]">Sign In</h2>
                <p className="text-xs text-[#6B7280]">
                  Log in to place bids or list items for sale.
                </p>
              </div>

              <form onSubmit={handleLogin} className="space-y-4">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-[#18181B]">Email Address</label>
                  <div className="relative">
                    <Mail className="w-4 h-4 text-[#6B7280] absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="email"
                      required
                      placeholder="e.g. aditya@bidhive.np"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full h-10 bg-white border border-[#E5E7EB] rounded-lg pl-9 pr-3 text-xs text-[#18181B] focus:outline-none focus:border-[#D99000]"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-semibold text-[#18181B]">Password</label>
                    <button
                      type="button"
                      onClick={() => setMode('FORGOT_PASSWORD')}
                      className="text-xs font-medium text-[#D99000] hover:underline cursor-pointer"
                    >
                      Forgot Password?
                    </button>
                  </div>
                  <div className="relative">
                    <Lock className="w-4 h-4 text-[#6B7280] absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      required
                      placeholder="••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full h-10 bg-white border border-[#E5E7EB] rounded-lg pl-9 pr-9 text-xs text-[#18181B] focus:outline-none focus:border-[#D99000]"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-[#6B7280] hover:text-[#18181B] cursor-pointer"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full h-10 bg-[#D99000] hover:bg-[#B87500] text-white font-bold text-xs rounded-lg transition-colors cursor-pointer flex items-center justify-center gap-2 shadow-2xs"
                >
                  {loading ? <RefreshCw className="w-4 h-4 animate-spin" /> : 'Log In'}
                </button>
              </form>

              <div className="text-center text-xs text-[#6B7280]">
                Don't have an account?{' '}
                <button
                  onClick={() => { setMode('SIGN_UP'); setError(null); setSuccessMsg(null); }}
                  className="text-[#D99000] font-bold hover:underline cursor-pointer"
                >
                  Register
                </button>
              </div>

              <div className="flex items-center gap-3">
                <div className="flex-1 h-px bg-[#E5E7EB]" />
                <span className="text-[11px] text-[#6B7280]">Or</span>
                <div className="flex-1 h-px bg-[#E5E7EB]" />
              </div>

              <button
                onClick={handleGoogleLogin}
                disabled={loading}
                className="w-full h-10 bg-white border border-[#E5E7EB] hover:bg-gray-50 text-[#18181B] font-semibold text-xs rounded-lg transition-colors cursor-pointer flex items-center justify-center gap-2 shadow-2xs"
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
                </svg>
                <span>Sign In with Google</span>
              </button>

              {showGoogleBypass && (
                <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 space-y-2">
                  <p className="text-xs text-amber-800">
                    Google Sign-In notice: Sandbox API key mode available.
                  </p>
                  <button
                    type="button"
                    onClick={() => handleDemoLogin('usr-aditya')}
                    className="w-full py-1.5 bg-[#D99000] text-white font-bold text-xs rounded transition-colors"
                  >
                    Continue as Demo User
                  </button>
                </div>
              )}
            </>
          )}

          {/* SIGN UP */}
          {mode === 'SIGN_UP' && (
            <>
              <div className="flex items-center gap-2 border-b border-[#E5E7EB] pb-3">
                <button
                  onClick={() => { setMode('SIGN_IN'); setError(null); setSuccessMsg(null); }}
                  className="p-1 text-[#6B7280] hover:text-[#18181B] cursor-pointer"
                >
                  <ArrowLeft className="w-4 h-4" />
                </button>
                <div>
                  <h2 className="text-sm font-bold text-[#18181B]">Create Account</h2>
                  <p className="text-xs text-[#6B7280]">Register to join BidHive auctions</p>
                </div>
              </div>

              <form onSubmit={handleSignUp} className="space-y-3">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-[#18181B]">Full Name *</label>
                  <div className="relative">
                    <User className="w-4 h-4 text-[#6B7280] absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      required
                      placeholder="e.g. Aditya Sharma"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="w-full h-10 bg-white border border-[#E5E7EB] rounded-lg pl-9 pr-3 text-xs text-[#18181B] focus:outline-none focus:border-[#D99000]"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-[#18181B]">Email Address *</label>
                  <div className="relative">
                    <Mail className="w-4 h-4 text-[#6B7280] absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="email"
                      required
                      placeholder="e.g. aditya@bidhive.np"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full h-10 bg-white border border-[#E5E7EB] rounded-lg pl-9 pr-3 text-xs text-[#18181B] focus:outline-none focus:border-[#D99000]"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-[#18181B]">Phone Number (Optional)</label>
                  <div className="relative">
                    <Phone className="w-4 h-4 text-[#6B7280] absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="tel"
                      placeholder="e.g. +977 9801234567"
                      value={phoneNumber}
                      onChange={(e) => setPhoneNumber(e.target.value)}
                      className="w-full h-10 bg-white border border-[#E5E7EB] rounded-lg pl-9 pr-3 text-xs text-[#18181B] focus:outline-none focus:border-[#D99000]"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-[#18181B]">Password *</label>
                  <div className="relative">
                    <Lock className="w-4 h-4 text-[#6B7280] absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      required
                      placeholder="At least 6 characters"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full h-10 bg-white border border-[#E5E7EB] rounded-lg pl-9 pr-9 text-xs text-[#18181B] focus:outline-none focus:border-[#D99000]"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-[#6B7280]"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-[#18181B]">Confirm Password *</label>
                  <div className="relative">
                    <Lock className="w-4 h-4 text-[#6B7280] absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type={showConfirmPassword ? 'text' : 'password'}
                      required
                      placeholder="••••••••"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      className="w-full h-10 bg-white border border-[#E5E7EB] rounded-lg pl-9 pr-9 text-xs text-[#18181B] focus:outline-none focus:border-[#D99000]"
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-[#6B7280]"
                    >
                      {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                {/* Human verification */}
                <div className="bg-gray-50 border border-[#E5E7EB] p-3 rounded-lg space-y-2">
                  <div className="flex justify-between items-center text-xs font-medium text-[#18181B]">
                    <span>Verification</span>
                    {humanVerified ? (
                      <span className="text-emerald-700 font-bold flex items-center gap-1">
                        <Check className="w-3.5 h-3.5" /> Verified
                      </span>
                    ) : (
                      <span className="text-[#6B7280]">Slide star to verify</span>
                    )}
                  </div>

                  <div className="relative h-9 bg-white border border-[#E5E7EB] rounded-lg flex items-center px-2 select-none overflow-hidden">
                    <input
                      type="range"
                      min="0"
                      max="100"
                      value={sliderValue}
                      onChange={handleSliderChange}
                      onMouseUp={handleSliderRelease}
                      onTouchEnd={handleSliderRelease}
                      disabled={humanVerified}
                      className="w-full opacity-0 cursor-pointer disabled:cursor-default"
                    />
                    {!humanVerified ? (
                      <div className="absolute left-2 text-xs text-[#6B7280] font-medium pointer-events-none">
                        Slide to verify →
                      </div>
                    ) : (
                      <div className="absolute left-2 text-xs text-emerald-700 font-bold pointer-events-none">
                        Verification Complete
                      </div>
                    )}
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading || !humanVerified}
                  className="w-full h-10 bg-[#D99000] hover:bg-[#B87500] disabled:bg-gray-200 disabled:text-gray-500 text-white font-bold text-xs rounded-lg transition-colors cursor-pointer"
                >
                  {loading ? <RefreshCw className="w-4 h-4 animate-spin mx-auto" /> : 'Register Account'}
                </button>
              </form>
            </>
          )}

          {/* FORGOT PASSWORD */}
          {mode === 'FORGOT_PASSWORD' && (
            <>
              <div className="flex items-center gap-2 border-b border-[#E5E7EB] pb-3">
                <button
                  onClick={() => { setMode('SIGN_IN'); setError(null); setSuccessMsg(null); }}
                  className="p-1 text-[#6B7280] hover:text-[#18181B] cursor-pointer"
                >
                  <ArrowLeft className="w-4 h-4" />
                </button>
                <div>
                  <h2 className="text-sm font-bold text-[#18181B]">Reset Password</h2>
                  <p className="text-xs text-[#6B7280]">We'll send a password reset link</p>
                </div>
              </div>

              <form onSubmit={handleForgotPassword} className="space-y-3">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-[#18181B]">Account Email</label>
                  <div className="relative">
                    <Mail className="w-4 h-4 text-[#6B7280] absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="email"
                      required
                      placeholder="e.g. aditya@bidhive.np"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full h-10 bg-white border border-[#E5E7EB] rounded-lg pl-9 pr-3 text-xs text-[#18181B] focus:outline-none focus:border-[#D99000]"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full h-10 bg-[#D99000] hover:bg-[#B87500] text-white font-bold text-xs rounded-lg transition-colors cursor-pointer"
                >
                  {loading ? <RefreshCw className="w-4 h-4 animate-spin mx-auto" /> : 'Send Reset Link'}
                </button>
              </form>

              {/* Sandbox simulated emails */}
              <div className="mt-4 pt-3 border-t border-[#E5E7EB] space-y-2">
                <div className="flex justify-between items-center text-xs font-medium text-[#6B7280]">
                  <span>Simulated Inbox</span>
                  {email && (
                    <button
                      type="button"
                      onClick={() => fetchRecentEmails(email)}
                      className="text-[#D99000] font-bold hover:underline cursor-pointer"
                    >
                      Refresh
                    </button>
                  )}
                </div>

                {sandboxEmails.map((mail: any) => {
                  const match = mail.bodyHtml?.match(/token=(rst-[a-z0-9]+)/);
                  const token = match ? match[1] : null;
                  return (
                    <div key={mail.id} className="bg-gray-50 border border-[#E5E7EB] rounded p-2 text-xs space-y-1">
                      <div className="font-bold text-[#18181B]">{mail.subject}</div>
                      {token && (
                        <button
                          type="button"
                          onClick={() => {
                            setResetToken(token);
                            setMode('RESET_PASSWORD');
                            setSuccessMsg('Reset token loaded. Enter your new password below.');
                          }}
                          className="text-[#D99000] font-bold underline cursor-pointer"
                        >
                          Click to Reset Password
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            </>
          )}

          {/* RESET PASSWORD */}
          {mode === 'RESET_PASSWORD' && (
            <>
              <div className="text-center space-y-1">
                <KeyRound className="w-6 h-6 text-[#D99000] mx-auto" />
                <h2 className="text-sm font-bold text-[#18181B]">Set New Password</h2>
              </div>

              <form onSubmit={handleResetPassword} className="space-y-3">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-[#18181B]">New Password</label>
                  <input
                    type="password"
                    required
                    placeholder="At least 6 characters"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full h-10 bg-white border border-[#E5E7EB] rounded-lg px-3 text-xs text-[#18181B] focus:outline-none focus:border-[#D99000]"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-[#18181B]">Confirm Password</label>
                  <input
                    type="password"
                    required
                    placeholder="••••••••"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="w-full h-10 bg-white border border-[#E5E7EB] rounded-lg px-3 text-xs text-[#18181B] focus:outline-none focus:border-[#D99000]"
                  />
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full h-10 bg-[#D99000] hover:bg-[#B87500] text-white font-bold text-xs rounded-lg transition-colors cursor-pointer"
                >
                  {loading ? <RefreshCw className="w-4 h-4 animate-spin mx-auto" /> : 'Save New Password'}
                </button>
              </form>
            </>
          )}

          {/* MFA */}
          {mode === 'MFA' && (
            <>
              <div className="text-center space-y-1">
                <Smartphone className="w-6 h-6 text-[#D99000] mx-auto" />
                <h2 className="text-sm font-bold text-[#18181B]">Enter 2FA Code</h2>
                <p className="text-xs text-[#6B7280]">Verification code sent to your email</p>
              </div>

              <form onSubmit={handleVerifyMFA} className="space-y-3">
                <input
                  type="text"
                  required
                  maxLength={6}
                  placeholder="123456"
                  value={mfaCode}
                  onChange={(e) => setMfaCode(e.target.value.replace(/[^0-9]/g, ''))}
                  className="w-full h-11 border border-[#E5E7EB] rounded-lg text-center font-mono font-bold text-lg text-[#18181B] focus:border-[#D99000]"
                />

                <div className="text-center text-xs text-[#6B7280]">
                  Code expires in: <strong className="text-[#18181B]">{formatTime(mfaTimer)}</strong>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full h-10 bg-[#D99000] hover:bg-[#B87500] text-white font-bold text-xs rounded-lg transition-colors cursor-pointer"
                >
                  Verify Code
                </button>
              </form>
            </>
          )}

        </div>
      </div>
    </div>
  );
}
