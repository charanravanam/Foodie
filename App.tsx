
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
  Apple,
  Target,
  Zap,
  Star,
  Activity,
  Droplets,
  Calendar,
  Clock
} from 'lucide-react';
import { 
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, 
  PieChart, Pie, LineChart, Line, CartesianGrid, AreaChart, Area
} from 'recharts';
import Onboarding from './components/Onboarding';
import PremiumModal from './components/PremiumModal';
import Auth from './components/Auth';
import { UserProfile, ScanHistoryItem, Gender, Goal } from './types';
import { analyzeFoodImage } from './services/geminiService';
import { auth, db } from './services/firebase';
import { onAuthStateChanged, signOut, User as FirebaseUser } from 'firebase/auth';
// Updated to firebase/firestore/lite to resolve "no exported member" errors
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
  const [waterIntake, setWaterIntake] = useState(0); // Daily water in ml
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
        alert("Dr Foodie is busy or the photo was unclear. Please try again.");
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

  // Improved Stats Data
  const getWeeklyData = () => {
    const days = [...Array(7)].map((_, i) => {
      const d = new Date();
      d.setDate(d.getDate() - i);
      return d.toDateString();
    }).reverse();

    return days.map(day => {
      const dayScans = scans.filter(s => new Date(s.timestamp).toDateString() === day);
      return {
        name: day.split(' ')[0],
        calories: dayScans.reduce((a, b) => a + b.calories, 0),
        quality: dayScans.length > 0 ? Number((dayScans.reduce((a, b) => a + b.healthScore, 0) / dayScans.length).toFixed(1)) : 0
      };
    });
  };

  const getMealDistribution = () => {
    const today = new Date().toDateString();
    const todayScans = scans.filter(s => new Date(s.timestamp).toDateString() === today);
    const distribution = { Breakfast: 0, Lunch: 0, Dinner: 0, Snack: 0 };
    todayScans.forEach(s => {
      if (s.mealType) distribution[s.mealType] += s.calories;
    });
    return Object.keys(distribution).map(key => ({ name: key, value: (distribution as any)[key] }));
  };

  if (loading) {
    return (
      <div className="h-screen flex flex-col items-center justify-center bg-white">
        <Loader2 className="animate-spin text-black mb-4" size={40} />
        <p className="text-gray-400 font-medium animate-pulse tracking-tight tracking-widest uppercase text-[10px]">Syncing Records...</p>
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
      
      <div className="flex-1 px-6 overflow-y-auto no-scrollbar pb-32">
        {view === 'home' && (
          <div className="pt-6 animate-fade-in">
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
              <h3 className="font-bold text-lg tracking-tight">Timeline</h3>
              <button onClick={()=>setView('stats')} className="text-xs font-bold text-gray-400 hover:text-black transition-colors uppercase tracking-widest">Analytics</button>
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
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-bold text-sm leading-tight">{s.foodName}</span>
                        {s.mealType && <span className="text-[8px] bg-gray-100 px-1.5 py-0.5 rounded uppercase font-black">{s.mealType}</span>}
                      </div>
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
            <div className="pt-6 animate-fade-in">
              <button onClick={()=>setView('home')} className="mb-4 p-2 bg-white rounded-full shadow-card hover:bg-gray-50 transition-colors border border-gray-50"><ArrowLeft size={20}/></button>
              <div className="bg-white rounded-[40px] overflow-hidden shadow-card border border-gray-50">
                <div className="relative h-64">
                  <img src={analysis.imageUrl} className="w-full h-full object-cover" />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent"></div>
                  <div className="absolute bottom-6 left-6 text-white">
                    <div className="text-[10px] font-black uppercase tracking-[0.2em] mb-1 opacity-80">Identification • {analysis.mealType}</div>
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
           <div className="pt-6 animate-fade-in space-y-6">
             <div className="flex justify-between items-end">
               <div>
                 <h1 className="text-3xl font-bold tracking-tighter">Insights</h1>
                 <p className="text-gray-400 text-xs font-medium uppercase tracking-widest mt-1">Holistic Metrics</p>
               </div>
               <div className="flex gap-2">
                 <div className="bg-white p-2.5 rounded-2xl shadow-sm border border-gray-100">
                   <Calendar className="text-black" size={20} />
                 </div>
               </div>
             </div>

             {/* Daily Hydration Tracker */}
             <div className="bg-white p-6 rounded-[32px] shadow-card border border-gray-100 relative overflow-hidden">
                <div className="flex justify-between items-center mb-4">
                  <div className="flex items-center gap-2">
                    <Droplets className="text-blue-500" size={20} fill="currentColor"/>
                    <span className="font-bold text-[10px] uppercase tracking-[0.2em]">Smart Hydration</span>
                  </div>
                  <span className="text-[10px] font-black text-blue-600 bg-blue-50 px-2 py-1 rounded-full">{waterIntake}ml logged</span>
                </div>
                <div className="flex gap-2 mb-4">
                  {[...Array(8)].map((_, i) => (
                    <div 
                      key={i} 
                      className={`h-1.5 flex-1 rounded-full transition-all duration-500 ${waterIntake >= (i+1)*250 ? 'bg-blue-500' : 'bg-gray-100'}`}
                    />
                  ))}
                </div>
                <div className="flex gap-2">
                  <button 
                    onClick={() => setWaterIntake(prev => prev + 250)}
                    className="flex-1 bg-blue-50 hover:bg-blue-100 text-blue-600 py-3 rounded-2xl font-bold text-xs transition-colors active:scale-95 flex items-center justify-center gap-2"
                  >
                    + 250ml Glass
                  </button>
                  <button 
                    onClick={() => setWaterIntake(0)}
                    className="px-4 bg-gray-50 text-gray-300 py-3 rounded-2xl hover:bg-gray-100 transition-colors"
                  >
                    Reset
                  </button>
                </div>
             </div>

             {/* Calorie Sweet Spot Meter */}
             <div className="grid grid-cols-2 gap-4">
               <div className="bg-white p-6 rounded-[32px] shadow-card border border-gray-100 text-center">
                  <span className="font-bold text-[9px] uppercase tracking-widest text-gray-400 block mb-3">Precision</span>
                  <div className="relative w-24 h-24 mx-auto">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie 
                          data={[{v: todayCalories}, {v: Math.max(0, targetCals - todayCalories)}]} 
                          innerRadius={30} 
                          outerRadius={40} 
                          dataKey="v" 
                          startAngle={180} 
                          endAngle={0}
                        >
                          <Cell fill={todayCalories > targetCals + 100 ? '#ef4444' : '#10b981'} stroke="none" />
                          <Cell fill="#f3f4f6" stroke="none" />
                        </Pie>
                      </PieChart>
                    </ResponsiveContainer>
                    <div className="absolute inset-0 flex flex-col items-center justify-center pt-4">
                       <span className="text-xl font-black">{Math.round((todayCalories/targetCals)*100)}%</span>
                    </div>
                  </div>
                  <p className="text-[10px] font-bold text-gray-400 mt-2 uppercase">Daily Target</p>
               </div>

               <div className="bg-black p-6 rounded-[32px] shadow-card text-center text-white">
                  <span className="font-bold text-[9px] uppercase tracking-widest opacity-50 block mb-3">Consistency</span>
                  <div className="w-16 h-16 bg-white/10 rounded-full flex items-center justify-center mx-auto mb-2 border border-white/10">
                    <Star className="text-yellow-400" size={28} fill="currentColor" />
                  </div>
                  <div className="text-2xl font-black tracking-tighter">4 Day</div>
                  <p className="text-[10px] font-bold opacity-50 uppercase">Current Streak</p>
               </div>
             </div>

             {/* Meal Distribution Card */}
             <div className="bg-white p-6 rounded-[32px] shadow-card border border-gray-100">
                <div className="flex items-center gap-2 mb-6">
                  <Clock className="text-black" size={18}/>
                  <span className="font-bold text-[10px] uppercase tracking-widest">Energy Distribution</span>
                </div>
                <div className="h-40 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={getMealDistribution()}>
                      <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fontSize: 9, fontWeight: 900, fill: '#9ca3af'}} />
                      <Tooltip 
                        contentStyle={{borderRadius: '16px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)'}}
                        cursor={{fill: 'transparent'}}
                      />
                      <Bar dataKey="value" radius={[10, 10, 10, 10]} barSize={40}>
                        {getMealDistribution().map((entry, index) => (
                          <Cell key={index} fill={['#000', '#333', '#666', '#999'][index]} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
             </div>

             {/* Diet Quality Trend */}
             <div className="bg-white p-6 rounded-[32px] shadow-card border border-gray-100">
                <div className="flex items-center gap-2 mb-6">
                  <Activity className="text-green-500" size={18}/>
                  <span className="font-bold text-[10px] uppercase tracking-widest text-gray-500">Diet Quality Trend</span>
                </div>
                <div className="h-48 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={getWeeklyData()}>
                      <defs>
                        <linearGradient id="colorQual" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#10b981" stopOpacity={0.1}/>
                          <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
                      <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fontSize: 9, fontWeight: 700, fill: '#9ca3af'}} />
                      <YAxis hide domain={[0, 10]} />
                      <Tooltip 
                        contentStyle={{borderRadius: '16px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)'}}
                      />
                      <Area type="monotone" dataKey="quality" stroke="#10b981" strokeWidth={3} fillOpacity={1} fill="url(#colorQual)" />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
                <div className="mt-4 flex justify-between items-center text-[10px] font-bold text-gray-400 uppercase">
                  <span>Score Tracking</span>
                  <span className="text-green-600">Optimum Range: 7-10</span>
                </div>
             </div>

             {/* Achievement / Suggestion Card */}
             <div className="bg-indigo-600 p-6 rounded-[32px] text-white flex items-center gap-4 relative overflow-hidden">
                <div className="z-10 bg-white/20 p-3 rounded-2xl backdrop-blur-md">
                   <Zap size={24} fill="currentColor" />
                </div>
                <div className="z-10">
                   <h4 className="font-bold text-sm">Metabolic Edge</h4>
                   <p className="text-[10px] opacity-80 leading-relaxed">Your hydration is up 12% today. This improves nutrient absorption and calorie burn.</p>
                </div>
                <div className="absolute -right-4 -bottom-4 w-20 h-20 bg-white/10 rounded-full blur-2xl"></div>
             </div>
           </div>
        )}

        {view === 'workouts' && (
          <div className="pt-6 animate-fade-in text-center flex flex-col items-center justify-center min-h-[70vh]">
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
          <div className="pt-6 animate-fade-in">
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
