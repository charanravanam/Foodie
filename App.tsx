
import React, { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import { 
  Home, BarChart2, Settings, Plus, Flame, ChevronRight, ArrowLeft, ArrowRight,
  Camera, User as UserIcon, Dumbbell, LogOut, Crown, Loader2, TrendingUp,
  Target, Zap, Activity, Clock, Trophy, CheckCircle2, X,
  ScanLine, Wallet as WalletIcon, Gift, Users, Coins, Send, 
  ShieldCheck, ShieldAlert, DollarSign, Search, History, Heart, 
  Mail, Key, Share, Sparkle, Ban, UserX, Gem, Lock, Zap as Lightning,
  Shield, Bell, HelpCircle, Info, ChevronDown, Image, MessageCircle, Trash2,
  Edit3, CreditCard
} from 'lucide-react';
import { onAuthStateChanged, signOut, sendPasswordResetEmail } from 'firebase/auth';
import type { User as FirebaseUser } from 'firebase/auth';
import { 
  doc, getDoc, setDoc, collection, query, orderBy, getDocs, addDoc, deleteDoc, where, updateDoc, increment, onSnapshot, Timestamp, runTransaction
} from 'firebase/firestore';
import Onboarding from './components/Onboarding';
import PremiumModal from './components/PremiumModal';
import Auth from './components/Auth';
import { UserProfile, ScanHistoryItem, Gender, Goal, WorkoutLocation, MuscleGroup, Exercise } from './types';
import { analyzeFoodImage, generateWorkoutRoutine } from './services/geminiService';
import { auth, db } from './services/firebase';

const MAX_FREE_SCANS_PER_DAY = 3;
const COINS_PER_SCAN = 5;
const RUPEE_TO_COINS = 100;

const SIGNUP_REFERRAL_COINS = 100;
const PREMIUM_REFERRAL_COINS = 250;

const formatCoins = (num: number) => {
  if (!num) return '0';
  if (num < 100000) return num.toLocaleString();
  if (num >= 1000000) return (num / 1000000).toFixed(1).replace(/\.0$/, '') + 'M';
  return (num / 1000).toFixed(0) + 'k';
};

const resizeImage = (base64Str: string, maxWidth = 1024, maxHeight = 1024): Promise<string> => {
  return new Promise((resolve, reject) => {
    if (base64Str.length < 100) return reject(new Error("Invalid image string"));
    const img = new window.Image();
    const timeout = setTimeout(() => reject(new Error("Image processing timed out")), 8000);
    img.onload = () => {
      clearTimeout(timeout);
      try {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;
        if (width > height) {
          if (width > maxWidth) {
            height *= maxWidth / width;
            width = maxWidth;
          }
        } else {
          if (height > maxHeight) {
            width *= maxHeight / height;
            height = maxHeight;
          }
        }
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) throw new Error("Could not get canvas context");
        ctx.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL('image/jpeg', 0.8));
      } catch (err) {
        reject(err);
      }
    };
    img.onerror = () => {
      clearTimeout(timeout);
      reject(new Error("Failed to load image for processing"));
    };
    img.src = base64Str;
  });
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
    <div className="pt-4 space-y-6 animate-fade-in pb-40 px-5 h-full overflow-y-auto no-scrollbar">
      <div className="flex items-center gap-3">
        <button onClick={onBack} className="p-3 bg-white rounded-2xl shadow-card active:scale-95 transition-all">
          <ArrowLeft size={18}/>
        </button>
        <h1 className="text-2xl font-black tracking-tight text-black">Vault</h1>
      </div>
      <div className="bg-[#0A0A0A] text-white p-8 rounded-[40px] text-center relative overflow-hidden shadow-2xl border border-white/5">
         <div className="absolute top-0 left-0 w-full h-full opacity-30 pointer-events-none bg-[radial-gradient(circle_at_50%_0%,rgba(255,215,0,0.15),transparent_70%)]" />
         <div className="text-[9px] font-black uppercase text-gray-600 tracking-[0.4em] mb-3">TOTAL ASSETS</div>
         <div className="flex items-center justify-center gap-2">
            <div className="text-5xl font-black mb-1 bg-gradient-to-b from-white to-gray-500 bg-clip-text text-transparent">
              {formatCoins(profile?.points || 0)}
            </div>
            <Gem className="text-yellow-500 animate-pulse" size={24} />
         </div>
         <div className="text-[9px] font-black text-yellow-400 bg-white/5 py-2 px-4 rounded-full inline-block mt-3 uppercase tracking-[0.2em] border border-white/5 backdrop-blur-md">
           USER ID: {profile?.uniqueTransferCode || 'Generating...'}
         </div>
      </div>
      <div className="bg-gradient-to-br from-yellow-400 to-yellow-600 p-8 rounded-[40px] shadow-[0_15px_40px_rgba(234,179,8,0.2)] relative overflow-hidden group">
         <div className="absolute -right-8 -bottom-8 opacity-20 group-hover:scale-110 transition-transform duration-700">
            <Lightning size={120} className="text-white fill-white" />
         </div>
         <div className="relative z-10 space-y-3">
            <div className="flex items-center gap-2">
               <div className="bg-black text-white px-2 py-1 rounded-full text-[8px] font-black uppercase tracking-widest">PHASE 1: EARN</div>
            </div>
            <h2 className="text-2xl font-black text-black leading-tight tracking-tighter uppercase">The Great Airdrop</h2>
            <div className="space-y-2">
              <p className="text-black/90 text-xs font-bold leading-tight">
                Exclusive <span className="underline decoration-black/30 underline-offset-4">Airdrop</span> launching soon.
              </p>
              <p className="text-black/80 text-[12px] font-medium leading-tight">
                Convert coins into <span className="font-black">Real Money</span> at the reveal.
              </p>
            </div>
            <div className="pt-3 flex items-center gap-3">
               <div className="bg-black text-white p-3 rounded-[20px] flex-1 text-center shadow-xl">
                  <div className="text-[7px] font-black uppercase opacity-50 mb-1">COIN VALUE</div>
                  <div className="text-sm font-black flex items-center justify-center gap-1"><Lock size={12}/> LOCKED</div>
               </div>
               <div className="bg-white/20 backdrop-blur-md p-3 rounded-[20px] flex-1 text-center border border-white/30">
                  <div className="text-[7px] font-black uppercase opacity-50 mb-1">REVEAL</div>
                  <div className="text-sm font-black uppercase tracking-widest">SOON</div>
               </div>
            </div>
         </div>
      </div>
      <div className="bg-white p-6 rounded-[36px] shadow-card border border-gray-100 space-y-4">
         <div className="flex justify-between items-center">
            <h3 className="text-[9px] font-black text-gray-400 uppercase tracking-widest flex items-center gap-2 px-1"><Send size={12}/> Peer Transfer</h3>
            <div className="text-[8px] font-black text-green-500 bg-green-50 px-2 py-1 rounded-md uppercase">Zero Fee</div>
         </div>
         <div className="space-y-3">
            <input type="text" placeholder="Unique Code (INR-XXXXXX)" value={transferCode} onChange={(e) => setTransferCode(e.target.value.toUpperCase())} className="w-full p-4 rounded-xl bg-gray-50 font-bold border-none outline-none focus:ring-1 focus:ring-black transition-all text-base" />
            <input type="number" placeholder="Amount (Coins)" value={transferAmount} onChange={(e) => setTransferAmount(e.target.value)} className="w-full p-4 rounded-xl bg-gray-50 font-bold border-none outline-none focus:ring-1 focus:ring-black transition-all text-base" />
            <button onClick={async () => { setIsProcessingTransfer(true); try { await onTransfer(transferCode, parseInt(transferAmount) || 0); setTransferCode(''); setTransferAmount('100'); } finally { setIsProcessingTransfer(false); } }} disabled={isProcessingTransfer} className="w-full bg-black text-white py-4 rounded-[18px] font-black text-xs active:scale-95 transition-all disabled:opacity-50 shadow-lg">
              {isProcessingTransfer ? <Loader2 className="animate-spin mx-auto" size={16}/> : "Authorize Transfer"}
            </button>
         </div>
      </div>
    </div>
  );
};

