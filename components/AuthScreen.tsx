
import React, { useState, useEffect } from 'react';
import { User, UserRole, PendingSignup } from '../types';
import { authApi, authUtils } from '../services/api';

interface AuthScreenProps {
  onLoginSuccess: (user: User, token: string) => void;
  onSignupSuccess: (user: User, token: string) => void;
}

const AuthScreen: React.FC<AuthScreenProps> = ({ onLoginSuccess, onSignupSuccess }) => {
  const [selectedRole, setSelectedRole] = useState<UserRole | null>(null);
  const [authMode, setAuthMode] = useState<'signin' | 'signup'>('signin');
  const [view, setView] = useState<'role-selection' | 'form' | 'otp-verification'>('role-selection');

  // Form State
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');

  const [password, setPassword] = useState('');
  const [cnic, setCnic] = useState('');

  // OTP State
  const [otpInput, setOtpInput] = useState('');
  const [otpEmail, setOtpEmail] = useState('');
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [resendCooldown, setResendCooldown] = useState(0);

  // Loading States
  const [isLoading, setIsLoading] = useState(false);
  const [isOtpLoading, setIsOtpLoading] = useState(false);
  const [isResendLoading, setIsResendLoading] = useState(false);

  useEffect(() => {
    let timer: any;
    if (resendCooldown > 0) {
      timer = setInterval(() => setResendCooldown(prev => prev - 1), 1000);
    }
    return () => clearInterval(timer);
  }, [resendCooldown]);

  // Format countdown timer
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handleResendOTP = async () => {
    if (!otpEmail || resendCooldown > 0) return;

    setIsResendLoading(true);
    setError('');

    try {
      const response = await authApi.resendOtp(otpEmail);
      if (response.success) {
        setResendCooldown(120); // 2 minutes cooldown
        setOtpInput(''); // Clear previous OTP
        setError(''); // Clear any previous errors
      }
    } catch (error: any) {
      setError(error.message || 'Failed to resend code. Please try again.');
    } finally {
      setIsResendLoading(false);
    }
  };

  const handleRoleSelect = (role: UserRole) => {
    setSelectedRole(role);
    setView('form');
    setError('');
    setSuccessMsg('');
  };

  const handleAction = async () => {
    if (!selectedRole) return;
    setError('');
    setSuccessMsg('');
    setIsLoading(true);

    try {
      if (authMode === 'signin') {
        // Login
        const response = await authApi.login({
          email,
          password,
          role: selectedRole
        });
        if (response.success && response.data) {
          authUtils.setToken(response.data.token);
          const user: User = {
            id: response.data.user.id,
            role: response.data.user.role === 'patient' ? UserRole.PATIENT : UserRole.DOCTOR,
            name: '', // Will be fetched from profile
            email: response.data.user.email,
            cnic: response.data.user.cnic,
            isVerified: response.data.user.isVerified
          };
          onLoginSuccess(user, response.data.token);
        }
      } else {
        // Signup - Validation
        if (!name || !email || !cnic || !password) {
          setError('All fields are required.');
          return;
        }

        // CNIC format validation for all users
        if (!/^\d{5}-\d{7}-\d{1}$/.test(cnic)) {
          setError('CNIC must be in format XXXXX-XXXXXXX-X');
          return;
        }

        // Password strength validation
        if (password.length < 6) {
          setError('Password must be at least 6 characters long.');
          return;
        }

        // Start signup process - this will send OTP
        const response = await authApi.signup({
          cnic,
          name,
          email,
          password,
          role: selectedRole || 'patient'
        });

        if (response.success) {
          setOtpEmail(email);
          setView('otp-verification');
          // Start 5-minute countdown
          setResendCooldown(300); // 5 minutes
        }
      }
    } catch (error: any) {
      setError(error.message || 'An error occurred. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyOTP = async () => {
    if (!otpEmail || otpInput.length !== 6 || !selectedRole) return;

    setIsOtpLoading(true);
    setError('');

    try {
      const response = await authApi.verifyOtp({
        email: otpEmail,
        otp: otpInput
      });

      if (response.success && response.data) {
        // Redirect to login instead of auto-login
        setAuthMode('signin');
        setView('form');
        setOtpInput('');
        setOtpEmail('');
        setSuccessMsg('Account verified successfully. Please sign in to continue.');
      }
    } catch (error: any) {
      setError(error.message || 'Verification failed. Please try again.');
    } finally {
      setIsOtpLoading(false);
    }
  };

  return (
    <div className="max-w-md mx-auto py-6 sm:py-12 px-4">
      <div className="bg-white p-6 sm:p-8 rounded-3xl shadow-xl border border-slate-100 animate-in slide-in-from-bottom-4 duration-500">

        {view === 'role-selection' && (
          <div className="space-y-8 text-center">
            <div>
              <h2 className="text-2xl font-bold text-slate-900">MedChain Access</h2>
              <p className="text-slate-500 text-sm">Choose your identity to continue</p>
            </div>
            <div className="grid gap-4">
              <button
                onClick={() => handleRoleSelect(UserRole.DOCTOR)}
                className="group flex items-center p-4 bg-slate-50 border border-slate-100 rounded-2xl hover:bg-blue-600 hover:border-blue-600 transition-all text-left"
              >
                <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center text-blue-600 group-hover:bg-blue-500 group-hover:text-white transition-colors mr-4">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 group-hover:text-white">I am a Doctor</h3>
                  <p className="text-xs text-slate-500 group-hover:text-blue-100">Manage patient records & treatments</p>
                </div>
              </button>

              <button
                onClick={() => handleRoleSelect(UserRole.PATIENT)}
                className="group flex items-center p-4 bg-slate-50 border border-slate-100 rounded-2xl hover:bg-emerald-600 hover:border-emerald-600 transition-all text-left"
              >
                <div className="w-12 h-12 bg-emerald-100 rounded-xl flex items-center justify-center text-emerald-600 group-hover:bg-emerald-500 group-hover:text-white transition-colors mr-4">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" /></svg>
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 group-hover:text-white">I am a Patient</h3>
                  <p className="text-xs text-slate-500 group-hover:text-emerald-100">View your medical history & assets</p>
                </div>
              </button>
            </div>
          </div>
        )}

        {view === 'form' && selectedRole && (
          <div className="space-y-6">
            <button onClick={() => setView('role-selection')} className="text-xs text-slate-400 flex items-center hover:text-slate-600">
              <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" /></svg>
              Back to roles
            </button>

            <div className="flex bg-slate-100 p-1 rounded-xl">
              <button
                onClick={() => setAuthMode('signin')}
                className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${authMode === 'signin' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500'}`}
              >
                Sign In
              </button>
              <button
                onClick={() => setAuthMode('signup')}
                className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${authMode === 'signup' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500'}`}
              >
                Sign Up
              </button>
            </div>

            <div className="text-center">
              <h2 className="text-xl font-bold text-slate-900">
                {authMode === 'signin' ? 'Sign In' : 'Create Account'}
              </h2>
              <p className="text-xs text-slate-500">Accessing as {selectedRole.toLowerCase()}</p>
            </div>

            {error && <div className="p-3 bg-red-50 border border-red-100 text-red-600 text-[10px] rounded-lg text-center font-medium">{error}</div>}
            {successMsg && <div className="p-3 bg-emerald-50 border border-emerald-100 text-emerald-600 text-[10px] rounded-lg text-center font-medium">{successMsg}</div>}

            <div className="space-y-4">
              {authMode === 'signup' && (
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Full Name</label>
                  <input value={name} onChange={e => setName(e.target.value)} className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500" placeholder="John Doe" />
                </div>
              )}

              {authMode === 'signup' && (
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">CNIC Number</label>
                  <input value={cnic} onChange={e => setCnic(e.target.value)} className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500" placeholder="42101-XXXXXXX-X" />
                </div>
              )}

              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Email Address</label>
                <input type="email" value={email} onChange={e => setEmail(e.target.value)} className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500" placeholder="name@hospital.com" />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Password</label>
                <input type="password" value={password} onChange={e => setPassword(e.target.value)} className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500" placeholder="••••••••" />
              </div>
            </div>

            <button
              onClick={handleAction}
              disabled={isLoading}
              className={`w-full py-3 rounded-xl font-bold text-white transition-all shadow-lg disabled:opacity-50 disabled:cursor-not-allowed ${selectedRole === UserRole.DOCTOR ? 'bg-blue-600 hover:bg-blue-700 shadow-blue-200' : 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-200'}`}
            >
              {isLoading ? (
                <div className="flex items-center justify-center">
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                  {authMode === 'signin' ? 'Signing In...' : 'Sending Code...'}
                </div>
              ) : (
                authMode === 'signin' ? 'Verify & Sign In' : 'Continue to Verification'
              )}
            </button>
          </div>
        )}

        {view === 'otp-verification' && otpEmail && (
          <div className="space-y-6">
            <div className="text-center space-y-2">
              <h2 className="text-2xl font-bold text-slate-900">Verify Email</h2>
              <p className="text-xs text-slate-500 leading-relaxed">We sent a 6-digit security code to <br /><span className="text-slate-900 font-bold">{otpEmail}</span></p>
            </div>

            {error && <div className="p-2 bg-amber-50 border border-amber-100 text-amber-600 text-[10px] rounded-lg text-center font-medium">{error}</div>}

            <div className="space-y-4">
              <input
                type="text"
                maxLength={6}
                value={otpInput}
                onChange={e => setOtpInput(e.target.value.replace(/[^0-9]/g, ''))}
                className="w-full text-center text-3xl font-bold tracking-[0.4em] px-4 py-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="000000"
              />
              <p className="text-[9px] text-center text-slate-400 uppercase tracking-widest font-bold">
                {resendCooldown > 0 ? `Expires in ${formatTime(resendCooldown)}` : 'Code expired'}
              </p>
            </div>

            <button
              onClick={handleVerifyOTP}
              disabled={otpInput.length !== 6 || isOtpLoading}
              className="w-full py-3 bg-slate-900 text-white rounded-xl font-bold hover:bg-black transition-all shadow-xl disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isOtpLoading ? (
                <div className="flex items-center justify-center">
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                  Verifying...
                </div>
              ) : (
                'Complete Registration'
              )}
            </button>

            <div className="text-center">
              <button
                onClick={handleResendOTP}
                disabled={resendCooldown > 0 || isResendLoading}
                className="text-xs font-semibold text-blue-600 hover:text-blue-700 disabled:text-slate-400 disabled:cursor-not-allowed"
              >
                {isResendLoading ? (
                  <span>Sending...</span>
                ) : resendCooldown > 0 ? (
                  `Resend code in ${formatTime(resendCooldown)}`
                ) : (
                  "Didn't receive code? Resend"
                )}
              </button>
            </div>
            <div className="p-3 bg-slate-50 rounded-lg text-[9px] text-slate-500 text-center italic">
              💡 Check your email for the verification code
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AuthScreen;
