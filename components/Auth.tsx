
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
      setMessage("Link dispatched! Check your inbox.");
    } catch (err: any) {
      setError(err.message || "Failed to send link.");
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isForgotPassword) return handleResetPassword(e);

    setError(null);
    setLoading(true);

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
      let msg = "Unexpected error occurred.";
      if (err.code === 'auth/wrong-password') msg = "Incorrect password.";
      if (err.code === 'auth/user-not-found') msg = "No node found.";
      if (err.code === 'auth/email-already-in-use') msg = "Node already exists.";
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-white font-sans">
      <div className="w-full max-w-sm">
        <div className="text-center mb-6">
          <div className="w-14 h-14 bg-black rounded-2xl flex items-center justify-center mx-auto mb-3 shadow-xl transition-transform hover:scale-110">
            {isForgotPassword ? <Key className="text-white" size={28} /> : <ShieldAlert className="text-white" size={28} />}
          </div>
          <h1 className="text-xl font-black tracking-tight">
            {isForgotPassword ? 'Reset Access' : (isLogin ? 'Welcome Back' : 'Create Account')}
          </h1>
          <p className="text-gray-400 text-[10px] font-bold uppercase tracking-widest mt-1.5">
            {isForgotPassword ? 'Recover your terminal' : (isLogin ? 'Log in to your terminal' : 'Join the health network')}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="space-y-2">
            <div className="relative">
              <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-300" size={16} />
              <input
                type="text"
                placeholder="Email Address"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full pl-12 pr-4 py-4 bg-gray-50 rounded-[20px] border-none focus:ring-1 focus:ring-black font-bold transition-all shadow-inner text-sm"
                required
              />
            </div>
            
            {!isForgotPassword && (
              <div className="relative animate-fade-in">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-300" size={16} />
                <input
                  type="password"
                  placeholder={isLogin ? "Password" : "Create password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-12 pr-4 py-4 bg-gray-50 rounded-[20px] border-none focus:ring-1 focus:ring-black font-bold transition-all shadow-inner text-sm"
                  required
                />
              </div>
            )}

            {!isLogin && !isForgotPassword && (
              <div className="relative animate-fade-in">
                <Gift className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-300" size={16} />
                <input
                  type="text"
                  placeholder="Referral (Optional)"
                  value={referralCode}
                  onChange={(e) => setReferralCode(e.target.value)}
                  className="w-full pl-12 pr-4 py-4 bg-gray-50 rounded-[20px] border-none focus:ring-1 focus:ring-black font-bold transition-all shadow-inner uppercase text-sm"
                />
              </div>
            )}
          </div>

          {error && <div className="p-3 bg-red-50 text-red-500 text-[8px] font-black uppercase tracking-widest rounded-xl text-center border border-red-100">{error}</div>}
          {message && <div className="p-3 bg-green-50 text-green-500 text-[8px] font-black uppercase tracking-widest rounded-xl text-center border border-green-100">{message}</div>}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-black text-white py-4 rounded-[20px] font-black text-base shadow-xl active:scale-95 transition-all flex items-center justify-center gap-2 disabled:opacity-70 mt-2"
          >
            {loading ? <Loader2 className="animate-spin" size={18} /> : (isForgotPassword ? 'SEND RECOVERY' : (isLogin ? 'LOG IN' : 'ESTABLISH NODE'))}
          </button>
        </form>

        <div className="mt-6 space-y-3 text-center">
          {isLogin && !isForgotPassword && (
            <button
              type="button"
              onClick={() => setIsForgotPassword(true)}
              className="text-[9px] font-black text-gray-300 uppercase tracking-widest hover:text-black transition-colors flex items-center justify-center gap-1.5 mx-auto"
            >
              <HelpCircle size={10}/> Forgot Password?
            </button>
          )}
          
          <button
            type="button"
            onClick={() => {
              setIsForgotPassword(false);
              setIsLogin(!isLogin);
              setError(null);
              setMessage(null);
            }}
            className="text-[9px] font-black text-gray-400 uppercase tracking-widest hover:text-black transition-colors"
          >
            {isForgotPassword ? "Back to Login" : (isLogin ? "Need an account? Sign Up" : "Already have an account? Log In")}
          </button>
        </div>
      </div>
    </div>
  );
};

export default Auth;
