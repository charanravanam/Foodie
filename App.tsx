
import React, { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import { 
  Home, BarChart2, Settings, Plus, Flame, ChevronRight, ArrowLeft, ArrowRight,
  Camera, User as UserIcon, Dumbbell, LogOut, Crown, Loader2, TrendingUp,
  Apple, Target, Zap, Star, Activity, Droplets, Calendar, Clock,
  Trophy, CheckCircle2, Info, Timer, ZapOff, Play, X, Pause, SkipForward,
  Scan, Sparkles, MapPin, Check, Image as ImageIcon, RefreshCcw, Maximize, ScanLine, Trash2, Wallet as WalletIcon, Gift, Award, Users, CreditCard, Coins, Save, Calculator, Copy, Share2, ShieldCheck, UserMinus, ShieldAlert, DollarSign, ListOrdered, UserCheck, Filter, Search, History, Heart, Ruler, Medal, Mail, Key, Briefcase, Linkedin, Github, Globe, Send, ExternalLink, BadgeCheck, Share, Sparkle, Ban, UserX, Gem, Lock, Zap as Lightning
} from 'lucide-react';
import { onAuthStateChanged, signOut, sendPasswordResetEmail } from 'firebase/auth';
import type { User as FirebaseUser } from 'firebase/auth';
import { 
  doc, getDoc, setDoc, collection, query, orderBy, getDocs, addDoc, deleteDoc, where, updateDoc, increment, onSnapshot, Timestamp, runTransaction, limit
} from 'firebase/firestore';
import Onboarding from './components/Onboarding';
import PremiumModal from './components/PremiumModal';
import Auth from './components/Auth';
import { UserProfile, ScanHistoryItem, Gender, Goal, WorkoutLocation, MuscleGroup, Exercise } from './types';
import { analyzeFoodImage, generateWorkoutRoutine } from './services/geminiService';
import { auth, db } from './services/firebase';

const MAX_FREE_SCANS_PER_DAY = 3;
const COINS_PER_SCAN = 5;
const WITHDRAWAL_FEE = 100;
const RUPEE_TO_COINS = 100;

const SIGNUP_REFERRAL_COINS = 100;
const PREMIUM_REFERRAL_COINS = 250;

const TEAM_MEMBERS = [
  { name: 'Charan Ravanam', role: 'Founder & CEO', bio: 'Visionary behind Dr Foodie, focusing on metabolic health and AI integration.', icon: <Sparkles className="text-yellow-500" /> },
  { name: 'Kranthi Madireddy', role: 'Chief Product Officer', bio: 'Driving user experience and clinical product roadmap.', icon: <Target className="text-blue-500" /> },
  { name: 'Amogha', role: 'Head of AI Research', bio: 'Leading the development of Dr Foodie\'s clinical vision models.', icon: <Zap className="text-purple-500" /> },
  { name: 'Jathin', role: 'Lead Developer', bio: 'Scaling the infrastructure and real-time metabolic engines.', icon: <Activity className="text-green-500" /> },
  { name: 'Srikanth', role: 'Clinical Nutrition Lead', bio: 'Ensuring every micro-analysis meets medical-grade precision.', icon: <Heart className="text-red-500" /> },
];

const formatCoins = (num: number) => {
  if (!num) return '0';
  if (num < 100000) return num.toLocaleString();
  if (num >= 1000000) return (num / 1000000).toFixed(1).replace(/\.0$/, '') + 'M';
  return (num / 1000).toFixed(0) + 'k';
};

const WalletForm: React.FC<{
  profile: UserProfile | null;
  onTransfer: (code: string, coins: number) => Promise<void>;
  onBack: () => void;
}> = ({ profile, onTransfer, onBack }) => {
  const [transferCode, setTransferCode] = useState('');
  const [transferAmount, setTransferAmount] = useState('100');
  const [isProcessingTransfer, setIsProcessingTransfer] = useState(false);

  return (
    <div className="pt-4 space-y-8 animate-fade-in pb-40 px-4 h-full overflow-y-auto no-scrollbar">
      <div className="flex items-center gap-4">
        <button onClick={onBack} className="p-4 bg-white rounded-3xl shadow-card active:scale-95 transition-all">
          <ArrowLeft size={20}/>
        </button>
        <h1 className="text-3xl font-black">Vault</h1>
      </div>
      
      {/* Balance Card - Luxury Style */}
      <div className="bg-[#0A0A0A] text-white p-10 rounded-[56px] text-center relative overflow-hidden shadow-2xl border border-white/5">
         <div className="absolute top-0 left-0 w-full h-full opacity-30 pointer-events-none bg-[radial-gradient(circle_at_50%_0%,rgba(255,215,0,0.15),transparent_70%)]" />
         <div className="text-[10px] font-black uppercase text-gray-600 tracking-[0.4em] mb-4">TOTAL ASSETS</div>
         <div className="flex items-center justify-center gap-3">
            <div className="text-7xl font-black mb-2 bg-gradient-to-b from-white to-gray-500 bg-clip-text text-transparent">
              {formatCoins(profile?.points || 0)}
            </div>
            <Gem className="text-yellow-500 animate-pulse" size={32} />
         </div>
         <div className="text-[10px] font-black text-yellow-400 bg-white/5 py-3 px-6 rounded-full inline-block mt-4 uppercase tracking-[0.2em] border border-white/5 backdrop-blur-md">
           NODE ID: {profile?.uniqueTransferCode || 'Generating...'}
         </div>
      </div>

      {/* Airdrop Suspense Card - Simplified for clear understanding */}
      <div className="bg-gradient-to-br from-yellow-400 to-yellow-600 p-10 rounded-[56px] shadow-[0_20px_50px_rgba(234,179,8,0.3)] relative overflow-hidden group">
         <div className="absolute -right-10 -bottom-10 opacity-20 group-hover:scale-110 transition-transform duration-700">
            <Lightning size={160} className="text-white fill-white" />
         </div>
         <div className="relative z-10 space-y-4">
            <div className="flex items-center gap-2">
               <div className="bg-black text-white px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest">PHASE 1: EARN & HOLD</div>
            </div>
            <h2 className="text-3xl font-black text-black leading-tight tracking-tighter uppercase">The Great Airdrop</h2>
            <div className="space-y-3">
              <p className="text-black/90 text-sm font-bold leading-tight">
                Soon, we will launch an exclusive <span className="underline decoration-black/30 underline-offset-4">Airdrop</span>.
              </p>
              <p className="text-black/80 text-[13px] font-medium leading-tight">
                After the launch, you can convert your coins into <span className="font-black">Real Money</span> and withdraw it directly into your bank account.
              </p>
              <p className="text-black/70 text-[12px] italic font-bold border-l-2 border-black/10 pl-3">
                The exact cash value of 1 coin will be revealed during the launch. Earn as much as you can now!
              </p>
            </div>
            <div className="pt-4 flex items-center gap-4">
               <div className="bg-black text-white p-4 rounded-[28px] flex-1 text-center shadow-xl">
                  <div className="text-[8px] font-black uppercase opacity-50 tracking-widest mb-1">COIN VALUE</div>
                  <div className="text-lg font-black flex items-center justify-center gap-1"><Lock size={14}/> LOCKED</div>
               </div>
               <div className="bg-white/20 backdrop-blur-md p-4 rounded-[28px] flex-1 text-center border border-white/30">
                  <div className="text-[8px] font-black uppercase opacity-50 tracking-widest mb-1">CONVERSION</div>
                  <div className="text-lg font-black">SOON</div>
               </div>
            </div>
         </div>
      </div>

      {/* Peer Transfer */}
      <div className="bg-white p-10 rounded-[48px] shadow-card border border-gray-100 space-y-6">
         <div className="flex justify-between items-center">
            <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-widest flex items-center gap-2 px-1"><Send size={14}/> Network Transfer</h3>
            <div className="text-[8px] font-black text-green-500 bg-green-50 px-2 py-1 rounded-md uppercase">Zero Fee</div>
         </div>
         <div className="space-y-4">
            <input 
              type="text" 
              placeholder="Friend's Unique Code (INR-XXXXXX)" 
              value={transferCode} 
              onChange={(e) => setTransferCode(e.target.value.toUpperCase())}
              className="w-full p-6 rounded-2xl bg-gray-50 font-bold border-none outline-none focus:ring-2 focus:ring-black transition-all"
            />
            <input 
              type="number" 
              placeholder="Amount to Send" 
              value={transferAmount} 
              onChange={(e) => setTransferAmount(e.target.value)}
              className="w-full p-6 rounded-2xl bg-gray-50 font-bold border-none outline-none focus:ring-2 focus:ring-black transition-all"
            />
            <button 
              onClick={async () => {
                setIsProcessingTransfer(true);
                try { await onTransfer(transferCode, parseInt(transferAmount) || 0); setTransferCode(''); setTransferAmount('100'); }
                finally { setIsProcessingTransfer(false); }
              }}
              disabled={isProcessingTransfer}
              className="w-full bg-black text-white py-5 rounded-[24px] font-black text-sm active:scale-95 transition-all disabled:opacity-50 shadow-xl"
            >
              {isProcessingTransfer ? <Loader2 className="animate-spin" size={18}/> : "Authorize Transfer"}
            </button>
         </div>
      </div>
    </div>
  );
};

const App: React.FC = () => {
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [view, setView] = useState<'home' | 'stats' | 'settings' | 'analysis' | 'camera' | 'team' | 'wallet' | 'refer' | 'admin_users' | 'admin_payments' | 'admin_transfers' | 'admin_user_detail' | 'admin_dashboard' | 'workout_location' | 'workout_focus' | 'workout_plan'>('home');
  const [scans, setScans] = useState<ScanHistoryItem[]>([]);
  const [showPremium, setShowPremium] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysis, setAnalysis] = useState<ScanHistoryItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState<string>(new Date().toDateString());

  const [selectedLocation, setSelectedLocation] = useState<WorkoutLocation | null>(null);
  const [selectedMuscleGroups, setSelectedMuscleGroups] = useState<MuscleGroup[]>([]);
  const [currentRoutine, setCurrentRoutine] = useState<Exercise[]>([]);
  const [isGeneratingRoutine, setIsGeneratingRoutine] = useState(false);
  
  const [allUsers, setAllUsers] = useState<any[]>([]);
  const [allWithdrawals, setAllWithdrawals] = useState<any[]>([]);
  const [allTransfers, setAllTransfers] = useState<any[]>([]);
  const [selectedAdminUser, setSelectedAdminUser] = useState<any>(null);
  const [adminSearch, setAdminSearch] = useState('');

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const startCamera = useCallback(() => { setView('camera'); }, []);

  useEffect(() => {
    let stream: MediaStream | null = null;
    if (view === 'camera') {
      const initCamera = async () => {
        try {
          stream = await navigator.mediaDevices.getUserMedia({ 
            video: { facingMode: 'environment', width: { ideal: 1920 }, height: { ideal: 1080 } } 
          });
          if (videoRef.current) {
            videoRef.current.srcObject = stream;
            await videoRef.current.play();
          }
        } catch (err) {
          console.error("Camera Error:", err);
          setView('home');
        }
      };
      initCamera();
    }
    return () => { if (stream) stream.getTracks().forEach(t => t.stop()); };
  }, [view]);

  useEffect(() => {
    const adminSession = localStorage.getItem('drfoodie_admin');
    if (adminSession === 'true') {
      setIsAdmin(true);
      if (view === 'home') setView('admin_dashboard');
    }

    const unsub = onAuthStateChanged(auth, async (u) => {
      setLoading(true);
      if (u) {
        setUser(u);
        await fetchProfile(u);
      } else {
        setUser(null);
        setProfile(null);
      }
      setLoading(false);
    });
    return () => unsub();
  }, []);

  useEffect(() => {
    if (isAdmin) {
      const unsubUsers = onSnapshot(collection(db, "profiles"), (snapshot) => {
        const list: any[] = [];
        snapshot.forEach(doc => list.push({ uid: doc.id, ...doc.data() }));
        setAllUsers(list);
      });
      const unsubWithdrawals = onSnapshot(query(collection(db, "withdrawals"), orderBy("timestamp", "desc")), (snapshot) => {
        const list: any[] = [];
        snapshot.forEach(doc => list.push({ id: doc.id, ...doc.data() }));
        setAllWithdrawals(list);
      });
      const unsubTransfers = onSnapshot(query(collection(db, "transfers"), orderBy("timestamp", "desc")), (snapshot) => {
        const list: any[] = [];
        snapshot.forEach(doc => list.push({ id: doc.id, ...doc.data() }));
        setAllTransfers(list);
      });
      return () => { unsubUsers(); unsubWithdrawals(); unsubTransfers(); };
    }
  }, [isAdmin]);

  const fetchProfile = async (u: FirebaseUser) => {
    try {
      const docSnap = await getDoc(doc(db, "profiles", u.uid));
      if (docSnap.exists()) {
        let pData = docSnap.data() as UserProfile;
        
        if (pData.isDisabled) {
          alert("This node has been disabled by the network administrator.");
          signOut(auth);
          return;
        }

        if (!pData.referralCode) {
           pData.referralCode = u.uid.substring(0,8).toUpperCase();
           await updateDoc(doc(db, "profiles", u.uid), { referralCode: pData.referralCode });
        }

        const pendingRef = localStorage.getItem(`pending_referral_${u.uid}`);
        if (pendingRef && !pData.hasClaimedSignupReferral) {
           const refQuery = query(collection(db, "profiles"), where("referralCode", "==", pendingRef));
           const refSnap = await getDocs(refQuery);
           if (!refSnap.empty) {
              const referrerUid = refSnap.docs[0].id;
              await runTransaction(db, async (tx) => {
                 const newPRef = doc(db, "profiles", u.uid);
                 const referPRef = doc(db, "profiles", referrerUid);
                 tx.update(newPRef, { 
                   points: increment(SIGNUP_REFERRAL_COINS), 
                   hasClaimedSignupReferral: true, 
                   referredBy: pendingRef 
                 });
                 tx.update(referPRef, { points: increment(SIGNUP_REFERRAL_COINS) });
              });
              pData.points = (pData.points || 0) + SIGNUP_REFERRAL_COINS;
              pData.hasClaimedSignupReferral = true;
              pData.referredBy = pendingRef;
              localStorage.removeItem(`pending_referral_${u.uid}`);
           }
        }

        if (!pData.uniqueTransferCode) {
          pData.uniqueTransferCode = `INR-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
          await updateDoc(doc(db, "profiles", u.uid), { uniqueTransferCode: pData.uniqueTransferCode });
        }

        const todayStr = new Date().toDateString();
        if (pData.lastLoginDate !== todayStr) {
          const yesterday = new Date();
          yesterday.setDate(yesterday.getDate() - 1);
          const yesterdayStr = yesterday.toDateString();
          
          let newStreak = (pData.lastLoginDate === yesterdayStr) ? (pData.currentStreak || 0) + 1 : 1;
          let bonusCoins = 0;

          if (newStreak === 30) bonusCoins = 200 * RUPEE_TO_COINS;
          if (newStreak === 60) bonusCoins = 500 * RUPEE_TO_COINS;
          if (newStreak === 90) bonusCoins = 999 * RUPEE_TO_COINS;

          pData.currentStreak = newStreak;
          pData.lastLoginDate = todayStr;
          
          if (bonusCoins > 0) {
            pData.points = (pData.points || 0) + bonusCoins;
            alert(`Streak Milestone! ₹${bonusCoins/100} credited.`);
          }

          await updateDoc(doc(db, "profiles", u.uid), { 
            currentStreak: newStreak, 
            lastLoginDate: todayStr,
            points: (pData.points || 0),
            email: u.email || ''
          });
        }

        if (pData.lastScanResetDate !== todayStr) {
          pData.scansUsedToday = 0;
          pData.lastScanResetDate = todayStr;
          await updateDoc(doc(db, "profiles", u.uid), { scansUsedToday: 0, lastScanResetDate: todayStr });
        }

        setProfile(pData);
        const qScans = query(collection(db, "profiles", u.uid, "scans"), orderBy("timestamp", "desc"));
        const qs = await getDocs(qScans);
        const ls: ScanHistoryItem[] = [];
        qs.forEach(d => ls.push({ id: d.id, ...d.data() } as ScanHistoryItem));
        setScans(ls);
      } else {
        const newCode = `INR-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
        const newProfile = { isOnboarded: false, name: '', age: 0, gender: Gender.MALE, height: 0, weight: 0, targetWeight: 0, durationWeeks: 12, goal: Goal.MAINTAIN, referralCode: u.uid.substring(0,8).toUpperCase(), points: 0, uniqueTransferCode: newCode, currentStreak: 1, lastLoginDate: new Date().toDateString(), email: u.email || '' };
        setProfile(newProfile as UserProfile);
      }
    } catch (e) { console.error(e); }
  };

  const handleUpgradeToPremium = async () => {
    if (!user || !profile) return;
    try {
      await runTransaction(db, async (tx) => {
        const userRef = doc(db, "profiles", user.uid);
        tx.update(userRef, { isPremium: true });

        if (profile.referredBy && !(profile as any).hasClaimedPremiumReferral) {
          const refQuery = query(collection(db, "profiles"), where("referralCode", "==", profile.referredBy));
          const refSnap = await getDocs(refQuery);
          if (!refSnap.empty) {
            const referrerUid = refSnap.docs[0].id;
            const referrerRef = doc(db, "profiles", referrerUid);
            tx.update(referrerRef, { points: increment(PREMIUM_REFERRAL_COINS) });
            tx.update(userRef, { hasClaimedPremiumReferral: true });
          }
        }
      });
      setProfile(prev => prev ? { ...prev, isPremium: true } : null);
      setShowPremium(false);
      alert("Welcome to Pro Node!");
    } catch (e) {
      console.error(e);
      alert("Upgrade failed to process.");
    }
  };

  const saveProfile = async (data: Partial<UserProfile>) => {
    if (!user) return;
    try {
      const updated = { ...profile, ...data };
      await setDoc(doc(db, "profiles", user.uid), updated, { merge: true });
      setProfile(updated as UserProfile);
    } catch (e) { console.error(e); }
  };

  const getWeekDays = () => {
    const days = [];
    const today = new Date();
    for (let i = 3; i >= -3; i--) {
      const d = new Date();
      d.setDate(today.getDate() - i);
      days.push(d);
    }
    return days;
  };

  const currentCalTarget = useMemo(() => {
    if (!profile) return 2000;
    const s = profile.gender === Gender.FEMALE ? -161 : 5;
    const bmr = (10 * profile.weight) + (6.25 * profile.height) - (5 * profile.age) + s;
    const maintenance = Math.round(bmr * 1.375);
    if (profile.goal === Goal.LOSE_WEIGHT) return maintenance - 500;
    if (profile.goal === Goal.GAIN_WEIGHT) return maintenance + 500;
    return maintenance;
  }, [profile]);

  const currentDayFilteredScans = useMemo(() => {
    return scans.filter(s => new Date(s.timestamp).toDateString() === selectedDate);
  }, [scans, selectedDate]);

  const currentTotalCalories = useMemo(() => {
    return currentDayFilteredScans.reduce((acc, s) => acc + (s.calories || 0), 0);
  }, [currentDayFilteredScans]);

  const processImage = async (base64: string) => {
    if (!user || !profile) return;
    if (!profile.isPremium && (profile.scansUsedToday || 0) >= MAX_FREE_SCANS_PER_DAY) {
      setShowPremium(true);
      return;
    }
    setIsAnalyzing(true);
    setView('analysis');
    try {
      const base64Data = base64.includes(',') ? base64.split(',')[1] : base64;
      const result = await analyzeFoodImage(base64Data, profile);
      const scanItem: Omit<ScanHistoryItem, 'id'> = {
        ...result,
        imageUrl: base64,
        timestamp: new Date().toISOString(),
      };
      const docRef = await addDoc(collection(db, "profiles", user.uid, "scans"), scanItem);
      const newScan = { id: docRef.id, ...scanItem } as ScanHistoryItem;
      await updateDoc(doc(db, "profiles", user.uid), {
        scansUsedToday: increment(1),
        points: increment(COINS_PER_SCAN)
      });
      setScans(prev => [newScan, ...prev]);
      setAnalysis(newScan);
      setProfile(prev => prev ? {
        ...prev,
        scansUsedToday: (prev.scansUsedToday || 0) + 1,
        points: (prev.points || 0) + COINS_PER_SCAN
      } : null);
    } catch (err) {
      alert("Analysis failed.");
      setView('home');
    } finally { setIsAnalyzing(false); }
  };

  const captureImage = () => {
    if (videoRef.current && canvasRef.current) {
      const context = canvasRef.current.getContext('2d');
      if (context) {
        canvasRef.current.width = videoRef.current.videoWidth;
        canvasRef.current.height = videoRef.current.videoHeight;
        context.drawImage(videoRef.current, 0, 0);
        const base64 = canvasRef.current.toDataURL('image/jpeg', 0.8);
        processImage(base64);
      }
    }
  };

  const handleTransferCoins = async (targetCode: string, coins: number) => {
    if (!user || !profile) return;
    if (coins <= 0) return;
    if (coins > (profile.points || 0)) { alert("Insufficient coins."); return; }
    try {
      const q = query(collection(db, "profiles"), where("uniqueTransferCode", "==", targetCode));
      const snap = await getDocs(q);
      if (snap.empty) { alert("Invalid transfer code."); return; }
      const targetUser = snap.docs[0].data();
      const targetUid = snap.docs[0].id;
      
      await runTransaction(db, async (tx) => {
        const sRef = doc(db, "profiles", user.uid);
        const rRef = doc(db, "profiles", targetUid);
        tx.update(sRef, { points: increment(-coins) });
        tx.update(rRef, { points: increment(coins) });
        
        // Log Transfer
        const logRef = doc(collection(db, "transfers"));
        tx.set(logRef, {
          fromUid: user.uid,
          toUid: targetUid,
          fromName: profile.name,
          toName: targetUser.name || 'Anonymous',
          amount: coins,
          timestamp: Timestamp.now()
        });
      });
      setProfile(prev => prev ? { ...prev, points: (prev.points || 0) - coins } : null);
      alert(`Sent ${coins} coins!`);
    } catch (e) { alert("Transfer failed."); }
  };

  const handleGenerateRoutine = async () => {
    if (!selectedLocation || selectedMuscleGroups.length === 0 || !profile) return;
    setIsGeneratingRoutine(true);
    setView('workout_plan');
    try {
      const routine = await generateWorkoutRoutine(selectedLocation, selectedMuscleGroups, profile);
      setCurrentRoutine(routine);
    } catch (err: any) { alert("Failed."); setView('workout_focus'); }
    finally { setIsGeneratingRoutine(false); }
  };

  const adminStats = useMemo(() => {
    const uCount = allUsers.length;
    const pCount = allUsers.filter(u => u.isPremium).length;
    const tCoins = allUsers.reduce((acc, u) => acc + (u.points || 0), 0);
    const aStreak = uCount ? Math.round(allUsers.reduce((acc, u) => acc + (u.currentStreak || 0), 0) / uCount) : 0;
    return {
      users: uCount,
      revenue: pCount * 49,
      coins: tCoins,
      streak: aStreak,
      pending: allWithdrawals.filter(w => w.status === 'pending').length,
      p2pCount: allTransfers.length
    };
  }, [allUsers, allWithdrawals, allTransfers]);

  const filteredAdminUsers = useMemo(() => {
    return allUsers.filter(u => 
      (u.name || '').toLowerCase().includes(adminSearch.toLowerCase()) ||
      (u.email || '').toLowerCase().includes(adminSearch.toLowerCase()) ||
      (u.uniqueTransferCode || '').toLowerCase().includes(adminSearch.toLowerCase())
    );
  }, [allUsers, adminSearch]);

  if (loading) return <div className="min-h-screen bg-white flex items-center justify-center"><Loader2 className="animate-spin text-black/20" size={48}/></div>;
  if (!isAdmin && !user) return <Auth onAdminLogin={(status) => { setIsAdmin(status); if(status) { localStorage.setItem('drfoodie_admin', 'true'); setView('admin_dashboard'); } }} />;
  if (!isAdmin && user && profile && !profile.isOnboarded) return <Onboarding onComplete={p => saveProfile({ ...p, isOnboarded: true, referralCode: user.uid.substring(0,8).toUpperCase() })} />;

  return (
    <div className="max-w-md mx-auto min-h-screen bg-[#F2F2F7] text-black relative shadow-2xl flex flex-col font-sans overflow-hidden">
      <canvas ref={canvasRef} className="hidden" />
      <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={e => {
        const f = e.target.files?.[0]; if (f) { const r = new FileReader(); r.onload = () => processImage(r.result as string); r.readAsDataURL(f); }
      }} />

      <div className="flex-1 overflow-hidden h-full">
        {isAdmin ? (
          <div className="animate-fade-in px-4 pb-40 overflow-y-auto h-full no-scrollbar pt-6">
            {view === 'admin_dashboard' && (
              <div className="space-y-8">
                <div className="flex justify-between items-center px-2">
                   <h1 className="text-4xl font-black tracking-tighter">Terminal</h1>
                   <div className="bg-green-500 w-3 h-3 rounded-full animate-pulse shadow-green-500 shadow-lg"/>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-white p-6 rounded-[32px] shadow-card border border-gray-100 flex flex-col items-center text-center">
                    <Users size={24} className="text-blue-500 mb-2"/>
                    <div className="text-3xl font-black">{adminStats.users}</div>
                    <div className="text-[10px] font-black uppercase text-gray-400 tracking-widest">Total Users</div>
                  </div>
                  <div className="bg-black text-white p-6 rounded-[32px] shadow-card flex flex-col items-center text-center">
                    <DollarSign size={24} className="text-yellow-400 mb-2"/>
                    <div className="text-3xl font-black">₹{adminStats.revenue}</div>
                    <div className="text-[10px] font-black uppercase text-gray-500 tracking-widest">Revenue (PRO)</div>
                  </div>
                  <div className="bg-white p-6 rounded-[32px] shadow-card border border-gray-100 flex flex-col items-center text-center">
                    <History size={24} className="text-orange-500 mb-2"/>
                    <div className="text-3xl font-black">{adminStats.p2pCount}</div>
                    <div className="text-[10px] font-black uppercase text-gray-400 tracking-widest">P2P Transfers</div>
                  </div>
                  <div className="bg-white p-6 rounded-[32px] shadow-card border border-gray-100 flex flex-col items-center text-center">
                    <Clock size={24} className="text-purple-500 mb-2"/>
                    <div className="text-3xl font-black">{adminStats.pending}</div>
                    <div className="text-[10px] font-black uppercase text-gray-400 tracking-widest">Pending Payouts</div>
                  </div>
                </div>

                <div className="bg-white p-10 rounded-[56px] shadow-card border border-gray-100 flex items-center justify-between">
                   <div className="flex-1">
                      <div className="text-5xl font-black tracking-tighter">{formatCoins(adminStats.coins)}</div>
                      <div className="text-[10px] text-gray-400 font-black uppercase tracking-[0.2em] mt-3">COINS IN CIRCULATION</div>
                   </div>
                   <Coins className="text-black opacity-5" size={80} />
                </div>

                <button onClick={() => setView('admin_transfers')} className="w-full bg-white p-8 rounded-[40px] shadow-card border border-gray-100 flex items-center justify-between group active:scale-[0.98] transition-all">
                  <div className="flex items-center gap-6">
                    <div className="w-14 h-14 bg-gray-50 rounded-2xl flex items-center justify-center group-hover:bg-black group-hover:text-white transition-colors">
                      <ArrowRight size={24}/>
                    </div>
                    <div className="text-left">
                      <div className="font-black text-xl">Audit Ledger</div>
                      <div className="text-[10px] font-bold text-gray-400 uppercase">View P2P Network Activity</div>
                    </div>
                  </div>
                  <ChevronRight size={20} className="text-gray-200"/>
                </button>
              </div>
            )}
            {view === 'admin_users' && (
              <div className="space-y-6">
                <h1 className="text-3xl font-black">Directory</h1>
                <div className="relative">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-300" size={18}/>
                  <input type="text" placeholder="Search..." value={adminSearch} onChange={e => setAdminSearch(e.target.value)} className="w-full pl-12 pr-4 py-4 rounded-3xl bg-white border-none shadow-card font-bold outline-none focus:ring-2 focus:ring-black" />
                </div>
                <div className="space-y-3">
                  {filteredAdminUsers.map(u => (
                    <div key={u.uid} onClick={() => { setSelectedAdminUser(u); setView('admin_user_detail'); }} className="bg-white p-5 rounded-[32px] flex items-center justify-between shadow-card border border-gray-50 active:scale-95 transition-all">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-gray-100 rounded-2xl flex items-center justify-center font-black text-gray-400">{u.name?.charAt(0) || '?'}</div>
                        <div>
                          <div className="font-black leading-tight flex items-center gap-2">
                            {u.name || 'Anonymous'}
                            {u.isDisabled && <Ban size={10} className="text-red-500" />}
                          </div>
                          <div className="text-[10px] text-gray-400 font-bold uppercase">{formatCoins(u.points || 0)}c • {u.isPremium ? 'PRO' : 'Free'}</div>
                        </div>
                      </div>
                      <ChevronRight size={18} className="text-gray-200"/>
                    </div>
                  ))}
                </div>
              </div>
            )}
            {view === 'admin_user_detail' && selectedAdminUser && (
              <div className="space-y-8 animate-fade-in pb-40">
                 <div className="flex items-center gap-4">
                   <button onClick={() => setView('admin_users')} className="p-4 bg-white rounded-3xl shadow-card active:scale-95 transition-all"><ArrowLeft size={20}/></button>
                   <h1 className="text-2xl font-black">Control Panel</h1>
                 </div>
                 <div className="bg-white p-8 rounded-[48px] shadow-card border border-gray-100 space-y-8">
                    <div className="flex items-center gap-6 pb-6 border-b border-gray-50">
                       <div className="w-20 h-20 bg-black text-white rounded-[24px] flex items-center justify-center font-black text-4xl shadow-xl">{selectedAdminUser.name?.charAt(0)}</div>
                       <div>
                          <div className="text-2xl font-black truncate max-w-[200px]">{selectedAdminUser.name || 'Anonymous'}</div>
                          <div className="text-[10px] font-black uppercase text-gray-400">{selectedAdminUser.email}</div>
                       </div>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4">
                       <div className="bg-gray-50 p-6 rounded-[32px] border border-gray-100/50">
                          <div className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1">Coins</div>
                          <input type="number" defaultValue={selectedAdminUser.points || 0} onBlur={async (e) => {
                             await updateDoc(doc(db, "profiles", selectedAdminUser.uid), { points: parseInt(e.target.value) || 0 });
                             alert("Balance updated");
                          }} className="bg-transparent border-none text-xl font-black w-full outline-none" />
                       </div>
                       <button onClick={async () => {
                          const ns = !selectedAdminUser.isPremium;
                          await updateDoc(doc(db, "profiles", selectedAdminUser.uid), { isPremium: ns });
                          setSelectedAdminUser({...selectedAdminUser, isPremium: ns});
                          alert(`Premium Status: ${ns ? 'ACTIVE' : 'INACTIVE'}`);
                       }} className={`p-6 rounded-[32px] text-left transition-all border border-transparent ${selectedAdminUser.isPremium ? 'bg-black text-yellow-400 shadow-xl' : 'bg-gray-50 text-gray-400'}`}>
                          <div className="text-[9px] font-black uppercase tracking-widest mb-1">Status</div>
                          <div className="text-xl font-black">{selectedAdminUser.isPremium ? 'PRO' : 'Standard'}</div>
                       </button>
                    </div>

                    <div className="space-y-3">
                       <h3 className="text-[10px] font-black uppercase text-gray-300 tracking-widest px-2">Network Management</h3>
                       <button onClick={async () => {
                          if (selectedAdminUser.email) {
                            await sendPasswordResetEmail(auth, selectedAdminUser.email);
                            alert("Reset link dispatched to " + selectedAdminUser.email);
                          } else {
                            alert("User email not found.");
                          }
                       }} className="w-full p-6 rounded-[32px] bg-blue-50 text-blue-600 font-black flex items-center justify-between">
                         <div className="flex items-center gap-4"><Mail size={18}/> Reset Password Link</div>
                         <ChevronRight size={18}/>
                       </button>

                       <button onClick={async () => {
                          const next = !selectedAdminUser.isDisabled;
                          await updateDoc(doc(db, "profiles", selectedAdminUser.uid), { isDisabled: next });
                          setSelectedAdminUser({...selectedAdminUser, isDisabled: next});
                          alert(`Node ${next ? 'Disabled' : 'Enabled'}`);
                       }} className={`w-full p-6 rounded-[32px] font-black flex items-center justify-between ${selectedAdminUser.isDisabled ? 'bg-green-50 text-green-600' : 'bg-orange-50 text-orange-600'}`}>
                         <div className="flex items-center gap-4">
                           {selectedAdminUser.isDisabled ? <CheckCircle2 size={18}/> : <Ban size={18}/>}
                           {selectedAdminUser.isDisabled ? 'Re-enable Node' : 'Disable Node Access'}
                         </div>
                         <ChevronRight size={18}/>
                       </button>

                       <button onClick={async () => {
                          if (confirm("PURGE DATA: This will permanently delete this user's profile and scan history. Auth node must be manually removed in Firebase console. Proceed?")) {
                            await deleteDoc(doc(db, "profiles", selectedAdminUser.uid));
                            alert("Firestore Profile Purged.");
                            setView('admin_users');
                          }
                       }} className="w-full p-6 rounded-[32px] bg-red-50 text-red-600 font-black flex items-center justify-between">
                         <div className="flex items-center gap-4"><UserX size={18}/> Purge Account Data</div>
                         <ChevronRight size={18}/>
                       </button>
                    </div>
                 </div>
              </div>
            )}
            {view === 'admin_transfers' && (
              <div className="space-y-6 animate-fade-in pb-40">
                <div className="flex items-center gap-4">
                  <button onClick={() => setView('admin_dashboard')} className="p-4 bg-white rounded-3xl shadow-card active:scale-95 transition-all"><ArrowLeft size={20}/></button>
                  <h1 className="text-3xl font-black">Network Ledger</h1>
                </div>
                <div className="space-y-4">
                  {allTransfers.length === 0 ? (
                    <div className="text-center py-40 opacity-20 flex flex-col items-center gap-4">
                       <History size={48}/>
                       <div className="font-black uppercase text-[10px] tracking-widest">No transfers logged</div>
                    </div>
                  ) : allTransfers.map(t => (
                    <div key={t.id} className="bg-white p-6 rounded-[32px] shadow-card border border-gray-50 flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 bg-gray-50 rounded-xl flex items-center justify-center text-gray-400">
                          <Send size={16}/>
                        </div>
                        <div>
                          <div className="font-black text-sm">{t.fromName} → {t.toName}</div>
                          <div className="text-[9px] text-gray-300 font-bold uppercase">{new Date(t.timestamp?.toDate()).toLocaleString()}</div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-lg font-black">{t.amount}c</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
            {view === 'admin_payments' && (
              <div className="space-y-6 animate-fade-in pb-40">
                <h1 className="text-3xl font-black">Payments</h1>
                <div className="space-y-4">
                  {allWithdrawals.length === 0 ? (
                    <div className="text-center py-40 opacity-20 flex flex-col items-center gap-4">
                       <History size={48}/>
                       <div className="font-black uppercase text-[10px] tracking-widest">No payout requests</div>
                    </div>
                  ) : allWithdrawals.map(w => (
                    <div key={w.id} className="bg-white p-8 rounded-[48px] shadow-card border border-gray-100 space-y-4">
                      <div className="flex justify-between items-start">
                        <div>
                           <div className="font-black text-xl">{w.userName}</div>
                           <div className="text-[10px] text-gray-400 font-bold">{w.upiId}</div>
                        </div>
                        <div className="text-right">
                           <div className="text-3xl font-black">₹{w.coins/100}</div>
                           <div className={`text-[9px] font-black uppercase tracking-widest mt-1 ${w.status==='pending'?'text-orange-500':'text-green-500'}`}>{w.status}</div>
                        </div>
                      </div>
                      {w.status === 'pending' && <div className="flex gap-2">
                        <button onClick={async () => { await updateDoc(doc(db, "withdrawals", w.id), { status: 'approved' }); alert("Approved"); }} className="flex-1 bg-black text-white py-4 rounded-[24px] font-black text-[10px] uppercase shadow-lg shadow-black/10">Approve</button>
                        <button onClick={async () => { await updateDoc(doc(db, "withdrawals", w.id), { status: 'declined' }); await updateDoc(doc(db, "profiles", w.uid), { points: increment(w.totalDeducted) }); alert("Declined"); }} className="flex-1 bg-red-50 text-red-500 py-4 rounded-[24px] font-black text-[10px] uppercase border border-red-100">Decline</button>
                      </div>}
                    </div>
                  ))}
                </div>
              </div>
            )}
            {view === 'settings' && <div className="px-4 pt-10"><button onClick={() => { setIsAdmin(false); localStorage.removeItem('drfoodie_admin'); setView('home'); }} className="w-full p-8 text-red-500 bg-white rounded-[40px] shadow-card flex items-center justify-center gap-3 font-black active:scale-95 transition-all">Logout Admin</button></div>}
          </div>
        ) : (
          <div className="animate-fade-in px-4 h-full overflow-hidden">
            {view === 'home' && (
              <div className="pt-6 h-full overflow-y-auto no-scrollbar pb-40">
                <header className="flex justify-between items-center mb-8">
                  <div className="flex items-center gap-2"><div className="w-8 h-8 bg-black rounded-lg flex items-center justify-center shadow-lg"><Sparkles size={16} className="text-white fill-white"/></div><h1 className="text-xl font-bold tracking-tight">Dr Foodie</h1></div>
                  <div className="flex gap-2">
                    <div className="bg-white px-3 py-2 rounded-full flex items-center gap-1 shadow-sm border border-gray-100">
                      <Flame size={12} className="text-orange-500 fill-orange-500"/>
                      <span className="text-[10px] font-black">{profile?.currentStreak || 0}</span>
                    </div>
                    <button onClick={()=>setShowPremium(true)} className={`px-4 py-2 rounded-full text-[10px] font-black uppercase shadow-sm ${profile?.isPremium ? 'bg-black text-yellow-400' : 'bg-white text-black'}`}>
                      {profile?.isPremium ? 'PRO' : `${MAX_FREE_SCANS_PER_DAY - (profile?.scansUsedToday || 0)} Scans`}
                    </button>
                  </div>
                </header>
                <div className="flex justify-between mb-8 overflow-x-auto no-scrollbar py-2">
                  {getWeekDays().map((d, i) => (
                    <button key={i} onClick={() => setSelectedDate(d.toDateString())} className={`flex flex-col items-center min-w-[56px] py-4 rounded-[28px] transition-all duration-300 ${d.toDateString() === selectedDate ? 'bg-black text-white shadow-2xl scale-110' : 'bg-white text-gray-400'}`}>
                      <span className="text-[10px] font-black uppercase mb-1">{d.toLocaleDateString('en-US',{weekday:'short'}).charAt(0)}</span><span className="text-sm font-bold">{d.getDate()}</span>
                    </button>
                  ))}
                </div>
                <div className="bg-white p-10 rounded-[56px] shadow-card mb-8 flex items-center justify-between border border-gray-100">
                  <div className="flex-1">
                    <div className="flex items-baseline gap-1"><span className="text-7xl font-black tracking-tighter leading-none">{currentTotalCalories}</span><span className="text-xl text-gray-300 font-bold">/{currentCalTarget}</span></div>
                    <div className="text-[10px] text-gray-400 font-black uppercase tracking-[0.2em] mt-3">DAILY ENERGY BUDGET</div>
                  </div>
                  <Activity className="text-black opacity-10" size={100} />
                </div>
                <div className="space-y-4">
                  {currentDayFilteredScans.length === 0 ? (
                    <div className="text-center py-24 text-gray-300 bg-white rounded-[56px] border-2 border-dashed border-gray-100 flex flex-col items-center gap-4 cursor-pointer hover:bg-gray-50 transition-all active:scale-[0.98]" onClick={startCamera}>
                      <Camera size={48} className="opacity-10"/><p className="text-sm font-bold uppercase tracking-widest opacity-40">Scan to Start</p>
                    </div>
                  ) : currentDayFilteredScans.map(s => (
                    <div key={s.id} onClick={()=>{setAnalysis(s); setView('analysis')}} className="bg-white p-4 rounded-[40px] flex gap-5 shadow-card items-center border border-gray-100 active:scale-98 transition-all hover:bg-gray-50/50">
                      <img src={s.imageUrl} className="w-16 h-16 rounded-2xl object-cover" />
                      <div className="flex-1"><div className="font-black text-base truncate max-w-[150px]">{s.foodName}</div><div className="text-[10px] text-gray-400 font-black uppercase tracking-widest mt-2">{s.calories} kcal • {s.protein}g P</div></div>
                      <ChevronRight size={18} className="text-gray-200"/>
                    </div>
                  ))}
                </div>
              </div>
            )}
            {view === 'stats' && <StatsView scans={scans} currentCalTarget={currentCalTarget} profile={profile} />}
            {view === 'settings' && (
               <div className="pt-8 space-y-8 h-full overflow-y-auto no-scrollbar pb-40">
                  <h1 className="text-4xl font-black tracking-tighter">Settings</h1>
                  <div className="bg-white p-6 rounded-[56px] shadow-card border border-gray-100 space-y-3">
                    <div className="flex items-center gap-6 p-10 bg-gray-50 rounded-[48px] mb-8"><div className="w-16 h-16 bg-black text-white rounded-[24px] flex items-center justify-center font-black text-3xl shadow-xl">{profile?.name?.charAt(0)}</div><div><div className="font-black text-2xl truncate max-w-[150px]">{profile?.name}</div><div className="text-[10px] font-black uppercase text-gray-400">Node Established</div></div></div>
                    <button onClick={()=>setView('wallet')} className="w-full p-6 text-left font-black flex justify-between items-center hover:bg-gray-50 rounded-[32px] transition-all"><span className="flex items-center gap-5"><Gem size={22} className="text-yellow-500"/> My Vault ({formatCoins(profile?.points || 0)})</span><ChevronRight size={18} className="text-gray-200"/></button>
                    <button onClick={()=>setView('refer')} className="w-full p-6 text-left font-black flex justify-between items-center hover:bg-gray-50 rounded-[32px] transition-all"><span className="flex items-center gap-5"><Gift size={22} className="text-gray-400"/> Network Referral</span><ChevronRight size={18} className="text-gray-200"/></button>
                    <button onClick={()=>saveProfile({isOnboarded: false})} className="w-full p-6 text-left font-black flex justify-between items-center hover:bg-gray-50 rounded-[32px] transition-all"><span className="flex items-center gap-5"><UserIcon size={22} className="text-gray-400"/> Update Profile</span><ChevronRight size={18} className="text-gray-200"/></button>
                    <button onClick={()=>setShowPremium(true)} className="w-full p-6 text-left font-black flex justify-between items-center bg-black text-white rounded-[32px] transition-all shadow-xl"><span className="flex items-center gap-5"><Crown size={22} className="text-yellow-400 fill-yellow-400"/> Dr Foodie Pro</span><ChevronRight size={18} className="opacity-40"/></button>
                    <button onClick={()=>setView('team')} className="w-full p-6 text-left font-black flex justify-between items-center hover:bg-gray-50 rounded-[32px] transition-all"><span className="flex items-center gap-5"><Users size={22} className="text-gray-400"/> The Team</span><ChevronRight size={18} className="text-gray-200"/></button>
                    <button onClick={()=>signOut(auth)} className="w-full p-6 text-left font-black text-red-500 hover:bg-red-50 rounded-[32px] flex items-center gap-5 transition-all"><LogOut size={22}/> Logout Terminal</button>
                  </div>
               </div>
            )}
            {view === 'team' && <TeamSection onBack={() => setView('settings')} />}
            {view === 'wallet' && <WalletForm profile={profile} onTransfer={handleTransferCoins} onBack={() => setView('settings')} />}
            {view === 'refer' && <ReferralView profile={profile} onBack={() => setView('settings')} />}
            {view === 'workout_location' && <WorkoutLocationView onSelect={(loc) => { setSelectedLocation(loc); setView('workout_focus'); }} />}
            {view === 'workout_focus' && <WorkoutFocusView location={selectedLocation!} selectedGroups={selectedMuscleGroups} onToggle={(g)=>setSelectedMuscleGroups(prev=>prev.includes(g)?prev.filter(x=>x!==g):[...prev, g])} onGenerate={handleGenerateRoutine} onBack={() => setView('workout_location')} />}
            {view === 'workout_plan' && <WorkoutPlanView routine={currentRoutine} isGenerating={isGeneratingRoutine} onBack={() => setView('workout_focus')} />}
            {view === 'analysis' && <AnalysisDetailView analysis={analysis} isAnalyzing={isAnalyzing} onBack={() => setView('home')} />}
          </div>
        )}
      </div>

      <nav className="fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur-2xl border-t border-gray-100 p-5 pb-12 flex justify-between items-center z-40 max-w-md mx-auto px-10 shadow-floating">
        <button onClick={()=>{setView(isAdmin ? 'admin_dashboard' : 'home')}} className={`transition-all duration-300 ${(view==='home' || view==='admin_dashboard')?'text-black scale-125':'text-black/30'}`}><Home size={26}/></button>
        <button onClick={()=>{ if (isAdmin) setView('admin_payments'); else setView('workout_location'); }} className={`transition-all duration-300 ${(view.startsWith('workout') || view === 'admin_payments')?'text-black scale-125':'text-black/30'}`}>{isAdmin ? <DollarSign size={26}/> : <Dumbbell size={26}/>}</button>
        <div className="relative -mt-20 flex justify-center z-50">
          <button onClick={()=>{ if (isAdmin) setView('admin_users'); else startCamera(); }} className="w-24 h-24 bg-black rounded-full flex items-center justify-center text-white border-[10px] border-[#F2F2F7] shadow-2xl active:scale-90 transition-all hover:shadow-black/20">{isAdmin ? <Users size={36}/> : <Plus size={48}/>}</button>
        </div>
        <button onClick={()=>{ if (!isAdmin) setView('stats'); }} disabled={isAdmin} className={`transition-all duration-300 ${(!isAdmin && view==='stats')?'text-black scale-125':'text-black/30'}`}>{!isAdmin && <BarChart2 size={26}/>}</button>
        <button onClick={()=>setView('settings')} className={`transition-all duration-300 ${view==='settings' || view === 'team' || view === 'wallet' || view === 'refer' ?'text-black scale-125':'text-black/30'}`}><Settings size={26}/></button>
      </nav>

      <PremiumModal isOpen={showPremium} onClose={()=>setShowPremium(false)} onUpgrade={handleUpgradeToPremium} />

      {view === 'camera' && (
          <div className="fixed inset-0 z-[100] bg-black animate-fade-in flex flex-col">
            <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover" />
            <div className="absolute inset-0 flex flex-col justify-between p-12">
              <div className="flex justify-between pt-10">
                <button onClick={() => setView('home')} className="p-5 bg-white/10 backdrop-blur-lg rounded-full text-white active:scale-90 transition-all"><X size={32}/></button>
                <button onClick={() => fileInputRef.current?.click()} className="p-5 bg-white/10 backdrop-blur-lg rounded-full text-white active:scale-90 transition-all"><ImageIcon size={32}/></button>
              </div>
              <div className="flex justify-center pb-20">
                <button onClick={captureImage} className="w-28 h-28 bg-white rounded-full border-[10px] border-white/20 flex items-center justify-center active:scale-90 transition-all shadow-2xl"><div className="w-20 h-20 bg-black rounded-full flex items-center justify-center text-white"><ScanLine size={36}/></div></button>
              </div>
            </div>
          </div>
      )}

      <style>{`
        @keyframes fadeIn { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
        .animate-fade-in { animation: fadeIn 0.4s cubic-bezier(0.2, 0.8, 0.2, 1) forwards; }
        ::-webkit-scrollbar { display: none; }
        body { background-color: #F2F2F7; }
        .shadow-floating { box-shadow: 0 32px 64px rgba(0,0,0,0.1); }
        .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
        
        .luxury-shimmer {
          background: linear-gradient(90deg, transparent, rgba(255,255,255,0.2), transparent);
          background-size: 200% 100%;
          animation: shimmer 2s infinite linear;
        }
        @keyframes shimmer {
          from { background-position: -200% 0; }
          to { background-position: 200% 0; }
        }
      `}</style>
    </div>
  );
};

// --- SUB-COMPONENTS ---

const StatsView: React.FC<{ scans: ScanHistoryItem[]; currentCalTarget: number; profile: UserProfile | null }> = ({ scans, currentCalTarget, profile }) => {
  const last7Days = useMemo(() => {
    const days = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const ds = d.toDateString();
      const dailyScans = scans.filter(s => new Date(s.timestamp).toDateString() === ds);
      const total = dailyScans.reduce((acc, curr) => acc + (curr.calories || 0), 0);
      days.push({ date: d.toLocaleDateString('en-US', { weekday: 'short' }), total });
    }
    return days;
  }, [scans]);

  const streak = profile?.currentStreak || 0;

  return (
    <div className="pt-8 space-y-8 animate-fade-in pb-40 px-4 overflow-y-auto h-full no-scrollbar">
      <h1 className="text-4xl font-black tracking-tighter">Growth Matrix</h1>
      
      <div className="bg-white p-8 rounded-[48px] shadow-card border border-gray-100 space-y-6">
         <div className="flex justify-between items-center">
            <h3 className="text-[11px] font-black uppercase text-gray-400 tracking-[0.2em] flex items-center gap-2 px-1">
               <Trophy size={14} className="text-orange-400"/> Streak Rewards
            </h3>
            <div className="bg-orange-50 text-orange-500 px-3 py-1 rounded-full text-[10px] font-black uppercase">{streak} Days</div>
         </div>
         
         <div className="space-y-3">
            {[
               { days: 30, amount: '200', reached: streak >= 30 },
               { days: 60, amount: '500', reached: streak >= 60 },
               { days: 90, amount: '999', reached: streak >= 90 },
            ].map((m, i) => (
               <div key={i} className={`p-5 rounded-[28px] flex items-center justify-between border transition-all ${m.reached ? 'bg-green-50 border-green-100' : 'bg-gray-50 border-gray-100/50 opacity-60'}`}>
                  <div className="flex items-center gap-4">
                     <div className={`w-10 h-10 rounded-2xl flex items-center justify-center ${m.reached ? 'bg-green-500 text-white' : 'bg-gray-200 text-gray-400'}`}>
                        {m.reached ? <Check size={20} /> : <BadgeCheck size={20}/>}
                     </div>
                     <div>
                        <div className="font-black text-sm">{m.days} Days Streak</div>
                        <div className="text-[10px] font-bold text-gray-400">Earn Future Rewards</div>
                     </div>
                  </div>
                  <div className={`text-[10px] font-black uppercase tracking-widest ${m.reached ? 'text-green-600' : 'text-gray-300'}`}>
                     {m.reached ? 'Secured' : `${Math.round((streak/m.days)*100)}%`}
                  </div>
               </div>
            ))}
         </div>
      </div>

      <div className="bg-white p-10 rounded-[56px] shadow-card border border-gray-100">
        <div className="flex items-center gap-3 mb-8">
          <TrendingUp size={20} className="text-black"/>
          <h3 className="text-[11px] font-black uppercase text-gray-400 tracking-[0.3em]">Metabolic Momentum</h3>
        </div>
        <div className="flex items-end justify-between h-48 gap-2">
          {last7Days.map((d, i) => {
            const h = Math.min(100, (d.total / (currentCalTarget * 1.5)) * 100);
            return (
              <div key={i} className="flex-1 flex flex-col items-center gap-3 h-full group">
                <div className="w-full bg-gray-50 rounded-2xl relative flex-1 flex items-end overflow-hidden">
                  <div className={`w-full transition-all duration-700 rounded-t-lg ${d.total > currentCalTarget ? 'bg-red-400' : 'bg-black'}`} style={{ height: `${Math.max(5, h)}%` }} />
                </div>
                <span className="text-[10px] font-black text-gray-400 uppercase">{d.date}</span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

const ReferralView: React.FC<{ profile: UserProfile | null; onBack: () => void }> = ({ profile, onBack }) => {
  const shareCode = async () => {
    if (!profile) return;
    const msg = `Establish your node on Dr Foodie using code: ${profile.referralCode}. Every coin we earn now is a real-money asset at the Airdrop Launch! 🚀`;
    if (navigator.share) {
      await navigator.share({ title: 'Establish Your Node', text: msg, url: window.location.href });
    } else {
      await navigator.clipboard.writeText(msg);
      alert("Referral link secured!");
    }
  };

  return (
    <div className="pt-4 space-y-8 animate-fade-in pb-40 px-4 h-full overflow-y-auto no-scrollbar">
      <div className="flex items-center gap-4">
        <button onClick={onBack} className="p-4 bg-white rounded-3xl shadow-card active:scale-95 transition-all">
          <ArrowLeft size={20}/>
        </button>
        <h1 className="text-3xl font-black">Network Build</h1>
      </div>
      
      <div className="bg-black text-white p-12 rounded-[56px] text-center relative overflow-hidden shadow-2xl border border-white/5">
         <div className="absolute top-0 left-0 w-full h-full opacity-30 luxury-shimmer pointer-events-none" />
         <div className="w-20 h-20 bg-white/10 rounded-full flex items-center justify-center mx-auto mb-6 backdrop-blur-md">
            <Gift size={40} className="text-yellow-400" />
         </div>
         <h2 className="text-3xl font-black mb-2">Build your Node</h2>
         <p className="text-gray-500 text-[10px] font-black uppercase tracking-[0.2em] px-8">The Airdrop is coming. Every referral increases your multiplier.</p>
         <div className="mt-10 bg-white/5 p-6 rounded-[32px] border border-white/10 group cursor-pointer active:scale-95 transition-all" onClick={shareCode}>
            <div className="text-[10px] font-black uppercase text-gray-500 tracking-[0.3em] mb-2">YOUR ACCESS CODE</div>
            <div className="text-4xl font-black tracking-widest text-white flex items-center justify-center gap-3">
              {profile?.referralCode} <Share size={20} className="text-white/20"/>
            </div>
         </div>
      </div>

      <div className="bg-white p-10 rounded-[48px] shadow-card border border-gray-100 space-y-8">
         <h3 className="text-[11px] font-black text-gray-400 uppercase tracking-widest px-1">Network Rewards</h3>
         <div className="space-y-6">
            <div className="flex gap-6 items-start">
               <div className="w-10 h-10 bg-gray-50 rounded-2xl flex items-center justify-center font-black text-black shadow-sm">100</div>
               <div><p className="font-black text-base">Signup Asset</p><p className="text-[10px] font-bold text-gray-400 uppercase mt-1">Both receive 100 coins. These are pre-launch assets for the coming conversion.</p></div>
            </div>
            <div className="flex gap-6 items-start">
               <div className="w-10 h-10 bg-yellow-400 rounded-2xl flex items-center justify-center font-black text-black shadow-lg">250</div>
               <div><p className="font-black text-base">Pro Multiplier</p><p className="text-[10px] font-bold text-gray-400 uppercase mt-1">Earn 250 extra coins when they go Pro. Secure the maximum share before Phase 2.</p></div>
            </div>
         </div>
      </div>
    </div>
  );
};

const WorkoutLocationView: React.FC<{ onSelect: (loc: WorkoutLocation) => void }> = ({ onSelect }) => (
  <div className="pt-10 space-y-12 animate-fade-in px-6">
    <div className="space-y-2"><h1 className="text-4xl font-black tracking-tight">Location</h1><p className="text-[10px] font-black uppercase text-gray-400 tracking-[0.2em]">PICK YOUR TRAINING ZONE</p></div>
    <div className="space-y-6">
      <button onClick={() => onSelect(WorkoutLocation.GYM)} className="w-full bg-white p-8 rounded-[48px] shadow-card border border-gray-100 flex items-center gap-8 group active:scale-[0.98] transition-all text-left">
        <div className="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center text-black group-hover:bg-black group-hover:text-white transition-colors"><Dumbbell size={32} /></div>
        <div><h3 className="text-2xl font-black">Public Gym</h3><p className="text-sm font-bold text-gray-300">Equipment-rich facility</p></div>
      </button>
      <button onClick={() => onSelect(WorkoutLocation.HOME)} className="w-full bg-white p-8 rounded-[48px] shadow-card border border-gray-100 flex items-center gap-8 group active:scale-[0.98] transition-all text-left">
        <div className="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center text-black group-hover:bg-black group-hover:text-white transition-colors"><Home size={32} /></div>
        <div><h3 className="text-2xl font-black">Home/Park</h3><p className="text-sm font-bold text-gray-300">No equipment needed</p></div>
      </button>
    </div>
  </div>
);

const WorkoutFocusView: React.FC<{ location: WorkoutLocation; selectedGroups: MuscleGroup[]; onToggle: (g: MuscleGroup) => void; onGenerate: () => void; onBack: () => void; }> = ({ location, selectedGroups, onToggle, onGenerate, onBack }) => (
  <div className="pt-6 space-y-8 animate-fade-in px-6 pb-64 h-full overflow-y-auto no-scrollbar">
    <div className="flex items-center justify-between"><button onClick={onBack} className="flex items-center gap-1 text-[10px] font-black uppercase text-gray-400 tracking-widest"><ArrowLeft size={14}/> BACK</button><div className="bg-black text-white px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest">{location}</div></div>
    <h1 className="text-5xl font-black tracking-tighter">Focus</h1>
    <div className="space-y-3">
      {Object.values(MuscleGroup).map((group) => (
        <button key={group} onClick={() => onToggle(group)} className={`w-full p-7 rounded-[32px] flex items-center justify-between transition-all border ${selectedGroups.includes(group) ? 'bg-black text-white border-black scale-[1.02] shadow-xl' : 'bg-white text-black border-gray-50 shadow-card'}`}>
          <span className="text-xl font-black">{group}</span><Plus size={20} className={selectedGroups.includes(group) ? 'rotate-45' : ''} />
        </button>
      ))}
    </div>
    <button onClick={onGenerate} disabled={selectedGroups.length === 0} className="fixed bottom-32 left-8 right-8 bg-black text-white py-6 rounded-[32px] font-black text-xl shadow-2xl flex items-center justify-center gap-3 active:scale-95 disabled:opacity-30 transition-all z-10">Generate Routine <ChevronRight size={24}/></button>
  </div>
);

const WorkoutPlanView: React.FC<{ routine: Exercise[]; isGenerating: boolean; onBack: () => void }> = ({ routine, isGenerating, onBack }) => {
  if (isGenerating) return <div className="flex flex-col items-center justify-center h-[75vh] animate-pulse px-8"><div className="w-24 h-24 bg-white rounded-full flex items-center justify-center shadow-xl mb-8 border border-gray-100"><Loader2 className="animate-spin text-black" size={40}/></div><h3 className="text-3xl font-black tracking-tight mb-2 text-center">Optimizing...</h3></div>;
  return (
    <div className="pt-6 space-y-8 animate-fade-in px-6 pb-40 overflow-y-auto h-full no-scrollbar">
      <div className="flex items-center justify-between"><button onClick={onBack} className="flex items-center gap-1 text-[10px] font-black uppercase text-gray-400 tracking-widest"><ArrowLeft size={14}/> BACK</button></div>
      <h1 className="text-5xl font-black tracking-tighter">Your Plan</h1>
      <div className="space-y-4">
        {routine.map((ex, idx) => (
          <div key={idx} className="bg-white p-5 rounded-[40px] shadow-card border border-gray-100 flex gap-6 items-center">
            <div className="w-20 h-20 bg-gray-50 rounded-3xl flex items-center justify-center border border-gray-100"><Dumbbell size={24} className="text-gray-200" /></div>
            <div className="flex-1 space-y-1"><div className="flex justify-between items-start"><h4 className="text-lg font-black leading-tight pr-2">{ex.name}</h4><div className="bg-orange-50 text-orange-600 px-2 py-1 rounded-lg text-[10px] font-black whitespace-nowrap">{ex.sets}x{ex.reps}</div></div><p className="text-[10px] font-bold text-gray-300 leading-tight uppercase line-clamp-2">{ex.description}</p></div>
          </div>
        ))}
      </div>
    </div>
  );
};

const AnalysisDetailView: React.FC<{ analysis: ScanHistoryItem | null; isAnalyzing: boolean; onBack: () => void }> = ({ analysis, isAnalyzing, onBack }) => (
  <div className="pt-6 h-full overflow-y-auto no-scrollbar pb-40 px-4">
    <div className="flex items-center gap-4 mb-6"><button onClick={onBack} className="p-4 bg-white rounded-3xl shadow-card active:scale-95 transition-all"><ArrowLeft size={20}/></button><h1 className="text-2xl font-black">Analysis</h1></div>
    {isAnalyzing ? <div className="flex flex-col items-center justify-center py-20 space-y-4"><Loader2 className="animate-spin text-black" size={48} /><p className="font-bold text-gray-400 uppercase tracking-widest text-xs">Processing...</p></div> : analysis ? (
      <div className="space-y-8">
        <div className="bg-white rounded-[48px] overflow-hidden shadow-card border border-gray-50 animate-fade-in">
          <img src={analysis.imageUrl} className="w-full h-64 object-cover" />
          <div className="p-8 space-y-8">
            <div className="flex justify-between items-start">
               <div>
                  <h2 className="text-3xl font-black tracking-tighter leading-none">{analysis.foodName}</h2>
                  <div className="text-[10px] text-gray-400 font-black uppercase tracking-widest mt-3 flex items-center gap-2">
                    <Clock size={12}/> {analysis.mealType}
                  </div>
               </div>
               <div className="bg-black text-white px-5 py-3 rounded-[24px] text-center shadow-lg">
                  <div className="text-xl font-black leading-none">{analysis.healthScore}</div>
                  <div className="text-[8px] font-black uppercase opacity-40">Score</div>
               </div>
            </div>

            {/* Macros Section */}
            <div className="space-y-4">
               <h3 className="text-[10px] font-black uppercase text-gray-400 tracking-[0.2em] px-1">Metabolic Synergy</h3>
               <div className="grid grid-cols-4 gap-2">
                 <div className="bg-gray-50 p-4 rounded-3xl text-center border border-gray-100/50">
                    <div className="text-lg font-black">{analysis.calories}</div>
                    <div className="text-[8px] font-black text-gray-300 uppercase">Kcal</div>
                 </div>
                 <div className="bg-red-50 p-4 rounded-3xl text-center border border-red-100/50">
                    <div className="text-lg font-black text-red-500">{analysis.protein}g</div>
                    <div className="text-[8px] font-black text-red-300 uppercase">Prot</div>
                 </div>
                 <div className="bg-orange-50 p-4 rounded-3xl text-center border border-orange-100/50">
                    <div className="text-lg font-black text-orange-500">{analysis.carbs}g</div>
                    <div className="text-[8px] font-black text-orange-300 uppercase">Carb</div>
                 </div>
                 <div className="bg-blue-50 p-4 rounded-3xl text-center border border-blue-100/50">
                    <div className="text-lg font-black text-blue-500">{analysis.fat}g</div>
                    <div className="text-[8px] font-black text-blue-300 uppercase">Fat</div>
                 </div>
               </div>
            </div>

            {/* Alternatives Section */}
            <div className="space-y-4">
               <h3 className="text-[10px] font-black uppercase text-gray-400 tracking-[0.2em] px-1">Healthy Swaps</h3>
               <div className="space-y-2">
                  {analysis.alternatives?.map((alt, idx) => (
                    <div key={idx} className="bg-white p-5 rounded-[32px] border border-gray-100 flex items-center gap-4 shadow-sm group">
                       <div className="w-10 h-10 bg-black text-white rounded-2xl flex items-center justify-center shadow-xl group-hover:scale-110 transition-transform">
                          <Sparkle size={18} className="fill-white"/>
                       </div>
                       <p className="font-bold text-sm tracking-tight">{alt}</p>
                    </div>
                  ))}
               </div>
            </div>

            <div className="bg-gray-900 text-white p-6 rounded-[32px] relative overflow-hidden">
               <Activity size={60} className="absolute -right-4 -bottom-4 opacity-5" />
               <p className="text-[11px] font-bold leading-relaxed relative z-10 italic text-gray-400">
                  <span className="text-white">Note:</span> {analysis.microAnalysis}
               </p>
            </div>
          </div>
        </div>
      </div>
    ) : null}
  </div>
);

const TeamSection: React.FC<{ onBack: () => void }> = ({ onBack }) => {
  const founder = TEAM_MEMBERS[0];
  const others = TEAM_MEMBERS.slice(1);

  return (
    <div className="pt-6 h-full overflow-y-auto no-scrollbar pb-40 px-4">
      <div className="flex items-center gap-4 mb-8">
        <button onClick={onBack} className="p-4 bg-white rounded-3xl shadow-card active:scale-95 transition-all">
          <ArrowLeft size={20}/>
        </button>
        <h1 className="text-4xl font-black tracking-tight">The Team</h1>
      </div>

      <div className="space-y-8">
        {/* Founder Card */}
        <div className="bg-black rounded-[48px] p-10 relative overflow-hidden shadow-2xl min-h-[180px] flex flex-col justify-end">
          <div className="absolute top-6 right-6 opacity-20 transform rotate-12">
             <Crown size={90} className="text-white" />
          </div>
          <div className="relative z-10">
            <div className="text-[10px] font-black text-gray-500 uppercase tracking-[0.3em] mb-4">Founder</div>
            <h2 className="text-4xl font-black text-white tracking-tighter leading-tight">{founder.name}</h2>
          </div>
        </div>

        {/* Core Members List */}
        <div className="bg-white rounded-[56px] p-10 shadow-card border border-gray-100">
          <div className="flex items-center gap-3 mb-8 px-2">
            <Users size={16} className="text-gray-400"/>
            <h3 className="text-[10px] font-black uppercase text-gray-400 tracking-[0.2em]">Core Team Members</h3>
          </div>
          
          <div className="space-y-4">
            {others.map((m, i) => (
              <div key={i} className="bg-gray-50/50 p-6 rounded-[32px] flex items-center gap-6 border border-gray-50 group hover:bg-gray-100 transition-all">
                <div className="w-14 h-14 bg-white rounded-full flex items-center justify-center font-black text-xl text-gray-300 shadow-sm border border-gray-100 transition-transform group-hover:scale-105">
                  {m.name.charAt(0)}
                </div>
                <div>
                  <h4 className="text-xl font-black text-black leading-tight">{m.name}</h4>
                  <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest mt-1">Associate Node</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default App;
