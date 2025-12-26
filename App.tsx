
import React, { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import { 
  Home, BarChart2, Settings, Plus, Flame, ChevronRight, ArrowLeft, ArrowRight,
  Camera, User as UserIcon, Dumbbell, LogOut, Crown, Loader2, TrendingUp,
  Target, Zap, Activity, Clock, Trophy, CheckCircle2, X,
  ScanLine, Wallet as WalletIcon, Gift, Users, Coins, Send, 
  ShieldCheck, ShieldAlert, DollarSign, Search, History, Heart, 
  Mail, Key, Share, Sparkle, Ban, UserX, Gem, Lock, Zap as Lightning,
  Shield, Bell, HelpCircle, Info, ChevronDown, Image, MessageCircle, Trash2,
  Edit3, CreditCard, Save, AlertCircle
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
const REFERRAL_BONUS_SENDER = 100;
const REFERRAL_BONUS_RECEIVER = 50;
const REFERRAL_BONUS_PREMIUM = 250;

const resizeImage = (base64Str: string, maxWidth = 1024, maxHeight = 1024): Promise<string> => {
  return new Promise((resolve, reject) => {
    if (!base64Str || base64Str.length < 50) return reject(new Error("Invalid image source"));
    const img = new window.Image();
    const timeout = setTimeout(() => reject(new Error("Image processing timed out")), 10000);
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
        if (!ctx) throw new Error("Canvas context failed");
        ctx.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL('image/jpeg', 0.7));
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

const formatCoins = (num: number) => {
  if (num === undefined || num === null) return '0';
  if (num < 100000) return num.toLocaleString();
  if (num >= 1000000) return (num / 1000000).toFixed(1).replace(/\.0$/, '') + 'M';
  return (num / 1000).toFixed(0) + 'k';
};

// --- Sub-Components ---

const PendingScanCard: React.FC<{ imageUrl: string }> = ({ imageUrl }) => {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const duration = 5000;
    const intervalTime = 50;
    const steps = duration / intervalTime;
    const increment = 100 / steps;

    const interval = setInterval(() => {
      setProgress(prev => (prev >= 98 ? 98 : prev + increment));
    }, intervalTime);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="bg-white p-4 rounded-[30px] flex gap-4 shadow-card items-center border border-gray-50 relative overflow-hidden animate-fade-in">
      <div className="w-14 h-14 rounded-2xl bg-gray-50 overflow-hidden shrink-0 border border-gray-100">
        <img src={imageUrl} className="w-full h-full object-cover opacity-60" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="font-black text-sm tracking-tight text-gray-400">Processing Meal...</div>
        <div className="text-[9px] text-black font-black uppercase tracking-widest mt-1 flex items-center gap-1.5">
          <Loader2 size={10} className="animate-spin" /> Metabolic Density Scan
        </div>
      </div>
      <div 
        className="absolute bottom-0 left-0 h-1 bg-yellow-400 transition-all duration-300" 
        style={{ width: `${progress}%` }} 
      />
    </div>
  );
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
    <div className="pt-4 space-y-6 animate-fade-in pb-40 px-5 h-full overflow-y-auto no-scrollbar bg-[#F2F2F7]">
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
            <div className="text-5xl font-black mb-1 bg-gradient-to-b from-white to-gray-500 bg-clip-text text-transparent tracking-tighter">
              {formatCoins(profile?.points || 0)}
            </div>
            <Gem className="text-yellow-500 animate-pulse" size={24} />
         </div>
         <div className="text-[9px] font-black text-yellow-400 bg-white/5 py-2 px-4 rounded-full inline-block mt-3 uppercase tracking-[0.2em] border border-white/5 backdrop-blur-md">
           USER ID: {profile?.uniqueTransferCode || 'Generating...'}
         </div>
      </div>

      <div className="bg-white p-6 rounded-[36px] shadow-card border border-gray-100 space-y-4">
        <div className="flex items-center gap-2 px-1">
          <Zap size={14} className="text-yellow-500 fill-yellow-500" />
          <h3 className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Earning Protocol</h3>
        </div>
        <div className="grid grid-cols-1 gap-2">
          {[
            { label: 'Metabolic Scan', desc: 'Per successful scan', reward: '+5 Gems', icon: <Camera size={18} /> },
            { label: 'Node Expansion', desc: 'Per referral join', reward: '+100 Gems', icon: <Users size={18} /> },
            { label: 'Premium Upgrade', desc: 'Referral goes Pro', reward: '+250 Gems', icon: <Crown size={18} /> }
          ].map((item, i) => (
            <div key={i} className="flex items-center justify-between p-4 bg-gray-50 rounded-[20px]">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center shadow-sm text-black">
                  {item.icon}
                </div>
                <div>
                  <div className="text-[11px] font-black leading-none">{item.label}</div>
                  <div className="text-[8px] text-gray-400 font-bold uppercase mt-1">{item.desc}</div>
                </div>
              </div>
              <div className="text-xs font-black text-yellow-600 bg-yellow-50 px-3 py-1.5 rounded-full border border-yellow-100">{item.reward}</div>
            </div>
          ))}
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
              className="w-full p-4 rounded-xl bg-gray-50 border-none font-bold text-sm shadow-inner"
            />
            <input 
              type="number" 
              placeholder="Amount (Coins)" 
              value={transferAmount} 
              onChange={(e) => setTransferAmount(e.target.value)}
              className="w-full p-4 rounded-xl bg-gray-50 border-none font-bold text-sm shadow-inner"
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

const StatsView: React.FC<{ scans: ScanHistoryItem[]; currentCalTarget: number; profile: UserProfile | null; onBack: () => void }> = ({ scans, currentCalTarget, profile, onBack }) => {
  const chartData = useMemo(() => {
    const last7Days = Array.from({ length: 7 }, (_, i) => {
      const d = new Date();
      d.setDate(d.getDate() - i);
      return d.toDateString();
    }).reverse();
    
    return last7Days.map(date => {
      const dayScans = scans.filter(s => new Date(s.timestamp).toDateString() === date);
      const total = dayScans.reduce((acc, s) => acc + (s.calories || 0), 0);
      return { 
        name: date.split(' ')[0], 
        calories: total
      };
    });
  }, [scans]);

  return (
    <div className="pt-6 space-y-6 animate-fade-in pb-32 px-5 h-full overflow-y-auto no-scrollbar bg-[#F2F2F7]">
      <div className="flex items-center gap-3">
        <button onClick={onBack} className="p-3 bg-white rounded-2xl shadow-card active:scale-95 transition-all">
          <ArrowLeft size={18}/>
        </button>
        <h1 className="text-2xl font-black tracking-tight text-black">Insights</h1>
      </div>

      <div className="bg-white p-8 rounded-[40px] shadow-card border border-gray-100 space-y-6">
         <div className="flex justify-between items-center">
           <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-[0.3em] px-1">Calorie Trend</h3>
           <div className="bg-black text-white px-3 py-1 rounded-full text-[8px] font-black uppercase tracking-widest">Metabolism</div>
         </div>
         
         <div className="h-48 w-full flex items-end justify-between gap-2 px-1">
            {chartData.map((d, i) => {
              const maxCal = Math.max(...chartData.map(cd => cd.calories), currentCalTarget);
              const height = d.calories === 0 ? 8 : (d.calories / maxCal) * 100;
              const isOverTarget = d.calories > currentCalTarget;
              
              return (
                <div key={i} className="flex-1 flex flex-col items-center gap-3">
                  <div className="w-full bg-gray-50 rounded-2xl relative overflow-hidden group h-32">
                     <div 
                       className={`absolute bottom-0 left-0 right-0 transition-all duration-700 ease-out rounded-t-lg ${isOverTarget ? 'bg-orange-500' : 'bg-black'}`} 
                       style={{ height: `${height}%` }} 
                     />
                  </div>
                  <span className="text-[8px] font-black text-gray-400 uppercase">{d.name}</span>
                </div>
              );
            })}
         </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
         <div className="bg-white p-6 rounded-[32px] border border-gray-50 shadow-card text-center">
            <div className="text-[8px] font-black text-gray-400 uppercase tracking-widest mb-2">Avg. Health</div>
            <div className="text-3xl font-black tracking-tighter">
              {scans.length > 0 ? (scans.reduce((acc, s) => acc + (s.healthScore || 0), 0) / scans.length).toFixed(1) : '0.0'}
            </div>
         </div>
         <div className="bg-white p-6 rounded-[32px] border border-gray-50 shadow-card text-center">
            <div className="text-[8px] font-black text-gray-400 uppercase tracking-widest mb-2">Total Scans</div>
            <div className="text-3xl font-black tracking-tighter">{scans.length}</div>
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
  setIsAdmin: (v: boolean) => void;
  onUpdateUser: (uid: string, data: Partial<UserProfile>) => Promise<void>;
}> = ({ view, setView, allUsers, allPayments, allTransfers, adminSearch, setAdminSearch, setIsAdmin, onUpdateUser }) => {
  const [selectedUser, setSelectedUser] = useState<any | null>(null);
  const [editCoins, setEditCoins] = useState('');
  const [editPremium, setEditPremium] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);

  const filteredUsers = allUsers.filter(u => 
    u.name?.toLowerCase().includes(adminSearch.toLowerCase()) || 
    u.email?.toLowerCase().includes(adminSearch.toLowerCase()) ||
    u.uniqueTransferCode?.toLowerCase().includes(adminSearch.toLowerCase())
  );

  const totalCoinsInCirculation = useMemo(() => {
    return allUsers.reduce((acc, u) => acc + (u.points || 0), 0);
  }, [allUsers]);

  const handleEditUser = (user: any) => {
    setSelectedUser(user);
    setEditCoins(user.points?.toString() || '0');
    setEditPremium(user.isPremium || false);
    setView('admin_user_edit');
  };

  const saveUserChanges = async () => {
    if (!selectedUser) return;
    setIsUpdating(true);
    try {
      await onUpdateUser(selectedUser.uid, {
        points: parseInt(editCoins) || 0,
        isPremium: editPremium
      });
      setView('admin_users');
    } catch (e) {
      alert("Node update failed.");
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <div className="h-full flex flex-col bg-white overflow-hidden">
      <header className="p-6 border-b border-gray-100 flex justify-between items-center shrink-0">
        <div><h1 className="text-xl font-black tracking-tight">Admin Console</h1><p className="text-[8px] font-black text-red-500 uppercase tracking-widest">Restricted Access</p></div>
        <button onClick={() => { localStorage.removeItem('drfoodie_admin'); setIsAdmin(false); setView('home'); }} className="p-3 bg-gray-50 rounded-xl text-gray-400 active:scale-95 transition-all"><LogOut size={18}/></button>
      </header>
      
      <div className="flex-1 overflow-y-auto p-6 space-y-6 pb-32 no-scrollbar">
        {view === 'admin_dashboard' && (
          <div className="space-y-6 animate-fade-in">
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-black p-6 rounded-[32px] text-white">
                 <div className="text-[8px] font-black text-gray-500 uppercase mb-2">Active Nodes</div>
                 <div className="text-3xl font-black tracking-tighter">{allUsers.length}</div>
              </div>
              <div className="bg-gray-50 p-6 rounded-[32px] border border-gray-100">
                 <div className="text-[8px] font-black text-gray-400 uppercase mb-2">Pro Users</div>
                 <div className="text-3xl font-black text-black tracking-tighter">{allUsers.filter(u => u.isPremium).length}</div>
              </div>
            </div>
            
            <div className="bg-yellow-50 p-8 rounded-[40px] border border-yellow-100 text-center space-y-2 relative overflow-hidden group hover:bg-yellow-100 transition-all">
               <div className="absolute top-0 left-0 w-full h-full opacity-5 pointer-events-none bg-[radial-gradient(circle_at_50%_0%,rgba(234,179,8,0.3),transparent_70%)]" />
               <div className="text-[8px] font-black text-yellow-600 uppercase tracking-widest">Gems in Circulation</div>
               <div className="flex items-center justify-center gap-3">
                  <div className="text-4xl font-black text-yellow-700 tracking-tighter">{formatCoins(totalCoinsInCirculation)}</div>
                  <Gem size={24} className="text-yellow-500 animate-pulse" />
               </div>
            </div>

            <div className="space-y-3">
               <h3 className="text-[10px] font-black uppercase tracking-widest text-gray-400 px-1">Global Controls</h3>
               <div className="grid grid-cols-1 gap-2">
                 <button onClick={() => setView('admin_users')} className="bg-white p-5 rounded-[24px] border border-gray-100 flex justify-between items-center active:scale-95 transition-all">
                    <div className="flex items-center gap-3"><Users size={18} className="text-gray-400"/><span className="text-sm font-black">Node Database</span></div>
                    <ChevronRight size={16} className="text-gray-200" />
                 </button>
                 <button onClick={() => setView('admin_payments')} className="bg-white p-5 rounded-[24px] border border-gray-100 flex justify-between items-center active:scale-95 transition-all">
                    <div className="flex items-center gap-3"><DollarSign size={18} className="text-gray-400"/><span className="text-sm font-black">Transactions</span></div>
                    <ChevronRight size={16} className="text-gray-200" />
                 </button>
                 <button onClick={() => setView('admin_transfers')} className="bg-white p-5 rounded-[24px] border border-gray-100 flex justify-between items-center active:scale-95 transition-all">
                    <div className="flex items-center gap-3"><Send size={18} className="text-gray-400"/><span className="text-sm font-black">Peer Transfers</span></div>
                    <ChevronRight size={16} className="text-gray-200" />
                 </button>
               </div>
            </div>
          </div>
        )}

        {view === 'admin_users' && (
           <div className="space-y-4 animate-fade-in">
             <div className="flex items-center gap-3 mb-2">
               <button onClick={() => setView('admin_dashboard')} className="p-2 bg-gray-50 rounded-lg"><ArrowLeft size={16}/></button>
               <h2 className="text-lg font-black tracking-tight">Node Database</h2>
             </div>
             <div className="relative">
               <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-300" size={16} />
               <input type="text" placeholder="Search nodes..." value={adminSearch} onChange={(e) => setAdminSearch(e.target.value)} className="w-full pl-12 pr-4 py-4 bg-gray-50 rounded-2xl border-none font-bold text-sm shadow-inner" />
             </div>
             <div className="space-y-2">
               {filteredUsers.map((u: any) => (
                 <div key={u.uid} onClick={() => handleEditUser(u)} className="bg-white p-4 rounded-2xl border border-gray-100 flex justify-between items-center active:bg-gray-50 cursor-pointer transition-colors">
                   <div>
                     <div className="font-black text-sm">{u.name || 'Anonymous Agent'}</div>
                     <div className="text-[9px] text-gray-400 font-bold uppercase">{u.email}</div>
                     <div className="text-[7px] text-gray-300 font-bold uppercase tracking-widest mt-0.5">{u.uniqueTransferCode}</div>
                     <div className="text-[8px] font-black text-blue-500 uppercase tracking-widest mt-1 flex items-center gap-1"><Gem size={8}/> {formatCoins(u.points || 0)}</div>
                   </div>
                   <div className="flex flex-col items-end gap-2">
                      <div className={`px-2 py-1 rounded-md text-[8px] font-black uppercase ${u.isPremium ? 'bg-black text-yellow-400' : 'bg-gray-50 text-gray-400'}`}>
                        {u.isPremium ? 'PRO' : 'FREE'}
                      </div>
                      <ChevronRight size={14} className="text-gray-200" />
                   </div>
                 </div>
               ))}
             </div>
           </div>
        )}

        {view === 'admin_user_edit' && selectedUser && (
           <div className="space-y-6 animate-fade-in">
             <div className="flex items-center gap-3 mb-2">
               <button onClick={() => setView('admin_users')} className="p-2 bg-gray-50 rounded-lg"><ArrowLeft size={16}/></button>
               <h2 className="text-lg font-black tracking-tight">Edit Node</h2>
             </div>
             
             <div className="bg-gray-50 p-6 rounded-[32px] border border-gray-100 space-y-1">
                <div className="text-[8px] font-black text-gray-400 uppercase tracking-widest">AGENT IDENTITY</div>
                <div className="text-xl font-black">{selectedUser.name || 'Anonymous'}</div>
                <div className="text-[10px] text-gray-500 font-bold">{selectedUser.email}</div>
             </div>

             <div className="space-y-4">
               <div>
                  <label className="block text-[8px] font-black uppercase text-gray-400 mb-2 tracking-widest px-1">Gems Balance</label>
                  <div className="relative">
                    <Gem className="absolute left-4 top-1/2 -translate-y-1/2 text-yellow-500" size={18} />
                    <input 
                      type="number" 
                      value={editCoins} 
                      onChange={(e) => setEditCoins(e.target.value)}
                      className="w-full pl-12 pr-4 py-4 bg-gray-50 rounded-[20px] border-none font-black text-lg shadow-inner focus:ring-1 focus:ring-black"
                    />
                  </div>
               </div>

               <div className="bg-white p-5 rounded-[28px] border border-gray-100 flex items-center justify-between shadow-sm">
                  <div className="flex items-center gap-4">
                     <Crown className={editPremium ? 'text-yellow-500' : 'text-gray-300'} size={20} />
                     <span className="text-sm font-black">Pro Status</span>
                  </div>
                  <button 
                    onClick={() => setEditPremium(!editPremium)}
                    className={`w-14 h-8 rounded-full relative transition-all duration-300 p-1 ${editPremium ? 'bg-black' : 'bg-gray-200'}`}
                  >
                     <div className={`w-6 h-6 bg-white rounded-full shadow-sm transition-all duration-300 ${editPremium ? 'translate-x-6' : 'translate-x-0'}`} />
                  </button>
               </div>
             </div>

             <button 
               onClick={saveUserChanges}
               disabled={isUpdating}
               className="w-full bg-black text-white py-5 rounded-[24px] font-black text-sm shadow-xl flex items-center justify-center gap-2 active:scale-95 transition-all disabled:opacity-50"
             >
               {isUpdating ? <Loader2 className="animate-spin" size={20}/> : <><Save size={20}/> Deploy Updates</>}
             </button>
           </div>
        )}

        {(view === 'admin_payments' || view === 'admin_transfers') && (
           <div className="space-y-4 animate-fade-in">
             <div className="flex items-center gap-3 mb-2">
               <button onClick={() => setView('admin_dashboard')} className="p-2 bg-gray-50 rounded-lg"><ArrowLeft size={16}/></button>
               <h2 className="text-lg font-black tracking-tight">{view === 'admin_payments' ? 'Transactions' : 'Peer Transfers'}</h2>
             </div>
             <div className="space-y-2">
               {(view === 'admin_payments' ? allPayments : allTransfers).map((item: any) => (
                 <div key={item.id} className="bg-white p-4 rounded-2xl border border-gray-100">
                    <div className="flex justify-between items-start">
                       <div>
                         <div className="text-[10px] font-black">{item.userName || item.senderName || 'Unknown Agent'}</div>
                         <div className="text-[8px] text-gray-400 font-bold uppercase">{new Date(item.timestamp?.seconds * 1000 || Date.now()).toLocaleString()}</div>
                       </div>
                       <div className="text-right">
                          <div className="text-sm font-black tracking-tight">{item.amount ? `₹${item.amount}` : `${item.coins || 0} Gem`}</div>
                          {item.recipientCode && <div className="text-[7px] font-bold text-blue-500 uppercase tracking-widest mt-0.5">TO: {item.recipientCode}</div>}
                       </div>
                    </div>
                 </div>
               ))}
             </div>
           </div>
        )}
      </div>
    </div>
  );
};

const TeamSection: React.FC<{ onBack: () => void }> = ({ onBack }) => {
  return (
    <div className="pt-6 space-y-6 animate-fade-in pb-32 px-5 h-full overflow-y-auto no-scrollbar bg-[#F2F2F7]">
      <div className="flex items-center gap-3">
        <button onClick={onBack} className="p-3 bg-white rounded-2xl shadow-card active:scale-95 transition-all">
          <ArrowLeft size={18}/>
        </button>
        <h1 className="text-3xl font-black tracking-tight text-black">The Team</h1>
      </div>

      <div className="space-y-8 mt-4">
        {/* Founder Card */}
        <div className="bg-black text-white p-10 rounded-[45px] relative overflow-hidden shadow-2xl transition-transform hover:scale-[1.02] active:scale-100">
           <div className="absolute top-6 right-8 opacity-20 pointer-events-none">
              <Crown size={80} className="text-white" strokeWidth={1} />
           </div>
           <div className="relative z-10 space-y-2">
              <div className="text-[10px] font-black text-gray-500 uppercase tracking-[0.4em]">FOUNDER</div>
              <h2 className="text-4xl font-black tracking-tighter leading-tight">Charan Ravanam</h2>
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Founder and CEO</p>
           </div>
        </div>

        <div className="bg-white rounded-[45px] p-8 shadow-card border border-gray-50 space-y-6">
           <div className="flex items-center gap-3">
              <Users size={18} className="text-gray-300" />
              <div className="text-[10px] font-black text-gray-400 uppercase tracking-[0.3em]">CORE TEAM MEMBERS</div>
           </div>

           <div className="space-y-4">
              {[
                { name: 'Kranthi Madireddy', role: 'Core Team Member' },
                { name: 'Gagan Adithya Reddy', role: 'Core Team Member' }
              ].map((member, i) => (
                <div key={i} className="bg-gray-50/50 p-6 rounded-[32px] border border-gray-100 flex items-center gap-5 group transition-all hover:bg-white hover:shadow-sm">
                   <div className="w-14 h-14 bg-white rounded-full flex items-center justify-center font-black text-xl shadow-sm border border-gray-100 group-hover:scale-110 transition-transform">
                     {member.name.charAt(0)}
                   </div>
                   <div className="text-left">
                     <div className="text-base font-black tracking-tight leading-tight">{member.name}</div>
                     <div className="text-[8px] font-bold text-gray-400 uppercase tracking-[0.2em] mt-1">{member.role}</div>
                   </div>
                </div>
              ))}
           </div>
        </div>
      </div>
    </div>
  );
};

// --- Referral View Component ---
const ReferralView: React.FC<{ profile: UserProfile | null; onBack: () => void }> = ({ profile, onBack }) => {
  const [copied, setCopied] = useState(false);
  const referralCode = profile?.referralCode || '';

  const handleCopy = () => {
    navigator.clipboard.writeText(referralCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'Join Dr Foodie',
          text: `Join me on Dr Foodie using my referral code: ${referralCode}`,
          url: window.location.origin
        });
      } catch (err) {
        console.error(err);
      }
    } else {
      handleCopy();
    }
  };

  return (
    <div className="pt-6 space-y-6 animate-fade-in pb-32 px-5 h-full overflow-y-auto no-scrollbar bg-[#F2F2F7]">
      <div className="flex items-center gap-3">
        <button onClick={onBack} className="p-3 bg-white rounded-2xl shadow-card active:scale-95 transition-all">
          <ArrowLeft size={18}/>
        </button>
        <h1 className="text-2xl font-black tracking-tight text-black">Referral</h1>
      </div>

      <div className="bg-black text-white p-8 rounded-[40px] text-center relative overflow-hidden shadow-2xl">
         <div className="absolute top-0 left-0 w-full h-full opacity-10 pointer-events-none bg-[radial-gradient(circle_at_50%_0%,rgba(255,255,255,0.5),transparent_70%)]" />
         <div className="w-16 h-16 bg-white/10 rounded-full flex items-center justify-center mx-auto mb-4 border border-white/10">
            <Gift className="text-yellow-400" size={32} />
         </div>
         <h2 className="text-2xl font-black mb-2 uppercase tracking-tight">Expand the Network</h2>
         <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mb-6">Earn 100 Gems for every node established.</p>
         
         <div className="bg-white/5 border border-white/10 rounded-2xl p-4 mb-4 flex items-center justify-between">
            <span className="text-xl font-black tracking-widest">{referralCode}</span>
            <button onClick={handleCopy} className="text-[9px] font-black uppercase tracking-widest bg-white text-black px-4 py-2 rounded-xl active:scale-90 transition-all">
              {copied ? 'Copied' : 'Copy'}
            </button>
         </div>
      </div>

      <div className="space-y-3">
         <button onClick={handleShare} className="w-full bg-white p-6 rounded-[28px] border border-gray-100 shadow-sm flex items-center justify-between active:scale-95 transition-all">
            <div className="flex items-center gap-4">
               <Share size={18} className="text-black/40"/>
               <span className="text-sm font-black text-gray-700">Share Protocol</span>
            </div>
            <ChevronRight size={16} className="text-gray-200" />
         </button>
      </div>

      <div className="bg-blue-50 p-6 rounded-[32px] border border-blue-100">
         <div className="flex gap-4 items-start">
            <Info className="text-blue-500 shrink-0" size={20} />
            <p className="text-[11px] font-bold text-blue-700 leading-relaxed uppercase tracking-tight">
              Airdrop multipliers are granted for active nodes in your direct network down to 3 levels deep.
            </p>
         </div>
      </div>
    </div>
  );
};

const WorkoutPlanView: React.FC<{ routine: Exercise[]; isGenerating: boolean; onBack: () => void }> = ({ routine, isGenerating, onBack }) => {
  if (isGenerating) {
    return (
      <div className="h-full flex flex-col items-center justify-center p-10 space-y-6 text-center animate-pulse">
        <div className="w-20 h-20 bg-black rounded-[32px] flex items-center justify-center shadow-2xl"><Loader2 className="animate-spin text-white" size={40} /></div>
        <div className="space-y-2">
          <h2 className="text-2xl font-black tracking-tight uppercase">Computing Routine</h2>
          <p className="text-gray-400 text-[10px] font-black uppercase tracking-[0.3em]">Mapping Metabolic Response...</p>
        </div>
      </div>
    );
  }
  return (
    <div className="pt-6 space-y-6 animate-fade-in pb-32 px-5 h-full overflow-y-auto no-scrollbar bg-[#F2F2F7]">
      <div className="flex items-center gap-3">
        <button onClick={onBack} className="p-3 bg-white rounded-2xl shadow-card active:scale-95 transition-all">
          <ArrowLeft size={18}/>
        </button>
        <h1 className="text-2xl font-black tracking-tight text-black">Routine</h1>
      </div>
      <div className="space-y-4">
        {routine.length === 0 ? (
          <div className="text-center py-20 bg-white rounded-[40px] border border-gray-100 p-8 shadow-card space-y-4">
            <Activity size={48} className="mx-auto text-gray-200" />
            <p className="text-sm font-bold text-gray-400 uppercase tracking-widest">No Routine Established</p>
            <button onClick={onBack} className="bg-black text-white px-6 py-3 rounded-xl font-black text-[10px] uppercase tracking-widest">Re-Compute Node</button>
          </div>
        ) : routine.map((ex, i) => (
          <div key={ex.id || i} className="bg-white p-6 rounded-[36px] shadow-card border border-gray-100 space-y-4 group">
            <div className="flex justify-between items-start gap-4">
               <div className="flex-1">
                 <div className="bg-black text-white px-3 py-1 rounded-full text-[8px] font-black tracking-widest inline-block mb-2">STEP 0{i+1}</div>
                 <h3 className="text-lg font-black tracking-tight leading-tight">{ex.name}</h3>
                 <div className="flex items-center gap-1.5 bg-gray-50 px-2 py-0.5 rounded-full border border-gray-100 w-fit mt-2">
                    <Flame size={10} className="text-orange-500 fill-orange-500"/>
                    <span className="text-[10px] font-black">{ex.sets} × {ex.reps}</span>
                 </div>
               </div>
               {ex.imageUrl && (
                 <div className="w-24 h-24 rounded-2xl bg-gray-50 border border-gray-100 overflow-hidden shrink-0 shadow-sm aspect-square">
                   <img src={ex.imageUrl} alt={ex.name} className="w-full h-full object-cover" />
                 </div>
               )}
            </div>
            <div>
              <p className="text-gray-500 text-[11px] font-medium leading-relaxed">{ex.description}</p>
            </div>
            <div className="flex flex-wrap gap-1.5 pt-2">
               {ex.muscleGroups.map((mg, j) => (
                 <span key={j} className="text-[7px] font-black uppercase tracking-widest bg-gray-50 text-gray-400 px-2 py-1 rounded-md border border-gray-100">{mg}</span>
               ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

const AnalysisDetailView: React.FC<{ analysis: ScanHistoryItem | null; isAnalyzing: boolean; onBack: () => void; onDelete: () => void }> = ({ analysis, isAnalyzing, onBack, onDelete }) => {
  if (!analysis) return null;
  return (
    <div className="h-full flex flex-col animate-fade-in overflow-hidden bg-[#F2F2F7]">
      <div className="relative h-2/5 shrink-0">
        <img src={analysis.imageUrl} className="w-full h-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/20" />
        <button onClick={onBack} className="absolute top-8 left-6 p-4 bg-black/20 backdrop-blur-md rounded-2xl text-white active:scale-95 transition-all"><ArrowLeft size={20}/></button>
        <button onClick={onDelete} className="absolute top-8 right-6 p-4 bg-red-500/20 backdrop-blur-md rounded-2xl text-red-400 active:scale-95 transition-all"><Trash2 size={20}/></button>
        <div className="absolute bottom-8 left-8 right-8">
           <div className="text-[10px] font-black text-white/50 uppercase tracking-[0.4em] mb-2">{analysis.mealType} • {new Date(analysis.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
           <h1 className="text-4xl font-black text-white tracking-tighter leading-none">{analysis.foodName}</h1>
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
            <div key={i} className="bg-white p-3 rounded-[24px] text-center border border-gray-100 shadow-sm flex flex-col items-center justify-center">
               <div className="mb-1 text-black/10">{stat.icon}</div>
               <div className="text-sm font-black tracking-tighter leading-none">{stat.val}</div>
               <div className="text-[7px] font-black text-gray-700 uppercase tracking-tight mt-1 leading-none text-center">{stat.label}</div>
               <div className="text-[6px] font-black text-gray-300 uppercase tracking-widest mt-0.5">{stat.unit}</div>
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
             {analysis.alternatives?.map((alt, i) => (
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

const ClarificationModal: React.FC<{
  question: string;
  onAnswer: (ans: string) => void;
  onApprox: () => void;
  onCancel: () => void;
}> = ({ question, onAnswer, onApprox, onCancel }) => {
  const [answer, setAnswer] = useState('');
  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center p-6 bg-black/80 backdrop-blur-lg animate-fade-in">
      <div className="bg-white rounded-[40px] w-full max-w-sm overflow-hidden p-8 space-y-6 shadow-2xl border border-white/20">
        <div className="text-center space-y-2">
          <div className="w-14 h-14 bg-blue-50 rounded-2xl flex items-center justify-center mx-auto mb-3">
            <HelpCircle className="text-blue-500" size={28} />
          </div>
          <h2 className="text-2xl font-black tracking-tight">Need Details</h2>
          <p className="text-[11px] text-gray-500 font-bold uppercase tracking-widest leading-relaxed px-2 text-center">{question}</p>
        </div>
        
        <textarea
          value={answer}
          onChange={(e) => setAnswer(e.target.value.substring(0, 200))}
          placeholder="e.g. It's a chicken salad with olive oil dressing"
          className="w-full p-5 rounded-3xl bg-gray-50 border-none font-bold text-sm shadow-inner min-h-[120px] focus:ring-1 focus:ring-black transition-all resize-none shadow-inner"
        />

        <div className="space-y-3">
          <button
            onClick={() => onAnswer(answer)}
            disabled={!answer.trim()}
            className="w-full bg-black text-white py-4 rounded-2xl font-black text-sm shadow-xl active:scale-95 transition-all disabled:opacity-30"
          >
            Update Metabolic Node
          </button>
          
          <div className="grid grid-cols-2 gap-3">
            <button onClick={onApprox} className="bg-gray-100 text-gray-500 py-4 rounded-2xl font-black text-[9px] uppercase tracking-[0.2em] active:scale-95 transition-all">Approximate</button>
            <button onClick={onCancel} className="bg-white border border-gray-100 text-gray-400 py-4 rounded-2xl font-black text-[9px] uppercase tracking-[0.2em] active:scale-95 transition-all">Cancel</button>
          </div>
        </div>
      </div>
    </div>
  );
};

const WorkoutLocationView: React.FC<{ onBack: () => void; onSelect: (loc: WorkoutLocation) => void }> = ({ onBack, onSelect }) => {
  return (
    <div className="pt-6 space-y-6 animate-fade-in pb-32 px-5 h-full overflow-y-auto no-scrollbar bg-[#F2F2F7]">
      <div className="flex items-center gap-3">
        <button onClick={onBack} className="p-3 bg-white rounded-2xl shadow-card active:scale-95 transition-all">
          <ArrowLeft size={18}/>
        </button>
        <h1 className="text-2xl font-black tracking-tight text-black">Training Node</h1>
      </div>
      <div className="grid grid-cols-1 gap-4">
        {[
          { id: WorkoutLocation.HOME, icon: <Home size={24}/>, label: 'Home Protocol', desc: 'Metabolic bodyweight routines.' },
          { id: WorkoutLocation.GYM, icon: <Dumbbell size={24}/>, label: 'Gym Protocol', desc: 'Full machine protocol access.' }
        ].map(loc => (
          <button key={loc.id} onClick={() => onSelect(loc.id)} className="bg-white p-8 rounded-[40px] border border-gray-100 shadow-card flex flex-col items-center text-center gap-4 active:scale-95 transition-all group">
            <div className="w-16 h-16 bg-gray-50 rounded-[28px] flex items-center justify-center group-hover:bg-black group-hover:text-white transition-colors">
              {loc.icon}
            </div>
            <div>
              <h3 className="text-xl font-black tracking-tight">{loc.label}</h3>
              <p className="text-xs text-gray-400 font-medium mt-1">{loc.desc}</p>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
};

const WorkoutFocusView: React.FC<{
  location: WorkoutLocation;
  selectedGroups: MuscleGroup[];
  onToggle: (group: MuscleGroup) => void;
  onGenerate: () => void;
  onBack: () => void;
}> = ({ location, selectedGroups, onToggle, onGenerate, onBack }) => {
  return (
    <div className="pt-6 space-y-6 animate-fade-in pb-32 px-5 h-full overflow-y-auto no-scrollbar bg-[#F2F2F7]">
      <div className="flex items-center gap-3">
        <button onClick={onBack} className="p-3 bg-white rounded-2xl shadow-card active:scale-95 transition-all">
          <ArrowLeft size={18}/>
        </button>
        <h1 className="text-2xl font-black tracking-tight text-black">Muscle Nodes</h1>
      </div>
      <div className="grid grid-cols-2 gap-3">
        {Object.values(MuscleGroup).map((mg) => (
          <button
            key={mg}
            onClick={() => onToggle(mg)}
            className={`p-5 rounded-[28px] border font-black text-[10px] uppercase tracking-widest transition-all ${selectedGroups.includes(mg) ? 'bg-black text-white border-black shadow-xl' : 'bg-white text-gray-400 border-gray-100 shadow-sm'}`}
          >
            {mg}
          </button>
        ))}
      </div>
      <button
        onClick={onGenerate}
        disabled={selectedGroups.length === 0}
        className="w-full bg-black text-white py-5 rounded-[28px] font-black text-sm shadow-2xl active:scale-95 transition-all disabled:opacity-30 disabled:active:scale-100 flex items-center justify-center gap-2 mt-4"
      >
        <Zap size={18} className="fill-white" /> Compute Routine
      </button>
    </div>
  );
};

const App: React.FC = () => {
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [view, setView] = useState<'home' | 'stats' | 'settings' | 'analysis' | 'camera' | 'team' | 'wallet' | 'refer' | 'admin_users' | 'admin_user_edit' | 'admin_payments' | 'admin_transfers' | 'admin_dashboard' | 'workout_location' | 'workout_focus' | 'workout_plan' | 'update_profile'>('home');
  const [scans, setScans] = useState<(ScanHistoryItem & { isPending?: boolean; hasError?: boolean })[]>([]);
  const [showPremium, setShowPremium] = useState(false);
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
          stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment', width: { ideal: 1920 }, height: { ideal: 1080 } } });
          if (videoRef.current) { videoRef.current.srcObject = stream; await videoRef.current.play(); }
        } catch (err) { console.error(err); setView('home'); }
      };
      initCamera();
    }
    return () => { if (stream) stream.getTracks().forEach(t => t.stop()); };
  }, [view]);

  useEffect(() => {
    const adminSession = localStorage.getItem('drfoodie_admin');
    if (adminSession === 'true') { setIsAdmin(true); if (view === 'home') setView('admin_dashboard'); }
    const unsub = onAuthStateChanged(auth, async (u) => {
      setLoading(true);
      if (u) { 
        setUser(u); 
        try {
          await fetchProfile(u); 
        } catch (err) {
          console.error("Profile initialization error:", err);
          if (!profile) setProfile({ isOnboarded: false } as UserProfile);
        }
      } 
      else { setUser(null); setProfile(null); }
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

  const handlePendingReferral = async (uId: string, profileData: UserProfile) => {
    const referralCode = localStorage.getItem(`pending_referral_${uId}`);
    if (referralCode && !profileData.hasClaimedSignupReferral) {
      try {
        const q = query(collection(db, "profiles"), where("referralCode", "==", referralCode.toUpperCase()));
        const snap = await getDocs(q);
        
        if (!snap.empty) {
          const referrerDoc = snap.docs[0];
          const referrerId = referrerDoc.id;
          
          if (referrerId !== uId) {
            await runTransaction(db, async (tx) => {
              tx.update(doc(db, "profiles", referrerId), { points: increment(REFERRAL_BONUS_SENDER) });
              tx.update(doc(db, "profiles", uId), { 
                points: increment(REFERRAL_BONUS_RECEIVER),
                hasClaimedSignupReferral: true,
                referredBy: referrerId
              });
            });
          }
        }
      } catch (e) {
        console.warn("Referral application skipped (permission or network):", e);
      } finally {
        localStorage.removeItem(`pending_referral_${uId}`);
      }
    }
  };

  const fetchProfile = async (u: FirebaseUser) => {
    try {
      const docSnap = await getDoc(doc(db, "profiles", u.uid));
      if (docSnap.exists()) {
        let pData = docSnap.data() as UserProfile;
        if (pData.isDisabled) { 
          alert("Node access terminated by protocol."); 
          signOut(auth); 
          return; 
        }
        
        await handlePendingReferral(u.uid, pData);
        
        const todayStr = new Date().toDateString();
        if (pData.lastLoginDate !== todayStr) {
          pData.currentStreak = (pData.lastLoginDate === new Date(Date.now() - 86400000).toDateString()) ? (pData.currentStreak || 0) + 1 : 1;
          pData.lastLoginDate = todayStr;
          await updateDoc(doc(db, "profiles", u.uid), { 
            currentStreak: pData.currentStreak, 
            lastLoginDate: todayStr, 
            email: u.email || '' 
          });
        }
        if (pData.lastScanResetDate !== todayStr) { 
          pData.scansUsedToday = 0; 
          pData.lastScanResetDate = todayStr; 
          await updateDoc(doc(db, "profiles", u.uid), { scansUsedToday: 0, lastScanResetDate: todayStr }); 
        }
        
        const updatedSnap = await getDoc(doc(db, "profiles", u.uid));
        setProfile(updatedSnap.data() as UserProfile);
        
        const qScans = query(collection(db, "profiles", u.uid, "scans"), orderBy("timestamp", "desc"));
        const qs = await getDocs(qScans);
        const ls: ScanHistoryItem[] = [];
        qs.forEach(d => ls.push({ id: d.id, ...d.data() } as ScanHistoryItem));
        setScans(ls);
      } else {
        const newCode = `INR-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
        setProfile({ 
          isOnboarded: false, 
          name: '', 
          age: 0, 
          gender: Gender.MALE, 
          height: 0, 
          weight: 0, 
          targetWeight: 0, 
          durationWeeks: 12, 
          goal: Goal.MAINTAIN, 
          referralCode: u.uid.substring(0,8).toUpperCase(), 
          points: 0, 
          uniqueTransferCode: newCode, 
          currentStreak: 1, 
          lastLoginDate: new Date().toDateString(), 
          email: u.email || '' 
        } as UserProfile);
      }
    } catch (e) { 
      console.error("Profile fetch error:", e); 
      if (!profile) setProfile({ isOnboarded: false } as UserProfile);
    }
  };

  const saveProfile = async (data: Partial<UserProfile>) => {
    if (!user) return;
    try {
      const updated = { ...profile, ...data };
      await setDoc(doc(db, "profiles", user.uid), updated, { merge: true });
      setProfile(updated as UserProfile);
      setView('home'); 
    } catch (err) {
      console.error("Save profile error:", err);
      alert("Failed to sync metabolic metrics.");
    }
  };

  const handleUpgrade = async () => {
    if (!user || !profile) return;
    try {
      await runTransaction(db, async (tx) => {
        tx.update(doc(db, "profiles", user.uid), { isPremium: true });
        if (profile.referredBy) {
          tx.update(doc(db, "profiles", profile.referredBy), { points: increment(REFERRAL_BONUS_PREMIUM) });
        }
        tx.set(doc(collection(db, "payments")), { 
          uid: user.uid, 
          userName: profile.name, 
          amount: 49, 
          timestamp: Timestamp.now() 
        });
      });
      setProfile(prev => prev ? { ...prev, isPremium: true } : null);
      setShowPremium(false);
      alert("Pro Protocol Established.");
    } catch (e) {
      console.error("Upgrade error:", e);
      alert("Upgrade failed. Check network stability.");
    }
  };

  const processImage = async (base64: string, clarification?: string) => {
    if (!user || !profile) return;
    if (!profile.isPremium && (profile.scansUsedToday || 0) >= MAX_FREE_SCANS_PER_DAY) { setShowPremium(true); return; }
    
    const tempId = `temp-${Date.now()}`;
    let optimizedBase64 = base64;
    
    try {
      optimizedBase64 = await resizeImage(base64);
    } catch (e) {
      console.warn("Resize failed, using original source:", e);
    }
    
    const pendingItem: any = {
      id: tempId,
      imageUrl: optimizedBase64,
      timestamp: new Date().toISOString(),
      isPending: true,
      foodName: 'Analysis in Progress...',
      calories: 0, protein: 0, carbs: 0, fat: 0, healthScore: 0,
      microAnalysis: 'Scanning metabolic nodes...',
      mealType: 'Snack',
      alternatives: []
    };

    setScans(prev => [pendingItem, ...prev]);
    setSelectedDate(new Date().toDateString());
    setView('home');

    try {
      const base64Data = optimizedBase64.includes(',') ? optimizedBase64.split(',')[1] : optimizedBase64;
      const result = await analyzeFoodImage(base64Data, profile, clarification);
      
      if (result.needsClarification) { 
        setClarificationQuestion(result.clarificationQuestion); 
        setPendingImage(optimizedBase64); 
        setScans(prev => prev.filter(s => s.id !== tempId));
        return; 
      }
      
      const scanItem: Omit<ScanHistoryItem, 'id'> = { 
        ...result, 
        imageUrl: optimizedBase64, 
        timestamp: new Date().toISOString(),
        mealType: result.mealType || 'Snack',
        alternatives: result.alternatives || []
      };
      
      const docRef = await addDoc(collection(db, "profiles", user.uid, "scans"), scanItem);
      const newScan = { id: docRef.id, ...scanItem } as ScanHistoryItem;
      
      await updateDoc(doc(db, "profiles", user.uid), { 
        scansUsedToday: increment(1), 
        points: increment(COINS_PER_SCAN) 
      });
      
      setScans(prev => prev.map(s => s.id === tempId ? newScan : s));
      setProfile(prev => prev ? { ...prev, scansUsedToday: (prev.scansUsedToday || 0) + 1, points: (prev.points || 0) + COINS_PER_SCAN } : null);
    } catch (err) { 
      console.error("Background Scan Error:", err);
      setScans(prev => prev.map(s => s.id === tempId ? { ...s, isPending: false, hasError: true, foodName: 'Scan Failed' } : s));
    }
  };

  const handleTransfer = async (code: string, coins: number) => {
    if (!user || !profile || !code || coins <= 0) return;
    if ((profile.points || 0) < coins) { alert("Insufficient assets."); return; }
    try {
      const q = query(collection(db, "profiles"), where("uniqueTransferCode", "==", code));
      const snap = await getDocs(q);
      if (snap.empty) { alert("Recipient node not found."); return; }
      const recipientDoc = snap.docs[0];
      if (recipientDoc.id === user.uid) { alert("Loopback rejected."); return; }
      await runTransaction(db, async (tx) => {
        tx.update(doc(db, "profiles", user.uid), { points: increment(-coins) });
        tx.update(doc(db, "profiles", recipientDoc.id), { points: increment(coins) });
        tx.set(doc(collection(db, "transfers")), { 
          senderId: user.uid, 
          senderName: profile.name, 
          recipientCode: code, 
          coins, 
          timestamp: Timestamp.now() 
        });
      });
      setProfile(prev => prev ? { ...prev, points: (prev.points || 0) - coins } : null);
      alert("Peer transfer authorized.");
    } catch (e) { alert("Vault node unreachable."); }
  };

  const adminUpdateUser = async (uid: string, data: Partial<UserProfile>) => {
    try {
      await updateDoc(doc(db, "profiles", uid), data);
      alert("Node metrics updated.");
    } catch (e) {
      console.error(e);
      throw e;
    }
  };

  const captureImage = () => {
    if (videoRef.current && canvasRef.current) {
      const context = canvasRef.current.getContext('2d');
      if (context) {
        canvasRef.current.width = videoRef.current.videoWidth;
        canvasRef.current.height = videoRef.current.videoHeight;
        context.drawImage(videoRef.current, 0, 0);
        processImage(canvasRef.current.toDataURL('image/jpeg', 0.7));
      }
    }
  };

  const handleGenerateWorkout = async () => {
    if (!selectedLocation || !profile) return;
    setIsGeneratingRoutine(true); 
    setView('workout_plan'); 
    try { 
      const r = await generateWorkoutRoutine(selectedLocation, selectedMuscleGroups, profile); 
      setCurrentRoutine(r); 
    } catch (e) { 
      console.error("Workout flow error:", e);
      alert("Neural training node failed. Try fewer muscle groups.");
      setView('workout_focus'); 
    } finally { 
      setIsGeneratingRoutine(false); 
    } 
  };

  const currentCalTarget = useMemo(() => {
    if (!profile) return 2000;
    const s = profile.gender === Gender.FEMALE ? -161 : 5;
    const bmr = (10 * profile.weight) + (6.25 * profile.height) - (5 * (profile.age || 25)) + s;
    const maintenance = Math.round(bmr * 1.375);
    return profile.goal === Goal.LOSE_WEIGHT ? maintenance - 500 : profile.goal === Goal.GAIN_WEIGHT ? maintenance + 500 : maintenance;
  }, [profile]);

  if (loading) return <div className="min-h-screen bg-white flex items-center justify-center"><Loader2 className="animate-spin text-black/20" size={36}/></div>;
  if (!isAdmin && !user) return <Auth onAdminLogin={(status) => { setIsAdmin(status); if(status) { localStorage.setItem('drfoodie_admin', 'true'); setView('admin_dashboard'); } }} />;
  if (!isAdmin && user && profile && !profile.isOnboarded) return <Onboarding onComplete={p => saveProfile({ ...p, isOnboarded: true, referralCode: user.uid.substring(0,8).toUpperCase() })} />;

  return (
    <div className="max-w-md mx-auto min-h-screen bg-[#F2F2F7] text-black relative shadow-2xl flex flex-col font-sans overflow-hidden">
      <canvas ref={canvasRef} className="hidden" />
      <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={(e) => { const f = e.target.files?.[0]; if (f) { const r = new FileReader(); r.onload = () => processImage(r.result as string); r.readAsDataURL(f); } }} />
      <div className="flex-1 overflow-hidden h-full">
        {isAdmin ? <AdminPanel view={view} setView={setView} allUsers={allUsers} allPayments={allPayments} allTransfers={allTransfers} adminSearch={adminSearch} setAdminSearch={setAdminSearch} setIsAdmin={setIsAdmin} onUpdateUser={adminUpdateUser} /> : (
          <div className="animate-fade-in px-0 h-full overflow-hidden">
            {view === 'home' && (
              <div className="pt-5 h-full overflow-y-auto no-scrollbar pb-32 px-5">
                <header className="flex justify-between items-center mb-6">
                  <div className="flex items-center gap-2"><div className="w-8 h-8 bg-black rounded-lg flex items-center justify-center shadow-lg"><Lightning size={16} className="text-white fill-white"/></div><h1 className="text-xl font-black tracking-tighter">Dr Foodie</h1></div>
                  <div className="flex gap-2"><div className="bg-white px-3 py-1.5 rounded-full flex items-center gap-1.5 shadow-sm border border-gray-100"><Flame size={12} className="text-orange-500 fill-orange-500"/><span className="text-[10px] font-black">{profile?.currentStreak || 0}</span></div><button onClick={()=>setShowPremium(true)} className={`px-3 py-1.5 rounded-full text-[9px] font-black uppercase shadow-sm tracking-widest ${profile?.isPremium ? 'bg-black text-yellow-400' : 'bg-white text-black'}`}>{profile?.isPremium ? 'PRO' : `${MAX_FREE_SCANS_PER_DAY - (profile?.scansUsedToday || 0)} Free`}</button></div>
                </header>
                <div className="flex justify-between mb-6 overflow-x-auto no-scrollbar py-2 gap-3">
                  {Array.from({ length: 7 }, (_, i) => { const d = new Date(); d.setDate(d.getDate() - (3 - i)); return d; }).map((d, i) => (
                    <button key={i} onClick={() => setSelectedDate(d.toDateString())} className={`flex flex-col items-center min-w-[52px] py-4 rounded-[22px] transition-all duration-300 ${d.toDateString() === selectedDate ? 'bg-black text-white shadow-xl scale-105' : 'bg-white text-gray-300 border border-gray-50'}`}><span className="text-[9px] font-black uppercase mb-1">{d.toLocaleDateString('en-US',{weekday:'short'}).charAt(0)}</span><span className="text-base font-black">{d.getDate()}</span></button>
                  ))}
                </div>
                <div className="bg-white p-8 rounded-[40px] shadow-card mb-6 flex items-center justify-between border border-gray-100"><div className="flex-1"><div className="flex items-baseline gap-1"><span className="text-5xl font-black tracking-tighter leading-none">{scans.filter(s => new Date(s.timestamp).toDateString() === selectedDate).reduce((acc, s) => acc + (s.calories || 0), 0)}</span><span className="text-base text-gray-300 font-bold">/{currentCalTarget}</span></div><div className="text-[8px] text-gray-400 font-black uppercase tracking-[0.3em] mt-3">ENERGY BUDGET</div></div><Activity className="text-black opacity-5" size={70} /></div>
                <div className="space-y-3">
                  {scans.filter(s => new Date(s.timestamp).toDateString() === selectedDate).length === 0 ? <div className="text-center py-16 text-gray-300 bg-white rounded-[40px] border-2 border-dashed border-gray-100 flex flex-col items-center gap-3 cursor-pointer active:scale-[0.98]" onClick={startCamera}><Camera size={36} className="opacity-10"/><p className="text-[9px] font-black uppercase tracking-[0.2em] opacity-40">Start New Scan</p></div> : scans.filter(s => new Date(s.timestamp).toDateString() === selectedDate).map(s => (
                    s.isPending ? (
                      <PendingScanCard key={s.id} imageUrl={s.imageUrl!} />
                    ) : (
                      <div key={s.id} onClick={()=>{setAnalysis(s); setView('analysis')}} className={`bg-white p-4 rounded-[30px] flex gap-4 shadow-card items-center border border-gray-50 active:scale-95 transition-all ${s.hasError ? 'border-red-100' : ''}`}>
                        <img src={s.imageUrl} className={`w-14 h-14 rounded-2xl object-cover shadow-sm ${s.hasError ? 'grayscale' : ''}`} />
                        <div className="flex-1 min-w-0">
                          <div className={`font-black text-sm tracking-tight truncate ${s.hasError ? 'text-red-500' : ''}`}>{s.foodName}</div>
                          <div className="text-[9px] text-gray-400 font-black uppercase tracking-widest mt-1">
                            {s.hasError ? 'Analysis Failed' : `${s.calories} kcal • ${s.protein}g P`}
                          </div>
                        </div>
                        {s.hasError ? <AlertCircle size={16} className="text-red-400" /> : <ChevronRight size={16} className="text-gray-200 flex-shrink-0"/>}
                      </div>
                    )
                  ))}
                </div>
              </div>
            )}
            {view === 'stats' && <StatsView scans={scans} currentCalTarget={currentCalTarget} profile={profile} onBack={() => setView('home')} />}
            {view === 'settings' && (
              <div className="pt-6 space-y-6 animate-fade-in pb-32 px-5 h-full overflow-y-auto no-scrollbar bg-[#F2F2F7]">
                <div className="flex items-center gap-3">
                  <button onClick={() => setView('home')} className="p-3 bg-white rounded-2xl shadow-card active:scale-95 transition-all"><ArrowLeft size={18}/></button>
                  <h1 className="text-2xl font-black tracking-tight text-black">Control</h1>
                </div>
                <div className="bg-white p-8 rounded-[40px] shadow-card border border-gray-100 flex items-center gap-4">
                   <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center border border-gray-100"><UserIcon size={24} className="text-black/20" /></div>
                   <div>
                      <h2 className="text-xl font-black">{profile?.name || 'Agent'}</h2>
                      <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{profile?.goal}</p>
                   </div>
                </div>
                <div className="space-y-2">
                   {[
                     { icon: <Edit3 size={18}/>, label: 'Update Metrics', action: () => setView('update_profile') },
                     { icon: <WalletIcon size={18}/>, label: 'Vault Access', action: () => setView('wallet') },
                     { icon: <Gift size={18}/>, label: 'Referral Nodes', action: () => setView('refer') },
                     { icon: <Crown size={18}/>, label: 'Go Pro', action: () => setShowPremium(true), hidden: profile?.isPremium },
                     { icon: <Users size={18}/>, label: 'Team Info', action: () => setView('team') },
                   ].filter(i => !i.hidden).map((item, i) => (
                     <button key={i} onClick={item.action} className="w-full bg-white p-5 rounded-[28px] flex items-center justify-between border border-gray-50 shadow-sm active:scale-95 transition-all">
                        <div className="flex items-center gap-4">
                           <div className="text-black/40">{item.icon}</div>
                           <span className="text-sm font-black text-gray-700">{item.label}</span>
                        </div>
                        <ChevronRight size={16} className="text-gray-200" />
                     </button>
                   ))}
                </div>
                <button onClick={() => signOut(auth)} className="w-full py-5 rounded-[28px] flex items-center justify-center gap-2 text-red-500 font-black text-xs uppercase tracking-widest mt-4">
                   <LogOut size={16}/> Terminate Session
                </button>
              </div>
            )}
            {view === 'update_profile' && <Onboarding onComplete={saveProfile} initialData={profile} onBack={() => setView('settings')} />}
            {view === 'team' && <TeamSection onBack={() => setView('settings')} />}
            {view === 'wallet' && <WalletForm profile={profile} onTransfer={handleTransfer} onBack={() => setView('settings')} />}
            {view === 'refer' && <ReferralView profile={profile} onBack={() => setView('settings')} />}
            {view === 'workout_location' && <WorkoutLocationView onBack={() => setView('home')} onSelect={(loc) => { setSelectedLocation(loc); setView('workout_focus'); }} />}
            {view === 'workout_focus' && <WorkoutFocusView location={selectedLocation!} selectedGroups={selectedMuscleGroups} onToggle={(g)=>setSelectedMuscleGroups(prev=>prev.includes(g)?prev.filter(x=>x!==g):[...prev, g])} onGenerate={handleGenerateWorkout} onBack={() => setView('workout_location')} />}
            {view === 'workout_plan' && <WorkoutPlanView routine={currentRoutine} isGenerating={isGeneratingRoutine} onBack={() => setView('workout_focus')} />}
            {view === 'analysis' && <AnalysisDetailView analysis={analysis} isAnalyzing={false} onBack={() => setView('home')} onDelete={async () => { if(confirm("Delete record?")) { await deleteDoc(doc(db, "profiles", user!.uid, "scans", analysis!.id)); setScans(prev => prev.filter(s => s.id !== analysis!.id)); setView('home'); } }} />}
          </div>
        )}
      </div>

      <nav className="fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur-2xl border-t border-gray-100 p-4 pb-8 flex justify-between items-center z-40 max-w-md mx-auto px-8 shadow-floating">
        <button onClick={()=>{setView(isAdmin ? 'admin_dashboard' : 'home')}} className={`transition-all ${(view==='home' || view==='admin_dashboard')?'text-black scale-110':'text-black/20'}`}><Home size={22}/></button>
        <button onClick={()=>{ if (isAdmin) setView('admin_dashboard'); else setView('workout_location'); }} className={`transition-all ${view.startsWith('workout')?'text-black scale-110':'text-black/20'}`}>{isAdmin ? <DollarSign size={22}/> : <Dumbbell size={22}/>}</button>
        <div className="relative -mt-12 flex justify-center z-50"><button onClick={()=>{ if (isAdmin) setView('admin_users'); else startCamera(); }} className="w-16 h-16 bg-black rounded-full flex items-center justify-center text-white border-[6px] border-[#F2F2F7] shadow-2xl active:scale-90 transition-all">{isAdmin ? <Users size={24}/> : <Plus size={32}/>}</button></div>
        <button onClick={()=>{ if (!isAdmin) setView('stats'); }} className={`transition-all ${view==='stats'?'text-black scale-110':'text-black/20'}`}><BarChart2 size={22}/></button>
        <button onClick={()=>setView('settings')} className={`transition-all ${view==='settings' || view === 'team' ?'text-black scale-110':'text-black/20'}`}><Settings size={22}/></button>
      </nav>

      {clarificationQuestion && pendingImage && <ClarificationModal question={clarificationQuestion} onAnswer={(ans) => processImage(pendingImage, ans)} onApprox={() => processImage(pendingImage, "Approximate")} onCancel={() => setClarificationQuestion(null)} />}
      <PremiumModal isOpen={showPremium} onClose={()=>setShowPremium(false)} onUpgrade={handleUpgrade} />
      {view === 'camera' && (
          <div className="fixed inset-0 z-[100] bg-black animate-fade-in flex flex-col">
            <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover" />
            <div className="absolute inset-0 flex flex-col justify-between p-8">
              <div className="flex justify-between pt-8"><button onClick={() => setView('home')} className="p-4 bg-white/10 backdrop-blur-lg rounded-full text-white"><X size={28}/></button><button onClick={() => fileInputRef.current?.click()} className="p-4 bg-white/10 backdrop-blur-lg rounded-full text-white"><Image size={28}/></button></div>
              <div className="flex justify-center pb-16"><button onClick={captureImage} className="w-24 h-24 bg-white rounded-full border-[8px] border-white/20 flex items-center justify-center active:scale-90 shadow-2xl"><div className="w-16 h-16 bg-black rounded-full flex items-center justify-center text-white"><ScanLine size={30}/></div></button></div>
            </div>
          </div>
      )}
    </div>
  );
};

export default App;
