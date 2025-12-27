
import React, { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import { 
  Home, BarChart2, Settings, Plus, Flame, ChevronRight, ArrowLeft, ArrowRight,
  Camera, User as UserIcon, Dumbbell, LogOut, Crown, Loader2, TrendingUp,
  Target, Zap, Activity, Clock, Trophy, CheckCircle2, X,
  ScanLine, Wallet as WalletIcon, Gift, Users, Coins, Send, 
  ShieldCheck, ShieldAlert, DollarSign, Search, History, Heart, 
  Mail, Key, Share, Sparkle, Ban, UserX, Gem, Lock, Zap as Lightning,
  Shield, Bell, HelpCircle, Info, ChevronDown, Image, MessageCircle, Trash2,
  Edit3, CreditCard, Save, AlertCircle, Banknote, Wallet, Smartphone,
  RefreshCw, BarChart3, LineChart, MoveUpRight, MoveDownLeft
} from 'lucide-react';
import { onAuthStateChanged, signOut, sendPasswordResetEmail, sendEmailVerification, reload } from 'firebase/auth';
import type { User as FirebaseUser } from 'firebase/auth';
import { 
  doc, getDoc, setDoc, collection, query, orderBy, getDocs, addDoc, deleteDoc, where, updateDoc, increment, onSnapshot, Timestamp, runTransaction, limit
} from 'firebase/firestore';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import Onboarding from './components/Onboarding';
import PremiumModal from './components/PremiumModal';
import Auth from './components/Auth';
import { UserProfile, ScanHistoryItem, Gender, Goal, WorkoutLocation, MuscleGroup, Exercise } from './types';
import { analyzeFoodImage, generateWorkoutRoutine } from './services/geminiService';
import { auth, db } from './services/firebase';

const MAX_FREE_SCANS_PER_DAY = 3;
const COINS_PER_SCAN = 5;
const WORKOUT_UNLOCK_COST = 500;
const REFERRAL_BONUS_SENDER = 100;
const REFERRAL_BONUS_RECEIVER = 50;
const REFERRAL_BONUS_PREMIUM = 250;
const GEM_VALUE_ESTIMATE = 8; // ₹8 per Gem

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
  if (num < 1000) return num.toString();
  if (num < 1000000) return (num / 1000).toFixed(1) + 'k';
  return (num / 1000000).toFixed(1) + 'M';
};

// --- Crypto Market Component ---

const CryptoMarketView: React.FC<{ profile: UserProfile | null; scans: ScanHistoryItem[]; currentCalTarget: number; onBack: () => void }> = ({ profile, scans, currentCalTarget, onBack }) => {
  const [fdyPrice, setFdyPrice] = useState(8.00);
  const [history, setHistory] = useState<{ time: string; price: number }[]>([]);
  const [loading, setLoading] = useState(true);

  // Strictly synchronized global price logic
  useEffect(() => {
    const marketDocRef = doc(db, "market", "state");
    
    // Listen to global market state
    const unsubscribe = onSnapshot(marketDocRef, (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.data();
        setFdyPrice(data.price || 8.00);
        if (data.history) setHistory(data.history);
      }
      setLoading(false);
    });

    // Heartbeat logic to maintain price movement globally
    // We update every 10 seconds if stale to ensure real-time global consistency
    const heartbeat = setInterval(async () => {
      try {
        await runTransaction(db, async (transaction) => {
          const sfDoc = await transaction.get(marketDocRef);
          const now = Date.now();
          
          if (!sfDoc.exists() || now - (sfDoc.data().lastUpdated || 0) > 10000) {
            const currentPrice = sfDoc.exists() ? sfDoc.data().price : 8.00;
            const history = sfDoc.exists() ? sfDoc.data().history : [];
            
            const volatility = 0.4;
            const change = (Math.random() - 0.48) * volatility; // Slight bias upward
            let newPrice = currentPrice + change;
            
            // Boundary constraints
            if (newPrice > 35) newPrice = 34.2;
            if (newPrice < 6) newPrice = 6.8;

            const timeLabel = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
            const newHistory = [...history.slice(-49), { time: timeLabel, price: newPrice }];

            transaction.set(marketDocRef, {
              price: newPrice,
              lastUpdated: now,
              history: newHistory
            }, { merge: true });
          }
        });
      } catch (e) {
        // Transactions fail silently if another client wins the race, which is fine.
      }
    }, 5000); // Check every 5s, but only update if 10s passed

    return () => {
      unsubscribe();
      clearInterval(heartbeat);
    };
  }, []);

  const isUptrend = useMemo(() => {
    if (history.length < 2) return true;
    return history[history.length - 1].price >= history[history.length - 2].price;
  }, [history]);

  const todayCalories = useMemo(() => {
    const todayStr = new Date().toDateString();
    return scans
      .filter(s => new Date(s.timestamp).toDateString() === todayStr)
      .reduce((acc, s) => acc + (s.calories || 0), 0);
  }, [scans]);

  return (
    <div className="pt-6 space-y-6 animate-fade-in pb-32 px-6 h-full overflow-y-auto no-scrollbar">
      <div className="flex items-center gap-3">
        <button onClick={onBack} className="p-3 bg-white rounded-2xl shadow-card active:scale-95 transition-all"><ArrowLeft size={18}/></button>
        <h1 className="text-2xl font-black tracking-tight text-black">Exchange</h1>
      </div>

      <div className="bg-white p-8 rounded-[48px] shadow-card border border-gray-100 overflow-hidden relative min-h-[360px] flex flex-col">
        {loading ? (
           <div className="flex-1 flex flex-col items-center justify-center gap-4">
              <Loader2 className="animate-spin text-black/10" size={32} />
              <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Uplinking to Network...</p>
           </div>
        ) : (
          <>
            <div className="flex justify-between items-start mb-8 relative z-10">
              <div>
                <div className="flex items-center gap-2 mb-1.5">
                  <div className="w-5 h-5 bg-black rounded-md flex items-center justify-center shadow-md">
                    <Coins size={10} className="text-yellow-400" />
                  </div>
                  <p className="text-[10px] font-black text-gray-400 uppercase tracking-[0.3em]">$FDY COIN / INR</p>
                </div>
                <div className="flex items-baseline gap-3">
                  <h2 className="text-6xl font-black tracking-tighter">₹{fdyPrice.toFixed(2)}</h2>
                  <div className={`flex items-center px-2 py-0.5 rounded-lg text-[10px] font-black ${isUptrend ? 'bg-green-50 text-green-600' : 'bg-red-50 text-red-600'}`}>
                    {isUptrend ? <TrendingUp size={12} className="mr-1"/> : <Activity size={12} className="mr-1 rotate-180"/>}
                    {isUptrend ? '+' : '-'}{((Math.random() * 1.2) + 0.1).toFixed(2)}%
                  </div>
                </div>
              </div>
              <div className="flex flex-col items-end gap-1">
                 <span className="text-[8px] font-black text-white bg-black px-2 py-1 rounded-md uppercase tracking-widest flex items-center gap-1.5 shadow-lg">
                    <div className="w-1 h-1 bg-green-500 rounded-full animate-pulse" /> Global Live
                 </span>
              </div>
            </div>

            <div className="h-64 w-full -mx-4 -mb-4 mt-auto">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={history}>
                  <defs>
                    <linearGradient id="chartGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor={isUptrend ? "#22C55E" : "#EF4444"} stopOpacity={0.15}/>
                      <stop offset="95%" stopColor={isUptrend ? "#22C55E" : "#EF4444"} stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <Area 
                    type="monotone" 
                    dataKey="price" 
                    stroke={isUptrend ? "#22C55E" : "#EF4444"} 
                    strokeWidth={3}
                    fillOpacity={1} 
                    fill="url(#chartGradient)" 
                    animationDuration={800}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </>
        )}
      </div>

      <div className="space-y-4">
        <h3 className="text-[10px] font-black text-gray-300 uppercase tracking-[0.3em] px-2">Personal Portfolio</h3>
        <div className="grid grid-cols-1 gap-3">
          <div className="bg-white p-6 rounded-[32px] shadow-card border border-gray-100 flex items-center justify-between active:scale-[0.98] transition-all">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-black text-white rounded-2xl flex items-center justify-center shadow-lg">
                <Activity size={20} />
              </div>
              <div>
                <p className="text-[10px] font-black text-gray-300 uppercase tracking-widest">Energy Budget</p>
                <p className="text-xl font-black tracking-tight">{todayCalories} / {currentCalTarget} <span className="text-[10px] text-gray-400">kcal</span></p>
              </div>
            </div>
            <div className="w-2 h-2 bg-black rounded-full animate-pulse" />
          </div>

          <div className="bg-white p-6 rounded-[32px] shadow-card border border-gray-100 flex items-center justify-between active:scale-[0.98] transition-all">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-orange-500 text-white rounded-2xl flex items-center justify-center shadow-lg">
                <Flame size={20} fill="white" />
              </div>
              <div>
                <p className="text-[10px] font-black text-gray-300 uppercase tracking-widest">Metabolic Chain</p>
                <p className="text-xl font-black tracking-tight">{profile?.currentStreak || 0} <span className="text-[10px] text-gray-400">DAYS</span></p>
              </div>
            </div>
            <TrendingUp size={16} className="text-green-500" />
          </div>

          <div className="bg-white p-6 rounded-[32px] shadow-card border border-gray-100 flex items-center justify-between active:scale-[0.98] transition-all">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-yellow-400 text-black rounded-2xl flex items-center justify-center shadow-lg">
                <Coins size={20} />
              </div>
              <div>
                <p className="text-[10px] font-black text-gray-300 uppercase tracking-widest">Holdings</p>
                <p className="text-xl font-black tracking-tight">{profile?.points || 0} <span className="text-[10px] text-gray-400">FDY</span></p>
              </div>
            </div>
            <div className="text-[9px] font-black text-gray-400 uppercase">Settled</div>
          </div>
        </div>
      </div>

      <div className="pt-2">
        <button 
          onClick={() => alert("Buying Coins will be available soon.")}
          className="w-full bg-black text-white py-7 rounded-[32px] font-black text-lg uppercase tracking-widest shadow-2xl flex items-center justify-center gap-4 active:scale-[0.98] transition-all"
        >
          <DollarSign size={24}/>
          Buy $FDY Coins
        </button>
      </div>
    </div>
  );
};

