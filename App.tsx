
import React, { useState, useRef, useEffect } from 'react';
import { 
  Home, BarChart2, Settings, Plus, Flame, ChevronRight, ArrowLeft,
  Camera, User, Dumbbell, LogOut, Crown, Loader2, TrendingUp,
  Apple, Target, Zap, Star, Activity, Droplets, Calendar, Clock,
  Trophy, CheckCircle2, Info, Timer, ZapOff, Play, X, Pause, SkipForward,
  Scan, Sparkles, MapPin, Check
} from 'lucide-react';
import { 
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, 
  AreaChart, Area, CartesianGrid
} from 'recharts';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import type { User as FirebaseUser } from 'firebase/auth';
import { 
  doc, getDoc, setDoc, collection, query, orderBy, getDocs, addDoc 
} from 'firebase/firestore';
import Onboarding from './components/Onboarding';
import PremiumModal from './components/PremiumModal';
import Auth from './components/Auth';
import { UserProfile, ScanHistoryItem, Gender, Goal, WorkoutLocation, MuscleGroup, Exercise } from './types';
import { analyzeFoodImage } from './services/geminiService';
import { auth, db } from './services/firebase';

const MAX_FREE_SCANS_PER_DAY = 3;

// Expanded Exercise Database
const EXERCISE_DB: Exercise[] = [
  // GYM
  { id: 'g1', name: 'Barbell Bench Press', sets: 4, reps: '8-10', location: WorkoutLocation.GYM, muscleGroups: [MuscleGroup.CHEST], imageUrl: 'https://images.unsplash.com/photo-1571019614242-c5c5dee9f50b?w=400&q=80', description: 'Primary chest builder targeting the pectoralis major.' },
  { id: 'g2', name: 'Lat Pulldowns', sets: 4, reps: '10-12', location: WorkoutLocation.GYM, muscleGroups: [MuscleGroup.BACK], imageUrl: 'https://images.unsplash.com/photo-1605296867304-46d5465a13f1?w=400&q=80', description: 'Builds width in the lats.' },
  { id: 'g3', name: 'Overhead Press', sets: 4, reps: '8-10', location: WorkoutLocation.GYM, muscleGroups: [MuscleGroup.SHOULDERS], imageUrl: 'https://images.unsplash.com/photo-1541534741688-6078c6bfb5c5?w=400&q=80', description: 'Builds stable, powerful shoulders.' },
  { id: 'g4', name: 'Barbell Squats', sets: 4, reps: '8-12', location: WorkoutLocation.GYM, muscleGroups: [MuscleGroup.LEGS], imageUrl: 'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=400&q=80', description: 'Fundamental leg and core strength.' },
  { id: 'g5', name: 'Hammer Curls', sets: 3, reps: '12', location: WorkoutLocation.GYM, muscleGroups: [MuscleGroup.ARMS], imageUrl: 'https://images.unsplash.com/photo-1581009146145-b5ef050c2e1e?w=400&q=80', description: 'Targets biceps and brachialis.' },
  { id: 'g6', name: 'Romanian Deadlifts', sets: 3, reps: '10', location: WorkoutLocation.GYM, muscleGroups: [MuscleGroup.GLUTES, MuscleGroup.LEGS], imageUrl: 'https://images.unsplash.com/photo-1590487988256-9ed24133863e?w=400&q=80', description: 'Excellent for posterior chain.' },
  { id: 'g7', name: 'Cable Crunches', sets: 3, reps: '15', location: WorkoutLocation.GYM, muscleGroups: [MuscleGroup.ABS_CORE], imageUrl: 'https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=400&q=80', description: 'Constant core tension.' },
  
  // HOME
  { id: 'h1', name: 'Standard Push-ups', sets: 3, reps: 'To Failure', location: WorkoutLocation.HOME, muscleGroups: [MuscleGroup.CHEST], imageUrl: 'https://images.unsplash.com/photo-1571019614242-c5c5dee9f50b?w=400&q=80', description: 'Bodyweight chest strength.' },
  { id: 'h2', name: 'Superman Pulls', sets: 3, reps: '15', location: WorkoutLocation.HOME, muscleGroups: [MuscleGroup.BACK], imageUrl: 'https://images.unsplash.com/photo-1591940742888-11b2f001715d?w=400&q=80', description: 'Strengthens upper and lower back.' },
  { id: 'h3', name: 'Pike Push-ups', sets: 3, reps: '10', location: WorkoutLocation.HOME, muscleGroups: [MuscleGroup.SHOULDERS], imageUrl: 'https://images.unsplash.com/photo-1583454110551-21f2fa2afe61?w=400&q=80', description: 'Bodyweight shoulder builder.' },
  { id: 'h4', name: 'Lunges', sets: 3, reps: '12 per leg', location: WorkoutLocation.HOME, muscleGroups: [MuscleGroup.LEGS], imageUrl: 'https://images.unsplash.com/photo-1434608519344-49d77a699e1d?w=400&q=80', description: 'Unilateral leg development.' },
  { id: 'h5', name: 'Bench Dips', sets: 3, reps: '12', location: WorkoutLocation.HOME, muscleGroups: [MuscleGroup.ARMS], imageUrl: 'https://images.unsplash.com/photo-1532029837206-abba2b7620e3?w=400&q=80', description: 'Tricep focused home movement.' },
  { id: 'h6', name: 'Glute Bridges', sets: 3, reps: '20', location: WorkoutLocation.HOME, muscleGroups: [MuscleGroup.GLUTES], imageUrl: 'https://images.unsplash.com/photo-1574680096145-d05b474e2155?w=400&q=80', description: 'Isolated glute activation.' },
  { id: 'h7', name: 'Leg Raises', sets: 3, reps: '15', location: WorkoutLocation.HOME, muscleGroups: [MuscleGroup.ABS_CORE], imageUrl: 'https://images.unsplash.com/photo-1566241142559-40e1bfc26cc3?w=400&q=80', description: 'Lower abdominal focus.' },
];

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
  const [tempImage, setTempImage] = useState<string | null>(null);
  const [selectedDate, setSelectedDate] = useState<string>(new Date().toDateString());
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Workout Selection State
  const [workoutStep, setWorkoutStep] = useState<1 | 2 | 3>(1);
  const [selLocation, setSelLocation] = useState<WorkoutLocation | null>(null);
  const [selMuscles, setSelMuscles] = useState<MuscleGroup[]>([]);

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
    
    // Check limit for TODAY (scans are strictly limited to current calendar day for free users)
    const scansToday = scans.filter(s => new Date(s.timestamp).toDateString() === new Date().toDateString());
    if (!profile.isPremium && scansToday.length >= MAX_FREE_SCANS_PER_DAY) {
      setShowPremium(true);
      return;
    }

    const mimeType = file.type;
    setIsAnalyzing(true);
    setView('analysis');
    setAnalysis(null);

    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = async () => {
      const base64Data = reader.result as string;
      setTempImage(base64Data);
      const base64 = base64Data.split(',')[1];
      
      try {
        const res = await analyzeFoodImage(base64, profile, mimeType);
        const scanData = { ...res, imageUrl: base64Data, timestamp: new Date().toISOString() };
        const docRef = await addDoc(collection(db, "profiles", user.uid, "scans"), scanData);
        const newScan = { ...scanData, id: docRef.id };
        setScans(prev => [newScan, ...prev]);
        setAnalysis(newScan);
        setSelectedDate(new Date().toDateString()); // View today after scan
      } catch (err: any) {
        alert(err.message || "Dr Foodie is having trouble. Please try again.");
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

  const getStreak = () => {
    if (scans.length === 0) return 0;
    const scanDates = Array.from(new Set(scans.map(s => new Date(s.timestamp).toDateString())));
    let streak = 0;
    let curr = new Date();
    const todayStr = curr.toDateString();
    
    curr.setDate(curr.getDate() - 1);
    const yesterdayStr = curr.toDateString();
    
    // If no scans today AND no scans yesterday, streak is broken
    if (!scanDates.includes(todayStr) && !scanDates.includes(yesterdayStr)) return 0;
    
    // Start checking backwards from either today or yesterday
    curr = new Date();
    if (!scanDates.includes(todayStr)) curr.setDate(curr.getDate() - 1);
    
    while (scanDates.includes(curr.toDateString())) {
      streak++;
      curr.setDate(curr.getDate() - 1);
    }
    return streak;
  };

  const generateWorkout = () => {
    if (!selLocation || selMuscles.length === 0) return;
    if (!profile?.isPremium) {
      setShowPremium(true);
      return;
    }
    setWorkoutStep(3);
  };

  const toggleMuscle = (m: MuscleGroup) => {
    setSelMuscles(prev => prev.includes(m) ? prev.filter(x => x !== m) : [...prev, m]);
  };

  // Get days of the current week for date selector
  const getWeekDays = () => {
    const days = [];
    const today = new Date();
    for (let i = 0; i < 7; i++) {
      const d = new Date();
      d.setDate(today.getDate() - (6 - i));
      days.push(d);
    }
    return days;
  };

  const filteredScans = scans.filter(s => new Date(s.timestamp).toDateString() === selectedDate);
  const selectedDateCalories = filteredScans.reduce((a, b) => a + b.calories, 0);
  const targetCals = getCalorieTarget();
  const isToday = selectedDate === new Date().toDateString();

  if (!user) return <Auth />;
  if (!profile || !profile.isOnboarded) return <Onboarding onComplete={saveProfile} initialData={profile} />;
  if (loading) return <div className="flex items-center justify-center min-h-screen bg-white"><Loader2 className="animate-spin text-black" size={40} /></div>;

  return (
    <div className="max-w-md mx-auto min-h-screen bg-[#F2F2F7] text-black relative shadow-2xl overflow-hidden flex flex-col font-sans">
      <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleScan} />
      
      <div className="flex-1 px-6 overflow-y-auto no-scrollbar pb-32">
        {view === 'home' && (
          <div className="pt-6 animate-fade-in">
            <header className="flex justify-between items-center mb-6">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 bg-black rounded-lg flex items-center justify-center shadow-lg">
                  <Sparkles size={16} className="text-white fill-white"/>
                </div>
                <h1 className="text-xl font-bold tracking-tight">Dr Foodie</h1>
              </div>
              <button onClick={()=>setShowPremium(true)} className={`px-4 py-2 rounded-full text-[10px] font-black shadow-sm uppercase transition-all active:scale-95 ${profile.isPremium ? 'bg-black text-yellow-400 border border-yellow-400/20' : 'bg-white text-black border border-gray-100'}`}>
                {profile.isPremium ? <div className="flex items-center gap-2"><Crown size={12} className="fill-yellow-400"/> PRO</div> : `${Math.max(0, MAX_FREE_SCANS_PER_DAY - scans.filter(s => new Date(s.timestamp).toDateString() === new Date().toDateString()).length)} Free Scans`}
              </button>
            </header>

            {/* Date Selector */}
            <div className="flex justify-between items-center mb-8 px-1 overflow-x-auto no-scrollbar gap-3 pb-2">
              {getWeekDays().map((d, i) => {
                const isSel = d.toDateString() === selectedDate;
                const isT = d.toDateString() === new Date().toDateString();
                return (
                  <button 
                    key={i} 
                    onClick={() => setSelectedDate(d.toDateString())}
                    className={`flex flex-col items-center min-w-[45px] py-3 rounded-2xl transition-all ${isSel ? 'bg-black text-white shadow-xl scale-110' : 'bg-white text-gray-400 hover:bg-gray-50'}`}
                  >
                    <span className="text-[10px] font-black uppercase mb-1">{d.toLocaleDateString('en-US', { weekday: 'short' }).charAt(0)}</span>
                    <span className="text-sm font-bold">{d.getDate()}</span>
                    {isT && !isSel && <div className="w-1 h-1 bg-black rounded-full mt-1"></div>}
                  </button>
                );
              })}
            </div>
            
            <div className="bg-white p-7 rounded-[32px] shadow-card mb-4 flex items-center justify-between relative overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-gray-50 rounded-full blur-3xl -mr-16 -mt-16"></div>
              <div className="relative z-10">
                <div className="flex items-baseline gap-1">
                  <span className="text-5xl font-bold tracking-tighter">{selectedDateCalories}</span>
                  <span className="text-lg text-gray-400">/{targetCals}</span>
                </div>
                <div className="text-[10px] text-gray-400 font-black uppercase tracking-widest mt-1">Calorie Budget ({isToday ? 'Today' : 'Historical'})</div>
              </div>
              <div className="relative z-10 w-20 h-20 rounded-full border-[8px] border-gray-50 flex items-center justify-center">
                 <div className="absolute inset-0 rounded-full border-[8px] border-black border-t-transparent transition-all duration-1000" style={{ transform: `rotate(${Math.min(360, (selectedDateCalories/targetCals)*360)}deg)` }}></div>
                 <Activity className="text-black" size={28} />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3 mb-8">
               {[{l:'Protein', v: filteredScans.reduce((a,b)=>a+b.protein,0), c:'text-red-500', bg:'bg-red-50'},
                 {l:'Carbs', v: filteredScans.reduce((a,b)=>a+b.carbs,0), c:'text-orange-500', bg:'bg-orange-50'},
                 {l:'Fats', v: filteredScans.reduce((a,b)=>a+b.fat,0), c:'text-blue-500', bg:'bg-blue-50'}].map((m,i)=>(
                   <div key={i} className={`rounded-[24px] p-4 ${m.bg} flex flex-col items-center justify-center h-28 border border-white/50 shadow-sm transition-transform active:scale-95`}>
                       <span className={`font-black text-[9px] uppercase mb-2 tracking-widest ${m.c}`}>{m.l}</span>
                       <span className="text-xl font-bold tracking-tighter">{m.v}g</span>
                   </div>
               ))}
            </div>

            <div className="space-y-3">
              <div className="flex justify-between items-center mb-4 px-1">
                <h3 className="font-bold text-lg">{isToday ? "Daily Log" : `Log for ${new Date(selectedDate).toLocaleDateString('en-US', { day: 'numeric', month: 'short' })}`}</h3>
                <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">{filteredScans.length} Entries</span>
              </div>
              {filteredScans.length === 0 ? (
                <div className="text-center py-16 text-gray-400 font-medium bg-white rounded-[32px] border-2 border-dashed border-gray-100 flex flex-col items-center gap-3">
                  <Camera size={32} className="opacity-20" />
                  <p className="text-sm">No scans for this date</p>
                </div>
              ) : (
                filteredScans.map(s => (
                  <div key={s.id} onClick={()=>{setAnalysis(s); setView('analysis')}} className="bg-white p-3 rounded-[24px] flex gap-4 shadow-card items-center cursor-pointer hover:bg-gray-50 transition-all active:scale-[0.98]">
                    <img src={s.imageUrl} className="w-14 h-14 rounded-2xl object-cover bg-gray-100 shadow-inner" />
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-0.5">
                        <span className="font-bold text-sm line-clamp-1">{s.foodName}</span>
                        <span className="text-[8px] bg-gray-100 px-1.5 py-0.5 rounded font-black opacity-60 uppercase shrink-0">{s.mealType}</span>
                      </div>
                      <div className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">{s.calories} kcal • {s.protein}g P • {s.carbs}g C</div>
                    </div>
                    <ChevronRight className="text-gray-200" size={18}/>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {view === 'workouts' && (
          <div className="pt-6 animate-fade-in pb-12">
            {workoutStep === 1 && (
              <div className="space-y-8 animate-fade-in">
                <header className="px-1">
                  <h1 className="text-3xl font-bold tracking-tighter">Choose Environment</h1>
                  <p className="text-gray-400 text-[10px] font-black uppercase tracking-[0.2em] mt-1">Select your training space</p>
                </header>
                <div className="grid grid-cols-1 gap-4">
                  {[
                    { id: WorkoutLocation.GYM, label: 'Gym', desc: 'Full access to equipment & weights', icon: <Dumbbell size={24}/> },
                    { id: WorkoutLocation.HOME, label: 'Home', desc: 'Minimal space & bodyweight focused', icon: <Home size={24}/> }
                  ].map((loc) => (
                    <button 
                      key={loc.id} 
                      onClick={() => { setSelLocation(loc.id); setWorkoutStep(2); }}
                      className="bg-white p-8 rounded-[32px] shadow-card border border-gray-100 text-left flex items-center gap-6 hover:bg-black hover:text-white transition-all group active:scale-95"
                    >
                      <div className="w-14 h-14 bg-gray-50 rounded-2xl flex items-center justify-center group-hover:bg-white/10 group-hover:text-white text-black transition-colors">{loc.icon}</div>
                      <div>
                        <div className="font-bold text-lg tracking-tight mb-0.5">{loc.label}</div>
                        <div className="text-xs text-gray-400 group-hover:text-white/60 font-medium">{loc.desc}</div>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {workoutStep === 2 && (
              <div className="space-y-8 animate-fade-in">
                <header className="flex justify-between items-center px-1">
                  <div>
                    <button onClick={() => setWorkoutStep(1)} className="text-gray-400 hover:text-black mb-4 flex items-center gap-1 text-[10px] font-black uppercase tracking-widest"><ArrowLeft size={12}/> Back</button>
                    <h1 className="text-3xl font-bold tracking-tighter">Target Areas</h1>
                    <p className="text-gray-400 text-[10px] font-black uppercase tracking-[0.2em] mt-1">Select muscle groups to train</p>
                  </div>
                  <div className="bg-black text-white px-3 py-1.5 rounded-full text-[10px] font-black">{selLocation}</div>
                </header>
                <div className="grid grid-cols-1 gap-3">
                  {Object.values(MuscleGroup).map((mg) => (
                    <button 
                      key={mg}
                      onClick={() => toggleMuscle(mg)}
                      className={`p-6 rounded-[24px] text-left flex justify-between items-center transition-all ${selMuscles.includes(mg) ? 'bg-black text-white shadow-xl scale-[1.02]' : 'bg-white text-gray-700 shadow-sm border border-gray-100 hover:bg-gray-50'}`}
                    >
                      <span className="font-bold tracking-tight">{mg}</span>
                      {selMuscles.includes(mg) ? <Check size={20}/> : <Plus size={18} className="text-gray-300"/>}
                    </button>
                  ))}
                </div>
                <button onClick={generateWorkout} disabled={selMuscles.length === 0} className="w-full bg-black text-white p-6 rounded-[32px] font-black text-lg shadow-2xl flex items-center justify-center gap-3 active:scale-95 disabled:opacity-30 mt-8">Generate Routine <ChevronRight size={20}/></button>
              </div>
            )}

            {workoutStep === 3 && profile?.isPremium && (
              <div className="animate-fade-in">
                 <header className="flex justify-between items-center mb-8 px-1">
                    <div>
                      <button onClick={() => setWorkoutStep(2)} className="text-gray-400 hover:text-black mb-4 flex items-center gap-1 text-[10px] font-black uppercase tracking-widest"><ArrowLeft size={12}/> Modify Selection</button>
                      <h1 className="text-3xl font-bold tracking-tighter">Your Routine</h1>
                    </div>
                    <div className="bg-black text-white px-3 py-1.5 rounded-full text-[8px] font-black uppercase">{selLocation}</div>
                 </header>
                 <div className="space-y-4">
                    {EXERCISE_DB.filter(ex => ex.location === selLocation && ex.muscleGroups.some(mg => selMuscles.includes(mg))).map((ex) => (
                      <div key={ex.id} onClick={() => setActiveWorkout(ex)} className="bg-white rounded-[32px] overflow-hidden shadow-card border border-gray-100 flex items-center cursor-pointer transition-all active:scale-[0.98] group">
                        <img src={ex.imageUrl} className="w-24 h-24 object-cover" />
                        <div className="p-5 flex-1">
                           <div className="flex justify-between items-start mb-1">
                              <h3 className="font-bold tracking-tight text-sm line-clamp-1">{ex.name}</h3>
                              <div className="bg-orange-50 text-orange-600 px-2 py-0.5 rounded text-[9px] font-black uppercase whitespace-nowrap">{ex.sets} x {ex.reps}</div>
                           </div>
                           <p className="text-[10px] text-gray-400 font-medium line-clamp-2 leading-relaxed">{ex.description}</p>
                        </div>
                      </div>
                    ))}
                 </div>
              </div>
            )}
          </div>
        )}

        {view === 'stats' && (
           <div className="pt-6 animate-fade-in space-y-6">
             <header className="flex justify-between items-end mb-2 px-1">
               <div>
                 <h1 className="text-3xl font-bold tracking-tighter">Insights</h1>
                 <p className="text-gray-400 text-[10px] font-black uppercase tracking-[0.2em] mt-1">Clinical Performance</p>
               </div>
               <Calendar size={20} className="text-black mb-1" />
             </header>
             <div className="grid grid-cols-2 gap-4">
               <div className="bg-white p-6 rounded-[32px] shadow-card text-center border border-gray-100">
                  <span className="font-bold text-[9px] uppercase tracking-widest text-gray-400 block mb-4">Metabolic Adherence</span>
                  <div className="text-4xl font-black tracking-tighter">{Math.min(100, Math.round((selectedDateCalories/targetCals)*100))}%</div>
                  <p className="text-[9px] font-bold text-gray-400 mt-2 uppercase">Selected Date</p>
               </div>
               <div className="bg-black p-6 rounded-[32px] shadow-card text-center text-white">
                  <span className="font-bold text-[9px] uppercase tracking-widest opacity-40 block mb-4">Adherence</span>
                  <div className="text-4xl font-black tracking-tighter">{getStreak()} Days</div>
                  <p className="text-[9px] font-bold opacity-40 mt-2 uppercase">Healthy Streak</p>
               </div>
             </div>
           </div>
        )}

        {view === 'settings' && profile && (
          <div className="pt-6 animate-fade-in space-y-6">
            <h1 className="text-3xl font-bold tracking-tighter px-1">Profile</h1>
            <div className="bg-white rounded-[40px] p-4 space-y-2 border border-gray-100 shadow-card">
              <div className="flex items-center gap-5 p-6 bg-gray-50 rounded-[32px] mb-4 border border-gray-100">
                <div className="w-16 h-16 bg-black text-white rounded-[24px] flex items-center justify-center font-bold text-2xl shadow-xl">{profile.name.charAt(0)}</div>
                <div>
                  <div className="font-bold text-xl tracking-tight leading-none mb-1">{profile.name}</div>
                  <div className={`text-[9px] font-black uppercase tracking-widest ${profile.isPremium ? 'text-yellow-600' : 'text-gray-400'}`}>{profile.isPremium ? 'Pro Member' : 'Free Member'}</div>
                </div>
              </div>
              <button onClick={()=>setProfile(null)} className="w-full p-6 text-left font-bold text-sm hover:bg-gray-50 rounded-[28px] transition-colors flex justify-between items-center group">
                <span className="flex items-center gap-4"><User size={20}/> Update Metrics</span>
                <ChevronRight size={18} className="text-gray-200"/>
              </button>
              <button onClick={()=>signOut(auth)} className="w-full p-6 text-left font-bold text-sm text-red-500 hover:bg-red-50 rounded-[28px] transition-colors flex items-center gap-4">
                <LogOut size={20}/> Sign Out
              </button>
            </div>
          </div>
        )}
      </div>

      {view !== 'analysis' && !activeWorkout && (
        <nav className="fixed bottom-0 left-0 right-0 bg-white/90 backdrop-blur-2xl border-t border-gray-100 p-4 pb-10 flex justify-between items-center z-40 max-w-md mx-auto shadow-[0_-10px_40px_rgba(0,0,0,0.05)] px-8">
          <button onClick={()=>setView('home')} className={`transition-all duration-300 ${view==='home'?'text-black scale-125 shadow-black/5':'text-gray-300 hover:text-gray-500'}`}><Home size={22} strokeWidth={view==='home'?3:2}/></button>
          <button onClick={()=>{ setView('workouts'); setWorkoutStep(1); }} className={`transition-all duration-300 ${view==='workouts'?'text-black scale-125':'text-gray-300 hover:text-gray-500'}`}><Dumbbell size={22} strokeWidth={view==='workouts'?3:2}/></button>
          <div className="relative -mt-16 flex justify-center">
            <button onClick={()=>fileInputRef.current?.click()} className="w-18 h-18 bg-black rounded-full flex items-center justify-center text-white border-[8px] border-[#F2F2F7] shadow-2xl transition-all active:scale-90 hover:scale-110 group">
              <Plus size={36} className="group-hover:rotate-90 transition-transform duration-500"/>
            </button>
          </div>
          <button onClick={()=>setView('stats')} className={`transition-all duration-300 ${view==='stats'?'text-black scale-125':'text-gray-300 hover:text-gray-500'}`}><BarChart2 size={22} strokeWidth={view==='stats'?3:2}/></button>
          <button onClick={()=>setView('settings')} className={`transition-all duration-300 ${view==='settings'?'text-black scale-125':'text-gray-300 hover:text-gray-500'}`}><Settings size={22} strokeWidth={view==='settings'?3:2}/></button>
        </nav>
      )}

      {activeWorkout && (
        <div className="fixed inset-0 z-[60] bg-white animate-fade-in flex flex-col">
          <div className="relative h-[45%] bg-black">
            <img src={activeWorkout.imageUrl} className="w-full h-full object-cover" alt="Exercise" />
            <button onClick={() => setActiveWorkout(null)} className="absolute top-12 right-6 p-2 bg-white/20 backdrop-blur-md rounded-full text-white"><X size={24}/></button>
            <div className="absolute inset-0 bg-gradient-to-t from-black to-transparent"></div>
            <div className="absolute bottom-12 left-8">
               <h2 className="text-4xl font-bold tracking-tighter text-white mt-2">{activeWorkout.name}</h2>
            </div>
          </div>
          <div className="flex-1 p-8 bg-white flex flex-col -mt-8 rounded-t-[40px] shadow-2xl z-10">
            <div className="grid grid-cols-2 gap-4 mb-8">
              <div className="bg-gray-50 p-4 rounded-3xl border border-gray-100 flex items-center gap-3">
                <Timer size={18} className="text-gray-400" />
                <div className="text-sm font-black uppercase tracking-widest">{activeWorkout.sets} Sets</div>
              </div>
              <div className="bg-orange-50 p-4 rounded-3xl border border-orange-100 flex items-center gap-3">
                <Flame size={18} className="text-orange-500" />
                <div className="text-sm font-black uppercase text-orange-600 tracking-widest">{activeWorkout.reps} Reps</div>
              </div>
            </div>
            <p className="text-gray-600 font-medium leading-relaxed italic mb-auto px-1">"{activeWorkout.description}"</p>
            <button onClick={() => { setActiveWorkout(null); }} className="w-full bg-black text-white p-5 rounded-3xl font-black text-lg shadow-2xl transition-transform active:scale-95 mt-8">Finish Exercise</button>
          </div>
        </div>
      )}

      <PremiumModal isOpen={showPremium} onClose={()=>setShowPremium(false)} onUpgrade={()=>{saveProfile({isPremium: true}); setShowPremium(false); setWorkoutStep(3);}} />
    </div>
  );
};

export default App;
