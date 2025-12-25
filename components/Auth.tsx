
import React, { useState } from 'react';
import { auth, db } from '../services/firebase';
import { createUserWithEmailAndPassword, signInWithEmailAndPassword, sendPasswordResetEmail } from 'firebase/auth';
import { Mail, Lock, ArrowRight, Loader2, Gift, ShieldAlert, Key, HelpCircle } from 'lucide-react';

interface AuthProps {
  onAdminLogin: (status: boolean) => void;
}

const Auth: React.FC<AuthProps> = ({ onAdminLogin }) => {
  const [isLogin, setIsLogin] = useState(true);
  const [isForgotPassword, setIsForgotPassword] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [referralCode, setReferralCode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setMessage(null);
    setLoading(true);
    try {
      await sendPasswordResetEmail(auth, email);
      setMessage("Recovery link dispatched! Check your inbox.");
    } catch (err: any) {
      setError(err.message || "Failed to send recovery email.");
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isForgotPassword) return handleResetPassword(e);

    setError(null);
    setLoading(true);

    // ADMIN LOGIN CHECK
    if (email.toLowerCase() === 'admin' && password === 'adminfoodie') {
      onAdminLogin(true);
      setLoading(false);
      return;
    }

    try {
      if (isLogin) {
        await signInWithEmailAndPassword(auth, email, password);
      } else {
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        const user = userCredential.user;
        if (referralCode.trim()) {
           localStorage.setItem(`pending_referral_${user.uid}`, referralCode.trim().toUpperCase());
        }
      }
    } catch (err: any) {
      console.error("Auth Error:", err);
      let msg = "An unexpected error occurred.";
      if (err.code === 'auth/wrong-password') msg = "Incorrect password.";
      if (err.code === 'auth/user-not-found') msg = "No account found.";
      if (err.code === 'auth/email-already-in-use') msg = "Node already exists with this email.";
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-white font-sans">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-black rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-xl transition-transform hover:scale-110">
            {isForgotPassword ? <Key className="text-white" size={32} /> : <ShieldAlert className="text-white" size={32} />}
          </div>
          <h1 className="text-2xl font-black tracking-tight">
            {isForgotPassword ? 'Reset Access' : (isLogin ? 'Welcome Back' : 'Create Account')}
          </h1>
          <p className="text-gray-400 text-xs font-bold uppercase tracking-widest mt-2">
            {isForgotPassword ? 'Recover your terminal node' : (isLogin ? 'Log in to your terminal' : 'Join the elite nutrition network')}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-3">
            <div className="relative">
              <Mail className="absolute left-5 top-1/2 -translate-y-1/2 text-gray-300" size={18} />
              <input
                type="text"
                placeholder="Email Address"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full pl-14 pr-4 py-5 bg-gray-50 rounded-[24px] border-none focus:ring-2 focus:ring-black focus:outline-none font-bold transition-all shadow-inner"
                required
              />
            </div>
            
            {!isForgotPassword && (
              <div className="relative animate-fade-in">
                <Lock className="absolute left-5 top-1/2 -translate-y-1/2 text-gray-300" size={18} />
                <input
                  type="password"
                  placeholder={isLogin ? "Password" : "Create a password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-14 pr-4 py-5 bg-gray-50 rounded-[24px] border-none focus:ring-2 focus:ring-black focus:outline-none font-bold transition-all shadow-inner"
                  required
                />
              </div>
            )}

            {!isLogin && !isForgotPassword && (
              <div className="relative animate-fade-in">
                <Gift className="absolute left-5 top-1/2 -translate-y-1/2 text-gray-300" size={18} />
                <input
                  type="text"
                  placeholder="Referral Code (Optional)"
                  value={referralCode}
                  onChange={(e) => setReferralCode(e.target.value)}
                  className="w-full pl-14 pr-4 py-5 bg-gray-50 rounded-[24px] border-none focus:ring-2 focus:ring-black focus:outline-none font-bold transition-all shadow-inner uppercase"
                />
              </div>
            )}
          </div>

          {error && <div className="p-4 bg-red-50 text-red-500 text-[10px] font-black uppercase tracking-widest rounded-2xl text-center border border-red-100 animate-fade-in">{error}</div>}
          {message && <div className="p-4 bg-green-50 text-green-500 text-[10px] font-black uppercase tracking-widest rounded-2xl text-center border border-green-100 animate-fade-in">{message}</div>}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-black text-white py-5 rounded-[24px] font-black text-lg shadow-xl hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center gap-2 disabled:opacity-70"
          >
            {loading ? <Loader2 className="animate-spin" size={20} /> : (isForgotPassword ? 'SEND RECOVERY' : (isLogin ? 'LOG IN' : 'ESTABLISH NODE'))}
          </button>
        </form>

        <div className="mt-8 space-y-4 text-center">
          {isLogin && !isForgotPassword && (
            <button
              type="button"
              onClick={() => setIsForgotPassword(true)}
              className="text-[10px] font-black text-gray-300 uppercase tracking-widest hover:text-black transition-colors flex items-center justify-center gap-2 mx-auto"
            >
              <HelpCircle size={12}/> Forgot Password?
            </button>
          )}
          
          <button
            type="button"
            onClick={() => {
              if (isForgotPassword) {
                setIsForgotPassword(false);
              } else {
                setIsLogin(!isLogin);
              }
              setError(null);
              setMessage(null);
            }}
            className="text-[10px] font-black text-gray-400 uppercase tracking-widest hover:text-black transition-colors"
          >
            {isForgotPassword ? "Back to Login" : (isLogin ? "Need an account? Sign Up" : "Already have an account? Log In")}
          </button>
        </div>
      </div>
    </div>
  );
};

export default Auth;