// --- Admin Sub-Components ---

const AdminDashboard: React.FC<{ onLogout: () => void }> = ({ onLogout }) => {
  const [adminTab, setAdminTab] = useState<'home' | 'transactions' | 'nodes' | 'stats' | 'settings'>('home');
  const [adminSubView, setAdminSubView] = useState<'none' | 'edit_node' | 'peer_transfers'>('none');
  
  const [users, setUsers] = useState<(UserProfile & { id: string })[]>([]);
  const [transfers, setTransfers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedUser, setSelectedUser] = useState<(UserProfile & { id: string }) | null>(null);
  
  const [editGems, setEditGems] = useState('0');
  const [editPro, setEditPro] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);

  useEffect(() => {
    const fetchAdminData = async () => {
      try {
        const uSnap = await getDocs(query(collection(db, "profiles"), limit(200)));
        const uList: (UserProfile & { id: string })[] = [];
        uSnap.forEach(d => uList.push({ id: d.id, ...d.data() } as any));
        setUsers(uList);

        const tSnap = await getDocs(query(collection(db, "transfers"), orderBy("timestamp", "desc"), limit(50)));
        const tList: any[] = [];
        tSnap.forEach(d => tList.push({ id: d.id, ...d.data() }));
        setTransfers(tList);
      } catch (e) {
        console.error("Failed to fetch administrative data", e);
      } finally {
        setLoading(false);
      }
    };
    fetchAdminData();
  }, []);

  const totalGems = users.reduce((acc, u) => acc + (u.points || 0), 0);
  const stats = {
    total: users.length,
    premium: users.filter(u => u.isPremium).length,
    gems: totalGems
  };

  const filteredUsers = users.filter(u => 
    u.name?.toLowerCase().includes(searchTerm.toLowerCase()) || 
    u.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    u.uniqueTransferCode?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleUpdateNode = async () => {
    if (!selectedUser) return;
    setIsUpdating(true);
    try {
      const updatedData = {
        points: parseInt(editGems) || 0,
        isPremium: editPro
      };
      await updateDoc(doc(db, "profiles", selectedUser.id), updatedData);
      setUsers(prev => prev.map(u => u.id === selectedUser.id ? { ...u, ...updatedData } : u));
      alert("Node metrics deployed successfully.");
      setAdminSubView('none');
      setAdminTab('nodes');
    } catch (e) {
      alert("Deployment failed.");
    } finally {
      setIsUpdating(false);
    }
  };

  const renderHeader = (title: string, showBack = false, customBackAction?: () => void) => (
    <div className="flex justify-between items-center mb-8 px-2 pt-4">
      <div className="flex items-center gap-4">
        {showBack && (
          <button 
            onClick={customBackAction || (() => setAdminSubView('none'))} 
            className="p-3 bg-white rounded-2xl shadow-sm border border-gray-50 active:scale-90 transition-all"
          >
            <ArrowLeft size={18} />
          </button>
        )}
        <div>
          <h1 className="text-3xl font-black tracking-tight leading-none">{title}</h1>
          <p className="text-[10px] font-black text-red-500 uppercase tracking-[0.2em] mt-1.5">RESTRICTED ACCESS</p>
        </div>
      </div>
      {!showBack && (
        <button onClick={onLogout} className="p-4 bg-[#F8F9FA] text-gray-400 rounded-[20px] active:scale-90 transition-all border border-gray-100">
          <LogOut size={20} />
        </button>
      )}
    </div>
  );

  // --- Admin Views ---

  const HomeView = (
    <div className="space-y-6 animate-fade-in">
      {renderHeader("Admin Console")}
      
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-black text-white p-10 rounded-[48px] flex flex-col justify-between aspect-[1.1/1]">
          <div className="text-[10px] font-black text-gray-500 uppercase tracking-widest">ACTIVE NODES</div>
          <div className="text-6xl font-black tracking-tighter">{stats.total}</div>
        </div>
        <div className="bg-[#F8F9FA] p-10 rounded-[48px] flex flex-col justify-between aspect-[1.1/1] border border-gray-100">
          <div className="text-[10px] font-black text-gray-300 uppercase tracking-widest">PRO USERS</div>
          <div className="text-6xl font-black tracking-tighter">{stats.premium}</div>
        </div>
      </div>

      <div className="bg-[#FFFCEB] p-10 rounded-[48px] border border-[#FFF9DB] text-center shadow-sm relative overflow-hidden">
        <div className="text-[10px] font-black text-[#8A7100] uppercase tracking-widest mb-4">GEMS IN CIRCULATION</div>
        <div className="flex items-center justify-center gap-3">
          <span className="text-6xl font-black tracking-tighter text-[#A18400]">{formatCoins(stats.gems)}</span>
          <Gem className="text-[#A18400] fill-[#A18400]" size={36} />
        </div>
      </div>

      <div className="space-y-4 pt-4">
        <h3 className="text-[11px] font-black text-gray-300 uppercase tracking-[0.3em] px-2">GLOBAL CONTROLS</h3>
        {[
          { icon: <Users size={22} className="text-gray-200"/>, label: 'Node Database', action: () => setAdminTab('nodes') },
          { icon: <DollarSign size={22} className="text-gray-200"/>, label: 'Transactions', action: () => setAdminTab('transactions') },
          { icon: <Send size={22} className="text-gray-200 rotate-[-15deg]"/>, label: 'Peer Transfers', action: () => setAdminSubView('peer_transfers') }
        ].map((ctrl, i) => (
          <button 
            key={i} 
            onClick={ctrl.action}
            className="w-full bg-white p-8 rounded-[32px] border border-gray-50 flex items-center justify-between shadow-sm active:scale-[0.98] transition-all"
          >
            <div className="flex items-center gap-6">
              {ctrl.icon}
              <span className="text-xl font-black tracking-tight">{ctrl.label}</span>
            </div>
            <ChevronRight size={20} className="text-gray-100" />
          </button>
        ))}
      </div>
    </div>
  );

  const NodesView = (
    <div className="space-y-6 animate-fade-in">
      {renderHeader("Node Database", adminTab !== 'nodes', () => setAdminTab('home'))}
      
      <div className="relative mb-6">
        <Search className="absolute left-6 top-1/2 -translate-y-1/2 text-gray-300" size={20} />
        <input 
          value={searchTerm} 
          onChange={e => setSearchTerm(e.target.value)}
          placeholder="Search nodes..." 
          className="w-full pl-16 pr-6 py-6 bg-[#F8F9FA] rounded-[28px] border-none font-bold text-base shadow-inner"
        />
      </div>

      <div className="space-y-4">
        {filteredUsers.map((u, i) => (
          <button 
            key={i} 
            onClick={() => { setSelectedUser(u); setEditGems((u.points || 0).toString()); setEditPro(!!u.isPremium); setAdminSubView('edit_node'); }}
            className="w-full bg-white p-8 rounded-[32px] border border-gray-100 shadow-card flex items-center gap-5 active:scale-95 transition-all">
            <div className="w-14 h-14 bg-gray-50 rounded-2xl flex items-center justify-center shrink-0 border border-gray-100"><UserIcon size={24} className="text-gray-300"/></div>
            <div className="flex-1 min-w-0">
               <div className="font-black text-base truncate">{u.name || 'Anonymous'}</div>
               <div className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">{u.points || 0} FDY • {u.isPremium ? 'PRO' : 'FREE'}</div>
            </div>
            <ChevronRight size={18} className="text-gray-200" />
          </button>
        ))}
      </div>
    </div>
  );

  const PeerTransfersView = (
    <div className="space-y-6 animate-fade-in">
      {renderHeader("Peer Transfers", true)}
      <div className="space-y-4">
        {transfers.map((t, i) => (
          <div key={i} className="bg-white p-8 rounded-[32px] border border-gray-100 shadow-sm overflow-hidden">
             <div className="p-6">
                <div className="flex justify-between items-start mb-2">
                  <h4 className="text-xl font-black tracking-tight">{t.fromName}</h4>
                  <div className="text-2xl font-black tracking-tighter">{t.amount} FDY</div>
                </div>
                <div className="text-[11px] font-bold text-gray-300 uppercase mb-4">
                  {t.timestamp?.toDate ? t.timestamp.toDate().toLocaleString() : new Date(t.timestamp).toLocaleString()}
                </div>
                <div className="text-[10px] font-black text-black uppercase tracking-widest bg-gray-100 px-3 py-1.5 rounded-lg inline-block">TO: {t.toCode}</div>
             </div>
          </div>
        ))}
      </div>
    </div>
  );

  const EditNodeView = (
    <div className="space-y-8 animate-fade-in">
      {renderHeader("Edit Node", true)}

      <div className="bg-[#F8F9FA] p-10 rounded-[48px] border border-gray-50">
        <div className="text-[10px] font-black text-gray-300 uppercase tracking-[0.4em] mb-4">AGENT IDENTITY</div>
        <h2 className="text-4xl font-black tracking-tighter mb-2">{selectedUser?.name || 'AGENT'}</h2>
        <p className="text-[12px] font-bold text-gray-400 uppercase tracking-tight">{selectedUser?.email}</p>
      </div>

      <div className="space-y-6">
        <div className="space-y-2">
          <label className="text-[10px] font-black text-gray-300 uppercase tracking-widest px-4">GEMS BALANCE</label>
          <div className="relative">
            <Gem className="absolute left-8 top-1/2 -translate-y-1/2 text-yellow-500" size={24} />
            <input 
              type="number"
              value={editGems}
              onChange={e => setEditGems(e.target.value)}
              className="w-full pl-20 pr-8 py-8 bg-white rounded-[32px] border border-gray-100 font-black text-3xl shadow-sm"
            />
          </div>
        </div>

        <div className="bg-white p-10 rounded-[40px] border border-gray-100 flex items-center justify-between shadow-sm">
          <div className="flex items-center gap-6">
            <Crown className="text-gray-200" size={32} />
            <span className="text-xl font-black tracking-tight">Pro Status</span>
          </div>
          <button 
            onClick={() => setEditPro(!editPro)}
            className={`w-16 h-10 rounded-full transition-all relative ${editPro ? 'bg-black' : 'bg-gray-100'}`}
          >
            <div className={`absolute top-1.5 w-7 h-7 rounded-full bg-white shadow-md transition-all ${editPro ? 'right-1.5' : 'left-1.5'}`} />
          </button>
        </div>

        <button 
          onClick={handleUpdateNode}
          disabled={isUpdating}
          className="w-full py-8 bg-black text-white rounded-[32px] font-black text-lg uppercase tracking-widest flex items-center justify-center gap-4 shadow-2xl active:scale-95 transition-all disabled:opacity-50 mt-4"
        >
          {isUpdating ? <Loader2 className="animate-spin" size={24}/> : <Save size={24}/>}
          Deploy Updates
        </button>
      </div>
    </div>
  );

  return (
    <div className="max-w-md mx-auto min-h-screen bg-white text-black relative flex flex-col font-sans overflow-hidden shadow-2xl">
      <div className="flex-1 overflow-y-auto no-scrollbar p-6 pb-32">
        {loading ? (
          <div className="h-full flex flex-col items-center justify-center py-40 gap-4">
            <Loader2 className="animate-spin text-black/10" size={48} />
            <p className="text-[10px] font-black text-gray-300 uppercase tracking-widest">Accessing Central Command...</p>
          </div>
        ) : (
          <>
            {adminSubView === 'edit_node' ? EditNodeView : 
             adminSubView === 'peer_transfers' ? PeerTransfersView : 
             adminTab === 'home' ? HomeView :
             adminTab === 'nodes' ? NodesView :
             adminTab === 'transactions' ? <div className="animate-fade-in">{renderHeader("Transactions", true, () => setAdminTab('home'))}<div className="p-20 text-center text-gray-200 font-black uppercase text-xs tracking-widest">No Direct Sales Logged</div></div> :
             adminTab === 'stats' ? <div className="animate-fade-in">{renderHeader("Network Stats", true, () => setAdminTab('home'))}<div className="p-20 text-center text-gray-200 font-black uppercase text-xs tracking-widest">Analytics Nodes Offline</div></div> :
             adminTab === 'settings' ? <div className="animate-fade-in">{renderHeader("System Control", true, () => setAdminTab('home'))}<div className="p-20 text-center text-gray-200 font-black uppercase text-xs tracking-widest">Configuration Encrypted</div></div> : 
             null}
          </>
        )}
      </div>

      <nav className="fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur-3xl border-t border-gray-100 p-6 pb-10 flex justify-between items-center z-50 max-w-md mx-auto px-8 shadow-floating">
        <button onClick={() => { setAdminTab('home'); setAdminSubView('none'); }} className={`transition-all ${adminTab === 'home' && adminSubView === 'none' ? 'text-black scale-125' : 'text-gray-200'}`}><Home size={24} strokeWidth={2.5}/></button>
        <button onClick={() => { setAdminTab('transactions'); setAdminSubView('none'); }} className={`transition-all ${adminTab === 'transactions' ? 'text-black scale-125' : 'text-gray-200'}`}><DollarSign size={24} strokeWidth={2.5}/></button>
        <div className="relative -mt-16 flex justify-center z-50">
          <button 
            onClick={() => { setAdminTab('nodes'); setAdminSubView('none'); }} 
            className={`w-20 h-20 rounded-full flex items-center justify-center border-[8px] border-white shadow-2xl active:scale-90 transition-all ${adminTab === 'nodes' ? 'bg-black text-white' : 'bg-white text-gray-200'}`}
          >
            <Users size={32} strokeWidth={2.5}/>
          </button>
        </div>
        <button onClick={() => { setAdminTab('stats'); setAdminSubView('none'); }} className={`transition-all ${adminTab === 'stats' ? 'text-black scale-125' : 'text-gray-200'}`}><BarChart2 size={24} strokeWidth={2.5}/></button>
        <button onClick={() => { setAdminTab('settings'); setAdminSubView('none'); }} className={`transition-all ${adminTab === 'settings' ? 'text-black scale-125' : 'text-gray-200'}`}><Settings size={24} strokeWidth={2.5}/></button>
      </nav>
    </div>
  );
};

