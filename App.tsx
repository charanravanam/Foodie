
import React, { useState, useRef, useEffect } from 'react';
import { 
  Home, BarChart2, Settings, Plus, Flame, ChevronRight, ArrowLeft,
  Camera, User, Dumbbell, LogOut, Crown, Loader2, TrendingUp,
  Apple, Target, Zap, Star, Activity, Droplets, Calendar, Clock
} from 'lucide-react';
import { 
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, 
  PieChart, Pie, AreaChart, Area, CartesianGrid
} from 'recharts';
import Onboarding from './components/Onboarding';
import PremiumModal from './components/PremiumModal';
import Auth from './components/Auth';
import { UserProfile, ScanHistoryItem, Gender, Goal } from './types';
import { analyzeFoodImage } from './services/geminiService';
import { auth, db } from './services/firebase';
import { onAuthStateChanged, signOut, User as FirebaseUser } from 'firebase/auth';
import { doc, getDoc, setDoc, collection, query, orderBy, getDocs, addDoc } from 'firebase/firestore/lite';

const MAX_FREE_SCANS = 3;

const App: React.FC = () => {
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [view, setView] = useState<'home' | 'workouts' | 'stats' | 'settings' | 'analysis'>('home');
  const [scans, setScans] = useState<ScanHistoryItem[]>([]);
  const [showPremium, setShowPremium] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysis, setAnalysis] = useState<ScanHistoryItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [waterIntake, setWaterIntake] = useState(0); 
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (u) => {
      setLoading(true);
      setUser(u);
      if (u) {
        try {
          const docRef = doc(db, "profiles", u.uid);
          const docSnap = await getDoc(docRef);
          if (docSnap.exists()) {
            setProfile(docSnap.data() as UserProfile);
            const scansRef = collection(db, "profiles", u.uid, "scans");
            const q = query(scansRef, orderBy("timestamp", "desc"));
            const querySnapshot = await getDocs(q);
            const loadedScans: ScanHistoryItem[] = [];
            querySnapshot.forEach((doc) => {
              loadedScans.push({ id: doc.id, ...doc.data() } as ScanHistoryItem);
            });
            setScans(loadedScans);
          }
        } catch (err) { console.error(err); }
      }
      setLoading(false);
    });
    return () => unsub();
  }, []);

  const saveProfile = async (p: Partial<UserProfile>) => {
    if (!user) return;
    const newProfile = { ...(profile || {}), ...p } as UserProfile;
    setProfile(newProfile);
    await setDoc(doc(db, "profiles", user.uid), newProfile);
  };

  const handleScan = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !profile || !user) return;
    if (!profile.isPremium && scans.length >= MAX_FREE_SCANS) {
      setShowPremium(true);
      return;
    }
    const mimeType = file.type;
    setIsAnalyzing(true);
    setView('analysis');
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = async () => {
      const base64 = (reader.result as string).split(',')[1];
      try {
        const res = await analyzeFoodImage(base64, profile, mimeType);
        const scanData = { ...res, imageUrl: reader.result as string, timestamp: new Date().toISOString() };
        const docRef = await addDoc(collection(db, "profiles", user.uid, "scans"), scanData);
        const newScan = { ...scanData, id: docRef.id };
        setScans(prev => [newScan, ...prev]);
        setAnalysis(newScan);
      } catch (err) {
        alert("AI error. Check connection.");
        setView('home');
      } finally {
        setIsAnalyzing(false);
        if (fileInputRef.current) fileInputRef.current.value = '';
      }
    };
  };

  const getCalorieTarget = () => {
    if (!profile) return 2000;
    const base = (10 * profile.weight) + (6.25 * (profile.height || 170)) - (5 * profile.age) + (profile.gender === Gender.MALE ? 5 : -161);
    let target = base * 1.375;
    if(profile.goal === Goal.LOSE_WEIGHT) target -= 500;
    if(profile.goal === Goal.GAIN_WEIGHT) target += 500;
    return Math.round(target);
  };

  const getWeeklyTrend = () => {
    const days = [...Array(7)].map((_, i) => {
      const d = new Date(); d.setDate(d.getDate() - i); return d.toDateString();
    }).reverse();
    return days.map(day => ({
      name: day.split(' ')[0],
      calories: scans.filter(s => new Date(s.timestamp).toDateString() === day).reduce((a, b) => a + b.calories, 0),
      quality: Number((scans.filter(s => new Date(s.timestamp).toDateString() === day).reduce((a, b) => a + b.healthScore, 0) / (scans.filter(s => new Date(s.timestamp).toDateString() === day).length || 1)).toFixed(1))
    }));
  };

  const getMealSplit = () => {
    const split = { Breakfast: 0, Lunch: 0, Dinner: 0, Snack: 0 };
    scans.forEach(s => { if (s.mealType) (split as any)[s.mealType] += s.calories; });
    return Object.keys(split).map(k => ({ name: k, value: (split as any)[k] }));
  };

  if (loading) return (
    <div className="h-screen flex flex-col items-center justify-center bg-white">
      <Loader2 className="animate-spin text-black mb-4" size={40} />
      <p className="text-gray-400 font-bold uppercase tracking-widest text-[10px]">Syncing Body Metrics...</p>
    </div>
  );

  if (!user) return <Auth />;
  if (!profile || !profile.isOnboarded) return <Onboarding onComplete={saveProfile} initialData={profile} />;

  const todayCalories = scans.filter(s => new Date(s.timestamp).toDateString() === new Date().toDateString()).reduce((a, b) => a + b.calories, 0);
  const targetCals = getCalorieTarget();

  return (
    <div className="max-w-md mx-auto min-h-screen bg-[#F2F2F7] text-black relative shadow-2xl overflow-hidden flex flex-col font-sans">
      <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleScan} />
      
      <div className="flex-1 px-6 overflow-y-auto no-scrollbar pb-32">
        {view === 'home' && (
          <div className="pt-6 animate-fade-in">
            <header className="flex justify-between items-center mb-6">
              <img src="https://www.foodieqr.com/assets/img/logo.svg" alt="Dr Foodie" className="h-8" />
              <button onClick={()=>setShowPremium(true)} className="px-3 py-1.5 bg-white border border-gray-100 rounded-full text-[10px] font-black shadow-sm uppercase">
                {profile.isPremium ? <Crown size={12} className="text-yellow-500 fill-yellow-500"/> : `${MAX_FREE_SCANS - scans.length} Free Remaining`}
              </button>
            </header>
            
            <div className="bg-white p-6 rounded-[32px] shadow-card mb-6 flex items-center justify-between">
              <div>
                <div className="flex items-baseline gap-1">
                  <span className="text-5xl font-bold tracking-tighter">{todayCalories}</span>
                  <span className="text-lg text-gray-400">/{targetCals}</span>
                </div>
                <div className="text-[10px] text-gray-400 font-black uppercase tracking-widest mt-1">Daily Budget</div>
              </div>
              <Activity className="text-black" size={32} />
            </div>

            <div className="grid grid-cols-3 gap-3 mb-8">
               {[{l:'Protein', v: scans.filter(s => new Date(s.timestamp).toDateString() === new Date().toDateString()).reduce((a,b)=>a+b.protein,0), c:'text-red-500', bg:'bg-red-50'},
                 {l:'Carbs', v: scans.filter(s => new Date(s.timestamp).toDateString() === new Date().toDateString()).reduce((a,b)=>a+b.carbs,0), c:'text-orange-500', bg:'bg-orange-50'},
                 {l:'Fats', v: scans.filter(s => new Date(s.timestamp).toDateString() === new Date().toDateString()).reduce((a,b)=>a+b.fat,0), c:'text-blue-500', bg:'bg-blue-50'}].map((m,i)=>(
                   <div key={i} className={`rounded-[24px] p-4 ${m.bg} flex flex-col items-center justify-center h-28 border border-white/50 shadow-sm`}>
                       <span className={`font-black text-[9px] uppercase mb-2 tracking-widest ${m.c}`}>{m.l}</span>
                       <span className="text-xl font-bold tracking-tighter">{m.v}g</span>
                   </div>
               ))}
            </div>

            <div className="space-y-3">
              <h3 className="font-bold text-lg mb-4">Meal Log</h3>
              {scans.length === 0 ? <div className="text-center py-10 text-gray-400 font-medium">No meals logged yet.</div> : 
                scans.slice(0, 5).map(s => (
                  <div key={s.id} onClick={()=>{setAnalysis(s); setView('analysis')}} className="bg-white p-3 rounded-[24px] flex gap-4 shadow-card items-center cursor-pointer hover:bg-gray-50 transition-colors">
                    <img src={s.imageUrl} className="w-14 h-14 rounded-2xl object-cover bg-gray-100" />
                    <div className="flex-1">
                      <div className="font-bold text-sm">{s.foodName}</div>
                      <div className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">{s.calories} kcal • {s.mealType}</div>
                    </div>
                    <ChevronRight className="text-gray-200" size={18}/>
                  </div>
                ))
              }
            </div>
          </div>
        )}

        {view === 'analysis' && analysis && (
          <div className="pt-6 animate-fade-in">
            <button onClick={()=>setView('home')} className="mb-4 p-2 bg-white rounded-full shadow-card"><ArrowLeft size={20}/></button>
            <div className="bg-white rounded-[40px] overflow-hidden shadow-card">
              <img src={analysis.imageUrl} className="w-full h-64 object-cover" />
              <div className="p-8">
                <div className="flex justify-between items-start mb-6">
                  <div>
                    <span className="text-[10px] font-black bg-gray-100 px-2 py-1 rounded uppercase tracking-widest">{analysis.mealType}</span>
                    <h1 className="text-3xl font-bold tracking-tighter mt-2">{analysis.foodName}</h1>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-black">{analysis.healthScore}</div>
                    <div className="text-[8px] font-black text-gray-400 uppercase">Health Score</div>
                  </div>
                </div>
                <div className="grid grid-cols-4 gap-2 mb-8 text-center font-bold">
                  <div className="bg-gray-50 p-3 rounded-2xl"><div>{analysis.calories}</div><div className="text-[8px] opacity-40 uppercase">Kcal</div></div>
                  <div className="bg-red-50 p-3 rounded-2xl text-red-500"><div>{analysis.protein}g</div><div className="text-[8px] opacity-40 uppercase">Pro</div></div>
                  <div className="bg-orange-50 p-3 rounded-2xl text-orange-500"><div>{analysis.carbs}g</div><div className="text-[8px] opacity-40 uppercase">Carb</div></div>
                  <div className="bg-blue-50 p-3 rounded-2xl text-blue-500"><div>{analysis.fat}g</div><div className="text-[8px] opacity-40 uppercase">Fat</div></div>
                </div>
                <div className="bg-gray-50 p-6 rounded-[32px] italic text-sm text-gray-600">"{analysis.microAnalysis}"</div>
              </div>
            </div>
          </div>
        )}

        {view === 'stats' && (
           <div className="pt-6 animate-fade-in space-y-6">
             <h1 className="text-3xl font-bold tracking-tighter">Insights</h1>
             
             {/* Hydration */}
             <div className="bg-white p-6 rounded-[32px] shadow-card border border-gray-100">
                <div className="flex justify-between items-center mb-4">
                  <div className="flex items-center gap-2"><Droplets className="text-blue-500" size={20}/><span className="font-bold text-[10px] uppercase tracking-widest">Hydration</span></div>
                  <span className="text-[10px] font-black text-blue-600 bg-blue-50 px-2 py-1 rounded-full">{waterIntake}ml logged</span>
                </div>
                <div className="flex gap-1 mb-4">
                  {[...Array(8)].map((_, i) => <div key={i} className={`h-1.5 flex-1 rounded-full ${waterIntake >= (i+1)*250 ? 'bg-blue-500' : 'bg-gray-100'}`} />)}
                </div>
                <button onClick={() => setWaterIntake(prev => prev + 250)} className="w-full bg-blue-50 text-blue-600 py-3 rounded-2xl font-bold text-xs">+ 250ml Glass</button>
             </div>

             <div className="grid grid-cols-2 gap-4">
               <div className="bg-white p-6 rounded-[32px] shadow-card text-center">
                  <span className="font-bold text-[9px] uppercase tracking-widest text-gray-400 block mb-3">Precision</span>
                  <div className="text-3xl font-black">{Math.round((todayCalories/targetCals)*100)}%</div>
                  <p className="text-[8px] font-bold text-gray-400 mt-2 uppercase">Daily Target Met</p>
               </div>
               <div className="bg-black p-6 rounded-[32px] shadow-card text-center text-white">
                  <span className="font-bold text-[9px] uppercase tracking-widest opacity-40 block mb-3">Streak</span>
                  <div className="text-3xl font-black">4 Days</div>
                  <p className="text-[8px] font-bold opacity-40 mt-2 uppercase">Healthy Logging</p>
               </div>
             </div>

             {/* Distribution Chart */}
             <div className="bg-white p-6 rounded-[32px] shadow-card">
                <div className="flex items-center gap-2 mb-6"><Clock className="text-black" size={18}/><span className="font-bold text-[10px] uppercase tracking-widest">Energy Distribution</span></div>
                <div className="h-40 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={getMealSplit()}>
                      <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fontSize: 9, fontWeight: 900, fill: '#9ca3af'}} />
                      <Bar dataKey="value" radius={[10, 10, 10, 10]} barSize={40}>
                        {getMealSplit().map((e, i) => <Cell key={i} fill={['#000', '#333', '#666', '#999'][i]} />)}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
             </div>

             {/* Quality Trend Chart */}
             <div className="bg-white p-6 rounded-[32px] shadow-card">
                <div className="flex items-center gap-2 mb-6"><Activity className="text-green-500" size={18}/><span className="font-bold text-[10px] uppercase tracking-widest">Diet Quality Trend</span></div>
                <div className="h-48 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={getWeeklyTrend()}>
                      <defs><linearGradient id="colorQual" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#10b981" stopOpacity={0.1}/><stop offset="95%" stopColor="#10b981" stopOpacity={0}/></linearGradient></defs>
                      <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fontSize: 9, fontWeight: 700, fill: '#9ca3af'}} />
                      <Area type="monotone" dataKey="quality" stroke="#10b981" strokeWidth={3} fill="url(#colorQual)" />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
             </div>
           </div>
        )}

        {view === 'workouts' && (
          <div className="pt-6 text-center min-h-[70vh] flex flex-col items-center justify-center">
            <Dumbbell size={48} className="text-gray-200 mb-6" />
            <h2 className="text-3xl font-bold tracking-tighter mb-3">Elite Routines</h2>
            <p className="text-gray-500 mb-10 max-w-xs text-sm">Personalized routines for your {profile.goal} goal.</p>
            {!profile.isPremium && <button onClick={()=>setShowPremium(true)} className="w-full bg-black text-white p-5 rounded-[24px] font-bold shadow-xl flex items-center justify-center gap-2 transition-transform active:scale-95"><Crown size={20} className="text-yellow-400 fill-yellow-400"/> Pro Feature</button>}
          </div>
        )}

        {view === 'settings' && (
          <div className="pt-6 space-y-4">
            <h1 className="text-3xl font-bold tracking-tighter mb-8">Settings</h1>
            <div className="bg-white rounded-[32px] p-4 space-y-2 border border-gray-100">
              <div className="flex items-center gap-4 p-5 bg-gray-50 rounded-[24px]">
                <div className="w-14 h-14 bg-black text-white rounded-2xl flex items-center justify-center font-bold text-xl">{profile.name.charAt(0)}</div>
                <div><div className="font-bold text-lg">{profile.name}</div><div className="text-[10px] text-gray-400 font-black uppercase">{profile.isPremium ? 'Pro' : 'Free'}</div></div>
              </div>
              <button onClick={()=>setProfile(null)} className="w-full p-5 text-left font-bold text-sm hover:bg-gray-50 rounded-2xl transition-colors">Edit Profile</button>
              <button onClick={()=>signOut(auth)} className="w-full p-5 text-left font-bold text-sm text-red-500 hover:bg-red-50 rounded-2xl transition-colors">Sign Out</button>
            </div>
          </div>
        )}
      </div>

      <nav className="fixed bottom-0 left-0 right-0 bg-white/80 backdrop-blur-xl border-t border-gray-100 p-4 pb-10 flex justify-between items-center z-40 max-w-md mx-auto shadow-2xl px-8">
        <button onClick={()=>setView('home')} className={`transition-all ${view==='home'?'text-black scale-110':'text-gray-300'}`}><Home size={22}/></button>
        <button onClick={()=>setView('workouts')} className={`transition-all ${view==='workouts'?'text-black scale-110':'text-gray-300'}`}><Dumbbell size={22}/></button>
        <div className="relative -mt-16"><button onClick={()=>fileInputRef.current?.click()} className="w-16 h-16 bg-black rounded-full flex items-center justify-center text-white border-[6px] border-[#F2F2F7] shadow-2xl transition-transform active:scale-95"><Plus size={32}/></button></div>
        <button onClick={()=>setView('stats')} className={`transition-all ${view==='stats'?'text-black scale-110':'text-gray-300'}`}><BarChart2 size={22}/></button>
        <button onClick={()=>setView('settings')} className={`transition-all ${view==='settings'?'text-black scale-110':'text-gray-300'}`}><Settings size={22}/></button>
      </nav>

      <PremiumModal isOpen={showPremium} onClose={()=>setShowPremium(false)} onUpgrade={()=>{saveProfile({isPremium: true}); setShowPremium(false);}} />
    </div>
  );
};

export default App;
