
import React, { useState, useRef, useEffect } from 'react';
import { 
  Home, BarChart2, Settings, Plus, Flame, ChevronRight, ArrowLeft,
  Camera, User, Dumbbell, LogOut, Crown, Loader2, TrendingUp,
  Apple, Target, Zap, Star, Activity, Droplets, Calendar, Clock,
  Trophy, CheckCircle2, Info, Timer, ZapOff, Play, X, Pause, SkipForward,
  Scan, Sparkles, MapPin, Check, Image as ImageIcon, RefreshCcw, Maximize, ScanLine, Trash2, Wallet, Gift
} from 'lucide-react';
import { 
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell
} from 'recharts';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import type { User as FirebaseUser } from 'firebase/auth';
import { 
  doc, getDoc, setDoc, collection, query, orderBy, getDocs, addDoc, deleteDoc
} from 'firebase/firestore';
import Onboarding from './components/Onboarding';
import PremiumModal from './components/PremiumModal';
import Auth from './components/Auth';
import { UserProfile, ScanHistoryItem, Gender, Goal, WorkoutLocation, MuscleGroup, Exercise } from './types';
import { analyzeFoodImage } from './services/geminiService';
import { auth, db } from './services/firebase';

const MAX_FREE_SCANS_PER_DAY = 3;

const FOOD_QUOTES = [
  "If you were a vegetable, you'd be a cute-cumber.",
  "If you were a fruit, you'd be a fine-apple.",
  "I'm on a seafood diet. I see food and I eat it.",
  "Don't be upsetti, eat some spaghetti.",
  "You're the zest!",
  "We're a matcha made in heaven.",
  "Good things come to those who bake.",
  "I love you from my head to-ma-toes.",
  "You're one in a melon!",
  "Let's taco 'bout how healthy this looks."
];

const EXERCISE_DB: Exercise[] = [
  // GYM
  { id: 'g1', name: 'Barbell Bench Press', sets: 4, reps: '8-10', location: WorkoutLocation.GYM, muscleGroups: [MuscleGroup.CHEST], imageUrl: 'https://images.unsplash.com/photo-1571019614242-c5c5dee9f50b?w=400&q=80', description: 'Primary chest builder targeting the pectoralis major.' },
  { id: 'g2', name: 'Incline DB Press', sets: 3, reps: '12', location: WorkoutLocation.GYM, muscleGroups: [MuscleGroup.CHEST], imageUrl: 'https://images.unsplash.com/photo-1583454110551-21f2fa2afe61?w=400&q=80', description: 'Focus on upper chest fibers.' },
  { id: 'g3', name: 'Lat Pulldowns', sets: 4, reps: '10-12', location: WorkoutLocation.GYM, muscleGroups: [MuscleGroup.BACK], imageUrl: 'https://images.unsplash.com/photo-1605296867304-46d5465a13f1?w=400&q=80', description: 'Builds width in the lats.' },
  { id: 'g4', name: 'Seated Cable Row', sets: 3, reps: '12', location: WorkoutLocation.GYM, muscleGroups: [MuscleGroup.BACK], imageUrl: 'https://images.unsplash.com/photo-1594737625785-a6bad4b2ee8b?w=400&q=80', description: 'Back thickness and posture.' },
  { id: 'g5', name: 'Overhead Press', sets: 4, reps: '8-10', location: WorkoutLocation.GYM, muscleGroups: [MuscleGroup.SHOULDERS], imageUrl: 'https://images.unsplash.com/photo-1541534741688-6078c6bfb5c5?w=400&q=80', description: 'Total shoulder development.' },
  { id: 'g6', name: 'Barbell Squats', sets: 4, reps: '8-12', location: WorkoutLocation.GYM, muscleGroups: [MuscleGroup.LEGS], imageUrl: 'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=400&q=80', description: 'The king of lower body movements.' },
  { id: 'g7', name: 'Hammer Curls', sets: 3, reps: '12', location: WorkoutLocation.GYM, muscleGroups: [MuscleGroup.ARMS], imageUrl: 'https://images.unsplash.com/photo-1581009146145-b5ef050c2e1e?w=400&q=80', description: 'Brachialis and bicep focus.' },
  { id: 'g8', name: 'Romanian Deadlifts', sets: 3, reps: '10', location: WorkoutLocation.GYM, muscleGroups: [MuscleGroup.GLUTES, MuscleGroup.LEGS], imageUrl: 'https://images.unsplash.com/photo-1590487988256-9ed24133863e?w=400&q=80', description: 'Hamstrings and glute focus.' },
  
  // HOME
  { id: 'h1', name: 'Standard Push-ups', sets: 3, reps: 'Max', location: WorkoutLocation.HOME, muscleGroups: [MuscleGroup.CHEST], imageUrl: 'https://images.unsplash.com/photo-1571019614242-c5c5dee9f50b?w=400&q=80', description: 'Classic chest builder.' },
  { id: 'h2', name: 'Superman Pulls', sets: 3, reps: '15', location: WorkoutLocation.HOME, muscleGroups: [MuscleGroup.BACK], imageUrl: 'https://images.unsplash.com/photo-1591940742888-11b2f001715d?w=400&q=80', description: 'Bodyweight back strengthening.' },
  { id: 'h3', name: 'Pike Push-ups', sets: 3, reps: '10', location: WorkoutLocation.HOME, muscleGroups: [MuscleGroup.SHOULDERS], imageUrl: 'https://images.unsplash.com/photo-1583454110551-21f2fa2afe61?w=400&q=80', description: 'Shoulder-focused bodyweight press.' },
  { id: 'h4', name: 'Lunges', sets: 3, reps: '12 per leg', location: WorkoutLocation.HOME, muscleGroups: [MuscleGroup.LEGS], imageUrl: 'https://images.unsplash.com/photo-1434608519344-49d77a699e1d?w=400&q=80', description: 'Leg strength and stability.' },
  { id: 'h5', name: 'Plank', sets: 3, reps: '60s', location: WorkoutLocation.HOME, muscleGroups: [MuscleGroup.ABS_CORE], imageUrl: 'https://images.unsplash.com/photo-1566241142559-40e1bfc26cc3?w=400&q=80', description: 'Isometric core stability.' },
  { id: 'h6', name: 'Glute Bridges', sets: 3, reps: '20', location: WorkoutLocation.HOME, muscleGroups: [MuscleGroup.GLUTES], imageUrl: 'https://images.unsplash.com/photo-1574680096145-d05b474e2155?w=400&q=80', description: 'Isolated glute work.' },
];

