
import React, { useState } from 'react';
import { auth, db } from '../services/firebase';
import { createUserWithEmailAndPassword, signInWithEmailAndPassword, sendPasswordResetEmail, sendEmailVerification } from 'firebase/auth';
import { Mail, Lock, ArrowRight, Loader2, Gift, ShieldAlert, Key, HelpCircle, AlertCircle } from 'lucide-react';

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

  const validateForm = () => {
    if (!email.includes('@')) {
      setError("Please enter a valid email address.");
      return false;
    }
    if (password.length < 6) {
      setError("Password must be at least 6 characters.");
      return false;
    }
    return true;
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setMessage(null);
    if (!email) {
      setError("Enter email to receive reset link.");
      return;
    }
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
    
    // Explicit Admin Credential Check
    if (email.toLowerCase() === 'admin@foodie' && password === 'adminfoodie') {
      onAdminLogin(true);
      return;
    }

    if (!validateForm()) return;

    setLoading(true);

    try {
      if (isLogin) {
        await signInWithEmailAndPassword(auth, email, password);
      } else {
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        const user = userCredential.user;
        
        // Auto-send verification email
        await sendEmailVerification(user);
        
        if (referralCode.trim()) {
           localStorage.setItem(`pending_referral_${user.uid}`, referralCode.trim().toUpperCase());
        }
        setMessage("Node established. Verification link dispatched to " + email);
      }
    } catch (err: any) {
      console.error("Auth Error:", err.code);
      let msg = "Establishment failed. Try again.";
      
      // Specific Error Handling as requested
      if (err.code === 'auth/user-not-found') {
        msg = "No account found with this email. Please create an account first.";
      } else if (err.code === 'auth/wrong-password') {
        msg = "Incorrect password. Please try again.";
      } else if (err.code === 'auth/invalid-credential') {
        msg = "Invalid credentials. If you don't have an account, please sign up first.";
      } else if (err.code === 'auth/email-already-in-use') {
        msg = "Account already exists with this ID. Please Log In.";
      } else if (err.code === 'auth/weak-password') {
        msg = "Encryption too weak. Use min 6 chars.";
      } else if (err.code === 'auth/invalid-email') {
        msg = "Email protocol invalid.";
      }
      
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-white font-sans">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-black rounded-[24px] flex items-center justify-center mx-auto mb-4 shadow-xl transition-transform hover:rotate-3 active:scale-90">
             <ShieldAlert className="text-white" size={32} />
          </div>
          <h1 className="text-2xl font-black tracking-tight">
            {isForgotPassword ? 'Reset Access' : (isLogin ? 'Welcome Back' : 'Create Account')}
          </h1>
          <p className="text-gray-400 text-[10px] font-black uppercase tracking-[0.3em] mt-2">
            {isForgotPassword ? 'Recover Terminal' : (isLogin ? 'Log in to Terminal' : 'Join the Network')}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="space-y-2">
            <div className="relative">
              <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-300" size={16} />
              <input
                type="text"
                placeholder="Email address"
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
                  placeholder={isLogin ? "Password" : "Min. 6 characters"}
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

          {error && (
            <div className="p-4 bg-red-50 text-red-600 rounded-2xl flex items-start gap-3 border border-red-100 animate-fade-in shadow-sm">
              <AlertCircle size={16} className="shrink-0 mt-0.5" />
              <p className="text-[11px] font-black uppercase tracking-tight leading-tight">{error}</p>
            </div>
          )}
          
          {message && (
            <div className="p-4 bg-green-50 text-green-600 rounded-2xl flex items-start gap-3 border border-green-100 animate-fade-in shadow-sm">
              <Loader2 size={16} className="shrink-0 mt-0.5 animate-spin" />
              <p className="text-[11px] font-black uppercase tracking-tight leading-tight">{message}</p>
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-black text-white py-4 rounded-[20px] font-black text-sm shadow-xl active:scale-95 transition-all flex items-center justify-center gap-2 disabled:opacity-70 mt-4"
          >
            {loading ? <Loader2 className="animate-spin" size={20} /> : (isForgotPassword ? 'SEND RECOVERY' : (isLogin ? 'LOG IN' : 'ESTABLISH NODE'))}
          </button>
        </form>

        <div className="mt-8 space-y-4 text-center">
          {isLogin && !isForgotPassword && (
            <button
              type="button"
              onClick={() => setIsForgotPassword(true)}
              className="text-[10px] font-black text-gray-400 uppercase tracking-widest hover:text-black transition-colors"
            >
              Lost your access? Reset here
            </button>
          )}
          
          <div>
            <button
              type="button"
              onClick={() => {
                setIsForgotPassword(false);
                setIsLogin(!isLogin);
                setError(null);
                setMessage(null);
              }}
              className="text-[10px] font-black text-black uppercase tracking-widest bg-gray-50 px-6 py-3 rounded-full hover:bg-gray-100 transition-colors"
            >
              {isForgotPassword ? "Back to Login" : (isLogin ? "Join the Health Network" : "Log in to existing Node")}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Auth;