const ClarificationModal: React.FC<{
  question: string;
  onAnswer: (answer: string) => void;
  onApprox: () => void;
  onCancel: () => void;
}> = ({ question, onAnswer, onApprox, onCancel }) => {
  const [answer, setAnswer] = useState('');
  return (
    <div className="fixed inset-0 z-[110] bg-black/60 backdrop-blur-md flex items-center justify-center p-6 animate-fade-in">
      <div className="bg-white rounded-[32px] w-full max-w-sm p-7 shadow-2xl space-y-5">
        <div className="w-14 h-14 bg-black rounded-2xl flex items-center justify-center mx-auto shadow-xl">
           <MessageCircle className="text-white" size={28} />
        </div>
        <div className="text-center space-y-1">
           <h3 className="text-xl font-black tracking-tight">Quick Question</h3>
           <p className="text-gray-500 font-bold leading-tight text-sm">{question}</p>
        </div>
        <textarea value={answer} onChange={(e) => setAnswer(e.target.value)} placeholder="Type your answer..." className="w-full p-5 bg-gray-50 rounded-[24px] font-bold border-none outline-none focus:ring-2 focus:ring-black transition-all h-28 resize-none text-sm" />
        <div className="space-y-2">
           <button onClick={() => onAnswer(answer)} disabled={!answer.trim()} className="w-full bg-black text-white py-4 rounded-[20px] font-black text-xs shadow-xl active:scale-95 transition-all disabled:opacity-50">Submit Detail</button>
           <button onClick={onApprox} className="w-full bg-gray-50 text-black py-3 rounded-[20px] font-black text-[9px] uppercase tracking-widest border border-gray-100 hover:bg-gray-100 transition-all">Take approximate value</button>
           <button onClick={onCancel} className="w-full text-gray-400 font-bold text-[9px] uppercase tracking-widest py-2">Cancel Analysis</button>
        </div>
      </div>
    </div>
  );
};

const ReferralView: React.FC<{ profile: UserProfile | null; onBack: () => void }> = ({ profile, onBack }) => {
  const referralLink = `https://drfoodie.app/join?ref=${profile?.referralCode}`;
  const copyToClipboard = (text: string) => { navigator.clipboard.writeText(text); alert("Copied to clipboard!"); };
  return (
    <div className="pt-6 space-y-6 animate-fade-in pb-32 px-5 h-full overflow-y-auto no-scrollbar">
      <div className="flex items-center gap-3">
        <button onClick={onBack} className="p-3 bg-white rounded-2xl shadow-card active:scale-95 transition-all"><ArrowLeft size={18}/></button>
        <h1 className="text-2xl font-black tracking-tight text-black">Network</h1>
      </div>
      <div className="bg-white p-8 rounded-[40px] shadow-card border border-gray-100 text-center space-y-6">
        <div className="w-20 h-20 bg-blue-50 rounded-[32px] flex items-center justify-center mx-auto shadow-inner"><Users className="text-blue-500" size={40} /></div>
        <div className="space-y-2">
          <h2 className="text-2xl font-black tracking-tighter">Grow the Network</h2>
          <p className="text-gray-400 text-xs font-bold leading-relaxed px-4"> Onboard new nodes and earn <span className="text-black">100 coins</span> per referral. Secure an additional <span className="text-black">250 coins</span> when they upgrade to PRO. </p>
        </div>
      </div>
      <div className="bg-black text-white p-8 rounded-[40px] shadow-2xl space-y-4">
        <div className="text-[10px] font-black text-gray-500 uppercase tracking-[0.4em] text-center">YOUR UNIQUE NODE CODE</div>
        <div className="bg-white/5 border border-white/10 p-5 rounded-2xl text-center flex items-center justify-center gap-3 group active:scale-95 transition-all cursor-pointer" onClick={() => copyToClipboard(profile?.referralCode || '')}>
          <span className="text-3xl font-black tracking-[0.2em]">{profile?.referralCode}</span>
          <Share size={20} className="text-gray-500" />
        </div>
        <p className="text-[9px] text-gray-500 font-bold text-center uppercase tracking-widest">Tap code to copy and transmit</p>
      </div>
      <div className="space-y-2">
         <button onClick={() => copyToClipboard(referralLink)} className="w-full bg-white text-black py-4 rounded-[24px] font-black text-xs shadow-card border border-gray-100 active:scale-95 transition-all flex items-center justify-center gap-2">
           <Send size={14}/> TRANSMIT INVITE LINK
         </button>
      </div>
    </div>
  );
};

const WorkoutLocationView: React.FC<{ onBack: () => void; onSelect: (loc: WorkoutLocation) => void }> = ({ onBack, onSelect }) => {
  return (
    <div className="pt-6 space-y-8 animate-fade-in pb-32 px-5 h-full overflow-y-auto no-scrollbar">
      <div className="flex items-center gap-3">
        <button onClick={onBack} className="p-3 bg-white rounded-2xl shadow-card active:scale-95 transition-all"><ArrowLeft size={18}/></button>
        <h1 className="text-2xl font-black tracking-tight text-black">Protocol</h1>
      </div>
      <div className="space-y-4">
        <div className="text-center space-y-1">
          <h2 className="text-3xl font-black tracking-tighter">Select Environment</h2>
          <p className="text-gray-400 text-[10px] font-black uppercase tracking-widest">Deploy workout routine based on assets</p>
        </div>
        <div className="grid gap-4">
          <button onClick={() => onSelect(WorkoutLocation.HOME)} className="bg-white p-8 rounded-[40px] shadow-card border border-gray-100 flex flex-col items-center text-center space-y-4 active:scale-[0.98] transition-all hover:border-black">
             <div className="w-16 h-16 bg-blue-50 rounded-[24px] flex items-center justify-center"><Home className="text-blue-500" size={32} /></div>
             <div><div className="text-xl font-black">Home Base</div><div className="text-[10px] font-bold text-gray-400 uppercase mt-1">Bodyweight & Minimal Tools</div></div>
          </button>
          <button onClick={() => onSelect(WorkoutLocation.GYM)} className="bg-white p-8 rounded-[40px] shadow-card border border-gray-100 flex flex-col items-center text-center space-y-4 active:scale-[0.98] transition-all hover:border-black">
             <div className="w-16 h-16 bg-purple-50 rounded-[24px] flex items-center justify-center"><Dumbbell className="text-purple-500" size={32} /></div>
             <div><div className="text-xl font-black">Clinical Gym</div><div className="text-[10px] font-bold text-gray-400 uppercase mt-1">Full Equipment & Machines</div></div>
          </button>
        </div>
      </div>
    </div>
  );
};

const WorkoutFocusView: React.FC<{ location: WorkoutLocation; selectedGroups: MuscleGroup[]; onToggle: (g: MuscleGroup) => void; onGenerate: () => void; onBack: () => void; }> = ({ location, selectedGroups, onToggle, onGenerate, onBack }) => {
  return (
    <div className="pt-6 space-y-8 animate-fade-in pb-32 px-5 h-full overflow-y-auto no-scrollbar">
      <div className="flex items-center gap-3"><button onClick={onBack} className="p-3 bg-white rounded-2xl shadow-card active:scale-95 transition-all"><ArrowLeft size={18}/></button><h1 className="text-2xl font-black tracking-tight text-black">Focus</h1></div>
      <div className="space-y-6">
        <div className="text-center space-y-1">
          <h2 className="text-3xl font-black tracking-tighter">Target Nodes</h2>
          <p className="text-gray-400 text-[10px] font-black uppercase tracking-widest">Select muscle groups for optimization</p>
        </div>
        <div className="grid grid-cols-2 gap-3">
          {Object.values(MuscleGroup).map((g) => (
            <button key={g} onClick={() => onToggle(g)} className={`p-5 rounded-[28px] font-black text-xs transition-all border ${selectedGroups.includes(g) ? 'bg-black text-white border-black shadow-xl scale-[1.02]' : 'bg-white text-gray-400 border-gray-100 shadow-sm'}`}>{g}</button>
          ))}
        </div>
        <button onClick={onGenerate} disabled={selectedGroups.length === 0} className="w-full bg-black text-white py-5 rounded-[24px] font-black text-sm shadow-2xl active:scale-95 transition-all flex items-center justify-center gap-3 disabled:opacity-40 mt-4"><Zap size={18} className="fill-white"/> INITIALIZE GENERATION</button>
      </div>
    </div>
  );
};

