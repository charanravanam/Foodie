
import React, { useState, useRef, useEffect } from 'react';
import { 
  Home, 
  BarChart2, 
  Settings, 
  Plus, 
  Flame, 
  ChevronRight, 
  ArrowLeft,
  Camera,
  User,
  Dumbbell,
  LogOut,
  Crown,
  Loader2,
  TrendingUp,
  Apple
} from 'lucide-react';
import { BarChart, Bar, XAxis, Tooltip, ResponsiveContainer, Cell, PieChart, Pie } from 'recharts';
import Onboarding from './components/Onboarding';
import PremiumModal from './components/PremiumModal';
import Auth from './components/Auth';
import { UserProfile, ScanHistoryItem, Gender, Goal } from './types';
import { analyzeFoodImage } from './services/geminiService';
import { auth, db } from './services/firebase';
import { onAuthStateChanged, signOut, User as FirebaseUser } from 'firebase/auth';
// Using firestore/lite to resolve "no exported member" errors
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
            const profileData = docSnap.data() as UserProfile;
            setProfile(profileData);
            
            const scansRef = collection(db, "profiles", u.uid, "scans");
            const q = query(scansRef, orderBy("timestamp", "desc"));
            const querySnapshot = await getDocs(q);
            const loadedScans: ScanHistoryItem[] = [];
            querySnapshot.forEach((doc) => {
              loadedScans.push({ id: doc.id, ...doc.data() } as ScanHistoryItem);
            });
            setScans(loadedScans);
          } else {
            setProfile(null);
          }
        } catch (err) {
          console.error("Session restoration failed:", err);
        }
      } else {
        setProfile(null);
        setScans([]);
      }
      setLoading(false);
    });
    return () => unsub();
  }, []);

  const saveProfile = async (p: Partial<UserProfile>) => {
    if (!user) return;
    const newProfile = { ...(profile || {}), ...p } as UserProfile;
    setProfile(newProfile);
    try {
      await setDoc(doc(db, "profiles", user.uid), newProfile);
    } catch (err) {
      console.error("Failed to save profile:", err);
    }
  };

  const handleScan = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !profile || !user) return;
    
    if (!profile.isPremium && scans.length >= MAX_FREE_SCANS) {
      setShowPremium(true);
      if(fileInputRef.current) fileInputRef.current.value = '';
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
        const scanData = { 
          ...res, 
          imageUrl: reader.result as string, 
          timestamp: new Date().toISOString() 
        };
        
        const docRef = await addDoc(collection(db, "profiles", user.uid, "scans"), scanData);
        const newScan = { ...scanData, id: docRef.id };
        
        setScans(prev => [newScan, ...prev]);
        setAnalysis(newScan);
      } catch (err: any) {
        console.error("Scan failed detail:", err);
        const errorMsg = err?.message || "";
        if (errorMsg === "GEMINI_API_KEY_MISSING") {
          alert("Configuration Error: Gemini API key is missing.");
        } else if (errorMsg.includes("503") || errorMsg.includes("overloaded")) {
          alert("Dr Foodie is currently very busy. The AI model is overloaded. Please try again in a few minutes.");
        } else {
          alert("Meal analysis failed. Please try a different photo or check your connection.");
        }
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
    const multiplier = 1.375;
    let target = base * multiplier;
    if(profile.goal === Goal.LOSE_WEIGHT) target -= 500;
    if(profile.goal === Goal.GAIN_WEIGHT) target += 500;
    return Math.round(target);
  };

  if (loading) {
    return (
      <div className="h-screen flex flex-col items-center justify-center bg-white">
        <Loader2 className="animate-spin text-black mb-4" size={40} />
        <p className="text-gray-400 font-medium animate-pulse tracking-tight">Initializing Dr Foodie...</p>
      </div>
    );
  }

  if (!user) return <Auth />;
  if (!profile || !profile.isOnboarded) return <Onboarding onComplete={(p) => saveProfile(p)} initialData={profile} />;

  const todayScans = scans.filter(s => new Date(s.timestamp).toDateString() === new Date().toDateString());
  const todayCalories = todayScans.reduce((a, b) => a + (b.calories || 0), 0);
  const targetCals = getCalorieTarget();
  const remaining = Math.max(0, targetCals - todayCalories);

  return (
    <div className="max-w-md mx-auto min-h-screen bg-[#F2F2F7] text-black relative shadow-2xl overflow-hidden flex flex-col font-sans">
      <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleScan} />
      
      <div className="flex-1 px-6 overflow-y-auto no-scrollbar">
        {view === 'home' && (
          <div className="pt-6 animate-fade-in pb-32">
            <header className="flex justify-between items-center mb-6">
              <img src="https://www.foodieqr.com/assets/img/logo.svg" alt="Dr Foodie" className="h-8" />
              <button onClick={()=>setShowPremium(true)} className="px-3 py-1.5 bg-white border border-gray-100 rounded-full text-[10px] font-black flex items-center gap-1.5 shadow-sm uppercase tracking-tighter">
                {profile.isPremium ? <Crown size={12} className="text-yellow-500 fill-yellow-500"/> : 
                  <><span className={scans.length >= MAX_FREE_SCANS ? 'text-red-500' : 'text-black'}>{Math.max(0, MAX_FREE_SCANS - scans.length)}</span> / {MAX_FREE_SCANS} Free</>
                }
              </button>
            </header>
            
            <div className="bg-white p-6 rounded-[32px] shadow-card mb-6 flex items-center justify-between relative overflow-hidden group">
              <div className="z-10">
                <div className="flex items-baseline gap-1">
                  <span className="text-5xl font-bold tracking-tighter">{todayCalories}</span>
                  <span className="text-lg text-gray-400 font-medium">/{targetCals}</span>
                </div>
                <div className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mt-1">Daily Calories</div>
              </div>
              <div className="w-24 h-24 relative z-10">
                <ResponsiveContainer>
                  <PieChart>
                    <Pie 
                      data={[{value: todayCalories, color: '#000'}, {value: remaining, color: '#f3f4f6'}]} 
                      dataKey="value" 
                      innerRadius={30} 
                      outerRadius={40} 
                      paddingAngle={5}
                      startAngle={90} 
                      endAngle={-270}
                    >
                      <Cell fill="#000" stroke="none" />
                      <Cell fill="#f3f4f6" stroke="none" />
                    </Pie>
                  </PieChart>
                </ResponsiveContainer>
                <Flame className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-black fill-black" size={20}/>
              </div>
              <div className="absolute -right-4 -bottom-4 w-24 h-24 bg-gray-50 rounded-full opacity-20 group-hover:scale-110 transition-transform"></div>
            </div>

            <div className="grid grid-cols-3 gap-3 mb-8">
               {[{l:'Protein', v: todayScans.reduce((a,b)=>a+b.protein,0), c:'text-red-500', bg:'bg-red-50'},
                 {l:'Carbs', v: todayScans.reduce((a,b)=>a+b.carbs,0), c:'text-orange-500', bg:'bg-orange-50'},
                 {l:'Fats', v: todayScans.reduce((a,b)=>a+b.fat,0), c:'text-blue-500', bg:'bg-blue-50'}].map((m,i)=>(
                   <div key={i} className={`rounded-[24px] p-4 ${m.bg} flex flex-col items-center justify-center h-28 border border-white/50 shadow-sm transition-transform active:scale-95`}>
                       <span className={`font-black text-[9px] uppercase mb-2 tracking-widest ${m.c}`}>{m.l}</span>
                       <span className="text-xl font-bold tracking-tighter">{m.v}g</span>
                   </div>
               ))}
            </div>

            <div className="flex justify-between items-center mb-4">
              <h3 className="font-bold text-lg tracking-tight">Recent Scans</h3>
              <button onClick={()=>setView('stats')} className="text-xs font-bold text-gray-400 hover:text-black transition-colors uppercase tracking-widest">History</button>
            </div>
            
            <div className="space-y-3">
              {scans.length === 0 ? 
                <div onClick={()=>fileInputRef.current?.click()} className="text-center text-gray-400 py-12 border-2 border-dashed border-gray-200 rounded-[28px] cursor-pointer hover:bg-gray-50 transition-all">
                  <Camera className="mx-auto mb-3 opacity-30" size={32}/>
                  <p className="text-sm font-medium">Scan your first meal to begin</p>
                </div> : 
                scans.slice(0, 5).map(s => (
                  <div key={s.id} onClick={()=>{setAnalysis(s); setView('analysis')}} className="bg-white p-3 rounded-[24px] flex gap-4 shadow-card items-center cursor-pointer transition-all hover:scale-[1.02] border border-transparent hover:border-gray-100">
                    <img src={s.imageUrl} className="w-16 h-16 rounded-[20px] object-cover bg-gray-50 shadow-inner" />
                    <div className="flex-1">
                      <div className="font-bold text-sm leading-tight mb-1">{s.foodName}</div>
                      <div className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">{s.calories} kcal • {s.protein}g P</div>
                    </div>
                    <ChevronRight className="text-gray-200" size={18}/>
                  </div>
                ))
              }
            </div>
          </div>
        )}

        {view === 'analysis' && (
          isAnalyzing ? (
            <div className="h-[80vh] flex flex-col items-center justify-center text-center px-10">
              <div className="relative mb-8">
                <div className="w-20 h-20 border-[6px] border-gray-100 rounded-full"></div>
                <div className="w-20 h-20 border-[6px] border-black border-t-transparent rounded-full animate-spin absolute top-0"></div>
                <Camera className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-black" size={24}/>
              </div>
              <h2 className="text-2xl font-bold tracking-tighter mb-2">Analyzing Meal</h2>
              <p className="text-gray-400 text-sm font-medium leading-relaxed">Dr Foodie is identifying ingredients and calculating nutrition data...</p>
            </div>
          ) : analysis && (
            <div className="pt-6 animate-fade-in pb-32">
              <button onClick={()=>setView('home')} className="mb-4 p-2 bg-white rounded-full shadow-card hover:bg-gray-50 transition-colors border border-gray-50"><ArrowLeft size={20}/></button>
              <div className="bg-white rounded-[40px] overflow-hidden shadow-card border border-gray-50">
                <div className="relative h-64">
                  <img src={analysis.imageUrl} className="w-full h-full object-cover" />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent"></div>
                  <div className="absolute bottom-6 left-6 text-white">
                    <div className="text-[10px] font-black uppercase tracking-[0.2em] mb-1 opacity-80">Identification</div>
                    <h1 className="text-3xl font-bold tracking-tighter">{analysis.foodName}</h1>
                  </div>
                  <div className="absolute top-6 right-6 bg-white/90 backdrop-blur px-3 py-1 rounded-full text-[10px] font-black text-black shadow-sm">
                    SCORE {analysis.healthScore}/10
                  </div>
                </div>
                <div className="p-8">
                  <div className="grid grid-cols-4 gap-2 mb-8 text-center">
                    <div className="bg-gray-50 p-3 rounded-2xl border border-gray-100">
                      <div className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1">Cal</div>
                      <div className="font-bold text-lg leading-none">{analysis.calories}</div>
                    </div>
                    <div className="bg-red-50 p-3 rounded-2xl border border-red-100 text-red-600">
                      <div className="text-[9px] font-black uppercase tracking-widest mb-1">Pro</div>
                      <div className="font-bold text-lg leading-none">{analysis.protein}g</div>
                    </div>
                    <div className="bg-orange-50 p-3 rounded-2xl border border-orange-100 text-orange-600">
                      <div className="text-[9px] font-black uppercase tracking-widest mb-1">Carb</div>
                      <div className="font-bold text-lg leading-none">{analysis.carbs}g</div>
                    </div>
                    <div className="bg-blue-50 p-3 rounded-2xl border border-blue-100 text-blue-600">
                      <div className="text-[9px] font-black uppercase tracking-widest mb-1">Fat</div>
                      <div className="font-bold text-lg leading-none">{analysis.fat}g</div>
                    </div>
                  </div>
                  <div className="bg-gray-50 p-6 rounded-[32px] border border-gray-100 relative">
                    <div className="absolute -top-3 left-6 bg-black text-white px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest">Analysis</div>
                    <p className="text-sm font-medium leading-relaxed text-gray-700 italic">"{analysis.microAnalysis}"</p>
                  </div>
                </div>
              </div>
            </div>
          )
        )}

        {view === 'stats' && (
           <div className="pt-6 animate-fade-in pb-32 px-2">
             <h1 className="text-3xl font-bold tracking-tighter mb-6">Insights</h1>
             <div className="bg-white p-6 rounded-[32px] shadow-card border border-gray-50 mb-6">
                <div className="flex items-center gap-2 mb-6">
                  <TrendingUp className="text-black" size={20}/>
                  <span className="font-bold uppercase text-xs tracking-widest">Aggregate Stats</span>
                </div>
                <div className="grid grid-cols-2 gap-4">
                    <div className="text-center p-5 bg-gray-50 rounded-[24px] border border-gray-100">
                        <div className="text-3xl font-bold tracking-tighter">{scans.length}</div>
                        <div className="text-[9px] text-gray-400 font-black uppercase tracking-widest mt-1">Total Scans</div>
                    </div>
                    <div className="text-center p-5 bg-gray-50 rounded-[24px] border border-gray-100">
                        <div className="text-3xl font-bold tracking-tighter">{scans.length > 0 ? Math.round(scans.reduce((a,b)=>a+b.calories,0) / scans.length) : 0}</div>
                        <div className="text-[9px] text-gray-400 font-black uppercase tracking-widest mt-1">Avg Kcal/Meal</div>
                    </div>
                </div>
             </div>

             <div className="bg-white p-6 rounded-[32px] shadow-card border border-gray-50">
               <div className="flex items-center gap-2 mb-6">
                  <Apple className="text-black" size={20}/>
                  <span className="font-bold uppercase text-xs tracking-widest">Macro Split</span>
                </div>
                <div className="h-48 w-full flex items-center justify-center">
                   <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={[{name: 'PRO', val: scans.reduce((a,b)=>a+b.protein,0)}, {name: 'CARB', val: scans.reduce((a,b)=>a+b.carbs,0)}, {name: 'FAT', val: scans.reduce((a,b)=>a+b.fat,0)}]}>
                        <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fontSize: 10, fontWeight: 900}} />
                        <Tooltip cursor={{fill: 'transparent'}} contentStyle={{borderRadius: '16px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)'}} />
                        <Bar dataKey="val" radius={[10, 10, 10, 10]} barSize={40}>
                          <Cell fill="#ef4444" />
                          <Cell fill="#f97316" />
                          <Cell fill="#3b82f6" />
                        </Bar>
                      </BarChart>
                   </ResponsiveContainer>
                </div>
             </div>
           </div>
        )}

        {view === 'workouts' && (
          <div className="pt-6 animate-fade-in text-center pb-32 px-4 flex flex-col items-center justify-center min-h-[70vh]">
            <div className="w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mb-8 border border-gray-200">
              <Dumbbell size={40} className="text-gray-300" />
            </div>
            <h2 className="text-3xl font-bold tracking-tighter mb-3">Custom Plans</h2>
            <p className="text-gray-500 mb-10 max-w-xs text-sm font-medium leading-relaxed">
              Unlock clinical-grade AI workout routines based on your weight goal of {profile.targetWeight}kg.
            </p>
            {!profile.isPremium ? (
              <button onClick={()=>setShowPremium(true)} className="w-full bg-black text-white p-5 rounded-[24px] font-bold shadow-xl flex items-center justify-center gap-2 transition-transform active:scale-95">
                <Crown size={20} className="text-yellow-400 fill-yellow-400"/> Dr Foodie Pro • ₹49/mo
              </button>
            ) : (
              <div className="p-10 bg-white rounded-[32px] border border-dashed border-gray-200 text-gray-400 font-bold text-sm tracking-widest uppercase">
                Generating Routine...
              </div>
            )}
          </div>
        )}

        {view === 'settings' && (
          <div className="pt-6 animate-fade-in pb-32">
            <h1 className="text-3xl font-bold tracking-tighter mb-8">Settings</h1>
            <div className="bg-white rounded-[32px] overflow-hidden shadow-card p-4 space-y-2 border border-gray-50">
              <div className="flex items-center gap-4 p-5 bg-gray-50 rounded-[24px] mb-4 border border-gray-100">
                <div className="w-14 h-14 bg-black text-white rounded-[20px] flex items-center justify-center font-bold text-xl shadow-lg">{profile.name.charAt(0)}</div>
                <div>
                  <div className="font-bold text-lg tracking-tight">{profile.name}</div>
                  <div className="text-[10px] text-gray-400 font-black uppercase tracking-widest">{profile.isPremium ? 'Pro Member' : 'Free Tier'}</div>
                </div>
              </div>
              <button onClick={()=>setProfile(null)} className="w-full p-5 text-left font-bold text-sm flex justify-between hover:bg-gray-50 rounded-[20px] transition-colors group">
                <span className="flex gap-3 items-center"><User size={20} className="group-hover:text-black transition-colors"/> Edit Profile</span> <ChevronRight size={18} className="text-gray-200 group-hover:text-gray-400 transition-colors"/>
              </button>
              <button onClick={()=>setShowPremium(true)} className="w-full p-5 text-left font-bold text-sm flex justify-between hover:bg-gray-50 rounded-[20px] transition-colors group">
                <span className="flex gap-3 items-center"><Crown size={20} className="group-hover:text-yellow-600 transition-colors"/> Subscription</span> <ChevronRight size={18} className="text-gray-200 group-hover:text-gray-400 transition-colors"/>
              </button>
              <div className="h-[1px] bg-gray-100 my-2 mx-5"></div>
              <button onClick={()=>signOut(auth)} className="w-full p-5 text-left font-bold text-sm text-red-500 hover:bg-red-50 rounded-[20px] flex gap-3 items-center transition-colors">
                <LogOut size={20}/> Sign Out
              </button>
            </div>
          </div>
        )}
      </div>

      {view !== 'analysis' && (
        <nav className="fixed bottom-0 left-0 right-0 bg-white/80 backdrop-blur-xl border-t border-gray-100 p-4 pb-10 flex justify-between items-center z-40 max-w-md mx-auto shadow-[0_-8px_30px_rgb(0,0,0,0.04)] px-8">
          <button onClick={()=>setView('home')} className={`flex flex-col items-center gap-1.5 transition-all duration-300 ${view==='home'?'text-black scale-110':'text-gray-300 hover:text-gray-500'}`}><Home size={22} strokeWidth={view==='home'?2.5:2}/></button>
          <button onClick={()=>setView('workouts')} className={`flex flex-col items-center gap-1.5 transition-all duration-300 ${view==='workouts'?'text-black scale-110':'text-gray-300 hover:text-gray-500'}`}><Dumbbell size={22} strokeWidth={view==='workouts'?2.5:2}/></button>
          
          <div className="relative -mt-16">
            <button 
              onClick={()=>fileInputRef.current?.click()} 
              className="w-16 h-16 bg-black rounded-full flex items-center justify-center text-white border-[6px] border-[#F2F2F7] shadow-2xl hover:scale-110 transition-transform active:scale-95 group"
            >
              <Plus size={32} className="group-hover:rotate-90 transition-transform duration-300"/>
            </button>
          </div>

          <button onClick={()=>setView('stats')} className={`flex flex-col items-center gap-1.5 transition-all duration-300 ${view==='stats'?'text-black scale-110':'text-gray-300 hover:text-gray-500'}`}><BarChart2 size={22} strokeWidth={view==='stats'?2.5:2}/></button>
          <button onClick={()=>setView('settings')} className={`flex flex-col items-center gap-1.5 transition-all duration-300 ${view==='settings'?'text-black scale-110':'text-gray-300 hover:text-gray-500'}`}><Settings size={22} strokeWidth={view==='settings'?2.5:2}/></button>
        </nav>
      )}

      <PremiumModal isOpen={showPremium} onClose={()=>setShowPremium(false)} onUpgrade={()=>{saveProfile({isPremium: true}); setShowPremium(false);}} />
    </div>
  );
};

export default App;