const VerificationBanner: React.FC<{ onResend: () => void; isResending: boolean }> = ({ onResend, isResending }) => (
  <div className="bg-orange-50 border border-orange-100 p-4 rounded-[28px] mb-6 flex gap-3 items-start shadow-sm">
    <ShieldAlert className="text-orange-500 shrink-0 mt-0.5" size={18} />
    <div className="flex-1 min-w-0">
      <p className="text-[10px] font-black text-orange-900 uppercase tracking-tight">Email Verification Needed</p>
      <p className="text-[9px] text-orange-800/70 font-bold leading-tight mt-0.5">Please verify your email to unlock all features.</p>
      <button onClick={onResend} disabled={isResending} className="text-[8px] font-black text-orange-600 uppercase tracking-widest mt-1.5 flex items-center gap-1">
        {isResending ? <Loader2 size={8} className="animate-spin" /> : <RefreshCw size={8} />} Resend Link
      </button>
    </div>
  </div>
);

const PendingScanCard: React.FC<{ imageUrl: string }> = ({ imageUrl }) => (
  <div className="bg-white p-4 rounded-[32px] flex gap-4 shadow-card items-center border border-gray-100 relative overflow-hidden animate-pulse">
    <div className="w-14 h-14 rounded-2xl bg-gray-100 overflow-hidden shrink-0">
      <img src={imageUrl} className="w-full h-full object-cover opacity-40 grayscale" />
    </div>
    <div className="flex-1">
      <div className="h-4 w-24 bg-gray-100 rounded-full mb-2" />
      <div className="h-2 w-32 bg-gray-50 rounded-full" />
    </div>
    <Loader2 size={16} className="text-gray-200 animate-spin mr-2" />
  </div>
);

const StatsView: React.FC<{ scans: ScanHistoryItem[]; currentCalTarget: number; profile: UserProfile | null; onBack: () => void }> = ({ scans, currentCalTarget, profile, onBack }) => {
  const chartData = useMemo(() => {
    const days = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];
    return days.map((day, i) => {
      const dayScans = scans.filter(s => new Date(s.timestamp).getDay() === i);
      const total = dayScans.reduce((acc, s) => acc + (s.calories || 0), 0);
      return { day, calories: total };
    });
  }, [scans]);

  const avgHealth = scans.length > 0 
    ? (scans.reduce((a, b) => a + b.healthScore, 0) / scans.length).toFixed(1) 
    : "0.0";

  return (
    <div className="pt-6 space-y-6 animate-fade-in pb-32 px-6 h-full overflow-y-auto no-scrollbar">
      <div className="flex items-center gap-3">
        <button onClick={onBack} className="p-3 bg-white rounded-2xl shadow-card active:scale-95 transition-all"><ArrowLeft size={18}/></button>
        <h1 className="text-2xl font-black tracking-tight text-black">Insights</h1>
      </div>

      <div className="bg-white p-8 rounded-[40px] shadow-card border border-gray-100 space-y-10">
        <div className="flex justify-between items-center">
          <h3 className="text-[10px] font-black text-gray-300 uppercase tracking-[0.3em]">Calorie Trend</h3>
          <div className="bg-black text-white px-3 py-1 rounded-full text-[8px] font-black uppercase tracking-widest">Metabolism</div>
        </div>
        <div className="h-44 w-full flex items-end justify-between px-1 gap-2">
          {chartData.map((d, i) => {
            const height = Math.max(8, Math.min(100, (d.calories / (currentCalTarget * 1.5)) * 100));
            const isOver = d.calories > currentCalTarget;
            return (
              <div key={i} className="flex-1 flex flex-col items-center gap-3 h-full">
                <div className="w-full bg-gray-50 rounded-full relative overflow-hidden h-full">
                  <div 
                    className={`absolute bottom-0 left-0 right-0 rounded-full transition-all duration-1000 ease-out ${isOver ? 'bg-orange-500' : 'bg-black'}`} 
                    style={{ height: `${height}%` }} 
                  />
                </div>
                <span className="text-[8px] font-black text-gray-300">{d.day}</span>
              </div>
            );
          })}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="bg-white p-8 rounded-[40px] shadow-card border border-gray-100 text-center">
          <div className="text-[8px] font-black text-gray-300 uppercase tracking-widest mb-2">Avg. Health</div>
          <div className="text-4xl font-black tracking-tighter">{avgHealth}</div>
        </div>
        <div className="bg-white p-8 rounded-[40px] shadow-card border border-gray-100 text-center">
          <div className="text-[8px] font-black text-gray-300 uppercase tracking-widest mb-2">Total Scans</div>
          <div className="text-4xl font-black tracking-tighter">{scans.length}</div>
        </div>
      </div>
    </div>
  );
};

