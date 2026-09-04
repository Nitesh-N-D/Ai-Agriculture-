import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Leaf, User, Lock, Eye, EyeOff, Loader2, AlertCircle,
  CheckCircle2, ArrowRight, UserPlus, LogIn, Sparkles, Shield
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const Login = () => {
  const [isSignUp, setIsSignUp] = useState(false);
  const [formData, setFormData] = useState({
    username: '',
    fullName: '',
    password: '',
    confirmPassword: ''
  });
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const { login, register, user, logout } = useAuth();
  const navigate = useNavigate();

  const handleInputChange = (e) => {
    setFormData(prev => ({
      ...prev,
      [e.target.name]: e.target.value
    }));
    setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccessMsg('');

    if (!formData.username.trim()) {
      setError('Please enter your username.');
      return;
    }

    if (formData.username.trim().length < 3) {
      setError('Username must be at least 3 characters.');
      return;
    }

    if (!formData.password) {
      setError('Please enter your password.');
      return;
    }

    if (formData.password.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }

    if (isSignUp) {
      if (formData.password !== formData.confirmPassword) {
        setError('Passwords do not match. Please verify.');
        return;
      }

      setLoading(true);
      const res = await register(
        formData.username,
        formData.password,
        formData.fullName
      );
      setLoading(false);

      if (res.success) {
        setSuccessMsg('Account created successfully! Redirecting...');
        setTimeout(() => {
          navigate('/');
        }, 1200);
      } else {
        setError(res.message);
      }
    } else {
      setLoading(true);
      const res = await login(formData.username, formData.password);
      setLoading(false);

      if (res.success) {
        setSuccessMsg('Welcome back! Redirecting...');
        setTimeout(() => {
          navigate('/');
        }, 1000);
      } else {
        setError(res.message);
      }
    }
  };

  const switchMode = (signUpMode) => {
    setIsSignUp(signUpMode);
    setError('');
    setSuccessMsg('');
    setFormData({
      username: '',
      fullName: '',
      password: '',
      confirmPassword: ''
    });
  };

  // If already logged in, display active session card
  if (user) {
    return (
      <div className="flex items-center justify-center min-h-[75vh] px-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="glass-card max-w-md w-full p-8 text-center border-brand-500/30 shadow-[0_0_50px_rgba(76,175,80,0.2)]"
        >
          <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-brand-500 to-emerald-600 flex items-center justify-center mx-auto mb-6 shadow-[0_0_30px_rgba(76,175,80,0.5)]">
            <User className="w-10 h-10 text-white" />
          </div>

          <h2 className="text-2xl font-black text-white mb-2 tracking-wide">
            Already Signed In
          </h2>
          <p className="text-slate-400 text-sm mb-6">
            You are logged in as{' '}
            <span className="text-brand-300 font-bold">{user.full_name || user.username}</span>{' '}
            (<span className="text-slate-300 font-mono">@{user.username}</span>)
          </p>

          <div className="flex flex-col gap-3">
            <button
              onClick={() => navigate('/')}
              className="btn-primary flex items-center justify-center gap-2 py-3"
            >
              Go to Dashboard
              <ArrowRight className="w-4 h-4" />
            </button>

            <button
              onClick={logout}
              className="py-3 px-6 rounded-xl bg-white/5 hover:bg-rose-500/20 text-slate-300 hover:text-rose-300 border border-white/10 hover:border-rose-500/30 transition-all font-semibold text-sm"
            >
              Sign Out
            </button>
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-center min-h-[80vh] px-4 py-8">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="glass-card max-w-md w-full p-8 sm:p-10 relative overflow-hidden border-white/10 shadow-[0_0_60px_rgba(16,185,129,0.15)]"
      >
        {/* Glow backdrop decorative effect */}
        <div className="absolute top-0 right-0 w-48 h-48 bg-brand-500/15 rounded-full blur-[80px] pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-48 h-48 bg-emerald-600/10 rounded-full blur-[80px] pointer-events-none" />

        {/* Brand Header */}
        <div className="text-center mb-8 relative z-10">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-brand-500 to-brand-700 flex items-center justify-center mx-auto mb-4 shadow-[0_0_25px_rgba(76,175,80,0.5)] border border-brand-400/30">
            <Leaf className="w-8 h-8 text-white drop-shadow-[0_0_6px_rgba(255,255,255,0.8)]" />
          </div>

          <h1 className="text-2xl sm:text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-white via-slate-100 to-slate-400 tracking-wider">
            Smart-Farm-<span className="text-brand-400">Ai</span>
          </h1>
          <p className="text-xs uppercase tracking-[0.25em] text-brand-300/80 mt-1 font-semibold">
            {isSignUp ? 'Create Farmer Account' : 'Agronomic Portal Access'}
          </p>
        </div>

        {/* Mode Tabs (Sign In / Sign Up) */}
        <div className="flex rounded-xl bg-slate-900/80 p-1 mb-6 border border-white/10 relative z-10">
          <button
            type="button"
            onClick={() => switchMode(false)}
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-xs font-bold uppercase tracking-wider transition-all duration-300 ${
              !isSignUp
                ? 'bg-gradient-to-r from-brand-600 to-emerald-600 text-white shadow-[0_0_15px_rgba(76,175,80,0.4)]'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <LogIn className="w-3.5 h-3.5" />
            Sign In
          </button>
          <button
            type="button"
            onClick={() => switchMode(true)}
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-xs font-bold uppercase tracking-wider transition-all duration-300 ${
              isSignUp
                ? 'bg-gradient-to-r from-brand-600 to-emerald-600 text-white shadow-[0_0_15px_rgba(76,175,80,0.4)]'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <UserPlus className="w-3.5 h-3.5" />
            Sign Up
          </button>
        </div>

        {/* Alerts */}
        <AnimatePresence mode="wait">
          {error && (
            <motion.div
              key="err"
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="mb-5 p-3.5 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-200 text-xs flex items-start gap-2.5 shadow-[0_0_15px_rgba(244,63,94,0.15)] overflow-hidden"
            >
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-400" />
              <div className="flex-1 leading-relaxed">{error}</div>
            </motion.div>
          )}

          {successMsg && (
            <motion.div
              key="suc"
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="mb-5 p-3.5 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-200 text-xs flex items-start gap-2.5 shadow-[0_0_15px_rgba(16,185,129,0.15)] overflow-hidden"
            >
              <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5 text-emerald-400" />
              <div className="flex-1 leading-relaxed font-semibold">{successMsg}</div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4 relative z-10">
          {isSignUp && (
            <div>
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                Full Name / Farm Name
              </label>
              <input
                type="text"
                name="fullName"
                placeholder="e.g. Ramesh Kumar"
                value={formData.fullName}
                onChange={handleInputChange}
                className="glowing-input !py-3 !text-sm bg-slate-900/60"
              />
            </div>
          )}

          <div>
            <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5 flex items-center gap-1.5">
              <User className="w-3.5 h-3.5 text-brand-400" />
              Username <span className="text-rose-400">*</span>
            </label>
            <input
              type="text"
              name="username"
              required
              placeholder="e.g. farmer_john"
              value={formData.username}
              onChange={handleInputChange}
              className="glowing-input !py-3 !text-sm bg-slate-900/60"
            />
          </div>

          <div>
            <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5 flex items-center gap-1.5">
              <Lock className="w-3.5 h-3.5 text-brand-400" />
              Password <span className="text-rose-400">*</span>
            </label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                name="password"
                required
                placeholder="At least 6 characters"
                value={formData.password}
                onChange={handleInputChange}
                className="glowing-input !py-3 !text-sm !pr-10 bg-slate-900/60"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white transition-colors"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {isSignUp && (
            <div>
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5 flex items-center gap-1.5">
                <Shield className="w-3.5 h-3.5 text-emerald-400" />
                Confirm Password <span className="text-rose-400">*</span>
              </label>
              <input
                type={showPassword ? 'text' : 'password'}
                name="confirmPassword"
                required
                placeholder="Re-enter password"
                value={formData.confirmPassword}
                onChange={handleInputChange}
                className="glowing-input !py-3 !text-sm bg-slate-900/60"
              />
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className={`btn-primary w-full py-3.5 mt-3 uppercase tracking-widest text-xs font-bold flex items-center justify-center gap-2 ${
              loading ? 'opacity-60 cursor-not-allowed' : ''
            }`}
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                {isSignUp ? 'Creating Account...' : 'Signing In...'}
              </>
            ) : (
              <>
                {isSignUp ? <UserPlus className="w-4 h-4" /> : <LogIn className="w-4 h-4" />}
                {isSignUp ? 'Create Account' : 'Sign In'}
              </>
            )}
          </button>
        </form>

        {/* Footer switch prompt */}
        <div className="mt-6 text-center text-xs text-slate-400 relative z-10">
          {isSignUp ? (
            <p>
              Already have an account?{' '}
              <button
                type="button"
                onClick={() => switchMode(false)}
                className="text-brand-300 hover:text-brand-200 font-bold underline transition-colors"
              >
                Sign In
              </button>
            </p>
          ) : (
            <p>
              New to Smart-Farm-Ai?{' '}
              <button
                type="button"
                onClick={() => switchMode(true)}
                className="text-brand-300 hover:text-brand-200 font-bold underline transition-colors"
              >
                Create an account
              </button>
            </p>
          )}
        </div>
      </motion.div>
    </div>
  );
};

export default Login;
