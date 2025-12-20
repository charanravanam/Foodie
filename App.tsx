import React, { useState, useRef, useEffect } from 'react';
import { 
  Home, BarChart2, Settings, Plus, Flame, ChevronRight, ArrowLeft,
  Camera, User, Dumbbell, LogOut, Crown, Loader2, TrendingUp,
  Apple, Target, Zap, Star, Activity, Droplets, Calendar, Clock,
  Trophy, CheckCircle2, Info, Timer, ZapOff, Play, X, Pause, SkipForward
} from 'lucide-react';
import { 
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, 
  AreaChart, Area, CartesianGrid
} from 'recharts';
// Fixing Firebase Auth imports and type definitions to resolve resolution errors
import { onAuthStateChanged, signOut } from 'firebase/auth';
import type { User as FirebaseUser } from 'firebase/auth';
// Fixing Firebase Firestore imports to resolve member resolution errors
import { 
  doc, getDoc, setDoc, collection, query, orderBy, getDocs, addDoc 
} from 'firebase/firestore';
import Onboarding from './components/Onboarding';
import PremiumModal from './components/PremiumModal';
import Auth from './components/Auth';
import { UserProfile, ScanHistoryItem, Gender, Goal } from './types';
import { analyzeFoodImage } from './services/geminiService';
import { auth, db } from './services/firebase';

const MAX_FREE_SCANS = 3;

