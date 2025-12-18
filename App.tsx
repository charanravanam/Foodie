import React, { useState, useRef, useEffect } from 'react';
import { 
  Home, 
  BarChart2, 
  Settings, 
  Plus, 
  Flame, 
  ChevronRight, 
  Beef, 
  Wheat, 
  Droplet,
  Apple,
  ArrowLeft,
  X,
  Camera,
  Trash2,
  Calendar as CalendarIcon,
  User,
  Dumbbell,
  PlayCircle,
  Timer,
  Activity,
  Lock,
  CheckCircle2,
  Building2,
  Home as HomeIcon,
  Moon,
  Sun,
  List,
  Scale,
  Target,
  LogOut,
  Crown,
  Loader2
} from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer } from 'recharts';
import Onboarding from './components/Onboarding';
import PremiumModal from './components/PremiumModal';
import Auth from './components/Auth';
import { UserProfile, FoodAnalysis, ScanHistoryItem, Gender, Goal, WorkoutGoal, Exercise, WorkoutLocation } from './types';
import { analyzeFoodImage } from './services/geminiService';
import { auth } from './services/firebase';
import { onAuthStateChanged, signOut, User as FirebaseUser } from 'firebase/auth';

const MAX_FREE_SCANS = 3;

const HOME_WORKOUTS: Record<string, Exercise[]> = {
  [WorkoutGoal.BELLY_FAT]: [
    { 
      id: 'h1', 
      name: 'Mountain Climbers', 
      sets: 3, 
      reps: '45 sec', 
      description: 'Drive knees to chest rapidly keeping core tight.', 
      imageUrl: 'https://images.unsplash.com/photo-1434608519344-49d77a699ded?w=800&q=80',
      instructions: ["High plank position.", "Drive knees to chest.", "Fast pace."]
    },
    { 
      id: 'h2', 
      name: 'Plank', 
      sets: 3, 
      reps: '60 sec', 
      description: 'Maintain a straight line from head to heels.', 
      imageUrl: 'https://images.unsplash.com/photo-1517836357463-d25dfeac3438?w=800&q=80',
      instructions: ["Forearms on floor.", "Straight body line.", "Squeeze core."]
    }
  ],
  [WorkoutGoal.OVERALL_FAT_LOSS]: [
    { 
      id: 'h5', 
      name: 'Burpees', 
      sets: 3, 
      reps: '12 reps', 
      description: 'Full body explosive movement.', 
      imageUrl: 'https://images.unsplash.com/photo-1599058945522-28d584b6f0ff?w=800&q=80',
      instructions: ["Squat, kick back.", "Pushup.", "Jump up."]
    }
  ]
};

