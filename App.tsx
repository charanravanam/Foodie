
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
  return new Promise((resolve) => {
    const img = new window.Image();
    img.src = base64Str;
    img.onload = () => {
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
      ctx?.drawImage(img, 0, 0, width, height);
      resolve(canvas.toDataURL('image/jpeg', 0.8));
    };
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
            <input 
              type="text" 
              placeholder="Unique Code (INR-XXXXXX)" 
              value={transferCode} 
              onChange={(e) => setTransferCode(e.target.value.toUpperCase())}
              className="w-full p-4 rounded-xl bg-gray-50 font-bold border-none outline-none focus:ring-1 focus:ring-black transition-all text-base"
            />
            <input 
              type="number" 
              placeholder="Amount (Coins)" 
              value={transferAmount} 
              onChange={(e) => setTransferAmount(e.target.value)}
              className="w-full p-4 rounded-xl bg-gray-50 font-bold border-none outline-none focus:ring-1 focus:ring-black transition-all text-base"
            />
            <button 
              onClick={async () => {
                setIsProcessingTransfer(true);
                try { await onTransfer(transferCode, parseInt(transferAmount) || 0); setTransferCode(''); setTransferAmount('100'); }
                finally { setIsProcessingTransfer(false); }
              }}
              disabled={isProcessingTransfer}
              className="w-full bg-black text-white py-4 rounded-[18px] font-black text-xs active:scale-95 transition-all disabled:opacity-50 shadow-lg"
            >
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
        <textarea 
          value={answer}
          onChange={(e) => setAnswer(e.target.value)}
          placeholder="Type your answer..."
          className="w-full p-5 bg-gray-50 rounded-[24px] font-bold border-none outline-none focus:ring-2 focus:ring-black transition-all h-28 resize-none text-sm"
        />
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
  
  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    alert("Copied to clipboard!");
  };

  return (
    <div className="pt-6 space-y-6 animate-fade-in pb-32 px-5 h-full overflow-y-auto no-scrollbar">
      <div className="flex items-center gap-3">
        <button onClick={onBack} className="p-3 bg-white rounded-2xl shadow-card active:scale-95 transition-all">
          <ArrowLeft size={18}/>
        </button>
        <h1 className="text-2xl font-black tracking-tight text-black">Network</h1>
      </div>

      <div className="bg-white p-8 rounded-[40px] shadow-card border border-gray-100 text-center space-y-6">
        <div className="w-20 h-20 bg-blue-50 rounded-[32px] flex items-center justify-center mx-auto shadow-inner">
          <Users className="text-blue-500" size={40} />
        </div>
        <div className="space-y-2">
          <h2 className="text-2xl font-black tracking-tighter">Grow the Network</h2>
          <p className="text-gray-400 text-xs font-bold leading-relaxed px-4">
            Onboard new nodes and earn <span className="text-black">100 coins</span> per referral. Secure an additional <span className="text-black">250 coins</span> when they upgrade to PRO.
          </p>
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
        <button onClick={onBack} className="p-3 bg-white rounded-2xl shadow-card active:scale-95 transition-all">
          <ArrowLeft size={18}/>
        </button>
        <h1 className="text-2xl font-black tracking-tight text-black">Protocol</h1>
      </div>

      <div className="space-y-4">
        <div className="text-center space-y-1">
          <h2 className="text-3xl font-black tracking-tighter">Select Environment</h2>
          <p className="text-gray-400 text-[10px] font-black uppercase tracking-widest">Deploy workout routine based on assets</p>
        </div>

        <div className="grid gap-4">
          <button onClick={() => onSelect(WorkoutLocation.HOME)} className="bg-white p-8 rounded-[40px] shadow-card border border-gray-100 flex flex-col items-center text-center space-y-4 active:scale-[0.98] transition-all hover:border-black">
             <div className="w-16 h-16 bg-blue-50 rounded-[24px] flex items-center justify-center">
                <Home className="text-blue-500" size={32} />
             </div>
             <div>
                <div className="text-xl font-black">Home Base</div>
                <div className="text-[10px] font-bold text-gray-400 uppercase mt-1">Bodyweight & Minimal Tools</div>
             </div>
          </button>

          <button onClick={() => onSelect(WorkoutLocation.GYM)} className="bg-white p-8 rounded-[40px] shadow-card border border-gray-100 flex flex-col items-center text-center space-y-4 active:scale-[0.98] transition-all hover:border-black">
             <div className="w-16 h-16 bg-purple-50 rounded-[24px] flex items-center justify-center">
                <Dumbbell className="text-purple-500" size={32} />
             </div>
             <div>
                <div className="text-xl font-black">Clinical Gym</div>
                <div className="text-[10px] font-bold text-gray-400 uppercase mt-1">Full Equipment & Machines</div>
             </div>
          </button>
        </div>
      </div>
    </div>
  );
};

const WorkoutFocusView: React.FC<{ 
  location: WorkoutLocation; 
  selectedGroups: MuscleGroup[]; 
  onToggle: (g: MuscleGroup) => void; 
  onGenerate: () => void; 
  onBack: () => void; 
}> = ({ location, selectedGroups, onToggle, onGenerate, onBack }) => {
  return (
    <div className="pt-6 space-y-8 animate-fade-in pb-32 px-5 h-full overflow-y-auto no-scrollbar">
      <div className="flex items-center gap-3">
        <button onClick={onBack} className="p-3 bg-white rounded-2xl shadow-card active:scale-95 transition-all">
          <ArrowLeft size={18}/>
        </button>
        <h1 className="text-2xl font-black tracking-tight text-black">Focus</h1>
      </div>

      <div className="space-y-6">
        <div className="text-center space-y-1">
          <h2 className="text-3xl font-black tracking-tighter">Target Nodes</h2>
          <p className="text-gray-400 text-[10px] font-black uppercase tracking-widest">Select muscle groups for optimization</p>
        </div>

        <div className="grid grid-cols-2 gap-3">
          {Object.values(MuscleGroup).map((g) => (
            <button key={g} onClick={() => onToggle(g)} className={`p-5 rounded-[28px] font-black text-xs transition-all border ${selectedGroups.includes(g) ? 'bg-black text-white border-black shadow-xl scale-[1.02]' : 'bg-white text-gray-400 border-gray-100 shadow-sm'}`}>
              {g}
            </button>
          ))}
        </div>

        <button onClick={onGenerate} disabled={selectedGroups.length === 0} className="w-full bg-black text-white py-5 rounded-[24px] font-black text-sm shadow-2xl active:scale-95 transition-all flex items-center justify-center gap-3 disabled:opacity-40 mt-4">
          <Zap size={18} className="fill-white"/> INITIALIZE GENERATION
        </button>
      </div>
    </div>
  );
};

