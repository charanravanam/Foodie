
import React, { useState, useRef, useEffect } from 'react';
import { 
  Home, BarChart2, Settings, Plus, Flame, ChevronRight, ArrowLeft,
  Camera, User, Dumbbell, LogOut, Crown, Loader2, TrendingUp,
  Apple, Target, Zap, Star, Activity, Droplets, Calendar, Clock,
  Trophy, CheckCircle2, Info, Timer, ZapOff, Play, X, Pause, SkipForward,
  Scan, Sparkles, MapPin, Check, Image as ImageIcon, RefreshCcw, Maximize, ScanLine, Trash2, Wallet, Gift, Award, Users
} from 'lucide-react';
import { 
  BarChart, Bar, ResponsiveContainer
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
  // --- GYM WORKOUTS (21 Exercises) ---
  { id: 'g1', name: 'Barbell Bench Press', sets: 4, reps: '8-10', location: WorkoutLocation.GYM, muscleGroups: [MuscleGroup.CHEST], imageUrl: 'https://media.tenor.com/kpJH4zjuPF8AAAAM/supino.gif', description: 'Compound chest builder targeting the pectoralis major.' },
  { id: 'g2', name: 'Incline DB Press', sets: 3, reps: '10-12', location: WorkoutLocation.GYM, muscleGroups: [MuscleGroup.CHEST], imageUrl: 'https://fitnessprogramer.com/wp-content/uploads/2021/02/Incline-Dumbbell-Press.gif', description: 'Targets the upper chest for better shelf development.' },
  { id: 'g3', name: 'Cable Flys', sets: 3, reps: '15', location: WorkoutLocation.GYM, muscleGroups: [MuscleGroup.CHEST], imageUrl: 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcTqHR4Rp067mLyhBdXRDNGhZYfpHPcrb9woew&s', description: 'Isolation move for chest stretch and contraction.' },
  { id: 'g4', name: 'Lat Pulldown', sets: 4, reps: '10-12', location: WorkoutLocation.GYM, muscleGroups: [MuscleGroup.BACK], imageUrl: 'https://media.tenor.com/PVR9ra9tAwcAAAAM/pulley-pegada-aberta.gif', description: 'Targets the latissimus dorsi for back width.' },
  { id: 'g5', name: 'Seated Cable Row', sets: 3, reps: '10-12', location: WorkoutLocation.GYM, muscleGroups: [MuscleGroup.BACK], imageUrl: 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcRD4zX-meoI7ZdS_TLLgCXaG7TsIhCgOgENsg&s', description: 'Targets the middle back and rhomboids.' },
  { id: 'g6', name: 'Barbell Row', sets: 3, reps: '8-10', location: WorkoutLocation.GYM, muscleGroups: [MuscleGroup.BACK], imageUrl: 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcS4O8w73oTa-EEXMUhqBihTwI4w_l5ViEnWRw&s', description: 'Heavy back builder for thickness.' },
  { id: 'g7', name: 'Dumbbell Overhead Press', sets: 3, reps: '8-10', location: WorkoutLocation.GYM, muscleGroups: [MuscleGroup.SHOULDERS], imageUrl: 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcSQmArbrJhpFq9Tc_Zq-8UC97wPjMsPOxOFfA&s', description: 'Core compound movement for shoulder mass.' },
  { id: 'g8', name: 'Side Lateral Raises', sets: 3, reps: '15-20', location: WorkoutLocation.GYM, muscleGroups: [MuscleGroup.SHOULDERS], imageUrl: 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcS5Q2DuhQ9UFlgWyCYh_7QtvstQxkNlWO2J4g&s', description: 'Isolates the lateral deltoid for width.' },
  { id: 'g9', name: 'Face Pulls', sets: 3, reps: '15-20', location: WorkoutLocation.GYM, muscleGroups: [MuscleGroup.SHOULDERS, MuscleGroup.BACK], imageUrl: 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcTMUzR39Hnm_k7JKGaW3IulWc8WJNy-r_EFLw&s', description: 'Excellent for rear delts and shoulder health.' },
  { id: 'g10', name: 'Barbell Curls', sets: 3, reps: '10-12', location: WorkoutLocation.GYM, muscleGroups: [MuscleGroup.ARMS], imageUrl: 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcTWmZslF4Ib1XesFnOhgs5zPOjKMtQiAM9y3g&s', description: 'The gold standard for bicep hypertrophy.' },
  { id: 'g11', name: 'Tricep Pushdowns', sets: 3, reps: '12-15', location: WorkoutLocation.GYM, muscleGroups: [MuscleGroup.ARMS], imageUrl: 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcShja2vkxN7Ccm-psz4mfx5mdEqXVRSomD8gw&s', description: 'Constant tension for the lateral head of triceps.' },
  { id: 'g12', name: 'Skull Crushers', sets: 3, reps: '10-12', location: WorkoutLocation.GYM, muscleGroups: [MuscleGroup.ARMS], imageUrl: 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcT9SJnU1ZPYceH3af7X89jeI-8UAmjk4FIfSA&s', description: 'Tricep long head focus.' },
  { id: 'g13', name: 'Leg Press', sets: 4, reps: '10-12', location: WorkoutLocation.GYM, muscleGroups: [MuscleGroup.LEGS], imageUrl: 'https://media.tenor.com/L-taJvA94kQAAAAM/leg-extension.gif', description: 'Heavy quad and glute focus without spinal loading.' },
  { id: 'g14', name: 'Leg Extensions', sets: 3, reps: '15-20', location: WorkoutLocation.GYM, muscleGroups: [MuscleGroup.LEGS], imageUrl: 'https://media.tenor.com/L-taJvA94kQAAAAM/leg-extension.gif', description: 'Isolation for the quadriceps.' },
  { id: 'g15', name: 'Leg Curls', sets: 3, reps: '12-15', location: WorkoutLocation.GYM, muscleGroups: [MuscleGroup.LEGS], imageUrl: 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcQAlctzv4hzx5d4DJ3c8vCBp4hV_wsWRNeHzg&s', description: 'Isolation for the hamstrings.' },
  { id: 'g16', name: 'Romanian Deadlift', sets: 3, reps: '10-12', location: WorkoutLocation.GYM, muscleGroups: [MuscleGroup.LEGS, MuscleGroup.BACK], imageUrl: 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcQAlctzv4hzx5d4DJ3c8vCBp4hV_wsWRNeHzg&s', description: 'Hinge movement for posterior chain development.' },
  { id: 'g17', name: 'Barbell Squat', sets: 4, reps: '8-10', location: WorkoutLocation.GYM, muscleGroups: [MuscleGroup.LEGS], imageUrl: 'https://media.tenor.com/Re3T3B66V9UAAAAM/barbellsquats-gymexercisesmen.gif', description: 'The ultimate lower body compound movement.' },
  { id: 'g18', name: 'Calf Raises', sets: 4, reps: '15-20', location: WorkoutLocation.GYM, muscleGroups: [MuscleGroup.LEGS], imageUrl: 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcQE416GjWKssSs1W9ql8ItntyYp6R7Z6YlaBQ&s', description: 'Targets the gastrocnemius.' },
  { id: 'g19', name: 'Hip Thrust', sets: 4, reps: '10-12', location: WorkoutLocation.GYM, muscleGroups: [MuscleGroup.GLUTES], imageUrl: 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcQE416GjWKssSs1W9ql8ItntyYp6R7Z6YlaBQ&s', description: 'Primary glute builder.' },
  { id: 'g20', name: 'Hanging Leg Raises', sets: 3, reps: '12-15', location: WorkoutLocation.GYM, muscleGroups: [MuscleGroup.ABS_CORE], imageUrl: 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcRywqJobho7c8L2B_r1KlhNwh4GAl6BVq11rg&s', description: 'Advanced core move for lower abs.' },
  { id: 'g21', name: 'Plank with Weight', sets: 3, reps: '45s', location: WorkoutLocation.GYM, muscleGroups: [MuscleGroup.ABS_CORE], imageUrl: 'https://fitnessprogramer.com/wp-content/uploads/2021/04/Weighted-Front-Plank.gif', description: 'Isometric core stability with added resistance.' },

  // --- HOME WORKOUTS (21 Exercises) ---
  { id: 'h22', name: 'Push-ups', sets: 3, reps: '12-15', location: WorkoutLocation.HOME, muscleGroups: [MuscleGroup.CHEST, MuscleGroup.ARMS], imageUrl: 'https://c.tenor.com/EEJO0ylQ8tAAAAAC/tenor.gif', description: 'Classic bodyweight chest and tricep builder.' },
  { id: 'h23', name: 'Incline Push-ups', sets: 3, reps: '12-15', location: WorkoutLocation.HOME, muscleGroups: [MuscleGroup.CHEST], imageUrl: 'https://media.tenor.com/e45GckrMBLEAAAAM/flex%C3%A3o-inclinada-no-banco.gif', description: 'Easier pushup variant targeting lower chest.' },
  { id: 'h24', name: 'Wide Push-ups', sets: 3, reps: '10-12', location: WorkoutLocation.HOME, muscleGroups: [MuscleGroup.CHEST], imageUrl: 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcRMOhVJnB-6QN3fBB7trIvEe-_hagieSJ2iMw&s', description: 'Targets the outer pectorals for width.' },
  { id: 'h25', name: 'Doorway Rows', sets: 3, reps: '12-15', location: WorkoutLocation.HOME, muscleGroups: [MuscleGroup.BACK], imageUrl: 'https://gymvisual.com/img/p/1/5/0/8/9/15089.gif', description: 'Vertical pulling movement using common household items.' },
  { id: 'h26', name: 'Superman', sets: 3, reps: '15-20', location: WorkoutLocation.HOME, muscleGroups: [MuscleGroup.BACK], imageUrl: 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcSaHh3AsAmU4Ap7Y11UiNu7MDJx_5nXXltSfw&s', description: 'Strengthens lower back and glutes simultaneously.' },
  { id: 'h27', name: 'Backpack Rows', sets: 3, reps: '12-15', location: WorkoutLocation.HOME, muscleGroups: [MuscleGroup.BACK], imageUrl: 'https://www.mitrecsports.com/assets/Travel-Workout-_-Gif-5.gif', description: 'Weighted rows using a loaded backpack.' },
  { id: 'h28', name: 'Pike Push-ups', sets: 3, reps: '8-10', location: WorkoutLocation.HOME, muscleGroups: [MuscleGroup.SHOULDERS], imageUrl: 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcSrWYJAy64YbMYiamw23cu5hv7DjQkFauQbaQ&s', description: 'Primary bodyweight move for shoulder strength.' },
  { id: 'h29', name: 'Water Bottle Raises', sets: 3, reps: '20', location: WorkoutLocation.HOME, muscleGroups: [MuscleGroup.SHOULDERS], imageUrl: 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcQvkH4OXL5-KoE9A366F8UNByP8CpmwDl_UMg&s', description: 'Side lateral raises using water bottles as weights.' },
  { id: 'h30', name: 'Arm Circles', sets: 3, reps: '45s', location: WorkoutLocation.HOME, muscleGroups: [MuscleGroup.SHOULDERS], imageUrl: 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcQ7FMV8Gpa6T3b7EkXvy8qg5wjoa4z-33rYRA&s', description: 'Endurance drill for deltoid stability.' },
  { id: 'h31', name: 'Close-grip Push-ups', sets: 3, reps: '8-12', location: WorkoutLocation.HOME, muscleGroups: [MuscleGroup.ARMS, MuscleGroup.CHEST], imageUrl: 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcRMy-xoA8TPAz-ThT4EjDDtjkicFOWk0BwGrQ&s', description: 'Narrow hand placement to focus on triceps.' },
  { id: 'h32', name: 'Chair Dips', sets: 3, reps: '12-15', location: WorkoutLocation.HOME, muscleGroups: [MuscleGroup.ARMS], imageUrl: 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcQiODwgjJ_3NjiD075RSeNDc4FMBrcmV5hEKw&s', description: 'Classic tricep killer using a chair or bench.' },
  { id: 'h33', name: 'Backpack Curls', sets: 3, reps: '15', location: WorkoutLocation.HOME, muscleGroups: [MuscleGroup.ARMS], imageUrl: 'https://www.mitrecsports.com/assets/Travel-Workout-_-Gif-6.gif', description: 'Weighted bicep curls using home objects.' },
  { id: 'h34', name: 'Bodyweight Squats', sets: 4, reps: '20-25', location: WorkoutLocation.HOME, muscleGroups: [MuscleGroup.LEGS], imageUrl: 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcRZkQmT16Wt_57gNMSsOrUAJLFJQgOpkQGLzQ&s', description: 'Fundamental lower body strength movement.' },
  { id: 'h35', name: 'Reverse Lunges', sets: 3, reps: '12/leg', location: WorkoutLocation.HOME, muscleGroups: [MuscleGroup.LEGS], imageUrl: 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcTcLNVxVTSDvZ17Inr4T-405NghN9HSTwzD0Q&s', description: 'Single-leg focus for balance and glutes.' },
  { id: 'h36', name: 'Glute Bridge', sets: 3, reps: '20', location: WorkoutLocation.HOME, muscleGroups: [MuscleGroup.GLUTES, MuscleGroup.LEGS], imageUrl: 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcRH3LWcz6_u2u1Z-M5xsKcWWLhyxrajfOBOIw&s', description: 'Targets the posterior chain safely.' },
  { id: 'h37', name: 'Single-leg Bridge', sets: 3, reps: '12/leg', location: WorkoutLocation.HOME, muscleGroups: [MuscleGroup.GLUTES], imageUrl: 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcRIeysQXMDwfd7874CnqrXRsBtqoYqIGx9clw&s', description: 'Increased glute isolation.' },
  { id: 'h38', name: 'Step-ups', sets: 3, reps: '15/leg', location: WorkoutLocation.HOME, muscleGroups: [MuscleGroup.LEGS, MuscleGroup.GLUTES], imageUrl: 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcRMmvOjyjlsSxk87OrMqiV9TqyS5no3C0dWeA&s', description: 'Unilateral leg strength using a stable chair.' },
  { id: 'h39', name: 'Squat Pulses', sets: 3, reps: '45s', location: WorkoutLocation.HOME, muscleGroups: [MuscleGroup.LEGS, MuscleGroup.GLUTES], imageUrl: 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcTi7rM3bT2bW1ehzX2Kch-4ZfmQLeqfkgo56A&s', description: 'Maintains muscle tension for metabolic burn.' },
  { id: 'h40', name: 'Crunches', sets: 3, reps: '20', location: WorkoutLocation.HOME, muscleGroups: [MuscleGroup.ABS_CORE], imageUrl: 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcSB5prIgl1NCbppKVzyZqiE4Dm4Kz8FvT5aQA&s', description: 'Basic abdominal isolation.' },
  { id: 'h41', name: 'Bicycle Crunches', sets: 3, reps: '30 total', location: WorkoutLocation.HOME, muscleGroups: [MuscleGroup.ABS_CORE], imageUrl: 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcQn92VKYeMZpA8w5xTP5DmpeRjbAZAQCQs_NA&s', description: 'Targets obliques and lower abs effectively.' },
  { id: 'h42', name: 'Forearm Plank', sets: 3, reps: '60s', location: WorkoutLocation.HOME, muscleGroups: [MuscleGroup.ABS_CORE], imageUrl: 'https://fitnessprogramer.com/wp-content/uploads/2021/04/Weighted-Front-Plank.gif', description: 'Isometric hold for structural core integrity.' },
];

const App: React.FC = () => {
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [view, setView] = useState<'home' | 'workouts' | 'stats' | 'settings' | 'analysis' | 'camera' | 'team'>('home');
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
      const newScansUsed = scansUsed + 1;
      await saveProfile({ scansUsedToday: newScansUsed, lastScanResetDate: new Date().toDateString() });
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
    while (scanDates.includes(curr.toDateString())) { streak++; curr.setDate(curr.getDate() - 1); }
    return streak;
  };

  const getBMI = () => {
    if (!profile) return 0;
    const h = profile.height / 100;
    return parseFloat((profile.weight / (h * h)).toFixed(1));
  };

  const getBMICategory = (bmi: number) => {
    if (bmi < 18.5) return { label: 'Underweight', color: 'text-blue-500', bg: 'bg-blue-50' };
    if (bmi < 25) return { label: 'Normal', color: 'text-green-500', bg: 'bg-green-50' };
    if (bmi < 30) return { label: 'Overweight', color: 'text-orange-500', bg: 'bg-orange-50' };
    return { label: 'Obese', color: 'text-red-500', bg: 'bg-red-50' };
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
    if (!profile?.isPremium) { setShowPremium(true); return; }
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
                {profile.isPremium ? <div className="flex items-center gap-2"><Crown size={12}/> PRO</div> : `${Math.max(0, MAX_FREE_SCANS_PER_DAY - (profile.scansUsedToday || 0))} Scans Left`}
              </button>
            </header>

            <div className="flex justify-between items-center mb-8 px-1 overflow-x-auto no-scrollbar gap-3 pb-2">
              {getWeekDays().map((d, i) => {
                const isSel = d.toDateString() === selectedDate;
                const isT = d.toDateString() === new Date().toDateString();
                return (
                  <button key={i} onClick={() => setSelectedDate(d.toDateString())} className={`flex flex-col items-center min-w-[52px] py-4 rounded-3xl transition-all ${isSel ? 'bg-black text-white shadow-xl scale-110' : 'bg-white text-gray-400 hover:bg-gray-50'}`}>
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
                <div className="text-[10px] text-gray-400 font-black uppercase tracking-widest mt-1">Calorie Budget ({isToday ? 'Today' : 'History'})</div>
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
                <h3 className="font-bold text-lg">{isToday ? 'Today' : new Date(selectedDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</h3>
                <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">{filteredScans.length} Entries</span>
              </div>
              {filteredScans.length === 0 ? (
                <div className="text-center py-20 text-gray-300 bg-white rounded-[40px] border-2 border-dashed border-gray-100 flex flex-col items-center gap-4">
                  <Camera size={40} className="opacity-20" />
                  <p className="text-sm font-medium">No activity for this date.</p>
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
                  <h1 className="text-3xl font-bold tracking-tighter">Location</h1>
                  <p className="text-gray-400 text-[10px] font-black uppercase tracking-[0.2em] mt-1">Pick your training zone</p>
                </header>
                <div className="grid grid-cols-1 gap-4">
                  {[{ id: WorkoutLocation.GYM, label: 'Public Gym', desc: 'Equipment-rich facility', icon: <Dumbbell size={24}/> },
                    { id: WorkoutLocation.HOME, label: 'Home/Park', desc: 'No equipment needed', icon: <Home size={24}/> }].map((loc) => (
                    <button key={loc.id} onClick={() => { setSelLocation(loc.id); setWorkoutStep(2); }} className="bg-white p-8 rounded-[36px] shadow-card border border-gray-100 text-left flex items-center gap-6 hover:bg-black hover:text-white transition-all group active:scale-95">
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
                    <h1 className="text-3xl font-bold tracking-tighter">Focus</h1>
                  </div>
                  <div className="bg-black text-white px-3 py-1.5 rounded-full text-[10px] font-black uppercase">{selLocation}</div>
                </header>
                <div className="grid grid-cols-1 gap-3">
                  {Object.values(MuscleGroup).map((mg) => (
                    <button key={mg} onClick={() => toggleMuscle(mg)} className={`p-6 rounded-[28px] text-left flex justify-between items-center transition-all ${selMuscles.includes(mg) ? 'bg-black text-white shadow-xl scale-[1.02]' : 'bg-white text-gray-700 shadow-sm border border-gray-100 hover:bg-gray-50'}`}>
                      <span className="font-bold tracking-tight text-lg">{mg}</span>
                      {selMuscles.includes(mg) ? <Check size={20}/> : <Plus size={18} className="text-gray-300"/>}
                    </button>
                  ))}
                </div>
                <button onClick={handleGenerateWorkout} disabled={selMuscles.length === 0} className="w-full bg-black text-white p-6 rounded-[32px] font-black text-lg shadow-2xl flex items-center justify-center gap-3 active:scale-95 disabled:opacity-30 transition-all mt-8">Generate Routine <ChevronRight size={20}/></button>
              </div>
            )}

            {workoutStep === 3 && (
              <div className="animate-fade-in">
                <header className="flex justify-between items-center mb-8 px-1">
                  <div>
                    <button onClick={() => setWorkoutStep(2)} className="text-gray-400 hover:text-black mb-4 flex items-center gap-1 text-[10px] font-black uppercase tracking-widest"><ArrowLeft size={12}/> Back</button>
                    <h1 className="text-3xl font-bold tracking-tighter">Your Plan</h1>
                  </div>
                </header>
                <div className="space-y-4">
                  {EXERCISE_DB.filter(ex => ex.location === selLocation && ex.muscleGroups.some(mg => selMuscles.includes(mg))).map((ex) => (
                    <div key={ex.id} onClick={() => setActiveWorkout(ex)} className="bg-white rounded-[32px] overflow-hidden shadow-card border border-gray-100 flex items-center cursor-pointer transition-all active:scale-[0.98] group">
                      <img src={ex.imageUrl} className="w-24 h-24 object-cover bg-gray-50" />
                      <div className="p-5 flex-1">
                         <div className="flex justify-between items-start mb-1">
                            <h3 className="font-bold tracking-tight text-base line-clamp-1">{ex.name}</h3>
                            <div className="bg-orange-50 text-orange-600 px-2 py-0.5 rounded text-[10px] font-black uppercase whitespace-nowrap">{ex.sets}x{ex.reps}</div>
                         </div>
                         <p className="text-[11px] text-gray-400 font-medium line-clamp-2 leading-tight">{ex.description}</p>
                      </div>
                    </div>
                  ))}
                  {EXERCISE_DB.filter(ex => ex.location === selLocation && ex.muscleGroups.some(mg => selMuscles.includes(mg))).length === 0 && (
                     <div className="text-center py-20 bg-white rounded-[40px] text-gray-400 italic">No drills found for this combination.</div>
                  )}
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
                  <div className="absolute inset-0 flex items-center justify-center"><Sparkles className="text-black animate-pulse" size={32} /></div>
                </div>
                <h3 className="text-2xl font-bold tracking-tight mb-4">Analyzing Nutrition...</h3>
                <p className="text-gray-400 italic font-medium leading-relaxed">"{currentQuote}"</p>
              </div>
            ) : analysis && (
              <div className="animate-fade-in space-y-6">
                 <div className="flex justify-between items-center mb-4">
                   <button onClick={() => setView('home')} className="flex items-center gap-2 text-[11px] font-black uppercase tracking-widest text-gray-400 hover:text-black"><ArrowLeft size={14}/> Close</button>
                   <button onClick={() => deleteScan(analysis.id)} className="p-3 bg-red-50 text-red-500 rounded-full hover:bg-red-100 transition-colors"><Trash2 size={20} /></button>
                 </div>
                 <div className="bg-white rounded-[40px] overflow-hidden shadow-2xl relative">
                    <img src={analysis.imageUrl} className="w-full h-80 object-cover" />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/30 to-transparent"></div>
                    <div className="absolute bottom-8 left-8 right-8 text-white">
                       <span className="text-[10px] font-black bg-white/20 backdrop-blur-md px-3 py-1 rounded-full uppercase tracking-widest">{analysis.mealType}</span>
                       <h2 className="text-4xl font-bold tracking-tighter mt-3">{analysis.foodName}</h2>
                    </div>
                 </div>

                 <div className="grid grid-cols-2 gap-4">
                    <div className="bg-black text-white p-7 rounded-[32px] shadow-xl flex flex-col justify-center">
                       <div className="text-[10px] font-black uppercase opacity-40 mb-1 tracking-widest">Energy</div>
                       <div className="text-5xl font-black">{analysis.calories}<span className="text-lg opacity-40 ml-1">kcal</span></div>
                    </div>
                    <div className="bg-white p-7 rounded-[32px] shadow-card border border-gray-100 flex flex-col justify-center items-center">
                       <div className="text-[10px] font-black uppercase text-gray-400 mb-2 tracking-widest">Health Grade</div>
                       <div className="flex gap-1.5 w-full">
                          {[...Array(10)].map((_, i) => (
                            <div key={i} className={`h-2 flex-1 rounded-full ${i < analysis.healthScore ? 'bg-black' : 'bg-gray-100'}`} />
                          ))}
                       </div>
                       <div className="mt-3 text-2xl font-black">{analysis.healthScore}/10</div>
                    </div>
                 </div>

                 <div className="bg-white p-8 rounded-[40px] shadow-card border border-gray-100">
                    <h4 className="text-[11px] font-black uppercase tracking-[0.2em] text-gray-400 mb-8 flex items-center gap-2"><Activity size={16} className="text-black"/> Nutrients Breakdown</h4>
                    <div className="space-y-8">
                      {[{l:'Protein', v: analysis.protein, c:'bg-red-500', t:'Builds lean muscle mass & satiety', icon: <Flame size={14}/>, p: Math.min(100, (analysis.protein / 30) * 100)},
                        {l:'Carbs', v: analysis.carbs, c:'bg-orange-500', t:'Primary glycolytic fuel source', icon: <Zap size={14}/>, p: Math.min(100, (analysis.carbs / 50) * 100)},
                        {l:'Fats', v: analysis.fat, c:'bg-blue-500', t:'Hormonal & cognitive health', icon: <Droplets size={14}/>, p: Math.min(100, (analysis.fat / 20) * 100)}].map((m, i) => (
                        <div key={i} className="space-y-4">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <div className={`w-10 h-10 rounded-2xl ${m.c} flex items-center justify-center text-white shadow-lg shadow-black/5`}>{m.icon}</div>
                              <div>
                                <span className="font-bold text-lg tracking-tight block leading-none mb-1">{m.l}</span>
                                <p className="text-[10px] text-gray-400 font-medium">{m.t}</p>
                              </div>
                            </div>
                            <span className="text-2xl font-black">{m.v}<span className="text-xs opacity-40 ml-0.5">g</span></span>
                          </div>
                          <div className="w-full h-3.5 bg-gray-50 rounded-full overflow-hidden border border-gray-100">
                            <div className={`h-full ${m.c} rounded-full transition-all duration-1000 shadow-inner`} style={{ width: `${m.p}%` }}></div>
                          </div>
                        </div>
                      ))}
                    </div>
                    <div className="h-[1px] bg-gray-50 my-10"></div>
                    <div className="bg-black/5 p-6 rounded-[32px] border border-black/5">
                       <div className="flex items-center gap-2 mb-3 text-black"><Info size={16}/><span className="text-[10px] font-black uppercase tracking-widest">AI Clinical Insight</span></div>
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
              <button onClick={() => fileInputRef.current?.click()} className="p-3 bg-black/30 backdrop-blur-md rounded-full text-white"><ImageIcon size={24}/></button>
            </div>
            <div className="absolute bottom-20 left-0 right-0 flex flex-col items-center gap-8">
               <button onClick={captureImage} className="w-20 h-20 rounded-full border-4 border-white flex items-center justify-center transition-all active:scale-90"><div className="w-16 h-16 bg-white rounded-full"></div></button>
            </div>
          </div>
        )}

        {view === 'stats' && (
          <div className="pt-6 animate-fade-in space-y-6">
             <h1 className="text-3xl font-bold tracking-tighter px-1">Statistics</h1>
             
             <div className="grid grid-cols-2 gap-4">
                <div className="bg-black text-white p-7 rounded-[36px] shadow-xl text-center">
                   <div className="text-[10px] font-black uppercase opacity-40 mb-2 tracking-widest">Streak</div>
                   <div className="text-5xl font-black mb-1 flex items-center justify-center gap-1">{getStreak()} <Star size={24} className="text-yellow-400 fill-yellow-400" /></div>
                   <div className="text-[9px] font-bold uppercase tracking-widest opacity-60">Consecutive Days</div>
                </div>
                <div className={`p-7 rounded-[36px] shadow-card border border-gray-100 text-center flex flex-col justify-center ${getBMICategory(getBMI()).bg}`}>
                   <div className="text-[10px] font-black uppercase text-gray-400 mb-1 tracking-widest">Your BMI</div>
                   <div className={`text-4xl font-black ${getBMICategory(getBMI()).color}`}>{getBMI()}</div>
                   <div className={`text-[9px] font-bold uppercase tracking-widest mt-1 opacity-60`}>{getBMICategory(getBMI()).label}</div>
                </div>
             </div>

             <div className="bg-white p-8 rounded-[40px] shadow-card border border-gray-100">
                <div className="flex justify-between items-center mb-6 px-1">
                  <h4 className="font-bold text-lg flex items-center gap-2"><Award size={20} className="text-yellow-500" /> Milestone Rewards</h4>
                  <div className="bg-black/5 px-2 py-1 rounded text-[10px] font-black uppercase">Cashback Progress</div>
                </div>
                <div className="space-y-4">
                   {[{ d: 30, r: 200, label: 'Silver Goal' },
                     { d: 60, r: 500, label: 'Gold Goal' },
                     { d: 90, r: 999, label: 'Elite Goal' }].map((m, idx) => {
                     const streak = getStreak();
                     const isUnlocked = streak >= m.d;
                     const progress = Math.min(100, (streak / m.d) * 100);
                     return (
                       <div key={idx} className={`p-6 rounded-[32px] border transition-all ${isUnlocked ? 'bg-black text-white border-black shadow-xl' : 'bg-gray-50 border-gray-100'}`}>
                          <div className="flex justify-between items-center mb-4">
                            <div>
                               <div className={`text-[10px] font-black uppercase tracking-widest mb-1 ${isUnlocked ? 'opacity-40' : 'text-gray-400'}`}>{m.label}</div>
                               <div className="text-xl font-black">₹{m.r} Reward</div>
                            </div>
                            {isUnlocked ? <Trophy className="text-yellow-400" size={28} /> : <div className="text-xs font-black opacity-30">{streak}/{m.d} d</div>}
                          </div>
                          {!isUnlocked && (
                            <div className="w-full h-2.5 bg-gray-200 rounded-full overflow-hidden shadow-inner">
                               <div className="h-full bg-black rounded-full" style={{ width: `${progress}%` }}></div>
                            </div>
                          )}
                       </div>
                     );
                   })}
                </div>
             </div>

             <div className="bg-white p-8 rounded-[40px] shadow-card border border-gray-100">
                <h4 className="font-bold mb-6 flex items-center gap-2 px-1"><BarChart2 size={18}/> Activity Chart</h4>
                <div className="h-48 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={getWeekDays().map(d => ({
                      name: d.getDate(),
                      val: scans.filter(s => new Date(s.timestamp).toDateString() === d.toDateString()).reduce((a,b)=>a+b.calories, 0)
                    }))}><Bar dataKey="val" radius={[8, 8, 8, 8]} fill="#000" /></BarChart>
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
                  <div className={`text-[9px] font-black uppercase tracking-widest ${profile.isPremium ? 'text-yellow-600' : 'text-gray-400'}`}>{profile.isPremium ? 'Pro Subscription' : 'Standard Account'}</div>
                </div>
              </div>
              <button onClick={()=>setProfile(null)} className="w-full p-6 text-left font-bold text-sm hover:bg-gray-50 rounded-[28px] transition-colors flex justify-between items-center"><span className="flex items-center gap-4"><User size={20}/> Profile Update</span><ChevronRight size={18} className="text-gray-200"/></button>
              <button onClick={()=>setShowPremium(true)} className="w-full p-6 text-left font-bold text-sm hover:bg-gray-50 rounded-[28px] transition-colors flex justify-between items-center"><span className="flex items-center gap-4"><Crown size={20} className="text-yellow-500"/> Dr Foodie Pro</span><ChevronRight size={18} className="text-gray-200"/></button>
              <button onClick={()=>setView('team')} className="w-full p-6 text-left font-bold text-sm hover:bg-gray-50 rounded-[28px] transition-colors flex justify-between items-center"><span className="flex items-center gap-4"><Users size={20}/> The Team</span><ChevronRight size={18} className="text-gray-200"/></button>
              <button onClick={()=>signOut(auth)} className="w-full p-6 text-left font-bold text-sm text-red-500 hover:bg-red-50 rounded-[28px] transition-colors flex items-center gap-4"><LogOut size={20}/> Sign Out</button>
            </div>
          </div>
        )}

        {view === 'team' && (
          <div className="pt-6 animate-fade-in space-y-8">
            <header className="flex items-center gap-4 px-1">
              <button onClick={() => setView('settings')} className="p-3 bg-white rounded-2xl shadow-sm hover:bg-gray-50 transition-colors"><ArrowLeft size={20}/></button>
              <h1 className="text-3xl font-bold tracking-tighter">The Team</h1>
            </header>

            <div className="space-y-6">
              <div className="bg-black text-white p-8 rounded-[40px] shadow-2xl relative overflow-hidden">
                <div className="absolute top-0 right-0 p-4 opacity-10"><Crown size={80}/></div>
                <div className="text-[10px] font-black uppercase tracking-[0.2em] opacity-50 mb-4">Founder & Visionary</div>
                <h2 className="text-3xl font-black tracking-tight">Charan Ravanam</h2>
                <p className="text-gray-400 mt-2 text-sm leading-relaxed">Pioneering the next generation of AI-driven clinical nutrition and personalized wellness.</p>
              </div>

              <div className="bg-white p-8 rounded-[40px] shadow-card border border-gray-100">
                <h3 className="text-[11px] font-black uppercase tracking-[0.2em] text-gray-400 mb-8 flex items-center gap-2"><Users size={16} className="text-black"/> Core Team Members</h3>
                <div className="grid grid-cols-1 gap-4">
                  {[
                    "Kranthi Madireddy",
                    "Amogha",
                    "Jathin Kongalla",
                    "Sri Tej",
                    "Srikanth"
                  ].map((member, i) => (
                    <div key={i} className="flex items-center gap-4 p-5 bg-gray-50 rounded-[28px] border border-gray-100 hover:bg-white hover:shadow-md transition-all group">
                      <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center shadow-sm font-black group-hover:bg-black group-hover:text-white transition-colors">{member.charAt(0)}</div>
                      <span className="font-bold text-lg tracking-tight">{member}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {view !== 'analysis' && view !== 'camera' && view !== 'team' && !activeWorkout && (
        <nav className="fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur-2xl border-t border-gray-100 p-4 pb-10 flex justify-between items-center z-40 max-w-md mx-auto px-8 shadow-[0_-10px_40px_rgba(0,0,0,0.05)]">
          <button onClick={()=>{setView('home'); setSelectedDate(new Date().toDateString())}} className={`transition-all duration-300 ${view==='home'?'text-black scale-125':'text-black/30'}`}><Home size={22}/></button>
          <button onClick={()=>{ setView('workouts'); setWorkoutStep(1); }} className={`transition-all duration-300 ${view==='workouts'?'text-black scale-125':'text-black/30'}`}><Dumbbell size={22}/></button>
          <div className="relative -mt-16 flex justify-center">
            <button onClick={startCamera} className="w-20 h-20 bg-black rounded-full flex items-center justify-center text-white border-[8px] border-[#F2F2F7] shadow-2xl transition-all active:scale-90 group"><Plus size={36}/></button>
          </div>
          <button onClick={()=>setView('stats')} className={`transition-all duration-300 ${view==='stats'?'text-black scale-125':'text-black/30'}`}><BarChart2 size={22}/></button>
          <button onClick={()=>setView('settings')} className={`transition-all duration-300 ${view==='settings'?'text-black scale-125':'text-black/30'}`}><Settings size={22}/></button>
        </nav>
      )}

      {activeWorkout && (
        <div className="fixed inset-0 z-[60] bg-white animate-fade-in flex flex-col">
          <div className="relative h-[55%] bg-black">
            <img src={activeWorkout.imageUrl} className="w-full h-full object-cover" alt="Exercise GIF" />
            <button onClick={() => setActiveWorkout(null)} className="absolute top-12 right-6 p-2 bg-black/40 backdrop-blur-md rounded-full text-white shadow-xl"><X size={24}/></button>
            <div className="absolute inset-0 bg-gradient-to-t from-black to-transparent"></div>
            <div className="absolute bottom-12 left-8 right-8 text-white">
               <h2 className="text-4xl font-black tracking-tighter leading-none">{activeWorkout.name}</h2>
            </div>
          </div>
          <div className="flex-1 p-10 bg-white flex flex-col -mt-10 rounded-t-[50px] shadow-2xl z-10">
            <div className="grid grid-cols-2 gap-4 mb-8">
              <div className="bg-gray-50 p-6 rounded-[32px] border border-gray-100 flex items-center gap-4">
                <Timer size={22} className="text-black" />
                <div className="text-sm font-black uppercase tracking-widest">{activeWorkout.sets} Sets</div>
              </div>
              <div className="bg-orange-50 p-6 rounded-[32px] border border-orange-100 flex items-center gap-4">
                <Flame size={22} className="text-orange-500" />
                <div className="text-sm font-black uppercase text-orange-600 tracking-widest">{activeWorkout.reps} Reps</div>
              </div>
            </div>
            <p className="text-gray-600 font-medium leading-relaxed italic mb-auto px-2">"{activeWorkout.description}"</p>
            <button onClick={() => setActiveWorkout(null)} className="w-full bg-black text-white p-6 rounded-[32px] font-black text-xl shadow-2xl transition-transform active:scale-95 mt-10">Finish Drill</button>
          </div>
        </div>
      )}

      <PremiumModal isOpen={showPremium} onClose={()=>setShowPremium(false)} onUpgrade={()=>{saveProfile({isPremium: true}); setShowPremium(false); setWorkoutStep(3);}} />

      <style>{`
        @keyframes scan { 0% { transform: translateY(-100%); } 100% { transform: translateY(100%); } }
        .animate-scan { animation: scan 2s linear infinite; }
        .animate-spin-slow { animation: spin 8s linear infinite; }
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
};

export default App;