const WorkoutPlanView: React.FC<{ routine: Exercise[]; isGenerating: boolean; onBack: () => void }> = ({ routine, isGenerating, onBack }) => {
  if (isGenerating) {
    return (
      <div className="h-full flex flex-col items-center justify-center p-10 space-y-6 text-center animate-pulse">
        <div className="w-20 h-20 bg-black rounded-[32px] flex items-center justify-center shadow-2xl"><Loader2 className="animate-spin text-white" size={40} /></div>
        <div className="space-y-2"><h2 className="text-2xl font-black tracking-tight uppercase">Computing Routine</h2><p className="text-gray-400 text-[10px] font-black uppercase tracking-[0.3em]">Mapping Metabolic Response...</p></div>
      </div>
    );
  }
  return (
    <div className="pt-6 space-y-6 animate-fade-in pb-32 px-5 h-full overflow-y-auto no-scrollbar">
      <div className="flex items-center gap-3">
        <button onClick={onBack} className="p-3 bg-white rounded-2xl shadow-card active:scale-95 transition-all"><ArrowLeft size={18}/></button>
        <h1 className="text-2xl font-black tracking-tight text-black">Routine</h1>
      </div>
      <div className="space-y-4">
        {routine.map((ex, i) => (
          <div key={i} className="bg-white p-6 rounded-[36px] shadow-card border border-gray-100 space-y-4 group">
            {ex.imageUrl && (
              <div className="w-full aspect-video rounded-2xl overflow-hidden mb-2 bg-gray-50 border border-gray-50">
                <img src={ex.imageUrl} className="w-full h-full object-cover" alt={ex.name} />
              </div>
            )}
            <div className="flex justify-between items-start">
               <div className="bg-black text-white px-3 py-1 rounded-full text-[8px] font-black tracking-widest">STEP 0{i+1}</div>
               <div className="flex items-center gap-1.5 bg-gray-50 px-3 py-1 rounded-full border border-gray-100"><Flame size={10} className="text-orange-500 fill-orange-500"/><span className="text-[10px] font-black">{ex.sets} × {ex.reps}</span></div>
            </div>
            <div><h3 className="text-xl font-black tracking-tight">{ex.name}</h3><p className="text-gray-500 text-xs font-medium leading-relaxed mt-2">{ex.description}</p></div>
            <div className="flex flex-wrap gap-1.5 pt-2">
               {ex.muscleGroups.map((mg, j) => ( <span key={j} className="text-[7px] font-black uppercase tracking-widest bg-gray-50 text-gray-400 px-2 py-1 rounded-md border border-gray-100">{mg}</span> ))}
            </div>
          </div>
        ))}
      </div>
      <div className="bg-black text-white p-8 rounded-[40px] text-center space-y-3 shadow-2xl mt-4"><CheckCircle2 size={32} className="mx-auto text-green-400" /><h4 className="text-xl font-black tracking-tight">Sequence Ready</h4><p className="text-gray-500 text-[9px] font-bold uppercase tracking-widest px-4">Follow the protocol exactly for peak performance</p></div>
    </div>
  );
};

const AnalysisDetailView: React.FC<{ analysis: ScanHistoryItem | null; isAnalyzing: boolean; onBack: () => void; onDelete: () => void }> = ({ analysis, isAnalyzing, onBack, onDelete }) => {
  if (isAnalyzing) {
    return (
      <div className="h-full flex flex-col items-center justify-center p-10 space-y-6 text-center">
        <div className="w-24 h-24 bg-black rounded-[40px] flex items-center justify-center shadow-2xl relative"><div className="absolute inset-0 bg-white/20 rounded-[40px] animate-ping" /><ScanLine className="text-white animate-bounce" size={40} /></div>
        <div className="space-y-2"><h2 className="text-2xl font-black tracking-tight">Dr Foodie Analyzing</h2><p className="text-gray-400 text-[10px] font-black uppercase tracking-[0.3em]">Extracting Metabolic Data...</p></div>
      </div>
    );
  }
  if (!analysis) return null;
  return (
    <div className="h-full flex flex-col animate-fade-in overflow-hidden">
      <div className="relative h-2/5 shrink-0"><img src={analysis.imageUrl} className="w-full h-full object-cover" /><div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/20" /><button onClick={onBack} className="absolute top-8 left-6 p-4 bg-black/20 backdrop-blur-md rounded-2xl text-white active:scale-95 transition-all"><ArrowLeft size={20}/></button><button onClick={onDelete} className="absolute top-8 right-6 p-4 bg-red-500/20 backdrop-blur-md rounded-2xl text-red-400 active:scale-95 transition-all"><Trash2 size={20}/></button><div className="absolute bottom-8 left-8 right-8"><div className="text-[10px] font-black text-white/50 uppercase tracking-[0.4em] mb-2">{analysis.mealType} • {new Date(analysis.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div><h1 className="text-4xl font-black text-white tracking-tighter">{analysis.foodName}</h1></div></div>
      <div className="bg-[#F2F2F7] -mt-6 rounded-t-[40px] flex-1 overflow-y-auto no-scrollbar p-8 space-y-6 pb-40 relative z-10 shadow-[0_-10px_30px_rgba(0,0,0,0.1)]">
        <div className="grid grid-cols-4 gap-3">
          {[ { label: 'Energy', val: analysis.calories, unit: 'kcal', icon: <Flame size={12}/> }, { label: 'Protein', val: analysis.protein, unit: 'g', icon: <Activity size={12}/> }, { label: 'Carbs', val: analysis.carbs, unit: 'g', icon: <Target size={12}/> }, { label: 'Fat', val: analysis.fat, unit: 'g', icon: <Heart size={12}/> }, ].map((stat, i) => ( <div key={i} className="bg-white p-4 rounded-[24px] text-center border border-gray-50 shadow-sm"><div className="flex justify-center mb-1 text-black/10">{stat.icon}</div><div className="text-base font-black tracking-tighter leading-none">{stat.val}</div><div className="text-[7px] font-black text-gray-300 uppercase tracking-widest mt-1">{stat.unit}</div></div> ))}
        </div>
        <div className="bg-white p-6 rounded-[32px] border border-gray-100 shadow-sm"><div className="flex justify-between items-center mb-4"><h3 className="text-[9px] font-black uppercase text-gray-400 tracking-widest px-1">Dr Foodie Insights</h3><div className="bg-black text-white px-3 py-1 rounded-full text-[8px] font-black uppercase tracking-widest">SCORE: {analysis.healthScore}/10</div></div><p className="text-sm font-bold text-gray-700 leading-relaxed italic border-l-4 border-black pl-4">"{analysis.microAnalysis}"</p></div>
        <div className="space-y-3"><h3 className="text-[9px] font-black uppercase text-gray-400 tracking-widest px-1">Metabolic Alternatives</h3><div className="grid grid-cols-1 gap-2">{analysis.alternatives.map((alt, i) => ( <div key={i} className="bg-white/50 border border-gray-100 p-4 rounded-2xl flex items-center justify-between group hover:bg-white hover:shadow-sm transition-all"><span className="text-xs font-black text-gray-600">{alt}</span><Sparkle size={14} className="text-yellow-500 opacity-20 group-hover:opacity-100 transition-opacity" /></div> ))}</div></div>
      </div>
    </div>
  );
};