const App: React.FC = () => {
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [view, setView] = useState<'home' | 'workouts' | 'stats' | 'settings' | 'analysis' | 'camera'>('home');
  const [scans, setScans] = useState<ScanHistoryItem[]>([]);
  const [showPremium, setShowPremium] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysis, setAnalysis] = useState<ScanHistoryItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState<string>(new Date().toDateString());
  const [currentQuote, setCurrentQuote] = useState(FOOD_QUOTES[0]);
  const [activeWorkout, setActiveWorkout] = useState<Exercise | null>(null);

  // Workout Selection Flow
  const [workoutStep, setWorkoutStep] = useState<1 | 2 | 3>(1);
  const [selLocation, setSelLocation] = useState<WorkoutLocation | null>(null);
  const [selMuscles, setSelMuscles] = useState<MuscleGroup[]>([]);

  // Camera and UI refs
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (u) => {
      setLoading(true);
      setUser(u);
      if (u) await fetchProfile(u.uid);
      setLoading(false);
    });
    return () => unsub();
  }, []);

  const fetchProfile = async (uid: string) => {
    try {
      const docSnap = await getDoc(doc(db, "profiles", uid));
      if (docSnap.exists()) {
        const pData = docSnap.data() as UserProfile;
        
        // Reset daily scan counter if date changed
        const todayStr = new Date().toDateString();
        if (pData.lastScanResetDate !== todayStr) {
          pData.scansUsedToday = 0;
          pData.lastScanResetDate = todayStr;
          await setDoc(doc(db, "profiles", uid), pData);
        }
        
        setProfile(pData);
        
        const q = query(collection(db, "profiles", uid, "scans"), orderBy("timestamp", "desc"));
        const querySnapshot = await getDocs(q);
        const loadedScans: ScanHistoryItem[] = [];
        querySnapshot.forEach((doc) => {
          loadedScans.push({ id: doc.id, ...doc.data() } as ScanHistoryItem);
        });
        setScans(loadedScans);
      }
    } catch (err) { console.error(err); }
  };

  const saveProfile = async (updatedData: UserProfile | Partial<UserProfile>) => {
    if (!user) return;
    const newProfile = { ...(profile || {}), ...updatedData } as UserProfile;
    try {
      await setDoc(doc(db, "profiles", user.uid), newProfile);
      setProfile(newProfile);
    } catch (err) {
      console.error("Error saving profile:", err);
    }
  };

  const deleteScan = async (scanId: string) => {
    if (!user) return;
    try {
      await deleteDoc(doc(db, "profiles", user.uid, "scans", scanId));
      setScans(prev => prev.filter(s => s.id !== scanId));
      setAnalysis(null);
      setView('home');
    } catch (err) {
      console.error("Delete Error:", err);
      alert("Failed to delete item.");
    }
  };

  const startCamera = async () => {
    setView('camera');
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 720 } } 
      });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    } catch (err) {
      console.error("Camera error:", err);
      alert("Please allow camera access to scan your food.");
      setView('home');
    }
  };

  const stopCamera = () => {
    if (videoRef.current && videoRef.current.srcObject) {
      (videoRef.current.srcObject as MediaStream).getTracks().forEach(t => t.stop());
    }
  };

  const captureImage = () => {
    if (videoRef.current && canvasRef.current) {
      const canvas = canvasRef.current;
      const video = videoRef.current;
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(video, 0, 0);
        const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
        processImage(dataUrl);
      }
    }
  };

  const handleGallerySelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = () => processImage(reader.result as string);
      reader.readAsDataURL(file);
    }
  };

  const processImage = async (dataUrl: string) => {
    if (!profile || !user) return;
    
    // Check limit using profile counter (resets daily)
    const scansUsed = profile.scansUsedToday || 0;
    
    if (!profile.isPremium && scansUsed >= MAX_FREE_SCANS_PER_DAY) {
      setShowPremium(true);
      stopCamera();
      setView('home');
      return;
    }

    stopCamera();
    setView('analysis');
    setIsAnalyzing(true);
    setAnalysis(null);
    setCurrentQuote(FOOD_QUOTES[Math.floor(Math.random() * FOOD_QUOTES.length)]);

    try {
      const base64 = dataUrl.split(',')[1];
      const res = await analyzeFoodImage(base64, profile, "image/jpeg");
      const scanData = { ...res, imageUrl: dataUrl, timestamp: new Date().toISOString() };
      
      const docRef = await addDoc(collection(db, "profiles", user.uid, "scans"), scanData);
      
      // Update profile counters (scansUsedToday remains even if item is deleted)
      const newScansUsed = scansUsed + 1;
      await saveProfile({ 
        scansUsedToday: newScansUsed, 
        lastScanResetDate: new Date().toDateString() 
      });
      
      const newScan = { ...scanData, id: docRef.id };
      setScans(prev => [newScan, ...prev]);
      setAnalysis(newScan);
      setSelectedDate(new Date().toDateString());
    } catch (err: any) {
      alert(err.message || "Failed to analyze image.");
      setView('home');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const getStreak = () => {
    if (scans.length === 0) return 0;
    const scanDates = Array.from(new Set(scans.map(s => new Date(s.timestamp).toDateString())));
    let streak = 0;
    let curr = new Date();
    const todayStr = curr.toDateString();
    curr.setDate(curr.getDate() - 1);
    const yesterdayStr = curr.toDateString();
    
    if (!scanDates.includes(todayStr) && !scanDates.includes(yesterdayStr)) return 0;
    curr = new Date();
    if (!scanDates.includes(todayStr)) curr.setDate(curr.getDate() - 1);
    while (scanDates.includes(curr.toDateString())) {
      streak++;
      curr.setDate(curr.getDate() - 1);
    }
    return streak;
  };

  const getBMI = () => {
    if (!profile) return 0;
    const h = profile.height / 100;
    return parseFloat((profile.weight / (h * h)).toFixed(1));
  };

  const getBMICategory = (bmi: number) => {
    if (bmi < 18.5) return { label: 'Underweight', color: 'text-blue-500' };
    if (bmi < 25) return { label: 'Healthy', color: 'text-green-500' };
    if (bmi < 30) return { label: 'Overweight', color: 'text-orange-500' };
    return { label: 'Obese', color: 'text-red-500' };
  };

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

  const toggleMuscle = (m: MuscleGroup) => {
    setSelMuscles(prev => prev.includes(m) ? prev.filter(x => x !== m) : [...prev, m]);
  };

  const handleGenerateWorkout = () => {
    if (!profile?.isPremium) {
      setShowPremium(true);
      return;
    }
    setWorkoutStep(3);
  };

  const filteredScans = scans.filter(s => new Date(s.timestamp).toDateString() === selectedDate);
  const totalCalories = filteredScans.reduce((a, b) => a + b.calories, 0);
  const calTarget = profile ? Math.round((10 * profile.weight) + (6.25 * (profile.height || 175)) - (5 * profile.age) + (profile.gender === Gender.MALE ? 5 : -161)) : 2000;
  const isToday = selectedDate === new Date().toDateString();

  if (!user) return <Auth />;
  if (!profile || !profile.isOnboarded) return <Onboarding onComplete={saveProfile} initialData={profile} />;

  return (
    <div className="max-w-md mx-auto min-h-screen bg-[#F2F2F7] text-black relative shadow-2xl flex flex-col font-sans overflow-hidden">
      <canvas ref={canvasRef} className="hidden" />
      <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleGallerySelect} />
      
      <div className="flex-1 px-6 overflow-y-auto no-scrollbar pb-32">
        {view === 'home' && (
          <div className="pt-6 animate-fade-in">
            <header className="flex justify-between items-center mb-6">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 bg-black rounded-lg flex items-center justify-center shadow-lg"><Sparkles size={16} className="text-white fill-white"/></div>
                <h1 className="text-xl font-bold tracking-tight">Dr Foodie</h1>
              </div>
              <button onClick={()=>setShowPremium(true)} className={`px-4 py-2 rounded-full text-[10px] font-black shadow-sm uppercase transition-all active:scale-95 ${profile.isPremium ? 'bg-black text-yellow-400 border border-yellow-400/20' : 'bg-white text-black border border-gray-100'}`}>
                {profile.isPremium ? <div className="flex items-center gap-2"><Crown size={12}/> PRO</div> : `${Math.max(0, MAX_FREE_SCANS_PER_DAY - (profile.scansUsedToday || 0))} Free Scans`}
              </button>
            </header>

            <div className="flex justify-between items-center mb-8 px-1 overflow-x-auto no-scrollbar gap-3 pb-2">
              {getWeekDays().map((d, i) => {
                const isSel = d.toDateString() === selectedDate;
                const isT = d.toDateString() === new Date().toDateString();
                return (
                  <button 
                    key={i} onClick={() => setSelectedDate(d.toDateString())}
                    className={`flex flex-col items-center min-w-[52px] py-4 rounded-3xl transition-all ${isSel ? 'bg-black text-white shadow-xl scale-110' : 'bg-white text-gray-400 hover:bg-gray-50'}`}
                  >
                    <span className="text-[10px] font-black uppercase mb-1">{d.toLocaleDateString('en-US', { weekday: 'short' }).charAt(0)}</span>
                    <span className="text-sm font-bold">{d.getDate()}</span>
                    {isT && !isSel && <div className="w-1.5 h-1.5 bg-black rounded-full mt-1.5"></div>}
                  </button>
                );
              })}
            </div>

            <div className="bg-white p-7 rounded-[32px] shadow-card mb-4 flex items-center justify-between relative overflow-hidden">
              <div className="relative z-10">
                <div className="flex items-baseline gap-1">
                  <span className="text-5xl font-bold tracking-tighter">{totalCalories}</span>
                  <span className="text-lg text-gray-400">/{calTarget}</span>
                </div>
                <div className="text-[10px] text-gray-400 font-black uppercase tracking-widest mt-1">Calorie Budget ({isToday ? 'Today' : 'Past Log'})</div>
              </div>
              <div className="relative z-10 w-20 h-20 rounded-full border-[8px] border-gray-50 flex items-center justify-center">
                 <div className="absolute inset-0 rounded-full border-[8px] border-black border-t-transparent transition-all duration-1000" style={{ transform: `rotate(${Math.min(360, (totalCalories/calTarget)*360)}deg)` }}></div>
                 <Activity className="text-black" size={28} />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3 mb-8">
               {[{l:'Protein', v: filteredScans.reduce((a,b)=>a+b.protein,0), c:'text-red-500', bg:'bg-red-50'},
                 {l:'Carbs', v: filteredScans.reduce((a,b)=>a+b.carbs,0), c:'text-orange-500', bg:'bg-orange-50'},
                 {l:'Fats', v: filteredScans.reduce((a,b)=>a+b.fat,0), c:'text-blue-500', bg:'bg-blue-50'}].map((m,i)=>(
                   <div key={i} className={`rounded-[24px] p-4 ${m.bg} flex flex-col items-center justify-center h-28 border border-white/50 shadow-sm`}>
                       <span className={`font-black text-[9px] uppercase mb-2 tracking-widest ${m.c}`}>{m.l}</span>
                       <span className="text-xl font-bold tracking-tighter">{m.v}g</span>
                   </div>
               ))}
            </div>

            <div className="space-y-3">
              <div className="flex justify-between items-center mb-4 px-1">
                <h3 className="font-bold text-lg">{isToday ? 'Daily Log' : `Log for ${new Date(selectedDate).getDate()} ${new Date(selectedDate).toLocaleDateString('en-US', { month: 'short' })}`}</h3>
                <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">{filteredScans.length} Items</span>
              </div>
              {filteredScans.length === 0 ? (
                <div className="text-center py-20 text-gray-300 bg-white rounded-[40px] border-2 border-dashed border-gray-100 flex flex-col items-center gap-4">
                  <Camera size={40} className="opacity-20" />
                  <p className="text-sm font-medium">No meals logged for this date.</p>
                </div>
              ) : (
                filteredScans.map(s => (
                  <div key={s.id} onClick={()=>{setAnalysis(s); setView('analysis')}} className="bg-white p-3 rounded-[28px] flex gap-4 shadow-card items-center cursor-pointer transition-all active:scale-[0.98]">
                    <img src={s.imageUrl} className="w-16 h-16 rounded-2xl object-cover bg-gray-50 shadow-inner" />
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-0.5">
                        <span className="font-bold text-sm line-clamp-1">{s.foodName}</span>
                        <span className="text-[8px] bg-gray-100 px-1.5 py-0.5 rounded font-black opacity-60 uppercase">{s.mealType}</span>
                      </div>
                      <div className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">{s.calories} kcal • {s.protein}g P</div>
                    </div>
                    <ChevronRight className="text-gray-200 mr-2" size={18}/>
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
                  <p className="text-gray-400 text-[10px] font-black uppercase tracking-[0.2em] mt-1">Where are you training today?</p>
                </header>
                <div className="grid grid-cols-1 gap-4">
                  {[
                    { id: WorkoutLocation.GYM, label: 'Public Gym', desc: 'Dumbbells, barbells, and machines', icon: <Dumbbell size={24}/> },
                    { id: WorkoutLocation.HOME, label: 'Home / Outdoor', desc: 'Minimal space and bodyweight focus', icon: <Home size={24}/> }
                  ].map((loc) => (
                    <button 
                      key={loc.id} 
                      onClick={() => { setSelLocation(loc.id); setWorkoutStep(2); }}
                      className="bg-white p-8 rounded-[36px] shadow-card border border-gray-100 text-left flex items-center gap-6 hover:bg-black hover:text-white transition-all group active:scale-95"
                    >
                      <div className="w-16 h-16 bg-gray-50 rounded-[24px] flex items-center justify-center group-hover:bg-white/10 group-hover:text-white text-black transition-colors">{loc.icon}</div>
                      <div>
                        <div className="font-bold text-xl tracking-tight mb-1">{loc.label}</div>
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
                    <p className="text-gray-400 text-[10px] font-black uppercase tracking-[0.2em] mt-1">Select groups to prioritize</p>
                  </div>
                  <div className="bg-black text-white px-3 py-1.5 rounded-full text-[10px] font-black uppercase">{selLocation}</div>
                </header>
                <div className="grid grid-cols-1 gap-3">
                  {Object.values(MuscleGroup).map((mg) => (
                    <button 
                      key={mg}
                      onClick={() => toggleMuscle(mg)}
                      className={`p-6 rounded-[28px] text-left flex justify-between items-center transition-all ${selMuscles.includes(mg) ? 'bg-black text-white shadow-xl scale-[1.02]' : 'bg-white text-gray-700 shadow-sm border border-gray-100 hover:bg-gray-50'}`}
                    >
                      <span className="font-bold tracking-tight text-lg">{mg}</span>
                      {selMuscles.includes(mg) ? <Check size={20}/> : <Plus size={18} className="text-gray-300"/>}
                    </button>
                  ))}
                </div>
                <button 
                  onClick={handleGenerateWorkout} 
                  disabled={selMuscles.length === 0} 
                  className="w-full bg-black text-white p-6 rounded-[32px] font-black text-lg shadow-2xl flex items-center justify-center gap-3 active:scale-95 disabled:opacity-30 transition-all mt-8"
                >
                  Generate Routine <ChevronRight size={20}/>
                </button>
              </div>
            )}

            {workoutStep === 3 && (
              <div className="animate-fade-in">
                <header className="flex justify-between items-center mb-8 px-1">
                  <div>
                    <button onClick={() => setWorkoutStep(2)} className="text-gray-400 hover:text-black mb-4 flex items-center gap-1 text-[10px] font-black uppercase tracking-widest"><ArrowLeft size={12}/> Back</button>
                    <h1 className="text-3xl font-bold tracking-tighter">Your Drill</h1>
                  </div>
                  <div className="bg-black text-white px-3 py-1.5 rounded-full text-[9px] font-black uppercase">{selLocation}</div>
                </header>
                <div className="space-y-4">
                  {EXERCISE_DB.filter(ex => ex.location === selLocation && ex.muscleGroups.some(mg => selMuscles.includes(mg))).map((ex) => (
                    <div key={ex.id} onClick={() => setActiveWorkout(ex)} className="bg-white rounded-[32px] overflow-hidden shadow-card border border-gray-100 flex items-center cursor-pointer transition-all active:scale-[0.98] group">
                      <img src={ex.imageUrl} className="w-24 h-24 object-cover" />
                      <div className="p-5 flex-1">
                         <div className="flex justify-between items-start mb-1">
                            <h3 className="font-bold tracking-tight text-base line-clamp-1">{ex.name}</h3>
                            <div className="bg-orange-50 text-orange-600 px-2 py-0.5 rounded text-[10px] font-black uppercase whitespace-nowrap">{ex.sets}x{ex.reps}</div>
                         </div>
                         <p className="text-[11px] text-gray-400 font-medium line-clamp-2 leading-tight">{ex.description}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {view === 'analysis' && (
          <div className="pt-10 animate-fade-in">
            {isAnalyzing ? (
              <div className="flex flex-col items-center justify-center h-[60vh] text-center px-10">
                <div className="relative mb-10">
                  <div className="w-24 h-24 border-4 border-gray-100 rounded-full animate-spin-slow"></div>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <Sparkles className="text-black animate-pulse" size={32} />
                  </div>
                </div>
                <h3 className="text-2xl font-bold tracking-tight mb-4">Dr Foodie is thinking...</h3>
                <p className="text-gray-400 italic font-medium leading-relaxed">"{currentQuote}"</p>
              </div>
            ) : analysis && (
              <div className="animate-fade-in space-y-6">
                 <div className="flex justify-between items-center mb-4">
                   <button onClick={() => setView('home')} className="flex items-center gap-2 text-[11px] font-black uppercase tracking-widest text-gray-400 hover:text-black"><ArrowLeft size={14}/> Back Home</button>
                   <button onClick={() => deleteScan(analysis.id)} className="p-3 bg-red-50 text-red-500 rounded-full hover:bg-red-100 transition-colors">
                     <Trash2 size={20} />
                   </button>
                 </div>
                 
                 <div className="bg-white rounded-[40px] overflow-hidden shadow-2xl relative">
                    <img src={analysis.imageUrl} className="w-full h-80 object-cover" />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent"></div>
                    <div className="absolute bottom-8 left-8 right-8 text-white">
                       <span className="text-[10px] font-black bg-white/20 backdrop-blur-md px-3 py-1 rounded-full uppercase tracking-widest">{analysis.mealType}</span>
                       <h2 className="text-4xl font-bold tracking-tighter mt-3">{analysis.foodName}</h2>
                    </div>
                 </div>

                 <div className="grid grid-cols-2 gap-4">
                    <div className="bg-black text-white p-7 rounded-[32px] shadow-xl flex flex-col justify-center">
                       <div className="text-[10px] font-black uppercase opacity-40 mb-1 tracking-widest">Total Energy</div>
                       <div className="text-5xl font-black">{analysis.calories}<span className="text-lg opacity-40 ml-1">kcal</span></div>
                    </div>
                    <div className="bg-white p-7 rounded-[32px] shadow-card border border-gray-100 flex flex-col justify-center items-center">
                       <div className="text-[10px] font-black uppercase text-gray-400 mb-3 tracking-widest text-center">Health Rating</div>
                       <div className="flex gap-1.5 w-full">
                          {[...Array(10)].map((_, i) => (
                            <div key={i} className={`h-2.5 flex-1 rounded-full ${i < analysis.healthScore ? 'bg-black' : 'bg-gray-100'}`} />
                          ))}
                       </div>
                       <div className="mt-3 text-xl font-bold">{analysis.healthScore}/10</div>
                    </div>
                 </div>

                 <div className="bg-white p-8 rounded-[40px] shadow-card border border-gray-100">
                    <h4 className="text-[11px] font-black uppercase tracking-[0.2em] text-gray-400 mb-8 flex items-center gap-2">
                       <Activity size={16} className="text-black"/> Metabolic Contribution
                    </h4>
                    
                    <div className="grid grid-cols-1 gap-6">
                      {[
                        {l:'Protein', v: analysis.protein, c:'bg-red-500', t:'Builds lean muscle mass & satiety', icon: <Flame size={14}/>, p: Math.min(100, (analysis.protein / 30) * 100)},
                        {l:'Carbs', v: analysis.carbs, c:'bg-orange-500', t:'Primary glycolytic fuel source', icon: <Zap size={14}/>, p: Math.min(100, (analysis.carbs / 50) * 100)},
                        {l:'Fats', v: analysis.fat, c:'bg-blue-500', t:'Hormonal & cognitive health', icon: <Droplets size={14}/>, p: Math.min(100, (analysis.fat / 20) * 100)}
                      ].map((m, i) => (
                        <div key={i} className="space-y-3">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <div className={`w-8 h-8 rounded-xl ${m.c} flex items-center justify-center text-white`}>{m.icon}</div>
                              <span className="font-bold text-lg tracking-tight">{m.l}</span>
                            </div>
                            <span className="text-lg font-black">{m.v}g</span>
                          </div>
                          <div className="w-full h-3 bg-gray-50 rounded-full overflow-hidden">
                            <div className={`h-full ${m.c} rounded-full transition-all duration-1000`} style={{ width: `${m.p}%` }}></div>
                          </div>
                          <p className="text-[11px] text-gray-400 font-medium px-1">{m.t}</p>
                        </div>
                      ))}
                    </div>

                    <div className="h-[1px] bg-gray-50 my-10"></div>
                    
                    <div className="bg-black/5 p-6 rounded-[32px] border border-black/5">
                       <div className="flex items-center gap-2 mb-3 text-black">
                         <Info size={16}/>
                         <span className="text-[10px] font-black uppercase tracking-widest">Clinical Insight</span>
                       </div>
                       <p className="text-sm font-medium leading-relaxed italic text-gray-700">"{analysis.microAnalysis}"</p>
                    </div>
                 </div>
              </div>
            )}
          </div>
        )}

        {view === 'camera' && (
          <div className="fixed inset-0 z-50 bg-black flex flex-col">
            <video ref={videoRef} autoPlay playsInline className="w-full h-full object-cover" />
            
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="w-72 h-72 relative">
                <div className="absolute top-0 left-0 w-8 h-8 border-t-4 border-l-4 border-white rounded-tl-2xl"></div>
                <div className="absolute top-0 right-0 w-8 h-8 border-t-4 border-r-4 border-white rounded-tr-2xl"></div>
                <div className="absolute bottom-0 left-0 w-8 h-8 border-b-4 border-l-4 border-white rounded-bl-2xl"></div>
                <div className="absolute bottom-0 right-0 w-8 h-8 border-b-4 border-r-4 border-white rounded-br-2xl"></div>
                <div className="absolute inset-0 bg-white/5 animate-pulse rounded-2xl"></div>
                <div className="absolute top-0 left-0 right-0 h-0.5 bg-white/50 animate-scan"></div>
              </div>
            </div>

            <div className="absolute top-12 left-6 right-6 flex justify-between items-center">
              <button onClick={() => { stopCamera(); setView('home'); }} className="p-3 bg-black/30 backdrop-blur-md rounded-full text-white"><X size={24}/></button>
              <span className="text-white text-[11px] font-black uppercase tracking-[0.3em] bg-black/30 backdrop-blur-md px-4 py-2 rounded-full">Scan Nutrition</span>
              <button onClick={() => fileInputRef.current?.click()} className="p-3 bg-black/30 backdrop-blur-md rounded-full text-white"><ImageIcon size={24}/></button>
            </div>

            <div className="absolute bottom-20 left-0 right-0 flex flex-col items-center gap-8">
               <p className="text-white/60 text-[10px] font-bold uppercase tracking-widest">Place food inside the frame</p>
               <button 
                 onClick={captureImage} 
                 className="w-20 h-20 rounded-full border-4 border-white flex items-center justify-center transition-all active:scale-90"
               >
                 <div className="w-16 h-16 bg-white rounded-full"></div>
               </button>
            </div>
          </div>
        )}

        {view === 'stats' && (
          <div className="pt-6 animate-fade-in space-y-6">
             <h1 className="text-3xl font-bold tracking-tighter px-1">Analytics</h1>
             
             <div className="grid grid-cols-2 gap-4">
                <div className="bg-black text-white p-7 rounded-[36px] shadow-xl text-center">
                   <div className="text-[10px] font-black uppercase opacity-40 mb-3 tracking-widest">Streak</div>
                   <div className="text-5xl font-black mb-1">{getStreak()}</div>
                   <div className="text-[9px] font-bold uppercase tracking-widest opacity-60">Healthy Days</div>
                </div>
                <div className="bg-white p-7 rounded-[36px] shadow-card border border-gray-100 text-center flex flex-col justify-center">
                   <div className="text-[10px] font-black uppercase text-gray-400 mb-1 tracking-widest">BMI Status</div>
                   <div className={`text-4xl font-black ${getBMICategory(getBMI()).color}`}>{getBMI()}</div>
                   <div className={`text-[9px] font-bold uppercase tracking-widest mt-1 opacity-60`}>{getBMICategory(getBMI()).label}</div>
                </div>
             </div>

             {/* Rewards Section */}
             <div className="bg-white p-8 rounded-[40px] shadow-card border border-gray-100">
                <h4 className="font-bold mb-6 flex items-center gap-2 px-1 text-lg">
                  <Gift size={20} className="text-yellow-500" /> Goal Rewards
                </h4>
                <div className="space-y-4">
                   {[
                     { d: 30, r: 200, label: '30 Day Milestone' },
                     { d: 60, r: 500, label: '60 Day Milestone' },
                     { d: 90, r: 999, label: '90 Day Milestone' }
                   ].map((milestone, idx) => {
                     const streak = getStreak();
                     const isUnlocked = streak >= milestone.d;
                     const progress = Math.min(100, (streak / milestone.d) * 100);
                     
                     return (
                       <div key={idx} className={`p-5 rounded-[28px] border transition-all ${isUnlocked ? 'bg-black text-white border-black shadow-xl' : 'bg-gray-50 border-gray-100'}`}>
                          <div className="flex justify-between items-center mb-3">
                            <div>
                               <div className={`text-[10px] font-black uppercase tracking-widest mb-0.5 ${isUnlocked ? 'opacity-40' : 'text-gray-400'}`}>{milestone.label}</div>
                               <div className="text-lg font-bold">₹{milestone.r} Reward</div>
                            </div>
                            {isUnlocked ? <CheckCircle2 className="text-yellow-400" size={24} /> : <div className="text-xs font-black opacity-40">{streak}/{milestone.d} Days</div>}
                          </div>
                          {!isUnlocked && (
                            <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
                               <div className="h-full bg-black rounded-full" style={{ width: `${progress}%` }}></div>
                            </div>
                          )}
                       </div>
                     );
                   })}
                </div>
             </div>

             <div className="bg-white p-8 rounded-[40px] shadow-card border border-gray-100">
                <h4 className="font-bold mb-6 flex items-center gap-2 px-1"><BarChart2 size={18}/> Calorie History</h4>
                <div className="h-48 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={getWeekDays().map(d => ({
                      name: d.getDate(),
                      val: scans.filter(s => new Date(s.timestamp).toDateString() === d.toDateString()).reduce((a,b)=>a+b.calories, 0)
                    }))}>
                      <Bar dataKey="val" radius={[10, 10, 10, 10]} fill="#000" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
             </div>
          </div>
        )}

        {view === 'settings' && (
          <div className="pt-6 animate-fade-in space-y-6">
            <h1 className="text-3xl font-bold tracking-tighter px-1">Settings</h1>
            <div className="bg-white rounded-[40px] p-4 space-y-2 border border-gray-100 shadow-card">
              <div className="flex items-center gap-5 p-6 bg-gray-50 rounded-[32px] mb-4 border border-gray-100">
                <div className="w-16 h-16 bg-black text-white rounded-[24px] flex items-center justify-center font-bold text-2xl shadow-xl">{profile.name.charAt(0)}</div>
                <div>
                  <div className="font-bold text-xl tracking-tight leading-none mb-1">{profile.name}</div>
                  <div className={`text-[9px] font-black uppercase tracking-widest ${profile.isPremium ? 'text-yellow-600' : 'text-gray-400'}`}>{profile.isPremium ? 'Pro Member' : 'Free Member'}</div>
                </div>
              </div>
              <button onClick={()=>setProfile(null)} className="w-full p-6 text-left font-bold text-sm hover:bg-gray-50 rounded-[28px] transition-colors flex justify-between items-center">
                <span className="flex items-center gap-4"><User size={20}/> Update Profile Metrics</span>
                <ChevronRight size={18} className="text-gray-200"/>
              </button>
              <button onClick={()=>setShowPremium(true)} className="w-full p-6 text-left font-bold text-sm hover:bg-gray-50 rounded-[28px] transition-colors flex justify-between items-center">
                <span className="flex items-center gap-4"><Crown size={20} className="text-yellow-500"/> Dr Foodie Pro Subscription</span>
                <ChevronRight size={18} className="text-gray-200"/>
              </button>
              <button onClick={()=>signOut(auth)} className="w-full p-6 text-left font-bold text-sm text-red-500 hover:bg-red-50 rounded-[28px] transition-colors flex items-center gap-4">
                <LogOut size={20}/> Sign Out Account
              </button>
            </div>
            <p className="text-center text-[10px] font-black text-gray-300 uppercase tracking-widest mt-12">Dr Foodie v2.5.1 Clinical Edition</p>
          </div>
        )}
      </div>

      {view !== 'analysis' && view !== 'camera' && !activeWorkout && (
        <nav className="fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur-2xl border-t border-gray-100 p-4 pb-10 flex justify-between items-center z-40 max-w-md mx-auto px-8 shadow-[0_-10px_40px_rgba(0,0,0,0.05)]">
          <button onClick={()=>{setView('home'); setSelectedDate(new Date().toDateString())}} className={`transition-all duration-300 ${view==='home'?'text-black scale-125':'text-gray-300'}`}><Home size={22} strokeWidth={view==='home'?3:2}/></button>
          <button onClick={()=>{ setView('workouts'); setWorkoutStep(1); }} className={`transition-all duration-300 ${view==='workouts'?'text-black scale-125':'text-gray-300'}`}><Dumbbell size={22} strokeWidth={view==='workouts'?3:2}/></button>
          <div className="relative -mt-16 flex justify-center">
            <button 
              onClick={startCamera} 
              className="w-20 h-20 bg-black rounded-full flex items-center justify-center text-white border-[8px] border-[#F2F2F7] shadow-2xl transition-all active:scale-90 group"
            >
              <Plus size={36} className="group-hover:rotate-90 transition-all duration-500"/>
            </button>
          </div>
          <button onClick={()=>setView('stats')} className={`transition-all duration-300 ${view==='stats'?'text-black scale-125':'text-gray-300'}`}><BarChart2 size={22} strokeWidth={view==='stats'?3:2}/></button>
          <button onClick={()=>setView('settings')} className={`transition-all duration-300 ${view==='settings'?'text-black scale-125':'text-gray-300'}`}><Settings size={22} strokeWidth={view==='settings'?3:2}/></button>
        </nav>
      )}

      {activeWorkout && (
        <div className="fixed inset-0 z-[60] bg-white animate-fade-in flex flex-col">
          <div className="relative h-[45%] bg-black">
            <img src={activeWorkout.imageUrl} className="w-full h-full object-cover" alt="Exercise" />
            <button onClick={() => setActiveWorkout(null)} className="absolute top-12 right-6 p-2 bg-white/20 backdrop-blur-md rounded-full text-white"><X size={24}/></button>
            <div className="absolute inset-0 bg-gradient-to-t from-black to-transparent"></div>
            <div className="absolute bottom-12 left-8 right-8">
               <h2 className="text-4xl font-bold tracking-tighter text-white mt-2 leading-none">{activeWorkout.name}</h2>
            </div>
          </div>
          <div className="flex-1 p-10 bg-white flex flex-col -mt-10 rounded-t-[50px] shadow-2xl z-10">
            <div className="grid grid-cols-2 gap-4 mb-10">
              <div className="bg-gray-50 p-6 rounded-[32px] border border-gray-100 flex items-center gap-4">
                <Timer size={20} className="text-gray-400" />
                <div className="text-sm font-black uppercase tracking-widest">{activeWorkout.sets} Sets</div>
              </div>
              <div className="bg-orange-50 p-6 rounded-[32px] border border-orange-100 flex items-center gap-4">
                <Flame size={20} className="text-orange-500" />
                <div className="text-sm font-black uppercase text-orange-600 tracking-widest">{activeWorkout.reps} Reps</div>
              </div>
            </div>
            <p className="text-gray-600 font-medium leading-relaxed italic mb-auto px-2">"{activeWorkout.description}"</p>
            <button onClick={() => { setActiveWorkout(null); }} className="w-full bg-black text-white p-6 rounded-[32px] font-black text-xl shadow-2xl transition-transform active:scale-95 mt-10">Finish Exercise</button>
          </div>
        </div>
      )}

      <PremiumModal isOpen={showPremium} onClose={()=>setShowPremium(false)} onUpgrade={()=>{saveProfile({isPremium: true}); setShowPremium(false); setWorkoutStep(3);}} />

      <style>{`
        @keyframes scan {
          0% { transform: translateY(-100%); }
          100% { transform: translateY(100%); }
        }
        .animate-scan {
          animation: scan 2s linear infinite;
        }
        .animate-spin-slow {
          animation: spin 8s linear infinite;
        }
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
};

export default App;