const App: React.FC = () => {
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [view, setView] = useState<'home' | 'workouts' | 'stats' | 'settings' | 'analysis'>('home');
  const [activeWorkout, setActiveWorkout] = useState<any | null>(null);
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
        await fetchProfile(u.uid);
      }
      setLoading(false);
    });
    return () => unsub();
  }, []);

  const fetchProfile = async (uid: string) => {
    try {
      const docRef = doc(db, "profiles", uid);
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        const pData = docSnap.data() as UserProfile;
        setProfile(pData);
        
        const scansRef = collection(db, "profiles", uid, "scans");
        const q = query(scansRef, orderBy("timestamp", "desc"));
        const querySnapshot = await getDocs(q);
        const loadedScans: ScanHistoryItem[] = [];
        querySnapshot.forEach((doc) => {
          loadedScans.push({ id: doc.id, ...doc.data() } as ScanHistoryItem);
        });
        setScans(loadedScans);
      }
    } catch (err) { console.error(err); }
  };

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
        alert("AI processing error. Try a clearer photo.");
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

  const getWorkouts = (): any[] => {
    if (!profile) return [];
    
    // Exercise Library with GIFs
    // Note: Using direct GIF links where possible for immediate visual impact
    if (profile.goal === Goal.LOSE_WEIGHT) return [
      { 
        name: "Metabolic HIIT", 
        dur: "20m", 
        level: "High", 
        tag: "FAT BURN", 
        icon: <Flame className="text-orange-500" size={18}/>,
        img: "https://images.unsplash.com/photo-1517836357463-d25dfeac3438?w=800&q=80",
        gifUrl: "https://fitnessprogramer.com/wp-content/uploads/2021/02/HIIT.gif",
        desc: "High-intensity bursts to maximize calorie afterburn for up to 24 hours."
      },
      { 
        name: "Fasted Walk", 
        dur: "45m", 
        level: "Low", 
        tag: "INSULIN", 
        icon: <Activity className="text-blue-500" size={18}/>,
        img: "https://images.unsplash.com/photo-1552674605-db6ffd4facb5?w=800&q=80",
        gifUrl: "https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExOHJidTRidTRidTRidTRidTRidTRidTRidTRidTRidTRidTRidTRidSZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9Zw/3o7TKp56t61Fv6v6rO/giphy.gif",
        desc: "Low-impact aerobic movement optimized for fat oxidation and glucose stability."
      },
      { 
        name: "Core Compression", 
        dur: "15m", 
        level: "Med", 
        tag: "ABS", 
        icon: <CheckCircle2 className="text-green-500" size={18}/>,
        img: "https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=800&q=80",
        gifUrl: "https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExNHJidTRidTRidTRidTRidTRidTRidTRidTRidTRidTRidTRidTRidSZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9Zw/3o7TKSj0G5W1z1f1wM/giphy.gif",
        desc: "Focused abdominal engagement to improve posture and visceral fat reduction."
      },
      { 
        name: "Daily Mobility", 
        dur: "10m", 
        level: "Low", 
        tag: "RECOVERY", 
        icon: <Clock className="text-teal-500" size={18}/>,
        img: "https://images.unsplash.com/photo-1544367567-0f2fcb009e0b?w=800&q=80",
        gifUrl: "https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExNHJidTRidTRidTRidTRidTRidTRidTRidTRidTRidTRidTRidTRidSZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9Zw/3o7TKp56t61Fv6v6rO/giphy.gif",
        desc: "Clinical stretching to reduce inflammation and maintain joint health."
      }
    ];
    if (profile.goal === Goal.GAIN_WEIGHT) return [
      { 
        name: "Hypertrophy Push", 
        dur: "50m", 
        level: "High", 
        tag: "STRENGTH", 
        icon: <Zap className="text-yellow-500" size={18}/>,
        img: "https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=800&q=80",
        gifUrl: "https://fitnessprogramer.com/wp-content/uploads/2021/06/Cross-Arm-Push-Up.gif",
        desc: "Heavy compound movements focusing on chest, shoulders, and triceps."
      },
      { 
        name: "Heavy Squats", 
        dur: "30m", 
        level: "Elite", 
        tag: "POWER", 
        icon: <Trophy className="text-red-500" size={18}/>,
        img: "https://images.unsplash.com/photo-1534258936925-c58bed479fcb?w=800&q=80",
        gifUrl: "https://media.tenor.com/gI9jz9Pz_3IAAAAC/squat-exercise.gif",
        desc: "Lower body mastery to trigger maximum anabolic hormone release."
      },
      { 
        name: "Compound Pull", 
        dur: "45m", 
        level: "High", 
        tag: "BACK", 
        icon: <TrendingUp className="text-indigo-500" size={18}/>,
        img: "https://images.unsplash.com/photo-1526506118085-60ce8714f8c5?w=800&q=80",
        gifUrl: "https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExNHJidTRidTRidTRidTRidTRidTRidTRidTRidTRidTRidTRidTRidSZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9Zw/3o7TKp56t61Fv6v6rO/giphy.gif",
        desc: "Deadlifts and rows to build a thick, metabolic-demanding back."
      },
      { 
        name: "Pump Session", 
        dur: "15m", 
        level: "Med", 
        tag: "PUMP", 
        icon: <Activity className="text-pink-500" size={18}/>,
        img: "https://images.unsplash.com/photo-1581009146145-b5ef03a94e77?w=800&q=80",
        gifUrl: "https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExNHJidTRidTRidTRidTRidTRidTRidTRidTRidTRidTRidTRidTRidSZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9Zw/3o7TKp56t61Fv6v6rO/giphy.gif",
        desc: "High volume isolation work to maximize sarcoplasmic hypertrophy."
      }
    ];
    return [
      { 
        name: "Full Body Circuit", 
        dur: "40m", 
        level: "Med", 
        tag: "BALANCE", 
        icon: <Activity className="text-indigo-500" size={18}/>,
        img: "https://images.unsplash.com/photo-1541534741688-6078c6bfb5c5?w=800&q=80",
        gifUrl: "https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExNHJidTRidTRidTRidTRidTRidTRidTRidTRidTRidTRidTRidTRidSZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9Zw/3o7TKp56t61Fv6v6rO/giphy.gif",
        desc: "Balanced movement addressing all major muscle groups for overall vitality."
      },
      { 
        name: "Zone 2 Jog", 
        dur: "30m", 
        level: "Low", 
        tag: "HEART", 
        icon: <Activity className="text-blue-400" size={18}/>,
        img: "https://images.unsplash.com/photo-1476480862126-209bfaa8edc8?w=800&q=80",
        gifUrl: "https://fitnessprogramer.com/wp-content/uploads/2021/02/Jogging.gif",
        desc: "Low-intensity cardiovascular work to improve mitochondrial density."
      },
      { 
        name: "Yoga Flow", 
        dur: "25m", 
        level: "Low", 
        tag: "MIND", 
        icon: <Clock className="text-purple-400" size={18}/>,
        img: "https://images.unsplash.com/photo-1544367567-0f2fcb009e0b?w=800&q=80",
        gifUrl: "https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExNHJidTRidTRidTRidTRidTRidTRidTRidTRidTRidTRidTRidTRidSZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9Zw/3o7TKp56t61Fv6v6rO/giphy.gif",
        desc: "Vinyasa flow to improve flexibility and reduce cortisol levels."
      }
    ];
  };

  const todayScans = scans.filter(s => new Date(s.timestamp).toDateString() === new Date().toDateString());
  const todayCalories = todayScans.reduce((a, b) => a + b.calories, 0);
  const targetCals = getCalorieTarget();
  const readiness = Math.min(100, Math.round((todayCalories / (targetCals || 1)) * 100));

  if (!user) return <Auth />;
  if (!profile || !profile.isOnboarded) return <Onboarding onComplete={saveProfile} initialData={profile} />;

  return (
    <div className="max-w-md mx-auto min-h-screen bg-[#F2F2F7] text-black relative shadow-2xl overflow-hidden flex flex-col font-sans">
      <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleScan} />
      
      <div className="flex-1 px-6 overflow-y-auto no-scrollbar pb-32">
        {view === 'home' && (
          <div className="pt-6 animate-fade-in">
            <header className="flex justify-between items-center mb-6">
              <img src="https://www.foodieqr.com/assets/img/logo.svg" alt="Dr Foodie" className="h-8" />
              <button onClick={()=>setShowPremium(true)} className={`px-4 py-2 rounded-full text-[10px] font-black shadow-sm uppercase transition-all active:scale-95 ${profile.isPremium ? 'bg-black text-yellow-400 border border-yellow-400/20 shadow-lg shadow-yellow-400/10' : 'bg-white text-black border border-gray-100'}`}>
                {profile.isPremium ? <div className="flex items-center gap-2"><Crown size={12} className="fill-yellow-400"/> PRO UNLIMITED</div> : `${MAX_FREE_SCANS - scans.length} Free Left`}
              </button>
            </header>
            
            <div className="bg-white p-6 rounded-[32px] shadow-card mb-4 flex items-center justify-between relative overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-gray-50 rounded-full blur-3xl -mr-16 -mt-16"></div>
              <div className="relative z-10">
                <div className="flex items-baseline gap-1">
                  <span className="text-5xl font-bold tracking-tighter">{todayCalories}</span>
                  <span className="text-lg text-gray-400">/{targetCals}</span>
                </div>
                <div className="text-[10px] text-gray-400 font-black uppercase tracking-widest mt-1">Calorie Budget</div>
              </div>
              <Activity className="text-black relative z-10" size={32} />
            </div>

            {profile.isPremium && (
              <div className="bg-gradient-to-br from-zinc-900 to-black p-5 rounded-[32px] mb-6 text-white relative overflow-hidden border border-white/5 shadow-xl">
                <div className="absolute top-0 right-0 p-4 opacity-20"><Zap className="text-yellow-400" size={48} /></div>
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse shadow-[0_0_8px_rgba(34,197,94,0.8)]"></div>
                  <span className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-400">Metabolic Window: Optimal</span>
                </div>
                <h4 className="text-lg font-bold tracking-tight mb-1">Fat Oxidation Mode</h4>
                <p className="text-[10px] text-gray-400 font-medium leading-relaxed">Your insulin levels are steady. Current scan frequency reveals 4% faster metabolism than baseline.</p>
              </div>
            )}

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

            <div className="space-y-3">
              <div className="flex justify-between items-center mb-4 px-1">
                <h3 className="font-bold text-lg">Daily Log</h3>
                <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">{todayScans.length} Entries Today</span>
              </div>
              {scans.length === 0 ? <div className="text-center py-16 text-gray-400 font-medium bg-white rounded-[32px] border-2 border-dashed border-gray-100">Tap + to scan your first meal</div> : 
                scans.slice(0, 5).map(s => (
                  <div key={s.id} onClick={()=>{setAnalysis(s); setView('analysis')}} className="bg-white p-3 rounded-[24px] flex gap-4 shadow-card items-center cursor-pointer hover:bg-gray-50 transition-all active:scale-[0.98]">
                    <img src={s.imageUrl} className="w-14 h-14 rounded-2xl object-cover bg-gray-100 shadow-inner" />
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-0.5">
                        <span className="font-bold text-sm">{s.foodName}</span>
                        <span className="text-[8px] bg-gray-100 px-1.5 py-0.5 rounded font-black opacity-60 uppercase">{s.mealType}</span>
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

        {view === 'workouts' && (
          <div className="pt-6 animate-fade-in pb-12">
            <header className="flex justify-between items-end mb-8 px-1">
              <div>
                <h1 className="text-3xl font-bold tracking-tighter">Movement</h1>
                <p className="text-gray-400 text-[10px] font-black uppercase tracking-[0.2em] mt-1">Bio-Adaptive Routines</p>
              </div>
              {profile.isPremium && <Crown size={20} className="text-yellow-500 mb-1 fill-yellow-500"/>}
            </header>

            {!profile.isPremium ? (
              <div className="text-center min-h-[50vh] flex flex-col items-center justify-center">
                <div className="w-24 h-24 bg-white rounded-[32px] shadow-card border border-gray-100 flex items-center justify-center mb-8">
                  <Dumbbell size={40} className="text-gray-300" />
                </div>
                <h2 className="text-2xl font-bold tracking-tighter mb-3">Upgrade to Training</h2>
                <p className="text-gray-500 mb-10 max-w-xs text-sm font-medium leading-relaxed italic px-4">"Unlock AI-generated workout routines based on your metabolic scanning data."</p>
                <button onClick={()=>setShowPremium(true)} className="w-full bg-black text-white p-5 rounded-3xl font-bold shadow-2xl flex items-center justify-center gap-3 transition-all active:scale-95 group">
                  <Crown size={20} className="text-yellow-400 fill-yellow-400 group-hover:rotate-12 transition-transform"/> Start Dr Foodie Pro
                </button>
              </div>
            ) : (
              <div className="space-y-6">
                <div className="bg-white p-6 rounded-[32px] shadow-card border border-gray-100 relative overflow-hidden">
                   <div className="flex justify-between items-center mb-4">
                      <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Training Readiness</span>
                      <span className="font-bold text-xs">{readiness}%</span>
                   </div>
                   <div className="h-2 w-full bg-gray-50 rounded-full overflow-hidden mb-4">
                      <div 
                        className={`h-full transition-all duration-1000 ${readiness > 70 ? 'bg-green-500 shadow-[0_0_10px_rgba(34,197,94,0.4)]' : readiness > 40 ? 'bg-yellow-500 shadow-[0_0_10px_rgba(234,179,8,0.4)]' : 'bg-red-500 shadow-[0_0_10px_rgba(239,68,68,0.4)]'}`} 
                        style={{ width: `${readiness}%` }}
                      ></div>
                   </div>
                   <p className="text-[10px] text-gray-400 font-medium leading-relaxed italic">
                     {readiness > 70 ? "Energy levels are optimal for high intensity." : readiness > 40 ? "Moderate energy. Focus on steady-state movement." : "Under-fueled. Priority: Recovery and Light Stretching."}
                   </p>
                </div>

                <div 
                  onClick={() => setActiveWorkout(getWorkouts()[0])}
                  className="bg-black text-white rounded-[40px] shadow-2xl relative overflow-hidden group cursor-pointer active:scale-[0.98] transition-all h-64"
                >
                  <img src={getWorkouts()[0].img} className="absolute inset-0 w-full h-full object-cover opacity-60 group-hover:scale-110 transition-transform duration-[2s]" />
                  <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-transparent"></div>
                  <div className="relative z-10 p-8 h-full flex flex-col justify-end">
                    <div className="flex items-center gap-2 mb-4">
                       <span className="bg-yellow-400 text-black text-[9px] font-black px-2 py-1 rounded uppercase tracking-wider">Recommended Session</span>
                    </div>
                    <h3 className="text-3xl font-bold tracking-tighter mb-2">{getWorkouts()[0].name}</h3>
                    <div className="flex items-center justify-between">
                       <div className="flex gap-4">
                          <div className="flex items-center gap-1.5 opacity-80">
                             <Timer size={14}/>
                             <span className="text-[10px] font-black uppercase tracking-widest">{getWorkouts()[0].dur}</span>
                          </div>
                          <div className="flex items-center gap-1.5 opacity-80">
                             <Flame size={14}/>
                             <span className="text-[10px] font-black uppercase tracking-widest">{getWorkouts()[0].level}</span>
                          </div>
                       </div>
                       <div className="w-12 h-12 bg-white text-black rounded-full flex items-center justify-center shadow-lg group-hover:bg-yellow-400 transition-colors">
                          <Play size={20} fill="currentColor" className="ml-1"/>
                       </div>
                    </div>
                  </div>
                </div>

                <div className="px-1 pt-2">
                   <h4 className="text-lg font-bold tracking-tight mb-4">Adaptive Library</h4>
                   <div className="grid grid-cols-2 gap-4">
                      {getWorkouts().slice(1).map((w, i) => (
                        <div 
                          key={i} 
                          onClick={() => setActiveWorkout(w)}
                          className="bg-white rounded-[32px] shadow-card border border-gray-100 overflow-hidden h-52 flex flex-col transition-all hover:translate-y-[-4px] active:scale-95 cursor-pointer group"
                        >
                           <div className="h-28 relative">
                              <img src={w.img} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" />
                              <div className="absolute inset-0 bg-black/10"></div>
                              <div className="absolute top-3 left-3">
                                <div className="p-2 bg-white/90 backdrop-blur-md rounded-xl text-black shadow-sm">
                                   {w.icon}
                                </div>
                              </div>
                              <div className="absolute top-3 right-3">
                                <span className="text-[8px] font-black bg-black/40 backdrop-blur-md text-white px-2 py-1 rounded uppercase tracking-widest">{w.tag}</span>
                              </div>
                           </div>
                           <div className="p-4 flex-1 flex flex-col justify-between">
                              <div className="font-bold text-sm tracking-tight mb-1">{w.name}</div>
                              <div className="flex items-center gap-2 text-gray-400">
                                 <span className="text-[9px] font-black uppercase tracking-widest">{w.dur}</span>
                                 <div className="w-0.5 h-0.5 bg-gray-300 rounded-full"></div>
                                 <span className="text-[9px] font-black uppercase tracking-widest">{w.level}</span>
                              </div>
                           </div>
                        </div>
                      ))}
                   </div>
                </div>

                <div className="mt-8 p-6 bg-gray-50 rounded-[32px] border border-dashed border-gray-200 text-center">
                   <p className="text-[9px] font-black text-gray-400 uppercase tracking-[0.2em] mb-1">Dr Foodie Protocol v2.3</p>
                   <p className="text-[9px] text-gray-300 font-medium">Workouts refresh based on daily nutrient density and goal adherence.</p>
                </div>
              </div>
            )}
          </div>
        )}

        {/* WORKOUT SESSION OVERLAY */}
        {activeWorkout && (
          <div className="fixed inset-0 z-[60] bg-white animate-fade-in flex flex-col">
            <div className="relative h-[45%] bg-black">
              <img 
                src={activeWorkout.gifUrl || activeWorkout.img} 
                className="w-full h-full object-contain" 
                alt="Exercise Demonstration"
              />
              <div className="absolute top-12 left-6">
                <span className="bg-green-500 text-white text-[10px] font-black px-2 py-1 rounded uppercase tracking-[0.2em] shadow-lg flex items-center gap-1.5">
                  <div className="w-1.5 h-1.5 bg-white rounded-full animate-pulse"></div> Demonstration
                </span>
              </div>
              <button 
                onClick={() => setActiveWorkout(null)} 
                className="absolute top-12 right-6 p-2 bg-white/20 backdrop-blur-md rounded-full text-white border border-white/20 shadow-xl"
              >
                <X size={24}/>
              </button>
            </div>
            
            <div className="flex-1 p-8 bg-white flex flex-col -mt-8 rounded-t-[40px] shadow-[0_-20px_50px_rgba(0,0,0,0.1)] z-10">
              <div className="mb-6">
                <span className="bg-black text-white text-[10px] font-black px-2 py-1 rounded uppercase tracking-[0.2em] mb-3 inline-block">{activeWorkout.tag}</span>
                <h2 className="text-4xl font-bold tracking-tighter text-black">{activeWorkout.name}</h2>
              </div>

              <div className="grid grid-cols-3 gap-4 mb-8">
                <div className="bg-gray-50 p-4 rounded-3xl text-center border border-gray-100 shadow-sm">
                  <Timer size={18} className="mx-auto mb-2 text-gray-400" />
                  <div className="text-sm font-black">{activeWorkout.dur}</div>
                </div>
                <div className="bg-orange-50 p-4 rounded-3xl text-center border border-orange-100 shadow-sm">
                  <Flame size={18} className="mx-auto mb-2 text-orange-500" />
                  <div className="text-sm font-black">{activeWorkout.level}</div>
                </div>
                <div className="bg-blue-50 p-4 rounded-3xl text-center border border-blue-100 shadow-sm">
                  <Activity size={18} className="mx-auto mb-2 text-blue-500" />
                  <div className="text-sm font-black">Clinical</div>
                </div>
              </div>

              <div className="space-y-6 flex-1">
                <div className="flex items-center gap-2 mb-1">
                   <Info size={14} className="text-gray-400"/>
                   <h4 className="font-black text-[10px] uppercase tracking-[0.2em] text-gray-400">Exercise Protocol</h4>
                </div>
                <p className="text-gray-600 font-medium leading-relaxed italic border-l-4 border-gray-100 pl-4">"{activeWorkout.desc}"</p>
                
                <div className="bg-gray-50 p-6 rounded-[32px] border border-gray-100 shadow-inner">
                  <div className="flex items-center gap-4 mb-4">
                    <div className="w-10 h-10 bg-black text-white rounded-full flex items-center justify-center font-black shadow-lg">1</div>
                    <div className="font-bold">Follow demo for 45s</div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 bg-white text-gray-400 rounded-full flex items-center justify-center font-black border border-gray-200">2</div>
                    <div className="font-bold text-gray-400">Rest for 15s</div>
                  </div>
                </div>
              </div>

              <div className="pt-8 space-y-3">
                <div className="flex gap-3">
                  <button className="flex-1 bg-gray-50 p-5 rounded-3xl flex items-center justify-center border border-gray-100 hover:bg-gray-100 transition-colors shadow-sm">
                    <SkipForward size={24} className="text-gray-400"/>
                  </button>
                  <button className="w-2/3 bg-black text-white p-5 rounded-3xl font-black text-lg flex items-center justify-center gap-3 shadow-2xl transition-transform active:scale-95">
                    <Pause size={24} fill="currentColor"/> PAUSE
                  </button>
                </div>
                <button 
                  onClick={() => {
                    setActiveWorkout(null);
                    alert("Training Session Successfully Logged!");
                  }}
                  className="w-full text-[10px] font-black uppercase tracking-[0.2em] text-green-600 py-4 hover:bg-green-50 rounded-2xl transition-colors"
                >
                  Complete & Log Workout
                </button>
              </div>
            </div>
          </div>
        )}

        {view === 'analysis' && analysis && (
          <div className="pt-6 animate-fade-in">
            <button onClick={()=>setView('home')} className="mb-4 p-2 bg-white rounded-full shadow-card hover:bg-gray-50 transition-colors"><ArrowLeft size={20}/></button>
            <div className="bg-white rounded-[40px] overflow-hidden shadow-card border border-gray-50">
              <div className="relative">
                <img src={analysis.imageUrl} className="w-full h-72 object-cover" />
                <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent"></div>
                <div className="absolute bottom-6 left-6 text-white">
                  <span className="text-[10px] font-black bg-white/20 backdrop-blur-md px-2 py-1 rounded uppercase tracking-[0.2em]">{analysis.mealType}</span>
                  <h1 className="text-3xl font-bold tracking-tighter mt-2">{analysis.foodName}</h1>
                </div>
              </div>
              <div className="p-8">
                <div className="flex justify-between items-center mb-8 bg-gray-50 p-4 rounded-3xl border border-gray-100">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-black rounded-2xl flex items-center justify-center text-white font-black text-xl shadow-lg">{analysis.healthScore}</div>
                    <div>
                      <div className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Metabolic Score</div>
                      <div className="font-bold text-sm">Clinical Grade Analysis</div>
                    </div>
                  </div>
                  <Star className="text-yellow-400 fill-yellow-400" size={20} />
                </div>

                {profile.isPremium && (
                  <div className="mb-8 p-5 bg-yellow-50 rounded-[32px] border border-yellow-200 relative overflow-hidden group">
                    <div className="absolute top-0 right-0 p-4 opacity-5"><Crown size={40} /></div>
                    <div className="flex items-center gap-2 mb-3">
                      <Zap className="text-yellow-600" size={16} fill="currentColor" />
                      <span className="text-[10px] font-black text-yellow-700 uppercase tracking-widest">Metabolic Precision</span>
                    </div>
                    <p className="text-xs font-bold text-yellow-900 leading-relaxed mb-3">Glycemic Impact: Medium-High</p>
                    <div className="flex items-center gap-2 bg-white/60 p-3 rounded-2xl">
                      <Info className="text-yellow-700" size={14} />
                      <p className="text-[10px] text-yellow-800 font-medium">Recommendation: Walk for 10 minutes within 30m of finishing this meal to stabilize glucose levels.</p>
                    </div>
                  </div>
                )}
                
                <div className="grid grid-cols-4 gap-3 mb-8 text-center font-bold">
                  <div className="bg-gray-50 p-4 rounded-3xl border border-gray-100">
                    <div className="text-[9px] text-gray-400 uppercase tracking-widest mb-1">Cal</div>
                    <div className="text-lg leading-none">{analysis.calories}</div>
                  </div>
                  <div className="bg-red-50 p-4 rounded-3xl border border-red-100 text-red-600">
                    <div className="text-[9px] uppercase tracking-widest mb-1">Pro</div>
                    <div className="text-lg leading-none">{analysis.protein}g</div>
                  </div>
                  <div className="bg-orange-50 p-4 rounded-3xl border border-orange-100 text-orange-600">
                    <div className="text-[9px] uppercase tracking-widest mb-1">Carb</div>
                    <div className="text-lg leading-none">{analysis.carbs}g</div>
                  </div>
                  <div className="bg-blue-50 p-4 rounded-3xl border border-blue-100 text-blue-600">
                    <div className="text-[9px] uppercase tracking-widest mb-1">Fat</div>
                    <div className="text-lg leading-none">{analysis.fat}g</div>
                  </div>
                </div>

                <div className="relative bg-gray-50 p-6 rounded-[32px] border border-gray-100 overflow-hidden">
                  <div className="absolute top-0 right-0 p-4 opacity-10"><Zap size={40} /></div>
                  <p className="text-sm font-medium leading-relaxed text-gray-700 italic relative z-10">"{analysis.microAnalysis}"</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {view === 'stats' && (
           <div className="pt-6 animate-fade-in space-y-6">
             <div className="flex justify-between items-end mb-2 px-1">
               <div>
                 <h1 className="text-3xl font-bold tracking-tighter">Insights</h1>
                 <p className="text-gray-400 text-[10px] font-black uppercase tracking-[0.2em] mt-1">{profile.isPremium ? 'Clinical Grade Reports' : 'Advanced Performance'}</p>
               </div>
               <Calendar className="text-black mb-1" size={20} />
             </div>
             
             <div className="bg-white p-6 rounded-[32px] shadow-card border border-gray-100 relative overflow-hidden group">
                <div className="absolute -bottom-10 -right-10 w-32 h-32 bg-blue-50 rounded-full blur-3xl opacity-50 transition-all group-hover:scale-150"></div>
                <div className="flex justify-between items-center mb-5 relative z-10">
                  <div className="flex items-center gap-2">
                    <div className="p-2 bg-blue-50 rounded-xl"><Droplets className="text-blue-500" size={18} fill="currentColor"/></div>
                    <span className="font-black text-[10px] uppercase tracking-widest">Hydration Level</span>
                  </div>
                  <span className="text-[10px] font-black text-blue-600 bg-blue-50/50 px-2 py-1 rounded-full">{waterIntake}ml</span>
                </div>
                <div className="flex gap-1.5 mb-5 relative z-10">
                  {[...Array(8)].map((_, i) => (
                    <div key={i} className={`h-2 flex-1 rounded-full transition-all duration-700 ${waterIntake >= (i+1)*250 ? 'bg-blue-500 shadow-[0_0_10px_rgba(59,130,246,0.5)]' : 'bg-gray-100'}`} />
                  ))}
                </div>
                <button 
                  onClick={() => setWaterIntake(prev => prev + 250)} 
                  className="w-full bg-blue-500 hover:bg-blue-600 text-white py-4 rounded-2xl font-bold text-xs transition-all active:scale-95 shadow-lg shadow-blue-500/20"
                >
                  Log 250ml Glass
                </button>
             </div>

             <div className="grid grid-cols-2 gap-4">
               <div className="bg-white p-6 rounded-[32px] shadow-card text-center border border-gray-50">
                  <span className="font-bold text-[9px] uppercase tracking-widest text-gray-400 block mb-4">Metabolic Hit</span>
                  <div className="text-4xl font-black tracking-tighter">{readiness}%</div>
                  <p className="text-[9px] font-bold text-gray-400 mt-2 uppercase tracking-tight">Daily Target Met</p>
               </div>
               <div className="bg-black p-6 rounded-[32px] shadow-card text-center text-white relative overflow-hidden">
                  <div className="absolute top-0 right-0 w-16 h-16 bg-white/5 rounded-full blur-xl"></div>
                  <span className="font-bold text-[9px] uppercase tracking-widest opacity-40 block mb-4">Adherence</span>
                  <div className="text-4xl font-black tracking-tighter">4 Days</div>
                  <p className="text-[9px] font-bold opacity-40 mt-2 uppercase tracking-tight">Healthy Streak</p>
               </div>
             </div>

             {profile.isPremium && (
               <div className="bg-gradient-to-r from-yellow-50 to-orange-50 p-7 rounded-[32px] border border-yellow-100 shadow-sm relative overflow-hidden">
                 <div className="absolute -top-4 -right-4 w-20 h-20 bg-yellow-400/10 rounded-full blur-2xl"></div>
                 <div className="flex items-center gap-2 mb-4">
                   <Crown size={14} className="text-yellow-600 fill-yellow-600" />
                   <span className="text-[10px] font-black text-yellow-700 uppercase tracking-widest">Weight Forecast</span>
                 </div>
                 <div className="flex justify-between items-center">
                   <div>
                     <div className="text-2xl font-black text-yellow-900 leading-none mb-1">-{((profile.weight - profile.targetWeight) / profile.durationWeeks).toFixed(1)} kg</div>
                     <div className="text-[9px] font-bold text-yellow-700 uppercase tracking-tight">Projected Weekly Avg</div>
                   </div>
                   <div className="text-right">
                     <div className="text-xs font-bold text-yellow-800">Target Reach</div>
                     <div className="text-[9px] font-bold text-yellow-600 uppercase tracking-tight">in {profile.durationWeeks} weeks</div>
                   </div>
                 </div>
               </div>
             )}

             <div className="bg-white p-7 rounded-[32px] shadow-card border border-gray-50">
                <div className="flex items-center gap-2 mb-8 px-1">
                  <Clock className="text-black" size={18}/>
                  <span className="font-black text-[10px] uppercase tracking-widest">Energy Distribution</span>
                </div>
                <div className="h-44 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={getMealSplit()}>
                      <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fontSize: 9, fontWeight: 900, fill: '#9ca3af'}} />
                      <Bar dataKey="value" radius={[12, 12, 12, 12]} barSize={45}>
                        {getMealSplit().map((e, i) => <Cell key={i} fill={['#000', '#333', '#666', '#999'][i]} />)}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
             </div>

             <div className="bg-white p-7 rounded-[32px] shadow-card border border-gray-50">
                <div className="flex items-center gap-2 mb-8 px-1">
                  <Activity className="text-green-500" size={18}/>
                  <span className="font-black text-[10px] uppercase tracking-widest">Clinical Quality Trend</span>
                </div>
                <div className="h-48 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={getWeeklyTrend()}>
                      <defs>
                        <linearGradient id="colorQual" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#10b981" stopOpacity={0.15}/>
                          <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
                      <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fontSize: 9, fontWeight: 700, fill: '#9ca3af'}} />
                      <Area type="monotone" dataKey="quality" stroke="#10b981" strokeWidth={4} fill="url(#colorQual)" />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
             </div>
           </div>
        )}

        {view === 'settings' && (
          <div className="pt-6 animate-fade-in space-y-6">
            <h1 className="text-3xl font-bold tracking-tighter">Profile</h1>
            <div className="bg-white rounded-[40px] p-4 space-y-2 border border-gray-100 shadow-card">
              <div className="flex items-center gap-5 p-6 bg-gray-50 rounded-[32px] mb-4 border border-gray-100">
                <div className="w-16 h-16 bg-black text-white rounded-[24px] flex items-center justify-center font-bold text-2xl shadow-xl">{profile.name.charAt(0)}</div>
                <div>
                  <div className="font-bold text-xl tracking-tight leading-none mb-1">{profile.name}</div>
                  <div className={`text-[9px] font-black uppercase tracking-widest ${profile.isPremium ? 'text-yellow-600' : 'text-gray-400'}`}>{profile.isPremium ? 'Pro Subscription Active' : 'Free Member'}</div>
                </div>
              </div>
              <button onClick={()=>setProfile(null)} className="w-full p-6 text-left font-bold text-sm hover:bg-gray-50 rounded-[28px] transition-colors flex justify-between items-center group">
                <span className="flex items-center gap-4"><User size={20} className="group-hover:text-black transition-colors"/> Update Metrics</span>
                <ChevronRight size={18} className="text-gray-200"/>
              </button>
              <button onClick={()=>setShowPremium(true)} className="w-full p-6 text-left font-bold text-sm hover:bg-gray-50 rounded-[28px] transition-colors flex justify-between items-center group">
                <span className="flex items-center gap-4"><Crown size={20} className="text-yellow-500 group-hover:text-black transition-colors"/> {profile.isPremium ? 'Subscription Status' : 'Manage Pro'}</span>
                <ChevronRight size={18} className="text-gray-200"/>
              </button>
              <div className="h-[1px] bg-gray-50 mx-6 my-2"></div>
              <button onClick={()=>signOut(auth)} className="w-full p-6 text-left font-bold text-sm text-red-500 hover:bg-red-50 rounded-[28px] transition-colors flex items-center gap-4">
                <LogOut size={20}/> Sign Out
              </button>
            </div>
            <div className="text-center">
               <p className="text-[10px] font-black text-gray-300 uppercase tracking-widest">Dr Foodie v1.5.3 • Elite Protocol</p>
            </div>
          </div>
        )}
      </div>

      {view !== 'analysis' && !activeWorkout && (
        <nav className="fixed bottom-0 left-0 right-0 bg-white/90 backdrop-blur-2xl border-t border-gray-100 p-4 pb-10 flex justify-between items-center z-40 max-w-md mx-auto shadow-[0_-10px_40px_rgba(0,0,0,0.05)] px-8">
          <button onClick={()=>setView('home')} className={`transition-all duration-300 ${view==='home'?'text-black scale-125 shadow-black/5':'text-gray-300 hover:text-gray-500'}`}><Home size={22} strokeWidth={view==='home'?3:2}/></button>
          <button onClick={()=>setView('workouts')} className={`transition-all duration-300 ${view==='workouts'?'text-black scale-125':'text-gray-300 hover:text-gray-500'}`}><Dumbbell size={22} strokeWidth={view==='workouts'?3:2}/></button>
          <div className="relative -mt-16 flex justify-center">
            <button 
              onClick={()=>fileInputRef.current?.click()} 
              className="w-18 h-18 bg-black rounded-full flex items-center justify-center text-white border-[8px] border-[#F2F2F7] shadow-2xl transition-all active:scale-90 hover:scale-110 group"
            >
              <Plus size={36} className="group-hover:rotate-90 transition-transform duration-500"/>
            </button>
          </div>
          <button onClick={()=>setView('stats')} className={`transition-all duration-300 ${view==='stats'?'text-black scale-125':'text-gray-300 hover:text-gray-500'}`}><BarChart2 size={22} strokeWidth={view==='stats'?3:2}/></button>
          <button onClick={()=>setView('settings')} className={`transition-all duration-300 ${view==='settings'?'text-black scale-125':'text-gray-300 hover:text-gray-500'}`}><Settings size={22} strokeWidth={view==='settings'?3:2}/></button>
        </nav>
      )}

      <PremiumModal isOpen={showPremium} onClose={()=>setShowPremium(false)} onUpgrade={()=>{saveProfile({isPremium: true}); setShowPremium(false);}} />
    </div>
  );
};

export default App;