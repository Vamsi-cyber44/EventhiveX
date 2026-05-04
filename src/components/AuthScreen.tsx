import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Sparkles, Loader2, Mail, Lock, User, ArrowRight, CircleDashed } from 'lucide-react';
import { cn } from '@/src/lib/utils';
import { signInWithGoogle, signInWithEmail, registerWithEmail, resetPassword } from '@/src/lib/firebase';

interface AuthScreenProps {
  onAuthSuccess: (user: any) => void;
}

export default function AuthScreen({ onAuthSuccess }: AuthScreenProps) {
  const [isLogin, setIsLogin] = useState(true);
  const [isResetMode, setIsResetMode] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const [error, setError] = useState('');
  const [resetSuccess, setResetSuccess] = useState('');
  
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: ''
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');
    setResetSuccess('');

    try {
      if (isResetMode) {
        await resetPassword(formData.email);
        setResetSuccess('Check your email for the reset instructions');
        return;
      }

      if (isLogin) {
        const user = await signInWithEmail(formData.email, formData.password);
        onAuthSuccess(user);
      } else {
        const user = await registerWithEmail(formData.email, formData.password, formData.name);
        onAuthSuccess(user);
      }
    } catch (err: any) {
      if (err.code === 'auth/user-not-found' || err.code === 'auth/wrong-password') {
        setError('Invalid email or password');
      } else if (err.code === 'auth/email-already-in-use') {
        setError('Email already in use');
      } else if (err.code === 'auth/weak-password') {
        setError('Password should be at least 6 characters');
      } else if (err.code === 'auth/operation-not-allowed') {
        setError('Login provider not enabled. Please enable Email/Password in Firebase Console.');
      } else {
        setError(err.message || 'Authentication failed');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setIsGoogleLoading(true);
    setError('');
    try {
      const user = await signInWithGoogle();
      onAuthSuccess(user);
    } catch (err: any) {
      setError(err.message || 'Google login failed');
    } finally {
      setIsGoogleLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-brand-primary flex items-center justify-center p-6 relative overflow-hidden">
      {/* Background Decor */}
      <div className="absolute top-0 left-0 w-[500px] h-[500px] bg-brand-accent/5 rounded-full blur-[100px] -translate-x-1/2 -translate-y-1/2" />
      <div className="absolute bottom-0 right-0 w-[500px] h-[500px] bg-brand-accent/5 rounded-full blur-[100px] translate-x-1/2 translate-y-1/2" />

      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md"
      >
        <div className="text-center mb-12">
          <div className="inline-flex flex-col items-center gap-4 group">
            <div className="w-16 h-16 rounded-[2rem] bg-brand-accent flex items-center justify-center shadow-[0_0_30px_rgba(247,183,51,0.3)] group-hover:scale-110 transition-transform duration-500">
              <CircleDashed className="w-10 h-10 text-brand-primary animate-spin-slow" />
            </div>
            <div>
              <h1 className="text-4xl font-serif font-bold text-white tracking-tight">Aura <span className="text-brand-accent italic">Luxe</span></h1>
              <p className="text-[10px] uppercase tracking-[0.3em] text-white/30 font-black mt-2">Elite Collective Membership</p>
            </div>
          </div>
        </div>

        <div className="glass-card p-10 border-white/5 relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-brand-accent to-transparent opacity-20" />
          
          <h2 className="text-2xl font-serif font-bold text-white mb-8 text-center">
            {isResetMode ? 'Recall your Cipher' : isLogin ? 'Welcome Back, Visionary' : 'Join the Elite Collective'}
          </h2>

          {!isResetMode && (
            <div className="mb-8">
              <button 
                onClick={handleGoogleLogin}
                disabled={isGoogleLoading}
                className="w-full py-4 rounded-xl bg-white/5 border border-white/10 text-white font-black text-[10px] uppercase tracking-widest flex items-center justify-center gap-4 transition-all hover:bg-white/10 active:scale-95 disabled:opacity-50"
              >
                {isGoogleLoading ? (
                  <Loader2 className="w-5 h-5 animate-spin text-brand-accent" />
                ) : (
                  <>
                    <svg className="w-5 h-5" viewBox="0 0 24 24">
                      <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                      <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                      <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                      <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                    </svg>
                    Continue with Google
                  </>
                )}
              </button>

              <div className="relative mt-8 mb-8 text-center">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-white/5"></div>
                </div>
                <span className="relative px-4 text-[8px] font-black uppercase tracking-[0.5em] text-white/20 bg-brand-primary">Or use credentials</span>
              </div>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            <AnimatePresence mode="wait">
              {!isLogin && !isResetMode && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="space-y-2"
                >
                  <label className="text-[10px] uppercase font-black text-white/30 tracking-widest ml-1">Full Designation</label>
                  <div className="relative">
                    <User className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-brand-accent/40" />
                    <input 
                      type="text"
                      required={!isLogin}
                      placeholder="Your Name"
                      value={formData.name}
                      onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                      className="w-full pl-12 pr-4 py-4 rounded-xl bg-white/[0.03] border border-white/10 text-white placeholder:text-white/10 focus:outline-none focus:ring-1 focus:ring-brand-accent/30 font-bold transition-all"
                    />
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            <div className="space-y-2">
              <label className="text-[10px] uppercase font-black text-white/30 tracking-widest ml-1">Secure Channel (Email)</label>
              <div className="relative">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-brand-accent/40" />
                <input 
                  type="email"
                  required
                  placeholder="identity@auraluxe.com"
                  value={formData.email}
                  onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                  className="w-full pl-12 pr-4 py-4 rounded-xl bg-white/[0.03] border border-white/10 text-white placeholder:text-white/10 focus:outline-none focus:ring-1 focus:ring-brand-accent/30 font-bold transition-all"
                />
              </div>
            </div>

            {!isResetMode && (
              <div className="space-y-2">
                <div className="flex justify-between items-center ml-1">
                  <label className="text-[10px] uppercase font-black text-white/30 tracking-widest">Cipher Protocol (Password)</label>
                  {isLogin && (
                    <button 
                      type="button"
                      onClick={() => {
                        setIsResetMode(true);
                        setError('');
                        setResetSuccess('');
                      }}
                      className="text-[9px] uppercase font-black text-brand-accent hover:underline"
                    >
                      Forgot?
                    </button>
                  )}
                </div>
                <div className="relative">
                  <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-brand-accent/40" />
                  <input 
                    type="password"
                    required={!isResetMode}
                    placeholder="••••••••"
                    value={formData.password}
                    onChange={(e) => setFormData(prev => ({ ...prev, password: e.target.value }))}
                    className="w-full pl-12 pr-4 py-4 rounded-xl bg-white/[0.03] border border-white/10 text-white placeholder:text-white/10 focus:outline-none focus:ring-1 focus:ring-brand-accent/30 font-bold transition-all"
                  />
                </div>
              </div>
            )}

            {resetSuccess && (
              <motion.p 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="text-brand-accent text-xs font-bold text-center italic"
              >
                {resetSuccess}
              </motion.p>
            )}

            {error && (
              <motion.p 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="text-red-500 text-xs font-bold text-center italic"
              >
                {error}
              </motion.p>
            )}

            <button 
              type="submit"
              disabled={isLoading}
              className="w-full py-4 rounded-xl bg-brand-accent text-brand-primary font-black text-xs uppercase tracking-widest flex items-center justify-center gap-3 shadow-[0_0_30px_rgba(247,183,51,0.2)] hover:shadow-[0_0_40px_rgba(247,183,51,0.4)] transition-all active:scale-95 disabled:opacity-50"
            >
              {isLoading ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <>
                  {isResetMode ? 'Dispatch Reset Signal' : isLogin ? 'Initiate Access' : 'Create Persona'}
                  <ArrowRight className="w-5 h-5" />
                </>
              )}
            </button>
          </form>

          <div className="mt-10 pt-8 border-t border-white/5 text-center">
            <p className="text-white/30 text-[10px] uppercase tracking-widest">
              {isResetMode 
                ? "Remembered your cipher?" 
                : isLogin ? "New to the Collective?" : "Already recognized?"}
              <button 
                onClick={() => {
                  if (isResetMode) {
                    setIsResetMode(false);
                  } else {
                    setIsLogin(!isLogin);
                  }
                  setError('');
                  setResetSuccess('');
                }}
                className="ml-2 text-brand-accent font-black hover:underline"
              >
                {isResetMode 
                  ? 'Return to Protocol'
                  : isLogin ? 'Register your Cipher' : 'Access your Protocol'}
              </button>
            </p>
          </div>
        </div>

        <div className="mt-12 text-center opacity-20 flex flex-col items-center gap-2">
          <Sparkles className="w-4 h-4 text-brand-accent" />
          <p className="text-[8px] font-black uppercase tracking-[0.5em] text-white">Encryption Standard: AES-256 Bit Neural</p>
        </div>
      </motion.div>
    </div>
  );
}
