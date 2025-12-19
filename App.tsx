
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
import { BarChart, Bar, XAxis, Tooltip, ResponsiveContainer } from 'recharts';
import Onboarding from './components/Onboarding';
import PremiumModal from './components/PremiumModal';
import Auth from './components/Auth';
import { UserProfile, ScanHistoryItem, Gender, Goal } from './types';
import { analyzeFoodImage } from './services/geminiService';
import { auth, db } from './services/firebase';
import { onAuthStateChanged, signOut, User as FirebaseUser } from 'firebase/auth';
// Fix: Import from firebase/firestore instead of firebase/firestore/lite to ensure all members are exported
import { doc, getDoc, setDoc, collection, query, orderBy, getDocs, addDoc } from 'firebase/firestore';

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

    setIsAnalyzing(true);
    setView('analysis');
    
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = async () => {
      const base64 = (reader.result as string).split(',')[1];
      try {
        const res = await analyzeFoodImage(base64, profile);
        const scanData = { 
          ...res, 
          imageUrl: reader.result as string, 
          timestamp: new Date().toISOString() 
        };
        
        const docRef = await addDoc(collection(db, "profiles", user.uid, "scans"), scanData);
        const newScan = { ...scanData, id: docRef.id };
        
        setScans(prev => [newScan, ...prev]);
        setAnalysis(newScan);
      } catch (err) {
        console.error("Scan failed:", err);
        alert("Meal analysis failed. Please ensure your API key is configured correctly.");
        setView('home');
      } finally {
        setIsAnalyzing(false);
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
        <p className="text-gray-400 font-medium animate-pulse">Initializing Dr Foodie...</p>
      </div>
    );
  }

  if (!user) return <Auth />;
  if (!profile || !profile.isOnboarded) return <Onboarding onComplete={(p) => saveProfile(p)} initialData={profile} />;

  const todayScans = scans.filter(s => new Date(s.timestamp).toDateString() === new Date().toDateString());
  const todayCalories = todayScans.reduce((a, b) => a + (b.calories || 0), 0);
  const targetCals = getCalorieTarget();

  return (
    <div className="max-w-md mx-auto min-h-screen bg-[#F2F2F7] text-black relative shadow-2xl overflow-hidden flex flex-col">
      <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleScan} />
      
      <div className="flex-1 px-6 overflow-y-auto no-scrollbar">
        {view === 'home' && (
          <div className="pt-6 animate-fade-in pb-32">
            <header className="flex justify-between items-center mb-6">
              <img src="https://www.foodieqr.com/assets/img/logo.svg" alt="Dr Foodie" className="h-8" />
              <button onClick={()=>setShowPremium(true)} className="px-3 py-1 bg-white border rounded-full text-xs font-bold flex items-center gap-1 shadow-sm">
                {profile.isPremium ? <Crown size={14} className="text-yellow-500 fill-yellow-500"/> : 
                  <><span className={scans.length >= MAX_FREE_SCANS ? 'text-red-500' : 'text-black'}>{Math.max(0, MAX_FREE_SCANS - scans.length)}</span> / {MAX_FREE_SCANS} Free</>
                }
              </button>
            </header>
            
            <div className="bg-white p-6 rounded-[32px] shadow-card mb-6 flex items-center justify-between">
              <div>
                <div className="flex items-baseline gap-1">
                  <span className="text-5xl font-bold">{todayCalories}</span>
                  <span className="text-lg text-gray-400 font-medium">/{targetCals}</span>
                </div>
                <div className="text-sm text-gray-400 font-medium mt-1">Daily Calories</div>
              </div>
              <Flame className="text-black fill-black" size={40}/>
            </div>

            <div className="grid grid-cols-3 gap-3 mb-8">
               {[{l:'Protein', v: todayScans.reduce((a,b)=>a+b.protein,0), c:'text-red-500', bg:'bg-red-50'},
                 {l:'Carbs', v: todayScans.reduce((a,b)=>a+b.carbs,0), c:'text-orange-500', bg:'bg-orange-50'},
                 {l:'Fats', v: todayScans.reduce((a,b)=>a+b.fat,0), c:'text-blue-500', bg:'bg-blue-50'}].map((m,i)=>(
                   <div key={i} className={`rounded-[24px] p-4 ${m.bg} flex flex-col items-center justify-center h-28`}>
                       <span className={`font-bold text-[10px] uppercase mb-1 ${m.c}`}>{m.l}</span>
                       <span className="text-xl font-bold">{m.v}g</span>
                   </div>
               ))}
            </div>

            <h3 className="font-bold mb-4 text-lg">Recent Meals</h3>
            <div className="space-y-3">
              {scans.length === 0 ? 
                <div onClick={()=>fileInputRef.current?.click()} className="text-center text-gray-400 py-12 border-2 border-dashed rounded-[24px] cursor-pointer hover:bg-gray-50 transition-colors">
                  <Camera className="mx-auto mb-2 opacity-50"/>
                  Scan your first meal
                </div> : 
                scans.slice(0, 5).map(s => (
                  <div key={s.id} onClick={()=>{setAnalysis(s); setView('analysis')}} className="bg-white p-3 rounded-[24px] flex gap-4 shadow-card items-center cursor-pointer transition-all hover:scale-[1.02]">
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
            <div className="h-[80vh] flex flex-col items-center justify-center">
              <div className="w-12 h-12 border-4 border-black border-t-transparent rounded-full animate-spin mb-4"></div>
              <h2 className="text-xl font-bold">Dr Foodie is Thinking...</h2>
            </div>
          ) : analysis && (
            <div className="pt-6 animate-fade-in pb-32">
              <button onClick={()=>setView('home')} className="mb-4 p-2 bg-white rounded-full shadow-sm"><ArrowLeft size={20}/></button>
              <div className="bg-white rounded-[32px] overflow-hidden shadow-card">
                <img src={analysis.imageUrl} className="w-full h-56 object-cover" />
                <div className="p-6">
                  <h1 className="text-3xl font-bold mb-4">{analysis.foodName}</h1>
                  <div className="grid grid-cols-4 gap-2 mb-6 text-center">
                    <div className="bg-gray-50 p-2 rounded-xl">
                      <div className="text-[10px] font-bold text-gray-400 uppercase">Cal</div>
                      <div className="font-bold">{analysis.calories}</div>
                    </div>
                    <div className="bg-red-50 p-2 rounded-xl text-red-500">
                      <div className="text-[10px] font-bold uppercase">Pro</div>
                      <div className="font-bold">{analysis.protein}g</div>
                    </div>
                    <div className="bg-orange-50 p-2 rounded-xl text-orange-500">
                      <div className="text-[10px] font-bold uppercase">Carb</div>
                      <div className="font-bold">{analysis.carbs}g</div>
                    </div>
                    <div className="bg-blue-50 p-2 rounded-xl text-blue-500">
                      <div className="text-[10px] font-bold uppercase">Fat</div>
                      <div className="font-bold">{analysis.fat}g</div>
                    </div>
                  </div>
                  <div className="bg-gray-50 p-5 rounded-[24px] border border-gray-100">
                    <h4 className="font-bold text-sm mb-2 uppercase tracking-wider text-gray-400">Personalized Insights</h4>
                    <p className="text-sm italic text-gray-600">"{analysis.microAnalysis}"</p>
                  </div>
                </div>
              </div>
            </div>
          )
        )}

        {view === 'stats' && (
           <div className="pt-6 animate-fade-in pb-32 px-2">
             <h1 className="text-2xl font-bold mb-6">Health Stats</h1>
             <div className="bg-white p-6 rounded-[32px] shadow-card">
                <div className="flex items-center gap-2 mb-4">
                  <TrendingUp className="text-black" size={20}/>
                  <span className="font-bold">Summary</span>
                </div>
                <div className="grid grid-cols-2 gap-4">
                    <div className="text-center p-4 bg-gray-50 rounded-2xl">
                        <div className="text-3xl font-bold">{scans.length}</div>
                        <div className="text-xs text-gray-400 font-bold uppercase">Total Scans</div>
                    </div>
                    <div className="text-center p-4 bg-gray-50 rounded-2xl">
                        <div className="text-3xl font-bold">{scans.length > 0 ? Math.round(scans.reduce((a,b)=>a+b.calories,0) / scans.length) : 0}</div>
                        <div className="text-xs text-gray-400 font-bold uppercase">Avg Kcal</div>
                    </div>
                </div>
             </div>
           </div>
        )}

        {view === 'workouts' && (
          <div className="pt-6 animate-fade-in text-center pb-32 px-4">
            <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <Dumbbell size={40} className="text-gray-400" />
            </div>
            <h2 className="text-2xl font-bold mb-2">Pro Workout Plans</h2>
            <p className="text-gray-500 mb-8">Personalized AI routines based on your goals.</p>
            {!profile.isPremium ? (
              <button onClick={()=>setShowPremium(true)} className="w-full bg-black text-white p-5 rounded-2xl font-bold shadow-xl flex items-center justify-center gap-2 transition-transform active:scale-95">
                <Crown size={20} className="text-yellow-400 fill-yellow-400"/> Upgrade for ₹49/mo
              </button>
            ) : (
              <div className="p-6 bg-white rounded-3xl border border-dashed border-gray-200 text-gray-400 font-medium">
                Generating your custom plan...
              </div>
            )}
          </div>
        )}

        {view === 'settings' && (
          <div className="pt-6 animate-fade-in pb-32">
            <h1 className="text-2xl font-bold mb-6">Settings</h1>
            <div className="bg-white rounded-[32px] overflow-hidden shadow-card p-4 space-y-2">
              <div className="flex items-center gap-4 p-4 bg-gray-50 rounded-[20px] mb-4">
                <div className="w-12 h-12 bg-black text-white rounded-full flex items-center justify-center font-bold text-lg">{profile.name.charAt(0)}</div>
                <div>
                  <div className="font-bold">{profile.name}</div>
                  <div className="text-xs text-gray-500 font-medium">{profile.isPremium ? 'Pro Member' : 'Free Member'}</div>
                </div>
              </div>
              <button onClick={()=>setProfile(null)} className="w-full p-4 text-left font-medium flex justify-between hover:bg-gray-50 rounded-xl transition-colors">
                <span className="flex gap-3"><User size={20}/> Edit Profile</span> <ChevronRight size={18} className="text-gray-300"/>
              </button>
              <button onClick={()=>setShowPremium(true)} className="w-full p-4 text-left font-medium flex justify-between hover:bg-gray-50 rounded-xl transition-colors">
                <span className="flex gap-3"><Crown size={20}/> Subscription</span> <ChevronRight size={18} className="text-gray-300"/>
              </button>
              <button onClick={()=>signOut(auth)} className="w-full p-4 text-left font-medium text-red-500 hover:bg-red-50 rounded-xl flex gap-3 transition-colors">
                <LogOut size={20}/> Sign Out
              </button>
            </div>
          </div>
        )}
      </div>

      {view !== 'analysis' && (
        <nav className="fixed bottom-0 left-0 right-0 bg-white border-t p-4 pb-8 flex justify-between items-center z-40 max-w-md mx-auto shadow-floating">
          <button onClick={()=>setView('home')} className={`flex flex-col items-center gap-1 transition-colors ${view==='home'?'text-black':'text-gray-400'}`}><Home size={24}/><span className="text-[10px] font-bold">Home</span></button>
          <button onClick={()=>setView('workouts')} className={`flex flex-col items-center gap-1 transition-colors ${view==='workouts'?'text-black':'text-gray-400'}`}><Dumbbell size={24}/><span className="text-[10px] font-bold">Plan</span></button>
          
          <div className="relative -mt-12">
            <button onClick={()=>fileInputRef.current?.click()} className="w-16 h-16 bg-black rounded-full flex items-center justify-center text-white border-4 border-[#F2F2F7] shadow-xl hover:scale-105 transition-transform active:scale-95">
              <Plus size={32}/>
            </button>
          </div>

          <button onClick={()=>setView('stats')} className={`flex flex-col items-center gap-1 transition-colors ${view==='stats'?'text-black':'text-gray-400'}`}><BarChart2 size={24}/><span className="text-[10px] font-bold">Stats</span></button>
          <button onClick={()=>setView('settings')} className={`flex flex-col items-center gap-1 transition-colors ${view==='settings'?'text-black':'text-gray-400'}`}><Settings size={24}/><span className="text-[10px] font-bold">Settings</span></button>
        </nav>
      )}

      <PremiumModal isOpen={showPremium} onClose={()=>setShowPremium(false)} onUpgrade={()=>{saveProfile({isPremium: true}); setShowPremium(false);}} />
    </div>
  );
};

export default App;