const VaultView: React.FC<{ profile: UserProfile | null; onTransfer: (c: string, a: number) => void; onBack: () => void; isVerified: boolean }> = ({ profile, onTransfer, onBack, isVerified }) => {
  const [code, setCode] = useState('');
  const [amt, setAmt] = useState('100');

  return (
    <div className="pt-4 space-y-6 animate-fade-in pb-32 px-6 h-full overflow-y-auto no-scrollbar">
      <div className="flex items-center gap-3">
        <button onClick={onBack} className="p-3 bg-white rounded-2xl shadow-card active:scale-95 transition-all"><ArrowLeft size={18}/></button>
        <h1 className="text-2xl font-black tracking-tight text-black">Vault</h1>
      </div>

      <div className="bg-[#0A0A0A] text-white p-10 rounded-[48px] text-center relative overflow-hidden shadow-2xl">
        <div className="absolute top-0 left-0 w-full h-full opacity-10 bg-[radial-gradient(circle_at_50%_0%,white,transparent_70%)]" />
        <div className="text-[9px] font-black text-gray-500 uppercase tracking-[0.4em] mb-4">TOTAL ASSETS</div>
        <div className="flex items-center justify-center gap-2 mb-2">
          <span className="text-6xl font-black tracking-tighter">{profile?.points || 0}</span>
          <Gem className="text-yellow-500 fill-yellow-500" size={28} />
        </div>
        <div className="text-[9px] font-black text-yellow-500 bg-white/5 py-2 px-5 rounded-full inline-block uppercase tracking-[0.2em] border border-white/5">
          USER ID: {profile?.uniqueTransferCode || 'SYNCING...'}
        </div>
      </div>

      <div className="bg-white p-8 rounded-[40px] shadow-card border border-gray-100 space-y-4">
        <div className="flex items-center gap-2 px-1">
          <Zap size={14} className="text-yellow-500 fill-yellow-500" />
          <h3 className="text-[9px] font-black text-gray-300 uppercase tracking-widest">Earning Protocol</h3>
        </div>
        <div className="space-y-3">
          {[
            { label: 'Metabolic Scan', icon: <Camera size={18}/>, reward: '+5 Gems' },
            { label: 'Node Expansion', icon: <Users size={18}/>, reward: '+100 Gems' },
            { label: 'Premium Upgrade', icon: <Crown size={18}/>, reward: '+250 Gems' }
          ].map((item, i) => (
            <div key={i} className="flex items-center justify-between p-4 bg-gray-50 rounded-[28px] border border-gray-100">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 bg-white rounded-2xl flex items-center justify-center shadow-sm text-black/40">{item.icon}</div>
                <div><div className="text-[11px] font-black leading-none">{item.label}</div><div className="text-[8px] text-gray-400 font-bold uppercase mt-1">PER SUCCESSFUL EVENT</div></div>
              </div>
              <div className="bg-yellow-100/50 text-yellow-600 px-3 py-2 rounded-full text-[9px] font-black">{item.reward}</div>
            </div>
          ))}
        </div>
      </div>

      <div className="bg-gradient-to-br from-yellow-400 to-yellow-600 p-8 rounded-[40px] shadow-xl relative overflow-hidden group">
        <div className="absolute -right-6 -bottom-6 opacity-10 group-hover:scale-110 transition-transform duration-700"><Lightning size={140} className="text-white fill-white" /></div>
        <div className="relative z-10 space-y-3">
          <div className="bg-black text-white px-3 py-1 rounded-full text-[8px] font-black uppercase tracking-widest inline-block">PHASE 1: EARN</div>
          <h2 className="text-3xl font-black text-black leading-none tracking-tighter uppercase">The Great Airdrop</h2>
          <p className="text-black/80 text-[11px] font-bold leading-tight">Convert coins into <span className="font-black">Real Money</span> at the reveal.</p>
        </div>
      </div>

      <div className={`bg-white p-8 rounded-[40px] shadow-card border border-gray-100 space-y-4 ${!isVerified ? 'opacity-50 grayscale pointer-events-none' : ''}`}>
        <div className="flex justify-between items-center px-1">
          <h3 className="text-[9px] font-black text-gray-300 uppercase tracking-widest flex items-center gap-2"><Send size={12}/> Peer Transfer</h3>
          <div className="text-[8px] font-black text-green-500 bg-green-50 px-2 py-1 rounded-md uppercase">Zero Fee</div>
        </div>
        <div className="space-y-3">
          <input value={code} onChange={e=>setCode(e.target.value.toUpperCase())} placeholder="Unique Code (INR-XXXXXX)" className="w-full p-5 rounded-2xl bg-gray-50 border-none font-bold text-sm shadow-inner" />
          <input type="number" value={amt} onChange={e=>setAmt(e.target.value)} placeholder="100" className="w-full p-5 rounded-2xl bg-gray-50 border-none font-bold text-sm shadow-inner" />
          <button onClick={()=>onTransfer(code, parseInt(amt))} className="w-full bg-black text-white py-5 rounded-[24px] font-black text-xs uppercase tracking-widest shadow-lg active:scale-95 transition-all">Authorize Transfer</button>
        </div>
      </div>
    </div>
  );
};

const CashoutView: React.FC<{ profile: UserProfile | null; onBack: () => void; onManageUpi: () => void; isVerified: boolean }> = ({ profile, onBack, onManageUpi, isVerified }) => {
  const streak = profile?.currentStreak || 0;
  const milestones = [
    { target: 30, reward: 200 },
    { target: 60, reward: 500 },
    { target: 90, reward: 999 }
  ];

  return (
    <div className="pt-6 space-y-6 animate-fade-in pb-32 px-6 h-full overflow-y-auto no-scrollbar">
      <div className="flex items-center gap-3">
        <button onClick={onBack} className="p-3 bg-white rounded-2xl shadow-card active:scale-95 transition-all"><ArrowLeft size={18}/></button>
        <h1 className="text-2xl font-black tracking-tight text-black">Cashout</h1>
      </div>

      <div className="bg-[#0A0A0A] text-white p-10 rounded-[48px] relative overflow-hidden shadow-2xl">
        <div className="absolute top-0 left-0 w-full h-full opacity-10 bg-[radial-gradient(circle_at_50%_0%,white,transparent_70%)]" />
        <div className="text-[10px] font-black text-gray-500 uppercase tracking-[0.4em] mb-6">CURRENT STREAK</div>
        <div className="flex items-center gap-5">
          <div className="w-20 h-20 bg-white/10 rounded-[28px] flex items-center justify-center border border-white/10 backdrop-blur-md">
            <Flame size={40} className="text-orange-500 fill-orange-500" />
          </div>
          <div>
            <div className="text-5xl font-black tracking-tighter">{streak} Days</div>
            <div className="text-[9px] font-bold text-gray-400 uppercase tracking-[0.2em] mt-1">METABOLIC CHAIN ACTIVE</div>
          </div>
        </div>
        <div className="mt-8 pt-6 border-t border-white/5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Smartphone size={16} className="text-gray-500"/>
            <span className="text-[10px] font-black text-gray-300 tracking-widest uppercase">{profile?.upiId || 'NO UPLINK'}</span>
          </div>
          <button onClick={onManageUpi} className="text-[9px] font-black text-yellow-400 bg-yellow-400/10 px-3 py-1.5 rounded-full border border-yellow-400/20 active:scale-95">Edit Node</button>
        </div>
      </div>

      <div className="space-y-4 pt-4">
        <h3 className="text-[10px] font-black text-gray-300 uppercase tracking-[0.3em] px-2">Reward Milestones</h3>
        {milestones.map((m, i) => {
          const progress = Math.min(100, (streak / m.target) * 100);
          const daysLeft = Math.max(0, m.target - streak);
          return (
            <div key={i} className="bg-white p-8 rounded-[40px] shadow-card border border-gray-100 space-y-5">
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-gray-50 rounded-2xl flex items-center justify-center shadow-inner">
                    {i === 0 ? <Wallet size={20} className="text-blue-500" /> : i === 1 ? <Banknote size={20} className="text-green-500" /> : <Trophy size={20} className="text-yellow-500" />}
                  </div>
                  <div><div className="text-base font-black tracking-tight">₹{m.reward} Reward</div><div className="text-[9px] text-gray-300 font-black uppercase tracking-widest">{m.target} Day Milestone</div></div>
                </div>
                <div className="text-[9px] font-black text-gray-300 uppercase tracking-widest">{daysLeft} Days Left</div>
              </div>
              <div className="w-full h-2.5 bg-gray-50 rounded-full overflow-hidden">
                <div className="h-full bg-black rounded-full transition-all duration-1000" style={{ width: `${progress}%` }} />
              </div>
            </div>
          );
        })}
      </div>

      <div className="bg-yellow-50 p-8 rounded-[40px] border border-yellow-100 space-y-4">
        <div className="flex items-center gap-3 text-yellow-700">
          <Info size={20} /><span className="text-[11px] font-black uppercase tracking-tighter">Protocol Rules:</span>
        </div>
        <p className="text-[10px] font-bold text-yellow-800/70 leading-relaxed uppercase">You must scan at least one meal every 24 hours to register your day. Skipping a scan for one day will reset your metabolic streak to zero.</p>
        <p className="text-[9px] font-black text-yellow-600/60 italic uppercase tracking-widest">Rewards are credited to your Dr Foodie Vault upon verification of nodes.</p>
      </div>
    </div>
  );
};