const WorkoutPlanView: React.FC<{ routine: Exercise[]; isGenerating: boolean; onBack: () => void }> = ({ routine, isGenerating, onBack }) => {
  if (isGenerating) {
    return (
      <div className="h-full flex flex-col items-center justify-center p-10 space-y-6 text-center animate-pulse">
        <div className="w-20 h-20 bg-black rounded-[32px] flex items-center justify-center shadow-2xl">
          <Loader2 className="animate-spin text-white" size={40} />
        </div>
        <div className="space-y-2">
          <h2 className="text-2xl font-black tracking-tight uppercase">Computing Routine</h2>
          <p className="text-gray-400 text-[10px] font-black uppercase tracking-[0.3em]">Mapping Metabolic Response...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="pt-6 space-y-6 animate-fade-in pb-32 px-5 h-full overflow-y-auto no-scrollbar">
      <div className="flex items-center gap-3">
        <button onClick={onBack} className="p-3 bg-white rounded-2xl shadow-card active:scale-95 transition-all">
          <ArrowLeft size={18}/>
        </button>
        <h1 className="text-2xl font-black tracking-tight text-black">Routine</h1>
      </div>

      <div className="space-y-4">
        {routine.map((ex, i) => (
          <div key={i} className="bg-white p-6 rounded-[36px] shadow-card border border-gray-100 space-y-4 group">
            <div className="flex justify-between items-start">
               <div className="bg-black text-white px-3 py-1 rounded-full text-[8px] font-black tracking-widest">STEP 0{i+1}</div>
               <div className="flex items-center gap-1.5 bg-gray-50 px-3 py-1 rounded-full border border-gray-100">
                  <Flame size={10} className="text-orange-500 fill-orange-500"/>
                  <span className="text-[10px] font-black">{ex.sets} × {ex.reps}</span>
               </div>
            </div>
            <div>
              <h3 className="text-xl font-black tracking-tight">{ex.name}</h3>
              <p className="text-gray-500 text-xs font-medium leading-relaxed mt-2">{ex.description}</p>
            </div>
            <div className="flex flex-wrap gap-1.5 pt-2">
               {ex.muscleGroups.map((mg, j) => (
                 <span key={j} className="text-[7px] font-black uppercase tracking-widest bg-gray-50 text-gray-400 px-2 py-1 rounded-md border border-gray-100">{mg}</span>
               ))}
            </div>
          </div>
        ))}
      </div>

      <div className="bg-black text-white p-8 rounded-[40px] text-center space-y-3 shadow-2xl mt-4">
         <CheckCircle2 size={32} className="mx-auto text-green-400" />
         <h4 className="text-xl font-black tracking-tight">Sequence Ready</h4>
         <p className="text-gray-500 text-[9px] font-bold uppercase tracking-widest px-4">Follow the protocol exactly for peak performance</p>
      </div>
    </div>
  );
};

const AnalysisDetailView: React.FC<{ analysis: ScanHistoryItem | null; isAnalyzing: boolean; onBack: () => void; onDelete: () => void }> = ({ analysis, isAnalyzing, onBack, onDelete }) => {
  if (isAnalyzing) {
    return (
      <div className="h-full flex flex-col items-center justify-center p-10 space-y-6 text-center">
        <div className="w-24 h-24 bg-black rounded-[40px] flex items-center justify-center shadow-2xl relative">
          <div className="absolute inset-0 bg-white/20 rounded-[40px] animate-ping" />
          <ScanLine className="text-white animate-bounce" size={40} />
        </div>
        <div className="space-y-2">
          <h2 className="text-2xl font-black tracking-tight">Dr Foodie Analyzing</h2>
          <p className="text-gray-400 text-[10px] font-black uppercase tracking-[0.3em]">Extracting Metabolic Data...</p>
        </div>
      </div>
    );
  }

  if (!analysis) return null;

  return (
    <div className="h-full flex flex-col animate-fade-in overflow-hidden">
      <div className="relative h-2/5 shrink-0">
        <img src={analysis.imageUrl} className="w-full h-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/20" />
        <button onClick={onBack} className="absolute top-8 left-6 p-4 bg-black/20 backdrop-blur-md rounded-2xl text-white active:scale-95 transition-all"><ArrowLeft size={20}/></button>
        <button onClick={onDelete} className="absolute top-8 right-6 p-4 bg-red-500/20 backdrop-blur-md rounded-2xl text-red-400 active:scale-95 transition-all"><Trash2 size={20}/></button>
        <div className="absolute bottom-8 left-8 right-8">
           <div className="text-[10px] font-black text-white/50 uppercase tracking-[0.4em] mb-2">{analysis.mealType} • {new Date(analysis.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
           <h1 className="text-4xl font-black text-white tracking-tighter">{analysis.foodName}</h1>
        </div>
      </div>

      <div className="bg-[#F2F2F7] -mt-6 rounded-t-[40px] flex-1 overflow-y-auto no-scrollbar p-8 space-y-6 pb-40 relative z-10 shadow-[0_-10px_30px_rgba(0,0,0,0.1)]">
        <div className="grid grid-cols-4 gap-3">
          {[
            { label: 'Energy', val: analysis.calories, unit: 'kcal', icon: <Flame size={12}/> },
            { label: 'Protein', val: analysis.protein, unit: 'g', icon: <Activity size={12}/> },
            { label: 'Carbs', val: analysis.carbs, unit: 'g', icon: <Target size={12}/> },
            { label: 'Fat', val: analysis.fat, unit: 'g', icon: <Heart size={12}/> },
          ].map((stat, i) => (
            <div key={i} className="bg-white p-4 rounded-[24px] text-center border border-gray-50 shadow-sm">
               <div className="flex justify-center mb-1 text-black/10">{stat.icon}</div>
               <div className="text-base font-black tracking-tighter leading-none">{stat.val}</div>
               <div className="text-[7px] font-black text-gray-300 uppercase tracking-widest mt-1">{stat.unit}</div>
            </div>
          ))}
        </div>

        <div className="bg-white p-6 rounded-[32px] border border-gray-100 shadow-sm">
           <div className="flex justify-between items-center mb-4">
              <h3 className="text-[9px] font-black uppercase text-gray-400 tracking-widest px-1">Dr Foodie Insights</h3>
              <div className="bg-black text-white px-3 py-1 rounded-full text-[8px] font-black uppercase tracking-widest">SCORE: {analysis.healthScore}/10</div>
           </div>
           <p className="text-sm font-bold text-gray-700 leading-relaxed italic border-l-4 border-black pl-4">"{analysis.microAnalysis}"</p>
        </div>

        <div className="space-y-3">
           <h3 className="text-[9px] font-black uppercase text-gray-400 tracking-widest px-1">Metabolic Alternatives</h3>
           <div className="grid grid-cols-1 gap-2">
             {analysis.alternatives.map((alt, i) => (
               <div key={i} className="bg-white/50 border border-gray-100 p-4 rounded-2xl flex items-center justify-between group hover:bg-white hover:shadow-sm transition-all">
                 <span className="text-xs font-black text-gray-600">{alt}</span>
                 <Sparkle size={14} className="text-yellow-500 opacity-20 group-hover:opacity-100 transition-opacity" />
               </div>
             ))}
           </div>
        </div>
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
      // Listening to payments log (Upgrade events)
      const unsubPayments = onSnapshot(query(collection(db, "payments"), orderBy("timestamp", "desc")), (snapshot) => {
        const list: any[] = [];
        snapshot.forEach(doc => list.push({ id: doc.id, ...doc.data() }));
        setAllPayments(list);
      });
      const unsubTransfers = onSnapshot(query(collection(db, "transfers"), orderBy("timestamp", "desc")), (snapshot) => {
        const list: any[] = [];
        snapshot.forEach(doc => list.push({ id: doc.id, ...doc.data() }));
        setAllTransfers(list);
      });
      return () => { unsubUsers(); unsubPayments(); unsubTransfers(); };
    }
  }, [isAdmin]);

  const fetchProfile = async (u: FirebaseUser) => {
    try {
      const docSnap = await getDoc(doc(db, "profiles", u.uid));
      if (docSnap.exists()) {
        let pData = docSnap.data() as UserProfile;
        
        if (pData.isDisabled) {
          alert("This account has been disabled by the system administrator.");
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
        
        // Log payment
        const payRef = doc(collection(db, "payments"));
        tx.set(payRef, {
           uid: user.uid,
           userName: profile.name,
           amount: 49,
           timestamp: Timestamp.now()
        });

        if (profile.referredBy) {
          const refQuery = query(collection(db, "profiles"), where("referralCode", "==", profile.referredBy));
          const refSnap = await getDocs(refQuery);
          if (!refSnap.empty) {
            const referrerUid = refSnap.docs[0].id;
            const referrerRef = doc(db, "profiles", referrerUid);
            tx.update(referrerRef, { points: increment(PREMIUM_REFERRAL_COINS) });
          }
        }
      });
      setProfile(prev => prev ? { ...prev, isPremium: true } : null);
      setShowPremium(false);
      alert("Welcome to Pro Access!");
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
      setView('settings');
    } catch (e) { console.error(e); }
  };

  const handleDeleteScan = async (scanId: string) => {
    if (!user) return;
    if (confirm("Permanently delete this meal record?")) {
      try {
        await deleteDoc(doc(db, "profiles", user.uid, "scans", scanId));
        setScans(prev => prev.filter(s => s.id !== scanId));
        setView('home');
        setAnalysis(null);
      } catch (e) { alert("Failed to delete record."); }
    }
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

  const handleGenerateRoutine = async () => {
    if (!profile || !selectedLocation || selectedMuscleGroups.length === 0) return;
    setIsGeneratingRoutine(true);
    setView('workout_plan');
    try {
      const routine = await generateWorkoutRoutine(selectedLocation, selectedMuscleGroups, profile);
      setCurrentRoutine(routine);
    } catch (err) {
      console.error("Routine Generation Error:", err);
      alert("Failed to generate workout routine.");
      setView('workout_focus');
    } finally {
      setIsGeneratingRoutine(false);
    }
  };

  const processImage = async (base64: string, clarification?: string) => {
    if (!user || !profile) return;
    if (!profile.isPremium && (profile.scansUsedToday || 0) >= MAX_FREE_SCANS_PER_DAY) {
      setShowPremium(true);
      return;
    }
    setIsAnalyzing(true);
    setView('analysis');
    setClarificationQuestion(null);
    try {
      const optimizedBase64 = await resizeImage(base64);
      const base64Data = optimizedBase64.includes(',') ? optimizedBase64.split(',')[1] : optimizedBase64;
      const result = await analyzeFoodImage(base64Data, profile, clarification);
      
      if (result.needsClarification) {
        setClarificationQuestion(result.clarificationQuestion);
        setPendingImage(optimizedBase64);
        setIsAnalyzing(false);
        return;
      }

      const scanItem: Omit<ScanHistoryItem, 'id'> = {
        ...result,
        imageUrl: optimizedBase64,
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
      const targetUid = snap.docs[0].id;
      const targetUser = snap.docs[0].data();
      
      await runTransaction(db, async (tx) => {
        const sRef = doc(db, "profiles", user.uid);
        const rRef = doc(db, "profiles", targetUid);
        tx.update(sRef, { points: increment(-coins) });
        tx.update(rRef, { points: increment(coins) });
        
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
      alert(`Transfer Approved: ${coins} coins secured.`);
    } catch (e) { alert("Network error. Transfer aborted."); }
  };

  if (loading) return <div className="min-h-screen bg-white flex items-center justify-center"><Loader2 className="animate-spin text-black/20" size={36}/></div>;
  if (!isAdmin && !user) return <Auth onAdminLogin={(status) => { setIsAdmin(status); if(status) { localStorage.setItem('drfoodie_admin', 'true'); setView('admin_dashboard'); } }} />;
  if (!isAdmin && user && profile && !profile.isOnboarded) return <Onboarding onComplete={p => saveProfile({ ...p, isOnboarded: true, referralCode: user.uid.substring(0,8).toUpperCase() })} />;

  return (
    <div className="max-w-md mx-auto min-h-screen bg-[#F2F2F7] text-black relative shadow-2xl flex flex-col font-sans overflow-hidden">
      <canvas ref={canvasRef} className="hidden" />
      <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={async (e) => {
        const f = e.target.files?.[0]; if (f) { const r = new FileReader(); r.onload = () => processImage(r.result as string); r.readAsDataURL(f); }
      }} />

      <div className="flex-1 overflow-hidden h-full">
        {isAdmin ? (
          <AdminPanel 
            view={view} 
            setView={setView} 
            allUsers={allUsers} 
            allPayments={allPayments} 
            allTransfers={allTransfers} 
            adminSearch={adminSearch} 
            setAdminSearch={setAdminSearch}
            selectedAdminUser={selectedAdminUser}
            setSelectedAdminUser={setSelectedAdminUser}
            setIsAdmin={setIsAdmin}
          />
        ) : (
          <div className="animate-fade-in px-0 h-full overflow-hidden">
            {view === 'home' && (
              <div className="pt-5 h-full overflow-y-auto no-scrollbar pb-32 px-5">
                <header className="flex justify-between items-center mb-6">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 bg-black rounded-lg flex items-center justify-center shadow-lg">
                      <Lightning size={16} className="text-white fill-white"/>
                    </div>
                    <h1 className="text-xl font-black tracking-tighter">Dr Foodie</h1>
                  </div>
                  <div className="flex gap-2">
                    <div className="bg-white px-3 py-1.5 rounded-full flex items-center gap-1.5 shadow-sm border border-gray-100">
                      <Flame size={12} className="text-orange-500 fill-orange-500"/>
                      <span className="text-[10px] font-black">{profile?.currentStreak || 0}</span>
                    </div>
                    <button onClick={()=>setShowPremium(true)} className={`px-3 py-1.5 rounded-full text-[9px] font-black uppercase shadow-sm tracking-widest ${profile?.isPremium ? 'bg-black text-yellow-400' : 'bg-white text-black'}`}>
                      {profile?.isPremium ? 'PRO' : `${MAX_FREE_SCANS_PER_DAY - (profile?.scansUsedToday || 0)} Free`}
                    </button>
                  </div>
                </header>
                
                <div className="flex justify-between mb-6 overflow-x-auto no-scrollbar py-2 gap-3">
                  {getWeekDays().map((d, i) => (
                    <button key={i} onClick={() => setSelectedDate(d.toDateString())} className={`flex flex-col items-center min-w-[52px] py-4 rounded-[22px] transition-all duration-300 ${d.toDateString() === selectedDate ? 'bg-black text-white shadow-xl scale-105' : 'bg-white text-gray-300 border border-gray-50'}`}>
                      <span className="text-[9px] font-black uppercase mb-1">{d.toLocaleDateString('en-US',{weekday:'short'}).charAt(0)}</span>
                      <span className="text-base font-black">{d.getDate()}</span>
                    </button>
                  ))}
                </div>

                <div className="bg-white p-8 rounded-[40px] shadow-card mb-6 flex items-center justify-between border border-gray-100">
                  <div className="flex-1">
                    <div className="flex items-baseline gap-1"><span className="text-5xl font-black tracking-tighter leading-none">{currentTotalCalories}</span><span className="text-base text-gray-300 font-bold">/{currentCalTarget}</span></div>
                    <div className="text-[8px] text-gray-400 font-black uppercase tracking-[0.3em] mt-3">ENERGY BUDGET</div>
                  </div>
                  <Activity className="text-black opacity-5" size={70} />
                </div>

                <div className="space-y-3">
                  {currentDayFilteredScans.length === 0 ? (
                    <div className="text-center py-16 text-gray-300 bg-white rounded-[40px] border-2 border-dashed border-gray-100 flex flex-col items-center gap-3 cursor-pointer hover:bg-gray-50 transition-all active:scale-[0.98]" onClick={startCamera}>
                      <Camera size={36} className="opacity-10"/><p className="text-[9px] font-black uppercase tracking-[0.2em] opacity-40">Start New Scan</p>
                    </div>
                  ) : currentDayFilteredScans.map(s => (
                    <div key={s.id} onClick={()=>{setAnalysis(s); setView('analysis')}} className="bg-white p-4 rounded-[30px] flex gap-4 shadow-card items-center border border-gray-50 active:scale-95 transition-all">
                      <img src={s.imageUrl} className="w-14 h-14 rounded-2xl object-cover shadow-sm" />
                      <div className="flex-1 min-w-0">
                        <div className="font-black text-sm tracking-tight truncate">{s.foodName}</div>
                        <div className="text-[9px] text-gray-400 font-black uppercase tracking-widest mt-1">{s.calories} kcal • {s.protein}g P</div>
                      </div>
                      <ChevronRight size={16} className="text-gray-200 flex-shrink-0"/>
                    </div>
                  ))}
                </div>
              </div>
            )}
            {view === 'stats' && <StatsView scans={scans} currentCalTarget={currentCalTarget} profile={profile} onBack={() => setView('home')} />}
            {view === 'settings' && (
              <SettingsSection 
                profile={profile} 
                onViewWallet={() => setView('wallet')} 
                onViewRefer={() => setView('refer')} 
                onUpdateProfile={() => setView('update_profile')}
                onShowPremium={() => setShowPremium(true)}
                onViewTeam={() => setView('team')}
                onLogout={() => signOut(auth)}
                onBack={() => setView('home')}
              />
            )}
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

      <nav className="fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur-2xl border-t border-gray-100 p-4 pb-8 flex justify-between items-center z-40 max-w-md mx-auto px-8 shadow-floating">
        <button onClick={()=>{setView(isAdmin ? 'admin_dashboard' : 'home')}} className={`transition-all duration-300 ${(view==='home' || view==='admin_dashboard')?'text-black scale-105':'text-black/20'}`}><Home size={22}/></button>
        <button onClick={()=>{ if (isAdmin) setView('admin_payments'); else setView('workout_location'); }} className={`transition-all duration-300 ${(view.startsWith('workout') || view === 'admin_payments')?'text-black scale-105':'text-black/20'}`}>{isAdmin ? <DollarSign size={22}/> : <Dumbbell size={22}/>}</button>
        <div className="relative -mt-12 flex justify-center z-50">
          <button onClick={()=>{ if (isAdmin) setView('admin_users'); else startCamera(); }} className="w-16 h-16 bg-black rounded-full flex items-center justify-center text-white border-[6px] border-[#F2F2F7] shadow-2xl active:scale-90 transition-all">{isAdmin ? <Users size={24}/> : <Plus size={32}/>}</button>
        </div>
        <button onClick={()=>{ if (!isAdmin) setView('stats'); }} disabled={isAdmin} className={`transition-all duration-300 ${(!isAdmin && view==='stats')?'text-black scale-105':'text-black/20'}`}>{!isAdmin && <BarChart2 size={22}/>}</button>
        <button onClick={()=>setView('settings')} className={`transition-all duration-300 ${view==='settings' || view === 'team' || view === 'wallet' || view === 'refer' || view === 'update_profile' ?'text-black scale-105':'text-black/20'}`}><Settings size={22}/></button>
      </nav>

      {clarificationQuestion && pendingImage && (
        <ClarificationModal 
          question={clarificationQuestion} 
          onAnswer={(answer) => processImage(pendingImage, answer)} 
          onApprox={() => processImage(pendingImage, "Take approximate value")}
          onCancel={() => { setClarificationQuestion(null); setPendingImage(null); setView('home'); }}
        />
      )}

      <PremiumModal isOpen={showPremium} onClose={()=>setShowPremium(false)} onUpgrade={handleUpgradeToPremium} />

      {view === 'camera' && (
          <div className="fixed inset-0 z-[100] bg-black animate-fade-in flex flex-col">
            <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover" />
            <div className="absolute inset-0 flex flex-col justify-between p-8">
              <div className="flex justify-between pt-8">
                <button onClick={() => setView('home')} className="p-4 bg-white/10 backdrop-blur-lg rounded-full text-white active:scale-90 transition-all"><X size={28}/></button>
                <button onClick={() => fileInputRef.current?.click()} className="p-4 bg-white/10 backdrop-blur-lg rounded-full text-white active:scale-90 transition-all"><Image size={28}/></button>
              </div>
              <div className="flex justify-center pb-16">
                <button onClick={captureImage} className="w-24 h-24 bg-white rounded-full border-[8px] border-white/20 flex items-center justify-center active:scale-90 transition-all shadow-2xl"><div className="w-16 h-16 bg-black rounded-full flex items-center justify-center text-white"><ScanLine size={30}/></div></button>
              </div>
            </div>
          </div>
      )}

      <style>{`
        @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
        .animate-fade-in { animation: fadeIn 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
        ::-webkit-scrollbar { display: none; }
        body { background-color: #F2F2F7; }
        .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
        .shadow-card { box-shadow: 0 4px 12px rgba(0,0,0,0.03); }
        .shadow-floating { box-shadow: 0 15px 30px rgba(0,0,0,0.08); }
        .luxury-shimmer {
          background: linear-gradient(90deg, transparent, rgba(255,255,255,0.05), transparent);
          background-size: 200% 100%;
          animation: shimmer 3s infinite linear;
        }
        @keyframes shimmer { from { background-position: -200% 0; } to { background-position: 200% 0; } }
      `}</style>
    </div>
  );
};

const SettingsSection: React.FC<{
  profile: UserProfile | null;
  onViewWallet: () => void;
  onViewRefer: () => void;
  onUpdateProfile: () => void;
  onShowPremium: () => void;
  onViewTeam: () => void;
  onLogout: () => void;
  onBack: () => void;
}> = ({ profile, onViewWallet, onViewRefer, onUpdateProfile, onShowPremium, onViewTeam, onLogout, onBack }) => (
  <div className="pt-6 space-y-6 h-full overflow-y-auto no-scrollbar pb-32 px-4">
    <div className="flex items-center gap-3">
      <button onClick={onBack} className="p-3 bg-white rounded-2xl shadow-card active:scale-95 transition-all">
        <ArrowLeft size={18}/>
      </button>
      <div>
        <h1 className="text-2xl font-black tracking-tight text-black">Settings</h1>
        <p className="text-[8px] font-black uppercase text-gray-400 tracking-[0.3em]">NODE PROFILE</p>
      </div>
    </div>

    <div className="bg-white p-5 rounded-[36px] shadow-card border border-gray-100 flex items-center gap-4">
      <div className="w-14 h-14 bg-black text-white rounded-2xl flex items-center justify-center font-black text-2xl shadow-xl relative flex-shrink-0">
        {profile?.name?.charAt(0)}
        {profile?.isPremium && (
          <div className="absolute -top-1.5 -right-1.5 w-6 h-6 bg-yellow-400 rounded-full flex items-center justify-center border-2 border-white">
            <Crown size={10} className="text-black fill-black" />
          </div>
        )}
      </div>
      <div className="min-w-0">
        <div className="text-lg font-black tracking-tight text-black truncate">{profile?.name}</div>
        <div className="text-[8px] font-black uppercase text-gray-400 tracking-widest mt-0.5">
          {profile?.isPremium ? 'Pro Status' : 'Basic Account'}
        </div>
      </div>
    </div>

    <div className="space-y-2">
      <div className="bg-white rounded-[28px] shadow-card border border-gray-100 overflow-hidden">
        <div className="p-2 px-6 pt-4 text-[8px] font-black text-gray-300 uppercase tracking-widest">ASSETS</div>
        <div className="divide-y divide-gray-50">
          <SettingItem icon={<Gem size={16} className="text-yellow-500"/>} title="My Vault" value={formatCoins(profile?.points || 0)} onClick={onViewWallet} />
          <SettingItem icon={<Gift size={16} className="text-blue-500"/>} title="Refer & Earn" onClick={onViewRefer} />
        </div>
      </div>

      <div className="bg-white rounded-[28px] shadow-card border border-gray-100 overflow-hidden">
        <div className="p-2 px-6 pt-4 text-[8px] font-black text-gray-300 uppercase tracking-widest">CONFIG</div>
        <div className="divide-y divide-gray-50">
          <SettingItem icon={<UserIcon size={16} className="text-purple-500"/>} title="Update Profile" onClick={onUpdateProfile} />
          <SettingItem icon={<Crown size={16} className="text-yellow-400"/>} title="Premium Access" highlight onClick={onShowPremium} />
          <SettingItem icon={<Users size={16} className="text-orange-500"/>} title="The Core Team" onClick={onViewTeam} />
        </div>
      </div>

      <div className="bg-white rounded-[28px] shadow-card border border-gray-100 overflow-hidden">
        <div className="p-2 px-6 pt-4 text-[8px] font-black text-gray-300 uppercase tracking-widest">SYSTEM</div>
        <div className="divide-y divide-gray-50">
          <SettingItem icon={<Shield size={16} className="text-green-500"/>} title="Security & Privacy" />
          <SettingItem icon={<HelpCircle size={16} className="text-gray-400"/>} title="Help Center" />
        </div>
      </div>

      <button onClick={onLogout} className="w-full p-5 text-red-500 bg-white rounded-[28px] shadow-card flex items-center justify-center gap-2 font-black text-sm active:scale-95 transition-all border border-red-50 mt-1">
        <LogOut size={16}/> Logout Terminal
      </button>
    </div>
  </div>
);

const SettingItem: React.FC<{ icon: React.ReactNode; title: string; value?: string; onClick?: () => void; highlight?: boolean }> = ({ icon, title, value, onClick, highlight }) => (
  <button onClick={onClick} className={`w-full p-3.5 px-6 flex items-center justify-between transition-all active:bg-gray-50 ${highlight ? 'bg-black/5' : ''}`}>
    <div className="flex items-center gap-3">
      <div className="w-9 h-9 bg-gray-50 rounded-xl flex items-center justify-center">
        {icon}
      </div>
      <div className="text-left">
        <div className={`font-black text-sm tracking-tight ${highlight ? 'text-black' : 'text-gray-700'}`}>{title}</div>
        {value && <div className="text-[8px] font-black text-gray-400 uppercase tracking-widest">{value}</div>}
      </div>
    </div>
    <ChevronRight size={12} className="text-gray-200"/>
  </button>
);

const StatsView: React.FC<{ scans: ScanHistoryItem[]; currentCalTarget: number; profile: UserProfile | null; onBack: () => void }> = ({ scans, currentCalTarget, profile, onBack }) => {
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

  const bmiData = useMemo(() => {
    if (!profile || !profile.weight || !profile.height) return null;
    const hM = profile.height / 100;
    const bmi = profile.weight / (hM * hM);
    let cat = "Normal";
    let col = "text-green-500";
    if (bmi < 18.5) { cat = "Underweight"; col = "text-blue-500"; }
    else if (bmi >= 25 && bmi < 30) { cat = "Overweight"; col = "text-orange-500"; }
    else if (bmi >= 30) { cat = "Obese"; col = "text-red-500"; }
    return { bmi: bmi.toFixed(1), category: cat, color: col };
  }, [profile]);

  return (
    <div className="pt-6 space-y-6 animate-fade-in pb-32 px-4 h-full overflow-y-auto no-scrollbar">
      <div className="flex items-center gap-3 px-2">
        <button onClick={onBack} className="p-3 bg-white rounded-2xl shadow-card active:scale-95 transition-all">
          <ArrowLeft size={18}/>
        </button>
        <h1 className="text-2xl font-black tracking-tighter">Growth Matrix</h1>
      </div>

      {bmiData && (
        <div className="bg-white p-8 rounded-[40px] shadow-card border border-gray-100 flex items-center justify-between overflow-hidden relative group">
           <div className="absolute top-0 left-0 w-1.5 h-full bg-black group-hover:w-3 transition-all duration-500" />
           <div className="space-y-0.5 relative z-10">
              <div className="text-[8px] font-black text-gray-400 uppercase tracking-widest px-1">BODY MASS INDEX</div>
              <div className="text-5xl font-black tracking-tighter">{bmiData.bmi}</div>
              <div className={`text-[10px] font-black uppercase tracking-[0.2em] ${bmiData.color} px-1`}>{bmiData.category}</div>
           </div>
           <Activity className="text-black opacity-5 group-hover:scale-110 transition-transform duration-500" size={80} />
        </div>
      )}

      <div className="bg-white p-6 rounded-[40px] shadow-card border border-gray-100 space-y-6 relative overflow-hidden">
         <div className="flex justify-between items-center relative z-10">
            <h3 className="text-[9px] font-black uppercase text-gray-400 tracking-[0.2em] flex items-center gap-1.5 px-1">
              <Trophy size={12} className="text-yellow-500"/> STREAK MILESTONES
            </h3>
            <div className="bg-black text-white px-3 py-1 rounded-full text-[8px] font-black uppercase tracking-widest">
              {profile?.currentStreak || 0} DAYS ACTIVE
            </div>
         </div>
         
         <div className="space-y-3 relative z-10">
            {[
               { days: 30, amount: '200', reached: (profile?.currentStreak || 0) >= 30, grad: "from-blue-600 to-blue-800", text: "Bronze Milestone" },
               { days: 60, amount: '500', reached: (profile?.currentStreak || 0) >= 60, grad: "from-indigo-600 to-indigo-800", text: "Silver Milestone" },
               { days: 90, amount: '999', reached: (profile?.currentStreak || 0) >= 90, grad: "from-amber-400 to-yellow-600", text: "Elite Gold Milestone" },
            ].map((m, i) => {
               const prog = Math.min(100, ((profile?.currentStreak || 0) / m.days) * 100);
               return (
                 <div key={i} className={`p-5 rounded-[30px] flex items-center justify-between border transition-all relative overflow-hidden group ${m.reached ? 'border-transparent shadow-xl' : 'border-gray-50 bg-gray-50/30'}`}>
                    {m.reached && <div className={`absolute inset-0 bg-gradient-to-r ${m.grad} opacity-90`} />}
                    <div className="flex items-center gap-4 relative z-10">
                       <div className={`w-11 h-11 rounded-xl flex items-center justify-center backdrop-blur-md ${m.reached ? 'bg-white/20 text-white shadow-lg' : 'bg-white text-gray-300 shadow-sm border border-gray-100'}`}>
                          {m.reached ? <CheckCircle2 size={18} strokeWidth={3} /> : <Lock size={16}/>}
                       </div>
                       <div>
                          <div className={`font-black text-base tracking-tight ${m.reached ? 'text-white' : 'text-gray-800'}`}>{m.days} Days</div>
                          <div className={`text-[8px] font-bold uppercase tracking-widest ${m.reached ? 'text-white/70' : 'text-gray-400'}`}>{m.text}</div>
                       </div>
                    </div>
                    <div className="text-right relative z-10">
                      <div className={`text-xl font-black ${m.reached ? 'text-white' : 'text-gray-600'}`}>₹{m.amount}</div>
                      {!m.reached && (
                        <div className="w-16 h-1 bg-gray-200 rounded-full mt-1.5 overflow-hidden">
                          <div className="h-full bg-black/10" style={{ width: `${prog}%` }} />
                        </div>
                      )}
                      <div className={`text-[7px] font-black uppercase tracking-widest mt-1 ${m.reached ? 'text-white/80' : 'text-gray-300'}`}>
                        {m.reached ? 'SECURED' : `${m.days - (profile?.currentStreak || 0)} Days Left`}
                      </div>
                    </div>
                 </div>
               );
            })}
         </div>
         <p className="text-[7px] text-gray-400 font-bold uppercase tracking-widest text-center px-4">Rewards are credited to your vault automatically upon milestone completion.</p>
      </div>

      <div className="bg-white p-8 rounded-[40px] shadow-card border border-gray-100">
        <div className="flex items-center gap-2 mb-6">
          <TrendingUp size={16} className="text-black"/>
          <h3 className="text-[9px] font-black uppercase text-gray-400 tracking-[0.2em]">ENERGY TREND</h3>
        </div>
        <div className="flex items-end justify-between h-40 gap-2">
          {last7Days.map((d, i) => {
            const h = Math.min(100, (d.total / (currentCalTarget * 1.2)) * 100);
            return (
              <div key={i} className="flex-1 flex flex-col items-center gap-3 h-full">
                <div className="w-full bg-gray-50 rounded-xl relative flex-1 flex items-end overflow-hidden">
                  <div className={`w-full transition-all duration-700 rounded-t-lg ${d.total > currentCalTarget ? 'bg-red-400' : 'bg-black'}`} style={{ height: `${Math.max(5, h)}%` }} />
                </div>
                <span className="text-[8px] font-black text-gray-300 uppercase">{d.date.charAt(0)}</span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

const TeamSection: React.FC<{ onBack: () => void }> = ({ onBack }) => {
  return (
    <div className="pt-6 h-full overflow-y-auto no-scrollbar pb-32 px-5">
      <div className="flex items-center gap-3 mb-8">
        <button onClick={onBack} className="p-3 bg-white rounded-2xl shadow-card active:scale-95 transition-all"><ArrowLeft size={18}/></button>
        <h1 className="text-2xl font-black tracking-tight text-black">Core Team</h1>
      </div>
      <div className="space-y-6">
        <div className="bg-black rounded-[40px] p-10 relative overflow-hidden shadow-2xl min-h-[180px] flex flex-col justify-end group">
          <div className="absolute top-6 right-6 opacity-10 transform group-hover:rotate-12 transition-transform duration-700">
             <Crown size={100} className="text-white" />
          </div>
          <div className="relative z-10">
            <div className="text-[8px] font-black text-gray-500 uppercase tracking-[0.5em] mb-3">SYSTEM ARCHITECT</div>
            <h2 className="text-3xl font-black text-white tracking-tighter leading-tight">Charan Ravanam</h2>
            <p className="text-[9px] text-gray-500 font-bold uppercase mt-1 tracking-widest">FOUNDER & CEO</p>
          </div>
        </div>

        <div className="bg-white rounded-[40px] p-10 shadow-card border border-gray-100 flex flex-col items-center text-center space-y-4">
           <div className="w-24 h-24 bg-gray-50 rounded-[32px] flex items-center justify-center font-black text-4xl text-black shadow-inner">K</div>
           <div>
              <h3 className="text-2xl font-black tracking-tighter text-black">Kranthi Madireddy</h3>
              <div className="bg-yellow-400 text-black px-3 py-1 rounded-full text-[8px] font-black uppercase tracking-widest mt-3 inline-block shadow-lg">CORE MEMBER</div>
           </div>
           <p className="text-gray-400 text-[10px] font-bold leading-relaxed max-w-[180px]">Leading engineering and algorithmic metabolic insight.</p>
        </div>

        <div className="bg-white rounded-[40px] p-10 shadow-card border border-gray-100 flex flex-col items-center text-center space-y-4">
           <div className="w-24 h-24 bg-gray-50 rounded-[32px] flex items-center justify-center font-black text-4xl text-black shadow-inner">G</div>
           <div>
              <h3 className="text-2xl font-black tracking-tighter text-black">Gagan Adithya Reddy</h3>
              <div className="bg-yellow-400 text-black px-3 py-1 rounded-full text-[8px] font-black uppercase tracking-widest mt-3 inline-block shadow-lg">CORE MEMBER</div>
           </div>
           <p className="text-gray-400 text-[10px] font-bold leading-relaxed max-w-[180px]">Strategy lead and ecosystem growth strategist.</p>
        </div>
      </div>
    </div>
  );
};

const AdminPanel: React.FC<{ 
  view: string; 
  setView: (v: any) => void; 
  allUsers: any[]; 
  allPayments: any[]; 
  allTransfers: any[]; 
  adminSearch: string; 
  setAdminSearch: (v: string) => void;
  selectedAdminUser: any;
  setSelectedAdminUser: (u: any) => void;
  setIsAdmin: (s: boolean) => void;
}> = ({ view, setView, allUsers, allPayments, allTransfers, adminSearch, setAdminSearch, selectedAdminUser, setSelectedAdminUser, setIsAdmin }) => {
  const stats = useMemo(() => {
    const pCount = allUsers.filter(u => u.isPremium).length;
    return {
      users: allUsers.length,
      revenue: pCount * 49,
      coins: allUsers.reduce((acc, u) => acc + (u.points || 0), 0),
      transfers: allTransfers.length
    };
  }, [allUsers, allTransfers]);

  const filteredUsers = allUsers.filter(u => (u.name || '').toLowerCase().includes(adminSearch.toLowerCase()));

  // Local state for manually editing user coins in detail view
  const [editCoins, setEditCoins] = useState('');

  return (
    <div className="animate-fade-in px-5 pb-32 overflow-y-auto h-full no-scrollbar pt-8">
      {view === 'admin_dashboard' && (
        <div className="space-y-6">
          <div className="flex justify-between items-center">
             <h1 className="text-3xl font-black tracking-tighter">Terminal</h1>
             <div className="bg-green-500 w-2 h-2 rounded-full animate-pulse shadow-green-500 shadow-lg"/>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-white p-5 rounded-[28px] shadow-card border border-gray-100 text-center" onClick={() => setView('admin_users')}>
              <Users size={20} className="text-blue-500 mb-1.5 mx-auto"/>
              <div className="text-2xl font-black">{stats.users}</div>
              <div className="text-[8px] font-black uppercase text-gray-400 tracking-widest">Total Nodes</div>
            </div>
            <div className="bg-black text-white p-5 rounded-[28px] shadow-card text-center" onClick={() => setView('admin_payments')}>
              <DollarSign size={20} className="text-yellow-400 mb-1.5 mx-auto"/>
              <div className="text-2xl font-black">₹{stats.revenue}</div>
              <div className="text-[8px] font-black uppercase text-gray-500 tracking-widest">Revenue (PRO)</div>
            </div>
          </div>
          <div className="bg-white p-8 rounded-[40px] shadow-card border border-gray-100 flex items-center justify-between">
             <div className="flex-1">
                <div className="text-4xl font-black tracking-tighter">{formatCoins(stats.coins)}</div>
                <div className="text-[8px] text-gray-400 font-black uppercase tracking-[0.2em] mt-2">CIRCULATING COINS</div>
             </div>
             <Coins className="text-black opacity-5" size={60} />
          </div>
          <button onClick={() => setView('admin_transfers')} className="w-full bg-white p-6 rounded-[32px] shadow-card border border-gray-100 flex items-center justify-between group">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 bg-gray-50 rounded-xl flex items-center justify-center"><ArrowRight size={20}/></div>
              <div className="text-left"><div className="font-black text-base">Audit Ledger</div><div className="text-[8px] font-bold text-gray-400 uppercase">View Activity</div></div>
            </div>
            <ChevronRight size={16} className="text-gray-200"/>
          </button>
        </div>
      )}

      {view === 'admin_payments' && (
        <div className="space-y-5 animate-fade-in">
          <div className="flex items-center gap-3">
            <button onClick={() => setView('admin_dashboard')} className="p-3 bg-white rounded-2xl shadow-card"><ArrowLeft size={18}/></button>
            <h1 className="text-2xl font-black tracking-tight">Payments Log</h1>
          </div>
          <div className="space-y-3">
            {allPayments.length === 0 ? (
              <div className="p-10 text-center text-gray-400 font-black text-[10px] uppercase">No upgrade events detected</div>
            ) : (
              allPayments.map(p => (
                <div key={p.id} className="bg-white p-5 rounded-[28px] shadow-card border border-gray-50 flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 bg-green-50 rounded-xl flex items-center justify-center text-green-500"><CreditCard size={20}/></div>
                    <div>
                      <div className="font-black text-sm leading-tight">{p.userName || 'Anonymous Node'}</div>
                      <div className="text-[8px] text-gray-400 font-bold uppercase">{new Date(p.timestamp?.toDate()).toLocaleString()}</div>
                    </div>
                  </div>
                  <div className="text-lg font-black text-black">₹{p.amount}</div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {view === 'admin_users' && (
        <div className="space-y-5">
          <h1 className="text-2xl font-black tracking-tight">Directory</h1>
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-300" size={16}/>
            <input type="text" placeholder="Search nodes..." value={adminSearch} onChange={e => setAdminSearch(e.target.value)} className="w-full pl-12 pr-4 py-4 rounded-[20px] bg-white border-none shadow-card font-bold outline-none focus:ring-1 focus:ring-black text-sm" />
          </div>
          <div className="space-y-2">
            {filteredUsers.map(u => (
              <div key={u.uid} onClick={() => { setSelectedAdminUser(u); setEditCoins(u.points?.toString() || '0'); setView('admin_user_detail'); }} className="bg-white p-4 rounded-[24px] flex items-center justify-between shadow-card active:scale-95 transition-all">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-gray-100 rounded-xl flex items-center justify-center font-black text-gray-400 text-xs">{u.name?.charAt(0)}</div>
                  <div className="min-w-0">
                    <div className="font-black text-sm leading-tight flex items-center gap-1.5 truncate max-w-[120px]">{u.name || 'Unknown'}{u.isDisabled && <Ban size={10} className="text-red-500" />}</div>
                    <div className="text-[8px] text-gray-400 font-bold uppercase">{formatCoins(u.points || 0)}c • {u.isPremium ? 'PRO' : 'Free'}</div>
                  </div>
                </div>
                <ChevronRight size={14} className="text-gray-200"/>
              </div>
            ))}
          </div>
        </div>
      )}

      {view === 'admin_transfers' && (
        <div className="space-y-5">
          <div className="flex items-center gap-3">
            <button onClick={() => setView('admin_dashboard')} className="p-3 bg-white rounded-2xl shadow-card"><ArrowLeft size={18}/></button>
            <h1 className="text-2xl font-black">Ledger</h1>
          </div>
          <div className="space-y-3">
            {allTransfers.map(t => (
              <div key={t.id} className="bg-white p-5 rounded-[28px] shadow-card border border-gray-100 flex items-center justify-between">
                <div className="min-w-0">
                  <div className="font-black text-xs truncate max-w-[180px]">{t.fromName} → {t.toName}</div>
                  <div className="text-[8px] text-gray-300 font-bold uppercase">{new Date(t.timestamp?.toDate()).toLocaleString()}</div>
                </div>
                <div className="text-base font-black flex-shrink-0">{t.amount}c</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {view === 'admin_user_detail' && selectedAdminUser && (
        <div className="space-y-6 pb-20 animate-fade-in">
          <div className="flex items-center gap-3">
            <button onClick={() => setView('admin_users')} className="p-3 bg-white rounded-2xl shadow-card"><ArrowLeft size={18}/></button>
            <h1 className="text-xl font-black">Control Panel</h1>
          </div>
          <div className="bg-white p-7 rounded-[36px] shadow-card space-y-6">
            <div className="flex items-center gap-5 pb-5 border-b border-gray-50">
               <div className="w-16 h-16 bg-black text-white rounded-2xl flex items-center justify-center font-black text-2xl relative">
                 {selectedAdminUser.name?.charAt(0)}
                 {selectedAdminUser.isPremium && <Crown size={12} className="absolute -top-1 -right-1 text-yellow-400 fill-yellow-400"/>}
               </div>
               <div className="min-w-0">
                 <div className="text-xl font-black truncate">{selectedAdminUser.name}</div>
                 <div className="text-[9px] font-black uppercase text-gray-400 truncate">{selectedAdminUser.email}</div>
               </div>
            </div>

            {/* Manual Edit Section */}
            <div className="space-y-4">
               <div>
                  <label className="text-[8px] font-black uppercase text-gray-400 px-1 mb-2 block tracking-widest">Adjust Balance (Coins)</label>
                  <div className="flex gap-2">
                    <input 
                      type="number" 
                      value={editCoins} 
                      onChange={(e) => setEditCoins(e.target.value)}
                      className="flex-1 bg-gray-50 p-4 rounded-xl font-black text-sm outline-none focus:ring-1 focus:ring-black"
                    />
                    <button 
                      onClick={async () => {
                         const pts = parseInt(editCoins) || 0;
                         await updateDoc(doc(db, "profiles", selectedAdminUser.uid), { points: pts });
                         alert("Vault balance updated.");
                      }}
                      className="bg-black text-white px-4 rounded-xl font-black text-xs active:scale-95 transition-all"
                    >Save</button>
                  </div>
               </div>

               <button 
                  onClick={async () => {
                    const next = !selectedAdminUser.isPremium;
                    await updateDoc(doc(db, "profiles", selectedAdminUser.uid), { isPremium: next });
                    setSelectedAdminUser({...selectedAdminUser, isPremium: next});
                    alert(`Pro Access ${next ? 'Granted' : 'Revoked'}.`);
                  }}
                  className={`w-full p-5 rounded-[24px] font-black text-xs flex items-center justify-between ${selectedAdminUser.isPremium ? 'bg-yellow-50 text-yellow-600' : 'bg-gray-50 text-gray-600'}`}
               >
                 <div className="flex items-center gap-3"><Crown size={16}/> {selectedAdminUser.isPremium ? 'Revoke Pro Access' : 'Grant Pro Membership'}</div>
                 <ChevronRight size={16}/>
               </button>
            </div>

            <div className="space-y-2 pt-4 border-t border-gray-50">
               <button onClick={async () => {
                  const next = !selectedAdminUser.isDisabled;
                  await updateDoc(doc(db, "profiles", selectedAdminUser.uid), { isDisabled: next });
                  setSelectedAdminUser({...selectedAdminUser, isDisabled: next});
                  alert(`Access ${next ? 'Disabled' : 'Enabled'}.`);
               }} className={`w-full p-5 rounded-[24px] font-black text-xs flex items-center justify-between ${selectedAdminUser.isDisabled ? 'bg-green-50 text-green-600' : 'bg-orange-50 text-orange-600'}`}>
                 <div className="flex items-center gap-3">{selectedAdminUser.isDisabled ? <CheckCircle2 size={16}/> : <Ban size={16}/>} {selectedAdminUser.isDisabled ? 'Re-enable Node' : 'Disable Node Access'}</div>
                 <ChevronRight size={16}/>
               </button>
               <button onClick={async () => {
                  if (confirm("Permanently delete node profile?")) {
                    await deleteDoc(doc(db, "profiles", selectedAdminUser.uid));
                    setView('admin_users');
                  }
               }} className="w-full p-5 rounded-[24px] bg-red-50 text-red-600 font-black text-xs flex items-center justify-between">
                 <div className="flex items-center gap-3"><UserX size={16}/> Purge Data</div>
                 <ChevronRight size={16}/>
               </button>
            </div>
          </div>
        </div>
      )}
      
      {view === 'settings' && <div className="pt-6"><button onClick={() => { setIsAdmin(false); localStorage.removeItem('drfoodie_admin'); setView('home'); }} className="w-full p-6 text-red-500 bg-white rounded-[32px] shadow-card font-black active:scale-95 transition-all text-sm">Logout Admin</button></div>}
    </div>
  );
};

export default App;