const StatsView: React.FC<{ scans: ScanHistoryItem[]; currentCalTarget: number; profile: UserProfile | null; onBack: () => void }> = ({ scans, currentCalTarget, profile, onBack }) => {
  const chartData = useMemo(() => {
    const last7Days = Array.from({ length: 7 }, (_, i) => { const d = new Date(); d.setDate(d.getDate() - i); return d.toDateString(); }).reverse();
    return last7Days.map(date => {
      const dayScans = scans.filter(s => new Date(s.timestamp).toDateString() === date);
      const total = dayScans.reduce((acc, s) => acc + (s.calories || 0), 0);
      return { name: date.split(' ')[0], calories: total };
    });
  }, [scans]);
  return (
    <div className="pt-6 space-y-6 animate-fade-in pb-32 px-5 h-full overflow-y-auto no-scrollbar">
      <div className="flex items-center gap-3"><button onClick={onBack} className="p-3 bg-white rounded-2xl shadow-card active:scale-95 transition-all"><ArrowLeft size={18}/></button><h1 className="text-2xl font-black tracking-tight text-black">Insights</h1></div>
      <div className="bg-white p-6 rounded-[36px] shadow-card border border-gray-50 space-y-4">
         <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">Calorie Trend</h3>
         <div className="h-48 w-full"><div className="flex items-end justify-between h-full gap-2 px-2">{chartData.map((d, i) => { const height = Math.min(100, (d.calories / (currentCalTarget * 1.5)) * 100); return ( <div key={i} className="flex-1 flex flex-col items-center gap-2"><div className="w-full bg-gray-50 rounded-t-lg relative overflow-hidden group h-32"><div className="absolute bottom-0 left-0 right-0 bg-black transition-all duration-1000" style={{ height: `${height}%` }} /></div><span className="text-[8px] font-black text-gray-400 uppercase">{d.name}</span></div> ); })}</div></div>
      </div>
      <div className="grid grid-cols-2 gap-4"><div className="bg-white p-6 rounded-[32px] border border-gray-50 shadow-sm"><div className="text-[8px] font-black text-gray-400 uppercase tracking-widest mb-2">Total Scans</div><div className="text-3xl font-black">{scans.length}</div></div><div className="bg-white p-6 rounded-[32px] border border-gray-100 shadow-sm"><div className="text-[8px] font-black text-gray-400 uppercase tracking-widest mb-2">Avg. Health</div><div className="text-3xl font-black">{scans.length > 0 ? (scans.reduce((acc, s) => acc + (s.healthScore || 0), 0) / scans.length).toFixed(1) : '0'}</div></div></div>
    </div>
  );
};

const SettingsSection: React.FC<{ profile: UserProfile | null; onViewWallet: () => void; onViewRefer: () => void; onUpdateProfile: () => void; onShowPremium: () => void; onViewTeam: () => void; onLogout: () => void; onBack: () => void; }> = ({ profile, onViewWallet, onViewRefer, onUpdateProfile, onShowPremium, onViewTeam, onLogout, onBack }) => {
  return (
    <div className="pt-6 space-y-6 animate-fade-in pb-32 px-5 h-full overflow-y-auto no-scrollbar">
      <div className="flex items-center gap-3"><button onClick={onBack} className="p-3 bg-white rounded-2xl shadow-card active:scale-95 transition-all"><ArrowLeft size={18}/></button><h1 className="text-2xl font-black tracking-tight text-black">Control</h1></div>
      <div className="bg-white p-8 rounded-[40px] shadow-card border border-gray-100 flex items-center gap-4"><div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center border border-gray-100"><UserIcon size={24} className="text-black/20" /></div><div><h2 className="text-xl font-black">{profile?.name || 'Agent'}</h2><p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{profile?.goal}</p></div></div>
      <div className="space-y-2">
         {[ { icon: <Edit3 size={18}/>, label: 'Update Metrics', action: onUpdateProfile }, { icon: <WalletIcon size={18}/>, label: 'Vault Access', action: onViewWallet }, { icon: <Gift size={18}/>, label: 'Referral Nodes', action: onViewRefer }, { icon: <Crown size={18}/>, label: 'Go Pro', action: onShowPremium, hidden: profile?.isPremium }, { icon: <Users size={18}/>, label: 'Team Info', action: onViewTeam }, ].filter(i => !i.hidden).map((item, i) => ( <button key={i} onClick={item.action} className="w-full bg-white p-5 rounded-[28px] flex items-center justify-between border border-gray-100 shadow-sm active:scale-95 transition-all"><div className="flex items-center gap-4"><div className="text-black/40">{item.icon}</div><span className="text-sm font-black text-gray-700">{item.label}</span></div><ChevronRight size={16} className="text-gray-200" /></button> ))}
      </div>
      <button onClick={onLogout} className="w-full py-5 rounded-[28px] flex items-center justify-center gap-2 text-red-500 font-black text-xs uppercase tracking-widest mt-4"><LogOut size={16}/> Terminate Session</button>
    </div>
  );
};

const TeamSection: React.FC<{ onBack: () => void }> = ({ onBack }) => {
  return (
    <div className="pt-6 space-y-6 animate-fade-in pb-32 px-5 h-full overflow-y-auto no-scrollbar">
      <div className="flex items-center gap-3"><button onClick={onBack} className="p-3 bg-white rounded-2xl shadow-card active:scale-95 transition-all"><ArrowLeft size={18}/></button><h1 className="text-2xl font-black tracking-tight text-black">Metabolic Team</h1></div>
      <div className="bg-white p-8 rounded-[40px] shadow-card border border-gray-100 text-center space-y-4"><div className="w-20 h-20 bg-black rounded-[32px] flex items-center justify-center mx-auto shadow-xl"><Zap size={32} className="text-white fill-white"/></div><div className="space-y-2"><h2 className="text-2xl font-black">Dr Foodie Lab</h2><p className="text-xs font-medium text-gray-500 leading-relaxed">Designing peak human performance through metabolic AI tracking.</p></div></div>
    </div>
  );
};