const App: React.FC = () => {
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [view, setView] = useState<'home' | 'workouts' | 'stats' | 'settings' | 'analysis'>('home');
  const [scans, setScans] = useState<ScanHistoryItem[]>([]);
  const [showPremium, setShowPremium] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysis, setAnalysis] = useState<ScanHistoryItem | null>(null);
  const [loadingAuth, setLoadingAuth] = useState(true);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => {
      setUser(u);
      setLoadingAuth(false);
      if (u) {
        const saved = localStorage.getItem(`drfoodie_${u.uid}`);
        if (saved) setProfile(JSON.parse(saved));
      }
    });
    return () => unsub();
  }, []);

  const saveProfile = (p: Partial<UserProfile>) => {
    if (!profile && !p.isOnboarded) return;
    const newProfile = { ...(profile || {}), ...p } as UserProfile;
    setProfile(newProfile);
    if (user) localStorage.setItem(`drfoodie_${user.uid}`, JSON.stringify(newProfile));
  };

  const handleScan = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !profile) return;
    
    if (!profile.isPremium && scans.length >= MAX_FREE_SCANS) {
      setShowPremium(true);
      if(fileInputRef.current) fileInputRef.current.value = '';
      return;
    }

    setIsAnalyzing(true);
    setView('analysis');
    
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = async () => {
      const base64 = (reader.result as string).split(',')[1];
      try {
        const res = await analyzeFoodImage(base64, profile);
        const newScan: ScanHistoryItem = { 
          ...res, 
          imageUrl: reader.result as string, 
          id: Date.now().toString(), 
          timestamp: new Date().toISOString() 
        };
        setScans(prev => [newScan, ...prev]);
        setAnalysis(newScan);
      } catch (err) {
        alert("Analysis failed. Please check your API key and try again.");
        setView('home');
      } finally {
        setIsAnalyzing(false);
      }
    };
  };

  if (loadingAuth) return <div className="h-screen flex items-center justify-center bg-white"><Loader2 className="animate-spin text-black" size={32}/></div>;
  if (!user) return <Auth />;
  if (!profile) return <Onboarding onComplete={(p) => saveProfile(p)} />;

  const getCalorieTarget = () => {
    const base = (10 * profile.weight) + (6.25 * profile.height) - (5 * profile.age) + (profile.gender === Gender.MALE ? 5 : -161);
    const multiplier = 1.375;
    let target = base * multiplier;
    if(profile.goal === Goal.LOSE_WEIGHT) target -= 500;
    if(profile.goal === Goal.GAIN_WEIGHT) target += 500;
    return Math.round(target);
  };

  return (
    <div className="max-w-md mx-auto min-h-screen bg-[#F2F2F7] text-black relative shadow-2xl overflow-hidden flex flex-col">
      <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleScan} />
      
      <div className="flex-1 px-6 overflow-y-auto no-scrollbar pb-24">
        {view === 'home' && (
          <div className="pt-6 animate-fade-in">
            <header className="flex justify-between items-center mb-6">
              <img src="https://www.foodieqr.com/assets/img/logo.svg" alt="Logo" className="h-8" />
              <button onClick={()=>setShowPremium(true)} className="px-3 py-1 bg-white border rounded-full text-xs font-bold flex items-center gap-1 shadow-sm">
                {profile.isPremium ? <Crown size={14} className="text-yellow-500 fill-yellow-500"/> : 
                  <><span className={scans.length >= MAX_FREE_SCANS ? 'text-red-500' : 'text-black'}>{Math.max(0, MAX_FREE_SCANS - scans.length)}</span> / {MAX_FREE_SCANS} Free</>
                }
              </button>
            </header>
            
            <div className="bg-white p-6 rounded-[32px] shadow-card mb-6 flex items-center justify-between">
              <div>
                <div className="flex items-baseline gap-1">
                  <span className="text-5xl font-bold">{scans.reduce((a, b) => a + (b.calories || 0), 0)}</span>
                  <span className="text-lg text-gray-400 font-medium">/{getCalorieTarget()}</span>
                </div>
                <div className="text-sm text-gray-400 font-medium mt-1">Calories Eaten</div>
              </div>
              <Flame className="text-black fill-black" size={40}/>
            </div>

            <div className="grid grid-cols-3 gap-3 mb-8">
               {[{l:'Protein', v: scans.reduce((a,b)=>a+b.protein,0), c:'text-red-500', bg:'bg-red-50'},
                 {l:'Carbs', v: scans.reduce((a,b)=>a+b.carbs,0), c:'text-orange-500', bg:'bg-orange-50'},
                 {l:'Fats', v: scans.reduce((a,b)=>a+b.fat,0), c:'text-blue-500', bg:'bg-blue-50'}].map((m,i)=>(
                   <div key={i} className={`rounded-[24px] p-4 ${m.bg} flex flex-col items-center justify-center h-28`}>
                       <span className={`font-bold text-[10px] uppercase mb-1 ${m.c}`}>{m.l}</span>
                       <span className="text-xl font-bold">{m.v}g</span>
                   </div>
               ))}
            </div>

            <h3 className="font-bold mb-4 text-lg">Recent Meals</h3>
            <div className="space-y-3">
              {scans.length === 0 ? 
                <div onClick={()=>fileInputRef.current?.click()} className="text-center text-gray-400 py-12 border-2 border-dashed rounded-[24px] cursor-pointer hover:bg-gray-50">
                  <Camera className="mx-auto mb-2 opacity-50"/>
                  Tap to scan your first meal
                </div> : 
                scans.map(s => (
                  <div key={s.id} onClick={()=>{setAnalysis(s); setView('analysis')}} className="bg-white p-3 rounded-[24px] flex gap-4 shadow-card items-center cursor-pointer">
                    <img src={s.imageUrl} className="w-16 h-16 rounded-2xl object-cover" />
                    <div>
                      <div className="font-bold text-sm">{s.foodName}</div>
                      <div className="text-xs text-gray-500">{s.calories} kcal • {s.protein}g P</div>
                    </div>
                    <ChevronRight className="ml-auto text-gray-300"/>
                  </div>
                ))
              }
            </div>
          </div>
        )}

        {view === 'analysis' && (
          isAnalyzing ? (
            <div className="h-[60vh] flex flex-col items-center justify-center">
              <div className="w-12 h-12 border-4 border-black border-t-transparent rounded-full animate-spin mb-4"></div>
              <h2 className="text-xl font-bold">Analyzing Meal...</h2>
            </div>
          ) : analysis && (
            <div className="pt-6 animate-fade-in">
              <button onClick={()=>setView('home')} className="mb-4 p-2 bg-white rounded-full shadow-sm"><ArrowLeft size={20}/></button>
              <div className="bg-white rounded-[32px] overflow-hidden shadow-card">
                <img src={analysis.imageUrl} className="w-full h-56 object-cover" />
                <div className="p-6">
                  <h1 className="text-3xl font-bold mb-4">{analysis.foodName}</h1>
                  <div className="grid grid-cols-4 gap-2 mb-6 text-center">
                    <div className="bg-gray-50 p-2 rounded-xl">
                      <div className="text-[10px] font-bold text-gray-400">CAL</div>
                      <div className="font-bold">{analysis.calories}</div>
                    </div>
                    <div className="bg-red-50 p-2 rounded-xl text-red-500">
                      <div className="text-[10px] font-bold">PRO</div>
                      <div className="font-bold">{analysis.protein}g</div>
                    </div>
                    <div className="bg-orange-50 p-2 rounded-xl text-orange-500">
                      <div className="text-[10px] font-bold">CARB</div>
                      <div className="font-bold">{analysis.carbs}g</div>
                    </div>
                    <div className="bg-blue-50 p-2 rounded-xl text-blue-500">
                      <div className="text-[10px] font-bold">FAT</div>
                      <div className="font-bold">{analysis.fat}g</div>
                    </div>
                  </div>
                  <div className="bg-gray-50 p-4 rounded-2xl border border-gray-100">
                    <p className="text-sm italic text-gray-600">"{analysis.microAnalysis}"</p>
                  </div>
                </div>
              </div>
            </div>
          )
        )}

        {view === 'workouts' && (
          <div className="pt-6 animate-fade-in text-center">
            <Dumbbell size={48} className="mx-auto mb-4 opacity-20" />
            <h2 className="text-2xl font-bold mb-2">Workout Plan</h2>
            <p className="text-gray-500 mb-6">Personalized AI workout routines coming soon for Pro users.</p>
            {!profile.isPremium && (
              <button onClick={()=>setShowPremium(true)} className="w-full bg-black text-white p-4 rounded-2xl font-bold shadow-lg flex items-center justify-center gap-2">
                <Crown size={20} className="text-yellow-400 fill-yellow-400"/> Upgrade for ₹49
              </button>
            )}
          </div>
        )}

        {view === 'settings' && (
          <div className="pt-6 animate-fade-in">
            <h1 className="text-2xl font-bold mb-6">Settings</h1>
            <div className="bg-white rounded-[32px] overflow-hidden shadow-card p-4 space-y-2">
              <div className="flex items-center gap-4 p-4 bg-gray-50 rounded-[20px] mb-4">
                <div className="w-12 h-12 bg-black text-white rounded-full flex items-center justify-center font-bold text-lg">{profile.name.charAt(0)}</div>
                <div>
                  <div className="font-bold">{profile.name}</div>
                  <div className="text-xs text-gray-500">{profile.isPremium ? 'Pro Member' : 'Free Member'}</div>
                </div>
              </div>
              <button onClick={()=>setProfile(null)} className="w-full p-4 text-left font-medium flex justify-between hover:bg-gray-50 rounded-xl">
                <span className="flex gap-3"><User size={20}/> Edit Profile</span> <ChevronRight size={18} className="text-gray-300"/>
              </button>
              <button onClick={()=>setShowPremium(true)} className="w-full p-4 text-left font-medium flex justify-between hover:bg-gray-50 rounded-xl">
                <span className="flex gap-3"><Crown size={20}/> Subscription</span> <ChevronRight size={18} className="text-gray-300"/>
              </button>
              <button onClick={()=>signOut(auth)} className="w-full p-4 text-left font-medium text-red-500 hover:bg-red-50 rounded-xl flex gap-3">
                <LogOut size={20}/> Sign Out
              </button>
            </div>
          </div>
        )}
      </div>

      {view !== 'analysis' && (
        <nav className="absolute bottom-0 left-0 right-0 bg-white border-t p-4 pb-8 flex justify-between items-center z-40">
          <button onClick={()=>setView('home')} className={`flex flex-col items-center gap-1 ${view==='home'?'text-black':'text-gray-400'}`}><Home size={24}/><span className="text-[10px]">Home</span></button>
          <button onClick={()=>setView('workouts')} className={`flex flex-col items-center gap-1 ${view==='workouts'?'text-black':'text-gray-400'}`}><Dumbbell size={24}/><span className="text-[10px]">Workouts</span></button>
          <button onClick={()=>fileInputRef.current?.click()} className="w-14 h-14 bg-black rounded-full flex items-center justify-center text-white -mt-12 border-4 border-[#F2F2F7] shadow-xl"><Plus size={28}/></button>
          <button onClick={()=>setView('stats')} className={`flex flex-col items-center gap-1 ${view==='stats'?'text-black':'text-gray-400'}`}><BarChart2 size={24}/><span className="text-[10px]">Stats</span></button>
          <button onClick={()=>setView('settings')} className={`flex flex-col items-center gap-1 ${view==='settings'?'text-black':'text-gray-400'}`}><Settings size={24}/><span className="text-[10px]">Settings</span></button>
        </nav>
      )}

      <PremiumModal isOpen={showPremium} onClose={()=>setShowPremium(false)} onUpgrade={()=>{saveProfile({isPremium: true}); setShowPremium(false);}} />
    </div>
  );
};

export default App;