
import React, { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import { 
  Home, BarChart2, Settings, Plus, Flame, ChevronRight, ArrowLeft, ArrowRight,
  Camera, User as UserIcon, Dumbbell, LogOut, Crown, Loader2, TrendingUp,
  Target, Zap, Activity, Clock, Trophy, CheckCircle2, X,
  ScanLine, Wallet as WalletIcon, Gift, Users, Coins, Send, 
  ShieldCheck, ShieldAlert, DollarSign, Search, History, Heart, 
  Mail, Key, Share, Sparkle, Ban, UserX, Gem, Lock, Zap as Lightning,
  Shield, Bell, HelpCircle, Info, ChevronDown, Image, MessageCircle, Trash2,
  Edit3, CreditCard, Play, RotateCcw
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

// --- Sub-components (Moved up to prevent hoisting/reference issues) ---

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
        {view === 'admin_users' && ( <div className="space-y-4"><div className="flex items-center gap-3 mb-2"><button onClick={() => setView('admin_dashboard')} className="p-2 bg-gray-50 rounded-lg"><ArrowLeft size={16}/></button><h2 className="text-lg font-black">Node Database</h2></div><div className="relative"><Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-300" size={16} /><input type="text" placeholder="Search nodes..." value={adminSearch} onChange={(e) => setAdminSearch(e.target.value)} className="w-full pl-12 pr-4 py-4 bg-gray-50 rounded-2xl border-none font-bold text-sm" /></div><div className="space-y-2">{filteredUsers.map((u: any) => ( <div key={u.uid} onClick={() => { setSelectedAdminUser(u); setView('admin_user_detail'); }} className="bg-white p-4 rounded-2xl border border-gray-100 flex justify-between items-center cursor-pointer active:bg-gray-50 transition-colors"><div><div className="font-black text-sm">{u.name || 'Anonymous'}</div><div className="text-[9px] text-gray-400 font-bold uppercase">{u.email}</div></div><div className="flex items-center gap-2"><div className={`px-2 py-1 rounded-md text-[8px] font-black uppercase ${u.isPremium ? 'bg-black text-yellow-400' : 'bg-gray-50 text-gray-400'}`}>{u.isPremium ? 'PRO' : 'FREE'}</div><ChevronRight size={12} className="text-gray-200" /></div></div> ))}</div></div> )}
        {view === 'admin_user_detail' && selectedAdminUser && ( <div className="space-y-6 animate-fade-in"><div className="flex items-center gap-3 mb-2"><button onClick={() => setView('admin_users')} className="p-2 bg-gray-50 rounded-lg"><ArrowLeft size={16}/></button><h2 className="text-lg font-black">Node Intelligence</h2></div><div className="bg-gray-50 p-6 rounded-[32px] border border-gray-100 space-y-4"><div className="flex items-center gap-4"><div className="w-16 h-16 bg-white rounded-full flex items-center justify-center shadow-sm"><UserIcon size={24} className="text-black/20" /></div><div><h3 className="text-xl font-black">{selectedAdminUser.name || 'Anonymous Agent'}</h3><p className="text-[10px] font-bold text-gray-400 uppercase">{selectedAdminUser.email}</p></div></div><div className="grid grid-cols-2 gap-3"><div className="bg-white p-4 rounded-2xl"><div className="text-[8px] font-black text-gray-400 uppercase tracking-widest mb-1">Status</div><div className={`text-xs font-black uppercase ${selectedAdminUser.isPremium ? 'text-yellow-600' : 'text-gray-400'}`}>{selectedAdminUser.isPremium ? 'PRO ACCESS' : 'FREE TIER'}</div></div><div className="bg-white p-4 rounded-2xl"><div className="text-[8px] font-black text-gray-400 uppercase tracking-widest mb-1">Assets</div><div className="text-xs font-black">{formatCoins(selectedAdminUser.points || 0)}</div></div></div></div><div className="space-y-3"><h3 className="text-[10px] font-black uppercase tracking-widest text-gray-400 px-1">Biometric Data</h3><div className="bg-white p-6 rounded-[32px] border border-gray-100 grid grid-cols-2 gap-y-4"><div><p className="text-[8px] font-black text-gray-300 uppercase">Age</p><p className="font-bold">{selectedAdminUser.age} yrs</p></div><div><p className="text-[8px] font-black text-gray-300 uppercase">Goal</p><p className="font-bold">{selectedAdminUser.goal}</p></div><div><p className="text-[8px] font-black text-gray-300 uppercase">Weight</p><p className="font-bold">{selectedAdminUser.weight} kg</p></div><div><p className="text-[8px] font-black text-gray-300 uppercase">Target</p><p className="font-bold">{selectedAdminUser.targetWeight} kg</p></div></div></div><div className="space-y-3"><h3 className="text-[10px] font-black uppercase tracking-widest text-gray-400 px-1">Network Identity</h3><div className="bg-white p-6 rounded-[32px] border border-gray-100 space-y-2"><p className="text-[8px] font-black text-gray-300 uppercase">Unique Transfer Code</p><p className="font-mono font-black text-blue-600 text-sm">{selectedAdminUser.uniqueTransferCode}</p><p className="text-[8px] font-black text-gray-300 uppercase pt-2">Referral Code</p><p className="font-mono font-black text-gray-600 text-sm">{selectedAdminUser.referralCode}</p></div></div><button onClick={async () => { if(confirm(`Confirm: ${selectedAdminUser.isDisabled ? 'Enable' : 'Disable'} this node?`)) { await updateDoc(doc(db, "profiles", selectedAdminUser.uid), { isDisabled: !selectedAdminUser.isDisabled }); setSelectedAdminUser({...selectedAdminUser, isDisabled: !selectedAdminUser.isDisabled}); } }} className={`w-full py-5 rounded-[24px] font-black text-[10px] uppercase tracking-[0.2em] transition-all shadow-xl ${selectedAdminUser.isDisabled ? 'bg-green-500 text-white shadow-green-200' : 'bg-red-500 text-white shadow-red-200'}`}>{selectedAdminUser.isDisabled ? 'Authorize Node access' : 'Restrict Node access'}</button></div> )}
        {view === 'admin_payments' && ( <div className="space-y-4"><div className="flex items-center gap-3 mb-2"><button onClick={() => setView('admin_dashboard')} className="p-2 bg-gray-50 rounded-lg"><ArrowLeft size={16}/></button><h2 className="text-lg font-black">Revenue Log</h2></div><div className="space-y-2">{allPayments.map((p: any) => ( <div key={p.id} className="bg-white p-4 rounded-2xl border border-gray-100 flex justify-between items-center"><div><div className="font-black text-sm">{p.userName}</div><div className="text-[9px] text-gray-400 font-bold uppercase">{p.timestamp?.toDate().toLocaleString()}</div></div><div className="text-sm font-black text-green-500">₹{p.amount}</div></div> ))}</div></div> )}
        {view === 'admin_transfers' && ( <div className="space-y-4"><div className="flex items-center gap-3 mb-2"><button onClick={() => setView('admin_dashboard')} className="p-2 bg-gray-50 rounded-lg"><ArrowLeft size={16}/></button><h2 className="text-lg font-black">Vault History</h2></div><div className="space-y-2">{allTransfers.map((t: any) => ( <div key={t.id} className="bg-white p-4 rounded-2xl border border-gray-100 space-y-2"><div className="flex justify-between items-center"><div className="text-[10px] font-black text-gray-400 uppercase">{t.timestamp?.toDate().toLocaleTimeString()}</div><div className="text-sm font-black text-blue-500">{formatCoins(t.amount)}</div></div><div className="flex items-center justify-between text-xs font-bold"><span>{t.fromName}</span><ArrowRight size={12} className="text-gray-200"/><span>{t.toName}</span></div></div> ))}</div></div> )}
      </div>
    </div>
  );
};

// --- Workout UI Redesign ---

const WorkoutLocationView: React.FC<{ onBack: () => void; onSelect: (loc: WorkoutLocation) => void }> = ({ onBack, onSelect }) => {
  return (
    <div className="h-full flex flex-col bg-white animate-fade-in relative">
      <div className="absolute top-0 left-0 w-full h-1/2 bg-black opacity-5 pointer-events-none" />
      <div className="p-8 pt-12 space-y-12 flex-1">
        <div className="flex items-center gap-4">
          <button onClick={onBack} className="p-4 bg-gray-50 rounded-[20px] active:scale-90 transition-all shadow-sm"><ArrowLeft size={20}/></button>
          <div className="h-1 flex-1 bg-gray-100 rounded-full overflow-hidden"><div className="w-1/3 h-full bg-black rounded-full" /></div>
        </div>
        <div className="space-y-2">
          <h2 className="text-5xl font-black tracking-tighter leading-none">Deploy Protocol</h2>
          <p className="text-gray-400 text-sm font-bold uppercase tracking-[0.2em]">Select Deployment Environment</p>
        </div>
        <div className="grid gap-6">
          <button onClick={() => onSelect(WorkoutLocation.HOME)} className="group bg-white p-10 rounded-[48px] shadow-[0_10px_40px_rgba(0,0,0,0.04)] border border-gray-50 flex flex-col items-start space-y-6 active:scale-[0.97] transition-all hover:border-black overflow-hidden relative">
             <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:scale-125 transition-transform duration-700"><Home size={120} /></div>
             <div className="w-16 h-16 bg-blue-50 rounded-[24px] flex items-center justify-center group-hover:bg-black transition-colors"><Home className="text-blue-500 group-hover:text-white" size={32} /></div>
             <div className="text-left"><div className="text-3xl font-black tracking-tight">Home Base</div><div className="text-[10px] font-black text-gray-400 uppercase mt-2 tracking-widest">Minimal Tools • 100% Effective</div></div>
          </button>
          <button onClick={() => onSelect(WorkoutLocation.GYM)} className="group bg-white p-10 rounded-[48px] shadow-[0_10px_40px_rgba(0,0,0,0.04)] border border-gray-50 flex flex-col items-start space-y-6 active:scale-[0.97] transition-all hover:border-black overflow-hidden relative">
             <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:scale-125 transition-transform duration-700"><Dumbbell size={120} /></div>
             <div className="w-16 h-16 bg-purple-50 rounded-[24px] flex items-center justify-center group-hover:bg-black transition-colors"><Dumbbell className="text-purple-500 group-hover:text-white" size={32} /></div>
             <div className="text-left"><div className="text-3xl font-black tracking-tight">Clinical Gym</div><div className="text-[10px] font-black text-gray-400 uppercase mt-2 tracking-widest">Full Heavy Equipment Access</div></div>
          </button>
        </div>
      </div>
    </div>
  );
};

const WorkoutFocusView: React.FC<{ location: WorkoutLocation; selectedGroups: MuscleGroup[]; onToggle: (g: MuscleGroup) => void; onGenerate: () => void; onBack: () => void; }> = ({ location, selectedGroups, onToggle, onGenerate, onBack }) => {
  return (
    <div className="h-full flex flex-col bg-white animate-fade-in">
      <div className="p-8 pt-12 space-y-10 flex-1 overflow-y-auto no-scrollbar pb-40">
        <div className="flex items-center gap-4">
          <button onClick={onBack} className="p-4 bg-gray-50 rounded-[20px] active:scale-90 transition-all shadow-sm"><ArrowLeft size={20}/></button>
          <div className="h-1 flex-1 bg-gray-100 rounded-full overflow-hidden"><div className="w-2/3 h-full bg-black rounded-full" /></div>
        </div>
        <div className="space-y-2">
          <h2 className="text-5xl font-black tracking-tighter leading-none">Target Nodes</h2>
          <p className="text-gray-400 text-sm font-bold uppercase tracking-[0.2em]">Select muscle optimization sectors</p>
        </div>
        <div className="grid grid-cols-1 gap-3">
          {Object.values(MuscleGroup).map((g) => (
            <button 
              key={g} 
              onClick={() => onToggle(g)} 
              className={`p-7 rounded-[32px] font-black text-lg flex justify-between items-center transition-all border ${selectedGroups.includes(g) ? 'bg-black text-white border-black shadow-2xl scale-[1.02]' : 'bg-gray-50 text-gray-400 border-transparent shadow-sm'}`}
            >
              <span>{g}</span>
              <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center ${selectedGroups.includes(g) ? 'border-white bg-white/20' : 'border-gray-200'}`}>
                {selectedGroups.includes(g) && <div className="w-3 h-3 bg-white rounded-full shadow-[0_0_10px_white]" />}
              </div>
            </button>
          ))}
        </div>
      </div>
      <div className="fixed bottom-0 left-0 right-0 p-8 pt-0 bg-white/80 backdrop-blur-xl max-w-md mx-auto z-50">
        <button 
          onClick={onGenerate} 
          disabled={selectedGroups.length === 0} 
          className="w-full bg-black text-white py-6 rounded-[32px] font-black text-base shadow-2xl active:scale-95 transition-all flex items-center justify-center gap-3 disabled:opacity-40 group"
        >
          <Zap size={22} className="fill-yellow-400 text-yellow-400 group-hover:scale-125 transition-transform"/> 
          INITIALIZE GENERATION
        </button>
      </div>
    </div>
  );
};

const WorkoutPlanView: React.FC<{ routine: Exercise[]; isGenerating: boolean; onBack: () => void }> = ({ routine, isGenerating, onBack }) => {
  const [completedExercises, setCompletedExercises] = useState<Set<string>>(new Set());

  const toggleComplete = (id: string) => {
    setCompletedExercises(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  if (isGenerating) {
    return (
      <div className="h-full bg-black flex flex-col items-center justify-center p-12 text-center overflow-hidden">
        <div className="relative w-32 h-32 mb-10">
          <div className="absolute inset-0 border-4 border-white/5 rounded-[48px]" />
          <div className="absolute inset-0 border-t-4 border-yellow-400 rounded-[48px] animate-spin" />
          <div className="absolute inset-0 flex items-center justify-center">
            <Zap className="text-yellow-400 fill-yellow-400 animate-pulse" size={40} />
          </div>
        </div>
        <h2 className="text-3xl font-black text-white tracking-tighter mb-4">OPTIMIZING SEQUENCE</h2>
        <div className="flex flex-col gap-2 w-full max-w-[200px]">
          {['Scanning Biometrics', 'Mapping Mechanics', 'Calibrating Loads'].map((text, i) => (
            <div key={i} className="flex items-center gap-3 opacity-30 animate-pulse" style={{ animationDelay: `${i * 0.2}s` }}>
              <div className="w-1.5 h-1.5 bg-yellow-400 rounded-full" />
              <span className="text-[10px] font-black text-white uppercase tracking-widest">{text}</span>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="h-full bg-[#F2F2F7] flex flex-col animate-fade-in overflow-hidden">
      <div className="p-8 pt-12 shrink-0 bg-white shadow-sm flex items-center justify-between border-b border-gray-100">
        <button onClick={onBack} className="p-4 bg-gray-50 rounded-[20px] active:scale-90 transition-all"><ArrowLeft size={20}/></button>
        <div className="text-right">
          <h2 className="text-2xl font-black tracking-tighter">Peak Protocol</h2>
          <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">{routine.length} STEPS MAPPED</p>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto no-scrollbar p-6 space-y-6 pb-40">
        {routine.map((ex, i) => (
          <div key={ex.id} className={`bg-white rounded-[40px] shadow-[0_10px_30px_rgba(0,0,0,0.03)] border border-gray-50 overflow-hidden transition-all duration-500 ${completedExercises.has(ex.id) ? 'opacity-40 scale-[0.98]' : 'scale-100'}`}>
            {ex.imageUrl && (
              <div className="relative w-full aspect-square bg-black overflow-hidden">
                <img src={ex.imageUrl} className="w-full h-full object-cover" alt={ex.name} />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent pointer-events-none" />
                <div className="absolute top-6 right-6 bg-black/40 backdrop-blur-md px-4 py-2 rounded-full border border-white/20 flex items-center gap-2">
                  <Flame size={12} className="text-yellow-400 fill-yellow-400" />
                  <span className="text-[10px] font-black text-white tracking-widest">{ex.sets} × {ex.reps}</span>
                </div>
                <div className="absolute bottom-6 left-6 right-6">
                   <div className="bg-white/10 backdrop-blur-md border border-white/10 p-4 rounded-3xl">
                      <h3 className="text-xl font-black text-white tracking-tight leading-tight">{ex.name}</h3>
                   </div>
                </div>
              </div>
            )}
            <div className="p-8 space-y-6">
              {!ex.imageUrl && <h3 className="text-2xl font-black tracking-tight">{ex.name}</h3>}
              <p className="text-sm font-bold text-gray-500 leading-relaxed italic border-l-4 border-black pl-4">"{ex.description}"</p>
              
              <div className="flex items-center justify-between">
                <div className="flex gap-2">
                  {ex.muscleGroups.map((mg, j) => (
                    <span key={j} className="text-[8px] font-black uppercase tracking-widest bg-gray-50 text-gray-400 px-3 py-1.5 rounded-full border border-gray-100">{mg}</span>
                  ))}
                </div>
                <button 
                  onClick={() => toggleComplete(ex.id)}
                  className={`p-4 rounded-[20px] transition-all active:scale-90 ${completedExercises.has(ex.id) ? 'bg-green-500 text-white shadow-[0_10px_20px_rgba(34,197,94,0.3)]' : 'bg-gray-50 text-gray-300'}`}
                >
                  <CheckCircle2 size={24} />
                </button>
              </div>
            </div>
          </div>
        ))}

        <div className="bg-black text-white p-10 rounded-[48px] text-center space-y-4 shadow-2xl relative overflow-hidden group">
          <div className="absolute inset-0 bg-gradient-to-br from-yellow-400/10 to-transparent pointer-events-none" />
          <Trophy size={48} className="mx-auto text-yellow-400 group-hover:scale-125 transition-transform duration-700" />
          <div className="space-y-1">
            <h4 className="text-3xl font-black tracking-tighter">Protocol Terminated</h4>
            <p className="text-gray-500 text-[10px] font-black uppercase tracking-[0.2em]">Metabolic optimization completed</p>
          </div>
          <button 
            onClick={onBack}
            className="mt-4 bg-white text-black px-8 py-4 rounded-[24px] font-black text-[10px] uppercase tracking-widest shadow-xl active:scale-95 transition-all"
          >
            Regenerate Routine
          </button>
        </div>
      </div>
    </div>
  );
};

// --- Missing Sub-components ---

// Fix: Implemented AnalysisDetailView to show scanning state or food details
const AnalysisDetailView: React.FC<{ analysis: ScanHistoryItem | null; isAnalyzing: boolean; onBack: () => void; onDelete: () => void }> = ({ analysis, isAnalyzing, onBack, onDelete }) => {
  if (isAnalyzing) {
    return (
      <div className="h-full bg-white flex flex-col items-center justify-center p-12 text-center">
        <div className="relative w-32 h-32 mb-10">
          <div className="absolute inset-0 border-4 border-gray-100 rounded-[48px]" />
          <div className="absolute inset-0 border-t-4 border-black rounded-[48px] animate-spin" />
          <div className="absolute inset-0 flex items-center justify-center">
            <ScanLine className="text-black animate-pulse" size={40} />
          </div>
        </div>
        <h2 className="text-2xl font-black tracking-tighter mb-2">Analyzing Nutrients</h2>
        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Accessing metabolic databases...</p>
      </div>
    );
  }
  if (!analysis) return null;
  return (
    <div className="h-full bg-white flex flex-col animate-fade-in overflow-y-auto no-scrollbar pb-32">
      <div className="p-8 pt-12 flex justify-between items-center sticky top-0 bg-white/80 backdrop-blur-md z-10">
        <button onClick={onBack} className="p-4 bg-gray-50 rounded-[20px] active:scale-90 transition-all shadow-sm"><ArrowLeft size={20}/></button>
        <button onClick={onDelete} className="p-4 bg-red-50 text-red-500 rounded-[20px] active:scale-90 transition-all shadow-sm"><Trash2 size={20}/></button>
      </div>
      <div className="px-8 space-y-8">
        <div className="relative aspect-square rounded-[48px] overflow-hidden shadow-2xl border-8 border-gray-50">
          <img src={analysis.imageUrl} className="w-full h-full object-cover" alt={analysis.foodName} />
          <div className="absolute bottom-6 right-6 bg-black text-white px-6 py-3 rounded-full font-black text-xs shadow-xl">{analysis.healthScore}/10 Score</div>
        </div>
        <div className="space-y-2 text-center">
          <h2 className="text-4xl font-black tracking-tighter leading-none">{analysis.foodName}</h2>
          <p className="text-gray-400 text-[10px] font-black uppercase tracking-[0.3em]">{analysis.mealType} • {new Date(analysis.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-gray-50 p-6 rounded-[32px] text-center border border-gray-100"><div className="text-[8px] font-black text-gray-400 uppercase mb-1">Calories</div><div className="text-2xl font-black">{analysis.calories}</div></div>
          <div className="bg-gray-50 p-6 rounded-[32px] text-center border border-gray-100"><div className="text-[8px] font-black text-gray-400 uppercase mb-1">Protein</div><div className="text-2xl font-black">{analysis.protein}g</div></div>
          <div className="bg-gray-50 p-6 rounded-[32px] text-center border border-gray-100"><div className="text-[8px] font-black text-gray-400 uppercase mb-1">Carbs</div><div className="text-2xl font-black">{analysis.carbs}g</div></div>
          <div className="bg-gray-50 p-6 rounded-[32px] text-center border border-gray-100"><div className="text-[8px] font-black text-gray-400 uppercase mb-1">Fat</div><div className="text-2xl font-black">{analysis.fat}g</div></div>
        </div>
        <div className="bg-black text-white p-8 rounded-[40px] shadow-2xl space-y-4">
           <h3 className="text-[10px] font-black uppercase tracking-[0.2em] opacity-40">Metabolic Insight</h3>
           <p className="text-sm font-bold leading-relaxed">{analysis.microAnalysis}</p>
        </div>
        <div className="space-y-4 pb-12">
           <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-400 px-1">Optimization Paths</h3>
           <div className="space-y-2">
             {analysis.alternatives.map((alt, i) => (
               <div key={i} className="bg-white p-5 rounded-[24px] border border-gray-100 flex items-center gap-4">
                 <div className="w-8 h-8 bg-green-50 rounded-full flex items-center justify-center"><CheckCircle2 size={16} className="text-green-500" /></div>
                 <span className="text-sm font-bold text-gray-700">{alt}</span>
               </div>
             ))}
           </div>
        </div>
      </div>
    </div>
  );
};

// Fix: Implemented WalletForm to allow coin transfers and view balance
const WalletForm: React.FC<{ profile: UserProfile | null; onTransfer: (code: string, amount: number) => void; onBack: () => void }> = ({ profile, onTransfer, onBack }) => {
  const [code, setCode] = useState('');
  const [amount, setAmount] = useState('');
  return (
    <div className="pt-6 space-y-6 animate-fade-in pb-32 px-5 h-full overflow-y-auto no-scrollbar">
      <div className="flex items-center gap-3"><button onClick={onBack} className="p-3 bg-white rounded-2xl shadow-card active:scale-95 transition-all"><ArrowLeft size={18}/></button><h1 className="text-2xl font-black tracking-tight">Vault</h1></div>
      <div className="bg-black p-10 rounded-[48px] text-white shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 right-0 p-8 opacity-10 rotate-12"><Coins size={120} /></div>
        <div className="relative z-10">
          <div className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-2">Available Balance</div>
          <div className="flex items-baseline gap-2">
            <span className="text-6xl font-black tracking-tighter">{formatCoins(profile?.points || 0)}</span>
            <span className="text-sm font-bold text-gray-500">COINS</span>
          </div>
          <div className="mt-8 pt-8 border-t border-white/10">
            <div className="text-[8px] font-black text-gray-500 uppercase tracking-widest mb-1">Your Transfer Node</div>
            <div className="text-xl font-mono font-black text-yellow-400 tracking-wider">{profile?.uniqueTransferCode}</div>
          </div>
        </div>
      </div>
      <div className="bg-white p-8 rounded-[40px] shadow-card border border-gray-100 space-y-6">
        <h3 className="text-[10px] font-black uppercase tracking-widest text-gray-400 px-1">Send Assets</h3>
        <div className="space-y-4">
          <div className="space-y-1">
            <label className="text-[8px] font-black text-gray-400 uppercase tracking-widest px-1">Recipient Node Code</label>
            <input type="text" value={code} onChange={(e)=>setCode(e.target.value.toUpperCase())} placeholder="INR-XXXXXX" className="w-full p-4 bg-gray-50 rounded-2xl border-none font-mono font-black text-sm" />
          </div>
          <div className="space-y-1">
            <label className="text-[8px] font-black text-gray-400 uppercase tracking-widest px-1">Amount</label>
            <input type="number" value={amount} onChange={(e)=>setAmount(e.target.value)} placeholder="0" className="w-full p-4 bg-gray-50 rounded-2xl border-none font-black text-sm" />
          </div>
          <button onClick={()=>onTransfer(code, parseInt(amount) || 0)} className="w-full bg-black text-white py-5 rounded-[24px] font-black text-sm shadow-xl active:scale-95 transition-all flex items-center justify-center gap-2">
            <Send size={18}/> EXECUTE TRANSFER
          </button>
        </div>
      </div>
    </div>
  );
};

// Fix: Implemented ReferralView to show referral code and rewards info
const ReferralView: React.FC<{ profile: UserProfile | null; onBack: () => void }> = ({ profile, onBack }) => {
  const code = profile?.referralCode || '';
  const share = () => { if (navigator.share) { navigator.share({ title: 'Join Dr Foodie', text: `Optimize your health with Dr Foodie! Use my code ${code} for 100 bonus coins.`, url: window.location.origin }); } else { navigator.clipboard.writeText(code); alert("Code copied to clipboard!"); } };
  return (
    <div className="pt-6 space-y-6 animate-fade-in pb-32 px-5 h-full overflow-y-auto no-scrollbar">
      <div className="flex items-center gap-3"><button onClick={onBack} className="p-3 bg-white rounded-2xl shadow-card active:scale-95 transition-all"><ArrowLeft size={18}/></button><h1 className="text-2xl font-black tracking-tight">Nodes</h1></div>
      <div className="bg-white p-10 rounded-[48px] shadow-card border border-gray-100 text-center space-y-8">
        <div className="w-24 h-24 bg-yellow-50 rounded-[40px] flex items-center justify-center mx-auto"><Gift size={40} className="text-yellow-500" /></div>
        <div className="space-y-2">
          <h2 className="text-3xl font-black tracking-tighter">Expand the Network</h2>
          <p className="text-xs font-bold text-gray-400 px-4 leading-relaxed">Refer a new agent to receive 100 coins. If they go Pro, you gain 250 additional assets.</p>
        </div>
        <div className="bg-gray-50 p-8 rounded-[32px] border border-dashed border-gray-200 relative group cursor-pointer" onClick={share}>
          <div className="text-[8px] font-black text-gray-400 uppercase tracking-widest mb-2">Your Referral Identity</div>
          <div className="text-4xl font-black tracking-[0.2em] group-active:scale-95 transition-transform">{code}</div>
          <div className="absolute top-4 right-4 text-gray-300"><Share size={14}/></div>
        </div>
        <button onClick={share} className="w-full bg-black text-white py-5 rounded-[24px] font-black text-sm shadow-xl active:scale-95 transition-all flex items-center justify-center gap-2">
          DISPATCH INVITE
        </button>
      </div>
    </div>
  );
};

// Fix: Implemented ClarificationModal to handle AI feedback loop
const ClarificationModal: React.FC<{ question: string; onAnswer: (ans: string) => void; onApprox: () => void; onCancel: () => void }> = ({ question, onAnswer, onApprox, onCancel }) => {
  const [answer, setAnswer] = useState('');
  return (
    <div className="fixed inset-0 z-[110] bg-black/60 backdrop-blur-md flex items-end justify-center p-6 animate-fade-in">
      <div className="bg-white w-full max-w-sm rounded-[40px] p-8 space-y-6 shadow-2xl">
        <div className="w-12 h-12 bg-blue-50 rounded-2xl flex items-center justify-center"><MessageCircle size={24} className="text-blue-500" /></div>
        <div className="space-y-2">
          <h3 className="text-2xl font-black tracking-tighter">Clarification Needed</h3>
          <p className="text-sm font-bold text-gray-500 leading-relaxed">{question}</p>
        </div>
        <textarea value={answer} onChange={(e)=>setAnswer(e.target.value)} placeholder="Provide details..." className="w-full p-6 bg-gray-50 rounded-[28px] border-none font-bold text-sm h-32 resize-none shadow-inner focus:ring-1 focus:ring-black transition-all" />
        <div className="space-y-2">
          <button onClick={()=>onAnswer(answer)} disabled={!answer.trim()} className="w-full bg-black text-white py-4 rounded-[20px] font-black text-sm shadow-xl active:scale-95 transition-all disabled:opacity-40">SUBMIT DATA</button>
          <div className="grid grid-cols-2 gap-2">
            <button onClick={onApprox} className="bg-gray-100 py-4 rounded-[20px] font-black text-[10px] uppercase tracking-widest active:scale-95 transition-all">APPROXIMATE</button>
            <button onClick={onCancel} className="bg-gray-100 py-4 rounded-[20px] font-black text-[10px] uppercase tracking-widest active:scale-95 transition-all">ABORT</button>
          </div>
        </div>
      </div>
    </div>
  );
};

// --- Main App Component ---

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
          let bonusCoins = 0; 
          if (newStreak === 30) bonusCoins = 200 * RUPEE_TO_COINS; 
          if (newStreak === 60) bonusCoins = 500 * RUPEE_TO_COINS; 
          if (newStreak === 90) bonusCoins = 999 * RUPEE_TO_COINS;
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