const AdminPanel: React.FC<{ view: string; setView: (v: any) => void; allUsers: any[]; allPayments: any[]; allTransfers: any[]; adminSearch: string; setAdminSearch: (v: string) => void; selectedAdminUser: any; setSelectedAdminUser: (v: any) => void; setIsAdmin: (v: boolean) => void; }> = ({ view, setView, allUsers, allPayments, allTransfers, adminSearch, setAdminSearch, selectedAdminUser, setSelectedAdminUser, setIsAdmin }) => {
  const filteredUsers = allUsers.filter(u => u.name?.toLowerCase().includes(adminSearch.toLowerCase()) || u.email?.toLowerCase().includes(adminSearch.toLowerCase()) || u.uniqueTransferCode?.toLowerCase().includes(adminSearch.toLowerCase()));
  
  return (
    <div className="h-full flex flex-col bg-white overflow-hidden">
      <header className="p-6 border-b border-gray-100 flex justify-between items-center shrink-0"><div><h1 className="text-xl font-black">Admin Console</h1><p className="text-[8px] font-black text-red-500 uppercase tracking-widest">Restricted Access</p></div><button onClick={() => { localStorage.removeItem('drfoodie_admin'); setIsAdmin(false); setView('home'); }} className="p-3 bg-gray-50 rounded-xl text-gray-400"><LogOut size={18}/></button></header>
      <div className="flex-1 overflow-y-auto p-6 space-y-6 pb-32 no-scrollbar">
        {view === 'admin_dashboard' && ( <div className="space-y-6"><div className="grid grid-cols-2 gap-3"><div className="bg-black p-6 rounded-[32px] text-white"><div className="text-[8px] font-black text-gray-500 uppercase mb-2">Active Nodes</div><div className="text-3xl font-black">{allUsers.length}</div></div><div className="bg-gray-50 p-6 rounded-[32px] border border-gray-100"><div className="text-[8px] font-black text-gray-400 uppercase mb-2">Pro Subscriptions</div><div className="text-3xl font-black text-black">{allUsers.filter(u => u.isPremium).length}</div></div></div><div className="bg-blue-50 p-8 rounded-[40px] border border-blue-100 text-center space-y-2"><div className="text-[8px] font-black text-blue-400 uppercase tracking-widest">Accumulated Revenue</div><div className="text-4xl font-black text-blue-600">₹{allPayments.reduce((acc, p) => acc + (p.amount || 0), 0)}</div></div><div className="space-y-3"><h3 className="text-[10px] font-black uppercase tracking-widest text-gray-400 px-1">Global Controls</h3><div className="grid grid-cols-1 gap-2"><button onClick={() => setView('admin_users')} className="bg-white p-5 rounded-[24px] border border-gray-100 flex justify-between items-center"><div className="flex items-center gap-3"><Users size={18} className="text-gray-400"/><span className="text-sm font-black">Users</span></div><ChevronRight size={16} className="text-gray-200" /></button><button onClick={() => setView('admin_payments')} className="bg-white p-5 rounded-[24px] border border-gray-100 flex justify-between items-center"><div className="flex items-center gap-3"><DollarSign size={18} className="text-gray-400"/><span className="text-sm font-black">Payments</span></div><ChevronRight size={16} className="text-gray-200" /></button><button onClick={() => setView('admin_transfers')} className="bg-white p-5 rounded-[24px] border border-gray-100 flex justify-between items-center"><div className="flex items-center gap-3"><Send size={18} className="text-gray-400"/><span className="text-sm font-black">Transfers</span></div><ChevronRight size={16} className="text-gray-200" /></button></div></div></div> )}
        
        {view === 'admin_users' && ( 
          <div className="space-y-4">
            <div className="flex items-center gap-3 mb-2">
              <button onClick={() => setView('admin_dashboard')} className="p-2 bg-gray-50 rounded-lg"><ArrowLeft size={16}/></button>
              <h2 className="text-lg font-black">Node Database</h2>
            </div>
            <div className="relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-300" size={16} />
              <input type="text" placeholder="Search nodes..." value={adminSearch} onChange={(e) => setAdminSearch(e.target.value)} className="w-full pl-12 pr-4 py-4 bg-gray-50 rounded-2xl border-none font-bold text-sm" />
            </div>
            <div className="space-y-2">
              {filteredUsers.map((u: any) => ( 
                <div key={u.uid} onClick={() => { setSelectedAdminUser(u); setView('admin_user_detail'); }} className="bg-white p-4 rounded-2xl border border-gray-100 flex justify-between items-center cursor-pointer active:bg-gray-50 transition-colors">
                  <div>
                    <div className="font-black text-sm">{u.name || 'Anonymous'}</div>
                    <div className="text-[9px] text-gray-400 font-bold uppercase">{u.email}</div>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className={`px-2 py-1 rounded-md text-[8px] font-black uppercase ${u.isPremium ? 'bg-black text-yellow-400' : 'bg-gray-50 text-gray-400'}`}>{u.isPremium ? 'PRO' : 'FREE'}</div>
                    <ChevronRight size={12} className="text-gray-200" />
                  </div>
                </div> 
              ))}
            </div>
          </div> 
        )}

        {view === 'admin_user_detail' && selectedAdminUser && (
          <div className="space-y-6 animate-fade-in">
             <div className="flex items-center gap-3 mb-2">
                <button onClick={() => setView('admin_users')} className="p-2 bg-gray-50 rounded-lg"><ArrowLeft size={16}/></button>
                <h2 className="text-lg font-black">Node Intelligence</h2>
             </div>
             <div className="bg-gray-50 p-6 rounded-[32px] border border-gray-100 space-y-4">
                <div className="flex items-center gap-4">
                   <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center shadow-sm"><UserIcon size={24} className="text-black/20" /></div>
                   <div>
                      <h3 className="text-xl font-black">{selectedAdminUser.name || 'Anonymous Agent'}</h3>
                      <p className="text-[10px] font-bold text-gray-400 uppercase">{selectedAdminUser.email}</p>
                   </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                   <div className="bg-white p-4 rounded-2xl">
                      <div className="text-[8px] font-black text-gray-400 uppercase tracking-widest mb-1">Status</div>
                      <div className={`text-xs font-black uppercase ${selectedAdminUser.isPremium ? 'text-yellow-600' : 'text-gray-400'}`}>{selectedAdminUser.isPremium ? 'PRO ACCESS' : 'FREE TIER'}</div>
                   </div>
                   <div className="bg-white p-4 rounded-2xl">
                      <div className="text-[8px] font-black text-gray-400 uppercase tracking-widest mb-1">Assets</div>
                      <div className="text-xs font-black">{formatCoins(selectedAdminUser.points || 0)}</div>
                   </div>
                </div>
             </div>
             <div className="space-y-3">
                <h3 className="text-[10px] font-black uppercase tracking-widest text-gray-400 px-1">Biometric Data</h3>
                <div className="bg-white p-6 rounded-[32px] border border-gray-100 grid grid-cols-2 gap-y-4">
                   <div><p className="text-[8px] font-black text-gray-300 uppercase">Age</p><p className="font-bold">{selectedAdminUser.age} yrs</p></div>
                   <div><p className="text-[8px] font-black text-gray-300 uppercase">Goal</p><p className="font-bold">{selectedAdminUser.goal}</p></div>
                   <div><p className="text-[8px] font-black text-gray-300 uppercase">Weight</p><p className="font-bold">{selectedAdminUser.weight} kg</p></div>
                   <div><p className="text-[8px] font-black text-gray-300 uppercase">Target</p><p className="font-bold">{selectedAdminUser.targetWeight} kg</p></div>
                </div>
             </div>
             <div className="space-y-3">
                <h3 className="text-[10px] font-black uppercase tracking-widest text-gray-400 px-1">Network Identity</h3>
                <div className="bg-white p-6 rounded-[32px] border border-gray-100 space-y-2">
                   <p className="text-[8px] font-black text-gray-300 uppercase">Unique Transfer Code</p>
                   <p className="font-mono font-black text-blue-600 text-sm">{selectedAdminUser.uniqueTransferCode}</p>
                   <p className="text-[8px] font-black text-gray-300 uppercase pt-2">Referral Code</p>
                   <p className="font-mono font-black text-gray-600 text-sm">{selectedAdminUser.referralCode}</p>
                </div>
             </div>
             <button 
               onClick={async () => {
                 if(confirm(`Confirm: ${selectedAdminUser.isDisabled ? 'Enable' : 'Disable'} this node?`)) {
                    await updateDoc(doc(db, "profiles", selectedAdminUser.uid), { isDisabled: !selectedAdminUser.isDisabled });
                    setSelectedAdminUser({...selectedAdminUser, isDisabled: !selectedAdminUser.isDisabled});
                 }
               }}
               className={`w-full py-5 rounded-[24px] font-black text-[10px] uppercase tracking-[0.2em] transition-all shadow-xl ${selectedAdminUser.isDisabled ? 'bg-green-500 text-white shadow-green-200' : 'bg-red-500 text-white shadow-red-200'}`}
             >
               {selectedAdminUser.isDisabled ? 'Authorize Node access' : 'Restrict Node access'}
             </button>
          </div>
        )}

        {view === 'admin_payments' && ( <div className="space-y-4"><div className="flex items-center gap-3 mb-2"><button onClick={() => setView('admin_dashboard')} className="p-2 bg-gray-50 rounded-lg"><ArrowLeft size={16}/></button><h2 className="text-lg font-black">Revenue Log</h2></div><div className="space-y-2">{allPayments.map((p: any) => ( <div key={p.id} className="bg-white p-4 rounded-2xl border border-gray-100 flex justify-between items-center"><div><div className="font-black text-sm">{p.userName}</div><div className="text-[9px] text-gray-400 font-bold uppercase">{p.timestamp?.toDate().toLocaleString()}</div></div><div className="text-sm font-black text-green-500">₹{p.amount}</div></div> ))}</div></div> )}
        {view === 'admin_transfers' && ( <div className="space-y-4"><div className="flex items-center gap-3 mb-2"><button onClick={() => setView('admin_dashboard')} className="p-2 bg-gray-50 rounded-lg"><ArrowLeft size={16}/></button><h2 className="text-lg font-black">Vault History</h2></div><div className="space-y-2">{allTransfers.map((t: any) => ( <div key={t.id} className="bg-white p-4 rounded-2xl border border-gray-100 space-y-2"><div className="flex justify-between items-center"><div className="text-[10px] font-black text-gray-400 uppercase">{t.timestamp?.toDate().toLocaleTimeString()}</div><div className="text-sm font-black text-blue-500">{formatCoins(t.amount)}</div></div><div className="flex items-center justify-between text-xs font-bold"><span>{t.fromName}</span><ArrowRight size={12} className="text-gray-200"/><span>{t.toName}</span></div></div> ))}</div></div> )}
      </div>
    </div>
  );
};