const TeamSection: React.FC<{ onBack: () => void }> = ({ onBack }) => (
  <div className="pt-6 space-y-8 animate-fade-in pb-32 px-6 h-full overflow-y-auto no-scrollbar">
    <div className="flex items-center gap-3">
      <button onClick={onBack} className="p-3 bg-white rounded-2xl shadow-card active:scale-95 transition-all"><ArrowLeft size={18}/></button>
      <h1 className="text-3xl font-black tracking-tight text-black">The Team</h1>
    </div>

    <div className="bg-black text-white p-10 rounded-[48px] relative overflow-hidden shadow-2xl">
      <div className="absolute top-6 right-8 opacity-20"><Crown size={80} strokeWidth={1} /></div>
      <div className="relative z-10">
        <p className="text-[9px] font-black text-gray-500 uppercase tracking-[0.5em] mb-2">FOUNDER</p>
        <h2 className="text-4xl font-black tracking-tighter mb-1">Charan Ravanam</h2>
        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-[0.2em]">FOUNDER AND CEO</p>
      </div>
    </div>

    <div className="bg-white rounded-[48px] p-8 shadow-card border border-gray-100 space-y-6">
      <div className="flex items-center gap-3 text-gray-300">
        <Users size={16} /><h3 className="text-[9px] font-black uppercase tracking-[0.4em]">CORE TEAM MEMBERS</h3>
      </div>
      <div className="space-y-4">
        {[
          { name: 'Kranthi Madireddy', role: 'CMO (Chief Marketing Officer)' },
          { name: 'Gagan Adithya Reddy', role: 'CORE TEAM MEMBER' }
        ].map((m, i) => (
          <div key={i} className="flex items-center gap-5 p-6 bg-gray-50/50 rounded-[32px] border border-gray-100 group hover:bg-white hover:shadow-sm transition-all">
            <div className="w-14 h-14 bg-white rounded-full flex items-center justify-center font-black text-xl shadow-sm border border-gray-100 transition-transform group-hover:scale-110">
              {m.name.charAt(0)}
            </div>
            <div>
              <div className="text-lg font-black tracking-tight leading-none text-black">{m.name}</div>
              <div className="text-[8px] font-bold text-gray-400 uppercase tracking-[0.3em] mt-1.5">{m.role}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  </div>
);

/**
 * Node expansion/referral management interface.
 */
const ReferralView: React.FC<{ profile: UserProfile | null; onBack: () => void; isVerified: boolean }> = ({ profile, onBack, isVerified }) => {
  const referralCode = profile?.referralCode || 'NO-CODE';
  const handleShare = () => {
    if (navigator.share) {
      navigator.share({
        title: 'Join Dr Foodie',
        text: `Hey! Use my code ${referralCode} to join Dr Foodie and get bonus Gems!`,
        url: window.location.origin
      });
    } else {
      navigator.clipboard.writeText(referralCode);
      alert("Code copied to clipboard!");
    }
  };
  return (
    <div className="pt-6 space-y-6 animate-fade-in pb-32 px-6 h-full overflow-y-auto no-scrollbar">
      <div className="flex items-center gap-3">
        <button onClick={onBack} className="p-3 bg-white rounded-2xl shadow-card active:scale-95 transition-all"><ArrowLeft size={18}/></button>
        <h1 className="text-2xl font-black tracking-tight text-black">Referrals</h1>
      </div>
      <div className="bg-white p-10 rounded-[48px] shadow-card border border-gray-100 text-center space-y-6">
        <div className="w-20 h-20 bg-yellow-50 rounded-full flex items-center justify-center mx-auto">
          <Gift size={40} className="text-yellow-600" />
        </div>
        <div>
          <h2 className="text-3xl font-black tracking-tighter">Expand the Network</h2>
          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-2">Earn 100 Gems for every new node established</p>
        </div>
        <div className="bg-gray-50 p-6 rounded-[32px] border border-gray-100 border-dashed relative">
          <p className="text-[8px] font-black text-gray-300 uppercase tracking-[0.4em] mb-2">YOUR UNIQUE KEY</p>
          <div className="text-2xl font-black tracking-[0.2em]">{referralCode}</div>
        </div>
        <button onClick={handleShare} className="w-full bg-black text-white py-5 rounded-[24px] font-black text-xs uppercase tracking-widest shadow-lg flex items-center justify-center gap-3 active:scale-95 transition-all">
          <Share size={18} /> Deploy Code
        </button>
      </div>
    </div>
  );
};

/**
 * Interface for entering and verifying UPI ID.
 */
const UPIEntryView: React.FC<{ onSave: (id: string) => void; onBack: () => void }> = ({ onSave, onBack }) => {
  const [upi, setUpi] = useState('');
  return (
    <div className="pt-6 space-y-6 animate-fade-in pb-32 px-6 h-full overflow-y-auto no-scrollbar">
      <div className="flex items-center gap-3">
        <button onClick={onBack} className="p-3 bg-white rounded-2xl shadow-card active:scale-95 transition-all"><ArrowLeft size={18}/></button>
        <h1 className="text-2xl font-black tracking-tight text-black">UPI Link</h1>
      </div>
      <div className="bg-white p-10 rounded-[48px] shadow-card border border-gray-100 space-y-6">
        <div className="space-y-2">
          <label className="text-[10px] font-black text-gray-300 uppercase tracking-widest px-4">UPI ADDRESS</label>
          <input 
            value={upi} 
            onChange={e => setUpi(e.target.value)} 
            placeholder="example@upi" 
            className="w-full p-5 rounded-[24px] bg-gray-50 border-none font-bold text-sm shadow-inner" 
          />
        </div>
        <button 
          onClick={() => { if(upi.includes('@')) onSave(upi); else alert("Invalid UPI format."); }} 
          className="w-full bg-black text-white py-5 rounded-[24px] font-black text-xs uppercase tracking-widest shadow-lg active:scale-95 transition-all"
        >
          Verify & Save
        </button>
      </div>
    </div>
  );
};

/**
 * Gem-based workout module unlock interface.
 */
const UnlockWorkoutView: React.FC<{ currentGems: number; isUnlocking: boolean; onUnlock: () => void; onGoToWallet: () => void; onBack: () => void }> = ({ currentGems, isUnlocking, onUnlock, onGoToWallet, onBack }) => (
  <div className="pt-6 space-y-6 animate-fade-in pb-32 px-6 h-full overflow-y-auto no-scrollbar">
    <div className="flex items-center gap-3">
      <button onClick={onBack} className="p-3 bg-white rounded-2xl shadow-card active:scale-95 transition-all"><ArrowLeft size={18}/></button>
      <h1 className="text-2xl font-black tracking-tight text-black">Unlock Fitness</h1>
    </div>
    <div className="bg-white p-10 rounded-[48px] shadow-card border border-gray-100 text-center space-y-8">
      <div className="w-24 h-24 bg-gray-50 rounded-[40px] flex items-center justify-center mx-auto shadow-inner relative">
        <Dumbbell size={48} className="text-black/10" />
        <Lock size={24} className="absolute text-black" />
      </div>
      <div>
        <h2 className="text-3xl font-black tracking-tighter">Clinical Training</h2>
        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-2 leading-relaxed">AI-Generated workout routines optimized for your metabolic profile.</p>
      </div>
      <div className="bg-gray-50 p-6 rounded-[32px] border border-gray-100 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Gem size={20} className="text-yellow-500 fill-yellow-500" />
          <span className="text-xl font-black tracking-tighter">500 Gems</span>
        </div>
        <div className={`text-[10px] font-black px-3 py-1.5 rounded-full ${currentGems >= 500 ? 'bg-green-50 text-green-500' : 'bg-red-50 text-red-500'}`}>
          {currentGems >= 500 ? 'READY' : 'INSUFFICIENT'}
        </div>
      </div>
      {currentGems >= 500 ? (
        <button onClick={onUnlock} disabled={isUnlocking} className="w-full bg-black text-white py-5 rounded-[24px] font-black text-xs uppercase tracking-widest shadow-lg flex items-center justify-center gap-3 active:scale-95 transition-all">
          {isUnlocking ? <Loader2 className="animate-spin" size={18} /> : <Zap size={18} fill="white" />} Unlock Now
        </button>
      ) : (
        <button onClick={onGoToWallet} className="w-full bg-white text-black border-2 border-black py-5 rounded-[24px] font-black text-xs uppercase tracking-widest active:scale-95 transition-all">
          Earn More Gems
        </button>
      )}
    </div>
  </div>
);

/**
 * Environment selection for clinical workout generation.
 */
const WorkoutLocationView: React.FC<{ onBack: () => void; onSelect: (loc: WorkoutLocation) => void }> = ({ onBack, onSelect }) => (
  <div className="pt-6 space-y-6 animate-fade-in pb-32 px-6 h-full overflow-y-auto no-scrollbar">
    <div className="flex items-center gap-3">
      <button onClick={onBack} className="p-3 bg-white rounded-2xl shadow-card active:scale-95 transition-all"><ArrowLeft size={18}/></button>
      <h1 className="text-2xl font-black tracking-tight text-black">Location</h1>
    </div>
    <div className="grid grid-cols-1 gap-4">
      <button onClick={() => onSelect(WorkoutLocation.HOME)} className="bg-white p-10 rounded-[48px] shadow-card border border-gray-100 text-left group active:scale-95 transition-all">
        <Home size={32} className="mb-4 text-gray-200 group-hover:text-black transition-colors" />
        <h2 className="text-3xl font-black tracking-tighter">Home Node</h2>
        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-2">Bodyweight & Minimal Equipment</p>
      </button>
      <button onClick={() => onSelect(WorkoutLocation.GYM)} className="bg-white p-10 rounded-[48px] shadow-card border border-gray-100 text-left group active:scale-95 transition-all">
        <Dumbbell size={32} className="mb-4 text-gray-200 group-hover:text-black transition-colors" />
        <h2 className="text-3xl font-black tracking-tighter">Gym Node</h2>
        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-2">Full Commercial Equipment</p>
      </button>
    </div>
  </div>
);

/**
 * Muscle group selection interface.
 */
const WorkoutFocusView: React.FC<{ location: WorkoutLocation; selectedGroups: MuscleGroup[]; onToggle: (g: MuscleGroup) => void; onGenerate: () => void; onBack: () => void }> = ({ location, selectedGroups, onToggle, onGenerate, onBack }) => (
  <div className="pt-6 space-y-6 animate-fade-in pb-32 px-6 h-full overflow-y-auto no-scrollbar">
    <div className="flex items-center gap-3">
      <button onClick={onBack} className="p-3 bg-white rounded-2xl shadow-card active:scale-95 transition-all"><ArrowLeft size={18}/></button>
      <h1 className="text-2xl font-black tracking-tight text-black">Focus</h1>
    </div>
    <div className="grid grid-cols-2 gap-3">
      {Object.values(MuscleGroup).map((g) => (
        <button 
          key={g} 
          onClick={() => onToggle(g)} 
          className={`p-6 rounded-[32px] text-left font-black transition-all border ${selectedGroups.includes(g) ? 'bg-black text-white border-black shadow-xl scale-105' : 'bg-white text-gray-300 border-gray-50 shadow-sm'}`}
        >
          <div className="text-[12px] uppercase tracking-tighter">{g}</div>
        </button>
      ))}
    </div>
    <button 
      onClick={onGenerate} 
      disabled={selectedGroups.length === 0} 
      className="w-full bg-black text-white py-5 rounded-[24px] font-black text-xs uppercase tracking-widest shadow-2xl flex items-center justify-center gap-3 active:scale-95 transition-all disabled:opacity-20 mt-4"
    >
      Initialize Protocol <ChevronRight size={18} />
    </button>
  </div>
);

/**
 * Visualization of the AI-compiled workout plan.
 */
const WorkoutPlanView: React.FC<{ routine: Exercise[]; isGenerating: boolean; onBack: () => void }> = ({ routine, isGenerating, onBack }) => (
  <div className="pt-6 space-y-6 animate-fade-in pb-32 px-6 h-full overflow-y-auto no-scrollbar">
    <div className="flex items-center gap-3">
      <button onClick={onBack} className="p-3 bg-white rounded-2xl shadow-card active:scale-95 transition-all"><ArrowLeft size={18}/></button>
      <h1 className="text-2xl font-black tracking-tight text-black">Protocol</h1>
    </div>
    {isGenerating ? (
      <div className="flex flex-col items-center justify-center py-40 gap-6 text-center">
        <div className="relative">
          <Loader2 className="animate-spin text-black/10" size={80} />
          <Zap size={32} className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-black animate-pulse" />
        </div>
        <div className="space-y-2">
          <h2 className="text-2xl font-black tracking-tighter uppercase">Compiling Routine</h2>
          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest max-w-[200px]">Optimizing sets and reps for maximum metabolic impact...</p>
        </div>
      </div>
    ) : (
      <div className="space-y-4">
        {routine.map((ex, i) => (
          <div key={ex.id} className="bg-white p-6 rounded-[40px] shadow-card border border-gray-100 space-y-4">
            <div className="flex justify-between items-start">
              <div>
                <h3 className="text-xl font-black tracking-tight leading-tight">{ex.name}</h3>
                <div className="text-[9px] font-black text-gray-300 uppercase tracking-widest mt-1">{ex.sets} SETS • {ex.reps} REPS</div>
              </div>
              <div className="bg-black text-white px-3 py-1.5 rounded-xl text-[8px] font-black uppercase">{i + 1}</div>
            </div>
            <p className="text-[11px] text-gray-600 font-medium leading-relaxed">{ex.description}</p>
          </div>
        ))}
      </div>
    )}
  </div>
);

/**
 * Detailed clinical analysis view for a specific food scan.
 */
const AnalysisDetailView: React.FC<{ analysis: ScanHistoryItem | null; isAnalyzing: boolean; onBack: () => void; onDelete: () => void }> = ({ analysis, isAnalyzing, onBack, onDelete }) => {
  if (!analysis) return null;
  return (
    <div className="pt-6 space-y-6 animate-fade-in pb-32 px-6 h-full overflow-y-auto no-scrollbar">
      <div className="flex items-center justify-between">
        <button onClick={onBack} className="p-3 bg-white rounded-2xl shadow-card active:scale-95 transition-all"><ArrowLeft size={18}/></button>
        <button onClick={onDelete} className="p-3 bg-red-50 text-red-500 rounded-2xl active:scale-95 transition-all"><Trash2 size={18}/></button>
      </div>

      <div className="bg-white rounded-[48px] overflow-hidden shadow-card border border-gray-100">
        <img src={analysis.imageUrl} className="w-full aspect-square object-cover" />
        <div className="p-8 space-y-6">
          <div className="flex justify-between items-start">
            <div>
              <h2 className="text-3xl font-black tracking-tighter leading-none">{analysis.foodName}</h2>
              <div className="text-[10px] font-black text-gray-300 uppercase tracking-[0.3em] mt-3">CLINICAL SCAN RESULT</div>
            </div>
            <div className="bg-black text-white px-4 py-2 rounded-2xl text-xs font-black">Score: {analysis.healthScore}/10</div>
          </div>

          <div className="grid grid-cols-2 gap-3">
             {[
               { label: 'Calories', val: `${analysis.calories} kcal` },
               { label: 'Protein', val: `${analysis.protein}g` },
               { label: 'Carbs', val: `${analysis.carbs}g` },
               { label: 'Fats', val: `${analysis.fat}g` }
             ].map((m, i) => (
               <div key={i} className="bg-gray-50 p-5 rounded-[32px] border border-gray-100">
                 <div className="text-[8px] font-black text-gray-300 uppercase tracking-widest mb-1">{m.label}</div>
                 <div className="text-xl font-black tracking-tighter">{m.val}</div>
               </div>
             ))}
          </div>

          <div className="space-y-4">
            <div className="flex items-center gap-3 text-gray-300 px-2"><Activity size={16}/><h3 className="text-[9px] font-black uppercase tracking-[0.4em]">MICRO ANALYSIS</h3></div>
            <p className="bg-gray-50 p-6 rounded-[32px] text-[11px] font-bold text-gray-700 leading-relaxed italic border border-gray-100">"{analysis.microAnalysis}"</p>
          </div>

          <div className="space-y-4">
            <div className="flex items-center gap-3 text-gray-300 px-2"><Sparkle size={16}/><h3 className="text-[9px] font-black uppercase tracking-[0.4em]">ALTERNATIVES</h3></div>
            <div className="flex flex-wrap gap-2">
              {analysis.alternatives.map((alt, i) => (
                <div key={i} className="bg-green-50 text-green-700 px-4 py-2 rounded-full text-[10px] font-black uppercase tracking-tight border border-green-100">{alt}</div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

/**
 * Modal for AI-triggered clarification questions during food analysis.
 */
const ClarificationModal: React.FC<{ question: string; onAnswer: (ans: string) => void; onApprox: () => void; onCancel: () => void }> = ({ question, onAnswer, onApprox, onCancel }) => {
  const [answer, setAnswer] = useState('');
  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-6 bg-black/60 backdrop-blur-md animate-fade-in">
      <div className="bg-white rounded-[48px] w-full max-w-sm p-8 space-y-6 shadow-2xl">
        <div className="text-center space-y-2">
          <div className="w-16 h-16 bg-blue-50 rounded-full flex items-center justify-center mx-auto mb-2 text-blue-500"><HelpCircle size={32}/></div>
          <h3 className="text-xl font-black tracking-tighter">Node Clarification</h3>
          <p className="text-[11px] font-bold text-gray-400 uppercase tracking-widest leading-relaxed px-4">{question}</p>
        </div>
        <textarea 
          value={answer} 
          onChange={e => setAnswer(e.target.value)} 
          placeholder="Type your response..." 
          className="w-full p-6 rounded-[32px] bg-gray-50 border-none font-bold text-sm shadow-inner min-h-[120px] resize-none" 
        />
        <div className="space-y-2">
          <button onClick={() => onAnswer(answer)} disabled={!answer.trim()} className="w-full bg-black text-white py-5 rounded-[24px] font-black text-xs uppercase tracking-widest shadow-lg active:scale-95 transition-all disabled:opacity-20">Submit Data</button>
          <div className="grid grid-cols-2 gap-2">
            <button onClick={onApprox} className="bg-gray-100 text-gray-600 py-4 rounded-[24px] font-black text-[10px] uppercase tracking-widest active:scale-95 transition-all">Approximate</button>
            <button onClick={onCancel} className="bg-gray-100 text-red-500 py-4 rounded-[24px] font-black text-[10px] uppercase tracking-widest active:scale-95 transition-all">Cancel</button>
          </div>
        </div>
      </div>
    </div>
  );
};

// --- App Component ---

const App: React.FC = () => {
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [isVerified, setIsVerified] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [view, setView] = useState<'home' | 'stats' | 'settings' | 'analysis' | 'camera' | 'team' | 'wallet' | 'refer' | 'cashout' | 'upi_entry' | 'admin_dashboard' | 'workout_unlock' | 'workout_location' | 'workout_focus' | 'workout_plan' | 'update_profile' | 'crypto'>('home');
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
  const [isUnlockingWorkout, setIsUnlockingWorkout] = useState(false);

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const startCamera = useCallback(() => { setView('camera'); }, []);

  // Camera stream management effect
  useEffect(() => {
    let stream: MediaStream | null = null;
    const initCamera = async () => {
      if (view === 'camera' && videoRef.current) {
        try {
          stream = await navigator.mediaDevices.getUserMedia({ 
            video: { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 720 } } 
          });
          videoRef.current.srcObject = stream;
        } catch (err) {
          console.error("Camera access denied:", err);
          setView('home');
          alert("Camera access is required for metabolic scans.");
        }
      }
    };
    initCamera();
    return () => {
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
    };
  }, [view]);

  useEffect(() => {
    let interval: number;
    const unsub = onAuthStateChanged(auth, async (u) => {
      if (u) { 
        setUser(u); 
        setIsVerified(u.emailVerified);
        await fetchProfile(u); 
        
        if (!u.emailVerified) {
          interval = window.setInterval(async () => {
            await reload(u);
            if (auth.currentUser?.emailVerified) {
              setIsVerified(true);
              clearInterval(interval);
            }
          }, 5000);
        }
      } 
      else { 
        const adminStored = localStorage.getItem('drfoodie_admin');
        if (adminStored === 'true') {
          setIsAdmin(true);
          setView('admin_dashboard');
        } else {
          setUser(null); 
          setProfile(null); 
          setIsVerified(false); 
        }
      }
      setLoading(false);
    });
    return () => { unsub(); clearInterval(interval); };
  }, []);

  const fetchProfile = async (u: FirebaseUser) => {
    try {
      const docSnap = await getDoc(doc(db, "profiles", u.uid));
      if (docSnap.exists()) {
        const pData = docSnap.data() as UserProfile;
        setProfile(pData);
        const qScans = query(collection(db, "profiles", u.uid, "scans"), orderBy("timestamp", "desc"));
        const qs = await getDocs(qScans);
        const ls: ScanHistoryItem[] = [];
        qs.forEach(d => ls.push({ id: d.id, ...d.data() } as ScanHistoryItem));
        setScans(ls);
      } else {
        setProfile({ isOnboarded: false } as UserProfile);
      }
    } catch (e) { console.error(e); }
  };

  const handleResendVerification = async () => {
    if (!user) return;
    setIsResending(true);
    try { await sendEmailVerification(user); alert("Verification node dispatched to " + user.email); }
    catch (e) { alert("Protocol delay. Please wait before retrying."); }
    finally { setIsResending(false); }
  };

  const saveProfile = async (data: Partial<UserProfile>) => {
    if (!user) return;
    try {
      const updated = { ...profile, ...data };
      await setDoc(doc(db, "profiles", user.uid), updated, { merge: true });
      setProfile(updated as UserProfile);
      setView('home'); 
    } catch (err) { console.error(err); }
  };

  const handleTransfer = async (code: string, coins: number) => {
    if (!isVerified) { alert("Email verification required."); return; }
    if (!user || !profile || !code || coins <= 0) return;
    if ((profile.points || 0) < coins) { alert("Insufficient assets."); return; }
    try {
      const q = query(collection(db, "profiles"), where("uniqueTransferCode", "==", code));
      const snap = await getDocs(q);
      if (snap.empty) { alert("Node not found."); return; }
      const recipientDoc = snap.docs[0];
      await runTransaction(db, async (tx) => {
        tx.update(doc(db, "profiles", user.uid), { points: increment(-coins) });
        tx.update(doc(db, "profiles", recipientDoc.id), { points: increment(coins) });
        
        // Log transfer for Admin visibility
        const transferRef = doc(collection(db, "transfers"));
        tx.set(transferRef, {
          fromId: user.uid,
          fromName: profile.name || 'Anonymous Agent',
          toId: recipientDoc.id,
          toCode: code,
          amount: coins,
          timestamp: Timestamp.now()
        });
      });
      setProfile(prev => prev ? { ...prev, points: (prev.points || 0) - coins } : null);
      alert("Transfer authorized.");
    } catch (e) { alert("Vault uplink failed."); }
  };

  const handleUnlockWorkout = async () => {
    if (!user || !profile) return;
    if ((profile.points || 0) < 500) return;
    setIsUnlockingWorkout(true);
    try {
      await updateDoc(doc(db, "profiles", user.uid), { isWorkoutUnlocked: true, points: increment(-500) });
      setProfile(prev => prev ? { ...prev, isWorkoutUnlocked: true, points: (prev.points || 0) - 500 } : null);
      setView('workout_location');
    } catch (e) { alert("Node sync error."); }
    finally { setIsUnlockingWorkout(false); }
  };

  const handleGenerateWorkout = async () => {
    if (!profile || !selectedLocation || selectedMuscleGroups.length === 0) return;
    setIsGeneratingRoutine(true);
    setView('workout_plan');
    try {
      const routine = await generateWorkoutRoutine(selectedLocation, selectedMuscleGroups, profile);
      setCurrentRoutine(routine);
    } catch (e) {
      alert("Failed to generate workout routine. Please try again.");
      setView('workout_focus');
    } finally {
      setIsGeneratingRoutine(false);
    }
  };

  const captureImage = () => {
    if (videoRef.current && canvasRef.current) {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(video, 0, 0);
        const base64 = canvas.toDataURL('image/jpeg', 0.8);
        processImage(base64);
      }
    }
  };

  const processImage = async (base64: string, clarification?: string) => {
    if (!user || !profile) return;
    if (!profile.isPremium && (profile.scansUsedToday || 0) >= MAX_FREE_SCANS_PER_DAY) { setShowPremium(true); return; }
    
    const tempId = `temp-${Date.now()}`;
    setScans(prev => [{ id: tempId, imageUrl: base64, timestamp: new Date().toISOString(), isPending: true } as any, ...prev]);
    setView('home');

    try {
      const result = await analyzeFoodImage(base64.split(',')[1], profile, clarification);
      if (result.needsClarification) { setClarificationQuestion(result.clarificationQuestion); setPendingImage(base64); setScans(prev => prev.filter(s => s.id !== tempId)); return; }
      const scanItem = { ...result, imageUrl: base64, timestamp: new Date().toISOString() };
      const docRef = await addDoc(collection(db, "profiles", user.uid, "scans"), scanItem);
      await updateDoc(doc(db, "profiles", user.uid), { scansUsedToday: increment(1), points: increment(COINS_PER_SCAN) });
      setScans(prev => prev.map(s => s.id === tempId ? { id: docRef.id, ...scanItem } : s));
      setProfile(prev => prev ? { ...prev, scansUsedToday: (prev.scansUsedToday || 0) + 1, points: (prev.points || 0) + COINS_PER_SCAN } : null);
    } catch (err) { setScans(prev => prev.filter(s => s.id !== tempId)); }
  };

  const currentCalTarget = useMemo(() => {
    if (!profile) return 2000;
    const bmr = (10 * profile.weight) + (6.25 * profile.height) - (5 * (profile.age || 25)) + (profile.gender === Gender.FEMALE ? -161 : 5);
    const m = Math.round(bmr * 1.375);
    return profile.goal === Goal.LOSE_WEIGHT ? m - 500 : profile.goal === Goal.GAIN_WEIGHT ? m + 500 : m;
  }, [profile]);

  if (loading) return <div className="min-h-screen bg-[#F2F2F7] flex items-center justify-center"><Loader2 className="animate-spin text-black/10" size={48}/></div>;
  if (isAdmin) return <AdminDashboard onLogout={() => { setIsAdmin(false); localStorage.removeItem('drfoodie_admin'); setView('home'); }} />;
  if (!user) return <Auth onAdminLogin={(s) => { setIsAdmin(s); localStorage.setItem('drfoodie_admin', 'true'); setView('admin_dashboard'); }} />;
  if (user && profile && !profile.isOnboarded) return <Onboarding onComplete={p => saveProfile({ ...p, isOnboarded: true, referralCode: user.uid.substring(0,8).toUpperCase(), uniqueTransferCode: `INR-${Math.random().toString(36).substring(2,8).toUpperCase()}` })} />;

  return (
    <div className="max-w-md mx-auto min-h-screen bg-[#F2F2F7] text-black relative shadow-2xl flex flex-col font-sans overflow-hidden">
      <canvas ref={canvasRef} className="hidden" />
      <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={(e) => { const f = e.target.files?.[0]; if (f) { const r = new FileReader(); r.onload = () => processImage(r.result as string); r.readAsDataURL(f); } }} />
      
      <div className="flex-1 overflow-hidden h-full">
        <div className="animate-fade-in px-0 h-full overflow-hidden">
          {view === 'home' && (
            <div className="pt-6 h-full overflow-y-auto no-scrollbar pb-32 px-6">
              <header className="flex justify-between items-center mb-8">
                <div className="flex items-center gap-3"><div className="w-10 h-10 bg-black rounded-xl flex items-center justify-center shadow-lg"><Lightning size={20} className="text-white fill-white"/></div><h1 className="text-2xl font-black tracking-tighter">Dr Foodie</h1></div>
                <div className="flex gap-2.5">
                   <div className="bg-white px-4 py-2 rounded-full flex items-center gap-2 shadow-sm border border-gray-100"><Flame size={14} className="text-orange-500 fill-orange-500"/><span className="text-[11px] font-black">{profile?.currentStreak || 0}</span></div>
                   <button onClick={()=>setShowPremium(true)} className={`px-4 py-2 rounded-full text-[10px] font-black uppercase shadow-sm tracking-[0.1em] ${profile?.isPremium ? 'bg-black text-yellow-400' : 'bg-white text-black'}`}>{profile?.isPremium ? 'PRO' : 'GO PRO'}</button>
                </div>
              </header>

              {!isVerified && <VerificationBanner onResend={handleResendVerification} isResending={isResending} />}

              <div className="flex justify-between mb-8 overflow-x-auto no-scrollbar py-2 gap-4">
                {Array.from({ length: 7 }, (_, i) => { const d = new Date(); d.setDate(d.getDate() - (3 - i)); return d; }).map((d, i) => (
                  <button key={i} onClick={() => setSelectedDate(d.toDateString())} className={`flex flex-col items-center min-w-[56px] py-5 rounded-[24px] transition-all duration-300 ${d.toDateString() === selectedDate ? 'bg-black text-white shadow-2xl scale-110' : 'bg-white text-gray-200 border border-gray-50'}`}>
                    <span className="text-[9px] font-black uppercase mb-1.5 opacity-60">{d.toLocaleDateString('en-US',{weekday:'short'}).charAt(0)}</span>
                    <span className="text-lg font-black">{d.getDate()}</span>
                  </button>
                ))}
              </div>
              
              <div className="bg-white p-10 rounded-[48px] shadow-card mb-8 flex items-center justify-between border border-gray-100 relative overflow-hidden">
                <div className="flex-1 relative z-10">
                  <div className="flex items-baseline gap-1.5 mb-1.5">
                    <span className="text-6xl font-black tracking-tighter leading-none">{scans.filter(s => new Date(s.timestamp).toDateString() === selectedDate).reduce((acc, s) => acc + (s.calories || 0), 0)}</span>
                    <span className="text-xl text-gray-200 font-black">/{currentCalTarget}</span>
                  </div>
                  <div className="text-[9px] text-gray-300 font-black uppercase tracking-[0.4em]">ENERGY BUDGET</div>
                </div>
                <div className="absolute right-8 top-1/2 -translate-y-1/2 opacity-5">
                   <svg width="120" height="80" viewBox="0 0 120 80" fill="none"><path d="M0 40C20 40 20 10 40 10C60 10 60 70 80 70C100 70 100 40 120 40" stroke="black" strokeWidth="8" strokeLinecap="round"/></svg>
                </div>
              </div>
              
              <div className="space-y-4">
                {scans.filter(s => new Date(s.timestamp).toDateString() === selectedDate).length === 0 ? (
                  <div className="text-center py-20 text-gray-200 bg-white rounded-[48px] border-2 border-dashed border-gray-100 flex flex-col items-center gap-4 cursor-pointer" onClick={startCamera}>
                    <Camera size={44} className="opacity-10"/><p className="text-[10px] font-black uppercase tracking-[0.3em] opacity-40">ESTABLISH NEW SCAN</p>
                  </div>
                ) : scans.filter(s => new Date(s.timestamp).toDateString() === selectedDate).map(s => (
                  s.isPending ? <PendingScanCard key={s.id} imageUrl={s.imageUrl!} /> : (
                    <div key={s.id} onClick={()=>{setAnalysis(s); setView('analysis')}} className="bg-white p-5 rounded-[40px] flex gap-5 shadow-card items-center border border-gray-100 active:scale-95 transition-all">
                      <img src={s.imageUrl} className="w-16 h-16 rounded-[24px] object-cover shadow-sm" />
                      <div className="flex-1 min-w-0">
                        <div className="font-black text-base tracking-tight truncate leading-tight">{s.foodName}</div>
                        <div className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mt-1.5">{s.calories} KCAL • {s.protein}G P</div>
                      </div>
                      <ChevronRight size={18} className="text-gray-100 mr-2"/>
                    </div>
                  )
                ))}
              </div>
            </div>
          )}
          
          {view === 'stats' && <StatsView scans={scans} currentCalTarget={currentCalTarget} profile={profile} onBack={() => setView('home')} />}
          
          {view === 'settings' && (
            <div className="pt-6 space-y-6 animate-fade-in pb-32 px-6 h-full overflow-y-auto no-scrollbar">
              <div className="flex items-center gap-3">
                <button onClick={() => setView('home')} className="p-3 bg-white rounded-2xl shadow-card active:scale-95 transition-all"><ArrowLeft size={18}/></button>
                <h1 className="text-2xl font-black tracking-tight text-black">Control</h1>
              </div>

              <div className="bg-white p-10 rounded-[48px] shadow-card border border-gray-100 flex items-center gap-6">
                 <div className="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center border border-gray-100"><UserIcon size={32} className="text-black/10" /></div>
                 <div><h2 className="text-2xl font-black tracking-tighter">{profile?.name || 'AGENT'}</h2><p className="text-[10px] font-black text-gray-300 uppercase tracking-widest">{profile?.goal}</p></div>
              </div>

              <div className="space-y-3">
                 {[
                   { icon: <Edit3 size={18}/>, label: 'Update Metrics', action: () => setView('update_profile') },
                   { icon: <Coins size={18}/>, label: 'Crypto Market', action: () => setView('crypto') },
                   { icon: <Banknote size={18}/>, label: 'Cashout Rewards', action: () => setView('cashout') },
                   { icon: <WalletIcon size={18}/>, label: 'Vault Access', action: () => setView('wallet') },
                   { icon: <Gift size={18}/>, label: 'Referral Nodes', action: () => setView('refer') },
                   { icon: <Users size={18}/>, label: 'Team Info', action: () => setView('team') },
                 ].map((item, i) => (
                   <button key={i} onClick={item.action} className="w-full bg-white p-6 rounded-[32px] flex items-center justify-between border border-gray-100 shadow-sm active:scale-95 transition-all">
                      <div className="flex items-center gap-4"><div className="text-black/30">{item.icon}</div><span className="text-[15px] font-black text-gray-700 tracking-tight">{item.label}</span></div>
                      <ChevronRight size={18} className="text-gray-100" />
                   </button>
                 ))}
              </div>
              <button onClick={() => signOut(auth)} className="w-full py-6 text-red-500 font-black text-[11px] uppercase tracking-[0.3em] flex items-center justify-center gap-2 mt-4"><LogOut size={16}/> Terminate Session</button>
            </div>
          )}

          {view === 'wallet' && <VaultView profile={profile} onTransfer={handleTransfer} onBack={() => setView('settings')} isVerified={isVerified} />}
          {view === 'refer' && <ReferralView profile={profile} onBack={() => setView('settings')} isVerified={isVerified} />}
          {view === 'cashout' && <CashoutView profile={profile} onBack={() => setView('settings')} onManageUpi={() => setView('upi_entry')} isVerified={isVerified} />}
          {view === 'upi_entry' && <UPIEntryView onSave={(id)=>{ updateDoc(doc(db,"profiles",user!.uid),{upiId:id}); setProfile(p=>p?({...p,upiId:id}):null); setView('cashout'); }} onBack={() => setView('cashout')} />}
          {view === 'update_profile' && <Onboarding onComplete={saveProfile} initialData={profile} onBack={() => setView('settings')} />}
          {view === 'team' && <TeamSection onBack={() => setView('settings')} />}
          {view === 'crypto' && <CryptoMarketView profile={profile} scans={scans} currentCalTarget={currentCalTarget} onBack={() => setView('settings')} />}
          {view === 'workout_unlock' && <UnlockWorkoutView currentGems={profile?.points || 0} isUnlocking={isUnlockingWorkout} onUnlock={handleUnlockWorkout} onGoToWallet={() => setView('wallet')} onBack={() => setView('home')} />}
          {view === 'workout_location' && <WorkoutLocationView onBack={() => setView('home')} onSelect={(loc) => { setSelectedLocation(loc); setView('workout_focus'); }} />}
          {/* Fix: Added 'item =>' to the filter callback to define the parameter 'item' used in the comparison */}
          {view === 'workout_focus' && <WorkoutFocusView location={selectedLocation!} selectedGroups={selectedMuscleGroups} onToggle={(g)=>setSelectedMuscleGroups(prev=>prev.includes(g)?prev.filter(item => item !== g):[...prev, g])} onGenerate={()=>handleGenerateWorkout()} onBack={() => setView('workout_location')} />}
          {view === 'workout_plan' && <WorkoutPlanView routine={currentRoutine} isGenerating={isGeneratingRoutine} onBack={() => setView('workout_focus')} />}
          {view === 'analysis' && <AnalysisDetailView analysis={analysis} isAnalyzing={false} onBack={() => setView('home')} onDelete={async () => { if(confirm("Discard node data?")) { await deleteDoc(doc(db,"profiles",user!.uid,"scans",analysis!.id)); setScans(prev=>prev.filter(s=>s.id!==analysis!.id)); setView('home'); } }} />}
        </div>
      </div>

      {!isAdmin && (
        <nav className="fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur-3xl border-t border-gray-100 p-5 pb-9 flex justify-between items-center z-40 max-w-md mx-auto px-10 shadow-floating">
          <button onClick={()=>{setView('home')}} className={`transition-all ${view==='home'?'text-black scale-125':'text-black/15'}`}><Home size={22} strokeWidth={2.5}/></button>
          <button onClick={()=>{ if (profile?.isWorkoutUnlocked) setView('workout_location'); else setView('workout_unlock'); }} className={`transition-all ${view.startsWith('workout')?'text-black scale-125':'text-black/15'}`}><Dumbbell size={22} strokeWidth={2.5}/></button>
          <div className="relative -mt-14 flex justify-center z-50"><button onClick={startCamera} className="w-18 h-18 bg-black rounded-full flex items-center justify-center text-white border-[7px] border-[#F2F2F7] shadow-2xl active:scale-90 transition-all"><Plus size={34} strokeWidth={3}/></button></div>
          <button onClick={()=>{setView('stats')}} className={`transition-all ${view==='stats'?'text-black scale-125':'text-black/15'}`}><BarChart2 size={22} strokeWidth={2.5}/></button>
          <button onClick={()=>setView('settings')} className={`transition-all ${['settings', 'wallet', 'refer', 'cashout', 'team', 'upi_entry', 'update_profile', 'crypto'].includes(view)?'text-black scale-125':'text-black/15'}`}><Settings size={22} strokeWidth={2.5}/></button>
        </nav>
      )}

      {clarificationQuestion && pendingImage && <ClarificationModal question={clarificationQuestion} onAnswer={(ans) => processImage(pendingImage, ans)} onApprox={() => processImage(pendingImage, "Approximate")} onCancel={() => setClarificationQuestion(null)} />}
      <PremiumModal isOpen={showPremium} onClose={()=>setShowPremium(false)} onUpgrade={()=>{ if(user) { updateDoc(doc(db,"profiles",user.uid),{isPremium:true}); setProfile(p=>p?({...p,isPremium:true}):null); setShowPremium(false); } }} />
      {view === 'camera' && (
          <div className="fixed inset-0 z-[100] bg-black animate-fade-in flex flex-col">
            <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover" />
            <div className="absolute inset-0 flex flex-col justify-between p-8">
              <div className="flex justify-between pt-10"><button onClick={() => setView('home')} className="p-5 bg-white/10 backdrop-blur-xl rounded-3xl text-white border border-white/10 active:scale-90"><X size={28}/></button><button onClick={() => fileInputRef.current?.click()} className="p-5 bg-white/10 backdrop-blur-xl rounded-3xl text-white border border-white/10 active:scale-90"><Image size={28}/></button></div>
              <div className="flex justify-center pb-20"><button onClick={captureImage} className="w-28 h-28 bg-white rounded-full border-[10px] border-white/20 flex items-center justify-center active:scale-90 shadow-2xl transition-all"><div className="w-20 h-20 bg-black rounded-full flex items-center justify-center text-white"><ScanLine size={32}/></div></button></div>
            </div>
          </div>
      )}
    </div>
  );
};

export default App;
