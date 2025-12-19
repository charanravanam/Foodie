import React, { useState } from 'react';
import { auth } from '../services/firebase';
import { createUserWithEmailAndPassword, signInWithEmailAndPassword, AuthError } from 'firebase/auth';
import { Mail, Lock, ArrowRight, Loader2 } from 'lucide-react';

const Auth = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      if (isLogin) {
        await signInWithEmailAndPassword(auth, email, password);
      } else {
        await createUserWithEmailAndPassword(auth, email, password);
      }
    } catch (err: any) {
      console.error("Auth Error:", err);
      const firebaseError = err as AuthError;
      let msg = "An unexpected error occurred. Please try again.";
      
      if (firebaseError.code === 'auth/invalid-email') msg = "Invalid email address format.";
      if (firebaseError.code === 'auth/user-disabled') msg = "This account has been disabled.";
      if (firebaseError.code === 'auth/user-not-found') msg = "No account found with this email.";
      if (firebaseError.code === 'auth/wrong-password') msg = "Incorrect password. Please try again.";
      if (firebaseError.code === 'auth/email-already-in-use') msg = "An account with this email already exists.";
      if (firebaseError.code === 'auth/weak-password') msg = "Password is too weak. Use at least 6 characters.";
      if (firebaseError.code === 'auth/network-request-failed') msg = "Network error. Please check your internet connection.";
      if (firebaseError.code === 'auth/too-many-requests') msg = "Too many failed attempts. Try again later.";
      
      setError(`${msg} (${firebaseError.code})`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-white">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <img src="https://www.foodieqr.com/assets/img/logo.svg" alt="Dr Foodie" className="h-16 mx-auto mb-4" />
          <h1 className="text-2xl font-heading font-bold text-black">{isLogin ? 'Welcome Back' : 'Create Account'}</h1>
          <p className="text-gray-500 text-sm mt-2">
            {isLogin ? 'Enter your details to access your plan.' : 'Start your personalized nutrition journey.'}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-4">
            <div className="relative">
              <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
              <input
                type="email"
                placeholder="Email Address"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full pl-12 pr-4 py-4 bg-gray-50 rounded-2xl border-none focus:ring-2 focus:ring-black focus:outline-none font-medium transition-all"
                required
              />
            </div>
            <div className="relative">
              <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
              <input
                type="password"
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full pl-12 pr-4 py-4 bg-gray-50 rounded-2xl border-none focus:ring-2 focus:ring-black focus:outline-none font-medium transition-all"
                required
              />
            </div>
          </div>

          {error && (
            <div className="p-3 bg-red-50 text-red-500 text-xs font-medium rounded-xl text-center leading-relaxed">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-black text-white py-4 rounded-2xl font-bold text-lg shadow-lg hover:scale-[1.02] transition-transform flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed"
          >
            {loading ? (
              <Loader2 className="animate-spin" size={20} />
            ) : (
              <>
                {isLogin ? 'Sign In' : 'Sign Up'} <ArrowRight size={20} />
              </>
            )}
          </button>
        </form>

        <div className="mt-8 text-center">
          <p className="text-gray-500 text-sm">
            {isLogin ? "Don't have an account?" : "Already have an account?"}
            <button
              type="button"
              onClick={() => { setIsLogin(!isLogin); setError(null); }}
              className="ml-2 font-bold text-black hover:underline"
            >
              {isLogin ? 'Sign Up' : 'Log In'}
            </button>
          </p>
        </div>
      </div>
    </div>
  );
};

export default Auth;