const App: React.FC = () => {
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [view, setView] = useState<'home' | 'stats' | 'settings' | 'analysis' | 'camera' | 'team' | 'wallet' | 'refer' | 'admin_users' | 'admin_payments' | 'admin_transfers' | 'admin_user_detail' | 'admin_dashboard' | 'workout_location' | 'workout_focus' | 'workout_plan' | 'update_profile'>('home');
  const [scans, setScans] = useState<ScanHistoryItem[]>([]);
  const [showPremium, setShowPremium] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysis, setAnalysis] = useState<ScanHistoryItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState<string>(new Date().toDateString());
  const [clarificationQuestion, setClarificationQuestion] = useState<string | null>(null);
  const [pendingImage, setPendingImage] = useState<string | null>(null);
  const [selectedLocation, setSelectedLocation] = useState<WorkoutLocation | null>(null);
  const [selectedMuscleGroups, setSelectedMuscleGroups] = useState<MuscleGroup[]>([]);
  const [currentRoutine, setCurrentRoutine] = useState<Exercise[]>([]);
  const [isGeneratingRoutine, setIsGeneratingRoutine] = useState(false);
  const [allUsers, setAllUsers] = useState<any[]>([]);
  const [allPayments, setAllPayments] = useState<any[]>([]);
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
        try { stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment', width: { ideal: 1920 }, height: { ideal: 1080 } } }); if (videoRef.current) { videoRef.current.srcObject = stream; await videoRef.current.play(); } }
        catch (err) { console.error("Camera Error:", err); setView('home'); }
      };
      initCamera();
    }
    return () => { if (stream) stream.getTracks().forEach(t => t.stop()); };
  }, [view]);
  useEffect(() => {
    const adminSession = localStorage.getItem('drfoodie_admin');
    if (adminSession === 'true') { setIsAdmin(true); if (view === 'home') setView('admin_dashboard'); }
    const unsub = onAuthStateChanged(auth, async (u) => { setLoading(true); if (u) { setUser(u); await fetchProfile(u); } else { setUser(null); setProfile(null); } setLoading(false); });
    return () => unsub();
  }, []);
  useEffect(() => {
    if (isAdmin) {
      const unsubUsers = onSnapshot(collection(db, "profiles"), (snapshot) => { const list: any[] = []; snapshot.forEach(doc => list.push({ uid: doc.id, ...doc.data() })); setAllUsers(list); });
      const unsubPayments = onSnapshot(query(collection(db, "payments"), orderBy("timestamp", "desc")), (snapshot) => { const list: any[] = []; snapshot.forEach(doc => list.push({ id: doc.id, ...doc.data() })); setAllPayments(list); });
      const unsubTransfers = onSnapshot(query(collection(db, "transfers"), orderBy("timestamp", "desc")), (snapshot) => { const list: any[] = []; snapshot.forEach(doc => list.push({ id: doc.id, ...doc.data() })); setAllTransfers(list); });
      return () => { unsubUsers(); unsubPayments(); unsubTransfers(); };
    }
  }, [isAdmin]);
  const fetchProfile = async (u: FirebaseUser) => {
    try {
      const docSnap = await getDoc(doc(db, "profiles", u.uid));
      if (docSnap.exists()) {
        let pData = docSnap.data() as UserProfile;
        if (pData.isDisabled) { alert("This account has been disabled by the system administrator."); signOut(auth); return; }
        if (!pData.referralCode) { pData.referralCode = u.uid.substring(0,8).toUpperCase(); await updateDoc(doc(db, "profiles", u.uid), { referralCode: pData.referralCode }); }
        const pendingRef = localStorage.getItem(`pending_referral_${u.uid}`);
        if (pendingRef && !pData.hasClaimedSignupReferral) {
           const refQuery = query(collection(db, "profiles"), where("referralCode", "==", pendingRef));
           const refSnap = await getDocs(refQuery);
           if (!refSnap.empty) {
              const referrerUid = refSnap.docs[0].id;
              await runTransaction(db, async (tx) => { const newPRef = doc(db, "profiles", u.uid); const referPRef = doc(db, "profiles", referrerUid); tx.update(newPRef, { points: increment(SIGNUP_REFERRAL_COINS), hasClaimedSignupReferral: true, referredBy: pendingRef }); tx.update(referPRef, { points: increment(SIGNUP_REFERRAL_COINS) }); });
              pData.points = (pData.points || 0) + SIGNUP_REFERRAL_COINS; pData.hasClaimedSignupReferral = true; pData.referredBy = pendingRef; localStorage.removeItem(`pending_referral_${u.uid}`);
           }
        }
        if (!pData.uniqueTransferCode) { pData.uniqueTransferCode = `INR-${Math.random().toString(36).substring(2, 8).toUpperCase()}`; await updateDoc(doc(db, "profiles", u.uid), { uniqueTransferCode: pData.uniqueTransferCode }); }
        const todayStr = new Date().toDateString();
        if (pData.lastLoginDate !== todayStr) {
          const yesterday = new Date(); yesterday.setDate(yesterday.getDate() - 1); const yesterdayStr = yesterday.toDateString();
          let newStreak = (pData.lastLoginDate === yesterdayStr) ? (pData.currentStreak || 0) + 1 : 1;
          let bonusCoins = 0; if (newStreak === 30) bonusCoins = 200 * RUPEE_TO_COINS; if (newStreak === 60) bonusCoins = 500 * RUPEE_TO_COINS; if (newStreak === 90) bonusCoins = 999 * RUPEE_TO_COINS;
          pData.currentStreak = newStreak; pData.lastLoginDate = todayStr;
          if (bonusCoins > 0) { pData.points = (pData.points || 0) + bonusCoins; alert(`Streak Milestone! ₹${bonusCoins/100} credited.`); }
          await updateDoc(doc(db, "profiles", u.uid), { currentStreak: newStreak, lastLoginDate: todayStr, points: (pData.points || 0), email: u.email || '' });
        }
        if (pData.lastScanResetDate !== todayStr) { pData.scansUsedToday = 0; pData.lastScanResetDate = todayStr; await updateDoc(doc(db, "profiles", u.uid), { scansUsedToday: 0, lastScanResetDate: todayStr }); }
        setProfile(pData);
        const qScans = query(collection(db, "profiles", u.uid, "scans"), orderBy("timestamp", "desc"));
        const qs = await getDocs(qScans); const ls: ScanHistoryItem[] = []; qs.forEach(d => ls.push({ id: d.id, ...d.data() } as ScanHistoryItem)); setScans(ls);
      } else {
        const newCode = `INR-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
        const newProfile = { isOnboarded: false, name: '', age: 0, gender: Gender.MALE, height: 0, weight: 0, targetWeight: 0, durationWeeks: 12, goal: Goal.MAINTAIN, referralCode: u.uid.substring(0,8).toUpperCase(), points: 0, uniqueTransferCode: newCode, currentStreak: 1, lastLoginDate: new Date().toDateString(), email: u.email || '' }; setProfile(newProfile as UserProfile);
      }
    } catch (e) { console.error(e); }
  };
  const handleUpgradeToPremium = async () => {
    if (!user || !profile) return;
    try {
      await runTransaction(db, async (tx) => { const userRef = doc(db, "profiles", user.uid); tx.update(userRef, { isPremium: true }); const payRef = doc(collection(db, "payments")); tx.set(payRef, { uid: user.uid, userName: profile.name, amount: 49, timestamp: Timestamp.now() }); if (profile.referredBy) { const refQuery = query(collection(db, "profiles"), where("referralCode", "==", profile.referredBy)); const refSnap = await getDocs(refQuery); if (!refSnap.empty) { const referrerUid = refSnap.docs[0].id; const referrerRef = doc(db, "profiles", referrerUid); tx.update(referrerRef, { points: increment(PREMIUM_REFERRAL_COINS) }); } } });
      setProfile(prev => prev ? { ...prev, isPremium: true } : null); setShowPremium(false); alert("Welcome to Pro Access!");
    } catch (e) { console.error(e); alert("Upgrade failed to process."); }
  };
  const saveProfile = async (data: Partial<UserProfile>) => {
    if (!user) return;
    try { const updated = { ...profile, ...data }; await setDoc(doc(db, "profiles", user.uid), updated, { merge: true }); setProfile(updated as UserProfile); setView('settings'); } catch (e) { console.error(e); }
  };
  const handleDeleteScan = async (scanId: string) => {
    if (!user) return; if (confirm("Permanently delete this meal record?")) { try { await deleteDoc(doc(db, "profiles", user.uid, "scans", scanId)); setScans(prev => prev.filter(s => s.id !== scanId)); setView('home'); setAnalysis(null); } catch (e) { alert("Failed to delete record."); } }
  };
  const getWeekDays = () => { const days = []; const today = new Date(); for (let i = 3; i >= -3; i--) { const d = new Date(); d.setDate(today.getDate() - i); days.push(d); } return days; };
  const currentCalTarget = useMemo(() => {
    if (!profile) return 2000;
    const s = profile.gender === Gender.FEMALE ? -161 : 5; const bmr = (10 * profile.weight) + (6.25 * profile.height) - (5 * profile.age) + s; const maintenance = Math.round(bmr * 1.375);
    if (profile.goal === Goal.LOSE_WEIGHT) return maintenance - 500; if (profile.goal === Goal.GAIN_WEIGHT) return maintenance + 500; return maintenance;
  }, [profile]);
  const currentDayFilteredScans = useMemo(() => { return scans.filter(s => new Date(s.timestamp).toDateString() === selectedDate); }, [scans, selectedDate]);
  const currentTotalCalories = useMemo(() => { return currentDayFilteredScans.reduce((acc, s) => acc + (s.calories || 0), 0); }, [currentDayFilteredScans]);
  const handleGenerateRoutine = async () => {
    if (!profile || !selectedLocation || selectedMuscleGroups.length === 0) return; setIsGeneratingRoutine(true); setView('workout_plan');
    try { const routine = await generateWorkoutRoutine(selectedLocation, selectedMuscleGroups, profile); setCurrentRoutine(routine); } catch (err) { console.error("Routine Generation Error:", err); alert("Failed to generate workout routine."); setView('workout_focus'); }
    finally { setIsGeneratingRoutine(false); }
  };
  const processImage = async (base64: string, clarification?: string) => {
    if (!user || !profile) return; if (!profile.isPremium && (profile.scansUsedToday || 0) >= MAX_FREE_SCANS_PER_DAY) { setShowPremium(true); return; }
    setIsAnalyzing(true); setView('analysis'); setClarificationQuestion(null);
    try {
      let optimizedBase64: string; try { optimizedBase64 = await resizeImage(base64); } catch (e) { optimizedBase64 = base64; }
      const base64Data = optimizedBase64.includes(',') ? optimizedBase64.split(',')[1] : optimizedBase64;
      const result = await analyzeFoodImage(base64Data, profile, clarification);
      if (result.needsClarification) { setClarificationQuestion(result.clarificationQuestion); setPendingImage(optimizedBase64); setIsAnalyzing(false); return; }
      const scanItem: Omit<ScanHistoryItem, 'id'> = { ...result, imageUrl: optimizedBase64, timestamp: new Date().toISOString() };
      const docRef = await addDoc(collection(db, "profiles", user.uid, "scans"), scanItem);
      const newScan = { id: docRef.id, ...scanItem } as ScanHistoryItem;
      await updateDoc(doc(db, "profiles", user.uid), { scansUsedToday: increment(1), points: increment(COINS_PER_SCAN) });
      setScans(prev => [newScan, ...prev]); setAnalysis(newScan);
      setProfile(prev => prev ? { ...prev, scansUsedToday: (prev.scansUsedToday || 0) + 1, points: (prev.points || 0) + COINS_PER_SCAN } : null);
    } catch (err) { console.error("Scanning Node Failure:", err); alert("The metabolic node encountered high latency. Please check your network."); setView('home'); }
    finally { setIsAnalyzing(false); }
  };
  const captureImage = () => { if (videoRef.current && canvasRef.current) { const context = canvasRef.current.getContext('2d'); if (context) { canvasRef.current.width = videoRef.current.videoWidth; canvasRef.current.height = videoRef.current.videoHeight; context.drawImage(videoRef.current, 0, 0); const base64 = canvasRef.current.toDataURL('image/jpeg', 0.8); processImage(base64); } } };
  const handleTransferCoins = async (targetCode: string, coins: number) => {
    if (!user || !profile) return; if (coins <= 0) return; if (coins > (profile.points || 0)) { alert("Insufficient coins."); return; }
    try {
      const q = query(collection(db, "profiles"), where("uniqueTransferCode", "==", targetCode)); const snap = await getDocs(q); if (snap.empty) { alert("Invalid transfer code."); return; }
      const targetUid = snap.docs[0].id; const targetUser = snap.docs[0].data();
      await runTransaction(db, async (tx) => { const sRef = doc(db, "profiles", user.uid); const rRef = doc(db, "profiles", targetUid); tx.update(sRef, { points: increment(-coins) }); tx.update(rRef, { points: increment(coins) }); const logRef = doc(collection(db, "transfers")); tx.set(logRef, { fromUid: user.uid, toUid: targetUid, fromName: profile.name, toName: targetUser.name || 'Anonymous', amount: coins, timestamp: Timestamp.now() }); });
      setProfile(prev => prev ? { ...prev, points: (prev.points || 0) - coins } : null); alert(`Transfer Approved: ${coins} coins secured.`);
    } catch (e) { alert("Network error. Transfer aborted."); }
  };
  if (loading) return <div className="min-h-screen bg-white flex items-center justify-center"><Loader2 className="animate-spin text-black/20" size={36}/></div>;
  if (!isAdmin && !user) return <Auth onAdminLogin={(status) => { setIsAdmin(status); if(status) { localStorage.setItem('drfoodie_admin', 'true'); setView('admin_dashboard'); } }} />;
  if (!isAdmin && user && profile && !profile.isOnboarded) return <Onboarding onComplete={p => saveProfile({ ...p, isOnboarded: true, referralCode: user.uid.substring(0,8).toUpperCase() })} />;
  return (
    <div className="max-w-md mx-auto min-h-screen bg-[#F2F2F7] text-black relative shadow-2xl flex flex-col font-sans overflow-hidden">
      <canvas ref={canvasRef} className="hidden" />
      <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={(e) => { const f = e.target.files?.[0]; if (f) { const r = new FileReader(); r.onload = () => processImage(r.result as string); r.readAsDataURL(f); } }} />
      <div className="flex-1 overflow-hidden h-full">
        {isAdmin ? ( <AdminPanel view={view} setView={setView} allUsers={allUsers} allPayments={allPayments} allTransfers={allTransfers} adminSearch={adminSearch} setAdminSearch={setAdminSearch} selectedAdminUser={selectedAdminUser} setSelectedAdminUser={setSelectedAdminUser} setIsAdmin={setIsAdmin} /> ) : (
          <div className="animate-fade-in px-0 h-full overflow-hidden">
            {view === 'home' && (
              <div className="pt-5 h-full overflow-y-auto no-scrollbar pb-32 px-5">
                <header className="flex justify-between items-center mb-6"><div className="flex items-center gap-2"><div className="w-8 h-8 bg-black rounded-lg flex items-center justify-center shadow-lg"><Lightning size={16} className="text-white fill-white"/></div><h1 className="text-xl font-black tracking-tighter">Dr Foodie</h1></div><div className="flex gap-2"><div className="bg-white px-3 py-1.5 rounded-full flex items-center gap-1.5 shadow-sm border border-gray-100"><Flame size={12} className="text-orange-500 fill-orange-500"/><span className="text-[10px] font-black">{profile?.currentStreak || 0}</span></div><button onClick={()=>setShowPremium(true)} className={`px-3 py-1.5 rounded-full text-[9px] font-black uppercase shadow-sm tracking-widest ${profile?.isPremium ? 'bg-black text-yellow-400' : 'bg-white text-black'}`}> {profile?.isPremium ? 'PRO' : `${MAX_FREE_SCANS_PER_DAY - (profile?.scansUsedToday || 0)} Free`} </button></div></header>
                <div className="flex justify-between mb-6 overflow-x-auto no-scrollbar py-2 gap-3"> {getWeekDays().map((d, i) => ( <button key={i} onClick={() => setSelectedDate(d.toDateString())} className={`flex flex-col items-center min-w-[52px] py-4 rounded-[22px] transition-all duration-300 ${d.toDateString() === selectedDate ? 'bg-black text-white shadow-xl scale-105' : 'bg-white text-gray-300 border border-gray-50'}`}> <span className="text-[9px] font-black uppercase mb-1">{d.toLocaleDateString('en-US',{weekday:'short'}).charAt(0)}</span> <span className="text-base font-black">{d.getDate()}</span> </button> ))} </div>
                <div className="bg-white p-8 rounded-[40px] shadow-card mb-6 flex items-center justify-between border border-gray-100"><div className="flex-1"><div className="flex items-baseline gap-1"><span className="text-5xl font-black tracking-tighter leading-none">{currentTotalCalories}</span><span className="text-base text-gray-300 font-bold">/{currentCalTarget}</span></div><div className="text-[8px] text-gray-400 font-black uppercase tracking-[0.3em] mt-3">ENERGY BUDGET</div></div><Activity className="text-black opacity-5" size={70} /></div>
                <div className="space-y-3"> {currentDayFilteredScans.length === 0 ? ( <div className="text-center py-16 text-gray-300 bg-white rounded-[40px] border-2 border-dashed border-gray-100 flex flex-col items-center gap-3 cursor-pointer hover:bg-gray-50 transition-all active:scale-[0.98]" onClick={startCamera}> <Camera size={36} className="opacity-10"/><p className="text-[9px] font-black uppercase tracking-[0.2em] opacity-40">Start New Scan</p> </div> ) : currentDayFilteredScans.map(s => ( <div key={s.id} onClick={()=>{setAnalysis(s); setView('analysis')}} className="bg-white p-4 rounded-[30px] flex gap-4 shadow-card items-center border border-gray-50 active:scale-95 transition-all"><img src={s.imageUrl} className="w-14 h-14 rounded-2xl object-cover shadow-sm" /><div className="flex-1 min-w-0"><div className="font-black text-sm tracking-tight truncate">{s.foodName}</div><div className="text-[9px] text-gray-400 font-black uppercase tracking-widest mt-1">{s.calories} kcal • {s.protein}g P</div></div><ChevronRight size={16} className="text-gray-200 flex-shrink-0"/></div> ))} </div>
              </div>
            )}
            {view === 'stats' && <StatsView scans={scans} currentCalTarget={currentCalTarget} profile={profile} onBack={() => setView('home')} />}
            {view === 'settings' && <SettingsSection profile={profile} onViewWallet={() => setView('wallet')} onViewRefer={() => setView('refer')} onUpdateProfile={() => setView('update_profile')} onShowPremium={() => setShowPremium(true)} onViewTeam={() => setView('team')} onLogout={() => signOut(auth)} onBack={() => setView('home')} />}
            {view === 'update_profile' && <Onboarding onComplete={saveProfile} initialData={profile} onBack={() => setView('settings')} />}
            {view === 'team' && <TeamSection onBack={() => setView('settings')} />}
            {view === 'wallet' && <WalletForm profile={profile} onTransfer={handleTransferCoins} onBack={() => setView('settings')} />}
            {view === 'refer' && <ReferralView profile={profile} onBack={() => setView('settings')} />}
            {view === 'workout_location' && <WorkoutLocationView onBack={() => setView('home')} onSelect={(loc) => { setSelectedLocation(loc); setView('workout_focus'); }} />}
            {view === 'workout_focus' && <WorkoutFocusView location={selectedLocation!} selectedGroups={selectedMuscleGroups} onToggle={(g)=>setSelectedMuscleGroups(prev=>prev.includes(g)?prev.filter(x=>x!==g):[...prev, g])} onGenerate={handleGenerateRoutine} onBack={() => setView('workout_location')} />}
            {view === 'workout_plan' && <WorkoutPlanView routine={currentRoutine} isGenerating={isGeneratingRoutine} onBack={() => setView('workout_focus')} />}
            {view === 'analysis' && <AnalysisDetailView analysis={analysis} isAnalyzing={isAnalyzing} onBack={() => setView('home')} onDelete={() => analysis && handleDeleteScan(analysis.id)} />}
          </div>
        )}
      </div>
      <nav className="fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur-2xl border-t border-gray-100 p-4 pb-8 flex justify-between items-center z-40 max-w-md mx-auto px-8 shadow-floating"><button onClick={()=>{setView(isAdmin ? 'admin_dashboard' : 'home')}} className={`transition-all duration-300 ${(view==='home' || view==='admin_dashboard')?'text-black scale-105':'text-black/20'}`}><Home size={22}/></button><button onClick={()=>{ if (isAdmin) setView('admin_payments'); else setView('workout_location'); }} className={`transition-all duration-300 ${(view.startsWith('workout') || view === 'admin_payments')?'text-black scale-105':'text-black/20'}`}>{isAdmin ? <DollarSign size={22}/> : <Dumbbell size={22}/>}</button><div className="relative -mt-12 flex justify-center z-50"><button onClick={()=>{ if (isAdmin) setView('admin_users'); else startCamera(); }} className="w-16 h-16 bg-black rounded-full flex items-center justify-center text-white border-[6px] border-[#F2F2F7] shadow-2xl active:scale-90 transition-all">{isAdmin ? <Users size={24}/> : <Plus size={32}/>}</button></div><button onClick={()=>{ if (!isAdmin) setView('stats'); }} disabled={isAdmin} className={`transition-all duration-300 ${(!isAdmin && view==='stats')?'text-black scale-105':'text-black/20'}`}>{!isAdmin && <BarChart2 size={22}/>}</button><button onClick={()=>setView('settings')} className={`transition-all duration-300 ${view==='settings' || view === 'team' || view === 'wallet' || view === 'refer' || view === 'update_profile' ?'text-black scale-105':'text-black/20'}`}><Settings size={22}/></button></nav>
      {clarificationQuestion && pendingImage && <ClarificationModal question={clarificationQuestion} onAnswer={(answer) => processImage(pendingImage, answer)} onApprox={() => processImage(pendingImage, "Take approximate value")} onCancel={() => { setClarificationQuestion(null); setPendingImage(null); setView('home'); }} />}
      <PremiumModal isOpen={showPremium} onClose={()=>setShowPremium(false)} onUpgrade={handleUpgradeToPremium} />
      {view === 'camera' && ( <div className="fixed inset-0 z-[100] bg-black animate-fade-in flex flex-col"><video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover" /><div className="absolute inset-0 flex flex-col justify-between p-8"><div className="flex justify-between pt-8"><button onClick={() => setView('home')} className="p-4 bg-white/10 backdrop-blur-lg rounded-full text-white active:scale-90 transition-all"><X size={28}/></button><button onClick={() => fileInputRef.current?.click()} className="p-4 bg-white/10 backdrop-blur-lg rounded-full text-white active:scale-90 transition-all"><Image size={28}/></button></div><div className="flex justify-center pb-16"><button onClick={captureImage} className="w-24 h-24 bg-white rounded-full border-[8px] border-white/20 flex items-center justify-center active:scale-90 transition-all shadow-2xl"><div className="w-16 h-16 bg-black rounded-full flex items-center justify-center text-white"><ScanLine size={30}/></div></button></div></div></div> )}
      <style>{` @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } } .animate-fade-in { animation: fadeIn 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards; } ::-webkit-scrollbar { display: none; } body { background-color: #F2F2F7; } .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; } .shadow-card { box-shadow: 0 4px 12px rgba(0,0,0,0.03); } .shadow-floating { box-shadow: 0 15px 30px rgba(0,0,0,0.08); } `}</style>
    </div>
  );
};

export default App;
