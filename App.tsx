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
  UserPen,
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
  Crown
} from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer } from 'recharts';
import Onboarding from './components/Onboarding';
import PremiumModal from './components/PremiumModal';
import Auth from './components/Auth';
import { UserProfile, FoodAnalysis, ScanHistoryItem, Gender, Goal, ProgressPhoto, WorkoutGoal, Exercise, WorkoutLocation } from './types';
import { analyzeFoodImage } from './services/geminiService';
import { auth } from './services/firebase';
import { onAuthStateChanged, signOut, User } from 'firebase/auth';

const MAX_FREE_SCANS = 3;

// Mock initial data or load from local storage
const INITIAL_SCANS: ScanHistoryItem[] = [];

// Home Workouts (Bodyweight Focused)
const HOME_WORKOUTS: Record<string, Exercise[]> = {
  [WorkoutGoal.BELLY_FAT]: [
    { 
      id: 'h1', 
      name: 'Mountain Climbers', 
      sets: 3, 
      reps: '45 sec', 
      description: 'Drive knees to chest rapidly keeping core tight.', 
      imageUrl: 'https://images.unsplash.com/photo-1434608519344-49d77a699ded?w=800&q=80',
      instructions: [
        "Start in a high plank position, hands under shoulders.",
        "Engage your core and keep your back flat.",
        "Drive your right knee towards your chest.",
        "Quickly switch legs, driving the left knee in.",
        "Continue alternating legs at a fast pace."
      ]
    },
    { 
      id: 'h2', 
      name: 'Plank', 
      sets: 3, 
      reps: '60 sec', 
      description: 'Maintain a straight line from head to heels.', 
      imageUrl: 'https://images.unsplash.com/photo-1517836357463-d25dfeac3438?w=800&q=80',
      instructions: [
        "Lie face down, forearms on the floor.",
        "Lift your body off the ground, supporting weight on forearms and toes.",
        "Keep your body in a straight line from head to heels.",
        "Squeeze your glutes and core.",
        "Hold for the designated time."
      ]
    },
    { 
      id: 'h3', 
      name: 'Leg Raises', 
      sets: 3, 
      reps: '15 reps', 
      description: 'Lower legs slowly without arching your back.', 
      imageUrl: 'https://images.unsplash.com/photo-1599058945522-28d584b6f0ff?w=800&q=80',
      instructions: [
        "Lie on your back with legs straight.",
        "Keep your lower back pressed into the floor.",
        "Lift both legs until they are vertical.",
        "Slowly lower them back down without touching the floor.",
        "Repeat."
      ]
    },
    { 
      id: 'h4', 
      name: 'Russian Twists', 
      sets: 3, 
      reps: '20 reps', 
      description: 'Rotate torso side to side touching the floor.', 
      imageUrl: 'https://images.unsplash.com/photo-1541534741688-6078c6bfb5c5?w=800&q=80',
      instructions: [
        "Sit on the floor, lean back slightly, and lift feet off the ground.",
        "Clasp hands together or hold a weight.",
        "Twist your torso to the right, touching hands to the floor.",
        "Twist to the left.",
        "Keep core engaged throughout."
      ]
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
      instructions: [
        "Stand tall, then drop into a squat.",
        "Kick feet back into a plank position.",
        "Perform a push-up (optional).",
        "Jump feet back to hands.",
        "Explode upwards into a jump."
      ]
    },
    { 
      id: 'h6', 
      name: 'Jump Squats', 
      sets: 4, 
      reps: '15 reps', 
      description: 'Explode upwards from the squat position.', 
      imageUrl: 'https://images.unsplash.com/photo-1574680096145-d05b474e2155?w=800&q=80',
      instructions: [
        "Stand with feet shoulder-width apart.",
        "Lower into a squat.",
        "Drive through heels to jump up explosively.",
        "Land softly and immediately go into next squat."
      ]
    },
    { 
      id: 'h7', 
      name: 'Pushups', 
      sets: 3, 
      reps: '12 reps', 
      description: 'Keep elbows at 45 degrees.', 
      imageUrl: 'https://images.unsplash.com/photo-1571019614242-c5c5dee9f50b?w=800&q=80',
      instructions: [
        "Start in a high plank position.",
        "Lower chest to floor, keeping elbows at 45 degrees.",
        "Push back up to starting position.",
        "Keep core tight and back straight."
      ]
    },
    { 
      id: 'h8', 
      name: 'High Knees', 
      sets: 3, 
      reps: '60 sec', 
      description: 'Run in place bringing knees as high as possible.', 
      imageUrl: 'https://images.unsplash.com/photo-1601422407692-ec4eeec1d9b3?w=800&q=80',
      instructions: [
        "Stand tall.",
        "Run in place, driving knees up towards chest.",
        "Pump your arms.",
        "Maintain a fast rhythm."
      ]
    }
  ],
  'default': [
    { 
      id: 'd1', 
      name: 'Jumping Jacks', 
      sets: 3, 
      reps: '50 reps', 
      description: 'Standard cardio warmup.', 
      imageUrl: 'https://images.unsplash.com/photo-1544367563-12123d8965cd?w=800&q=80',
      instructions: [
        "Stand with feet together, hands at sides.",
        "Jump feet apart while raising arms overhead.",
        "Jump feet back together and lower arms.",
        "Repeat rhythmically."
      ]
    },
    { 
      id: 'd2', 
      name: 'Bodyweight Squats', 
      sets: 3, 
      reps: '20 reps', 
      description: 'Keep weight in heels.', 
      imageUrl: 'https://images.unsplash.com/photo-1574680096145-d05b474e2155?w=800&q=80',
      instructions: [
        "Feet shoulder-width apart.",
        "Hinge at hips and bend knees to lower down.",
        "Keep chest up and back straight.",
        "Drive through heels to stand."
      ]
    },
    { 
      id: 'd3', 
      name: 'Lunges', 
      sets: 3, 
      reps: '12 per leg', 
      description: 'Step forward keeping torso upright.', 
      imageUrl: 'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=800&q=80',
      instructions: [
        "Step forward with one leg.",
        "Lower hips until both knees are at 90 degrees.",
        "Push off front foot to return to start.",
        "Repeat on other leg."
      ]
    }
  ]
};

// Structured Gym Plan (0=Sunday to 6=Saturday)
interface DailyPlan {
  title: string;
  focus: string;
  exercises: Exercise[];
}

const GYM_WEEKLY_PLAN: Record<number, DailyPlan> = {
  1: { // Monday
    title: "Chest & Triceps",
    focus: "Push Day",
    exercises: [
      { 
        id: 'g1', 
        name: 'Machine Chest Press', 
        sets: 4, 
        reps: '12 reps', 
        description: 'Controlled push using the chest machine.', 
        imageUrl: 'https://images.unsplash.com/photo-1571019614242-c5c5dee9f50b?w=800&q=80',
        instructions: [
          "Adjust seat height so handles align with mid-chest.",
          "Sit back and grip the handles.",
          "Push the handles forward until arms are extended.",
          "Slowly return to the starting position.",
          "Exhale as you push, inhale as you return."
        ]
      },
      { 
        id: 'g2', 
        name: 'Incline Dumbbell Press', 
        sets: 3, 
        reps: '10 reps', 
        description: 'Set bench to 30 degrees. Press upwards.', 
        imageUrl: 'https://images.unsplash.com/photo-1517836357463-d25dfeac3438?w=800&q=80',
        instructions: [
          "Set bench to 30-45 degree incline.",
          "Lie back with dumbbells at shoulder level.",
          "Press weights straight up over chest.",
          "Lower slowly until elbows are just below shoulders.",
          "Repeat."
        ]
      },
      { 
        id: 'g3', 
        name: 'Pec Deck Fly', 
        sets: 3, 
        reps: '15 reps', 
        description: 'Squeeze chest at the peak of movement.', 
        imageUrl: 'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=800&q=80',
        instructions: [
          "Sit on the machine with back flat against pad.",
          "Grip handles or place forearms on pads.",
          "Bring arms together in front of chest.",
          "Squeeze chest muscles hard at the center.",
          "Return slowly to start."
        ]
      },
      { 
        id: 'g4', 
        name: 'Cable Tricep Pushdowns', 
        sets: 4, 
        reps: '15 reps', 
        description: 'Keep elbows tucked to sides.', 
        imageUrl: 'https://images.unsplash.com/photo-1581009146145-b5ef050c2e1e?w=800&q=80',
        instructions: [
          "Attach a bar or rope to high pulley.",
          "Grip firmly, elbows tucked at your sides.",
          "Push down until arms are fully extended.",
          "Squeeze triceps at bottom.",
          "Return slowly to chest level."
        ]
      },
      { 
        id: 'g5', 
        name: 'Overhead Dumbbell Extension', 
        sets: 3, 
        reps: '12 reps', 
        description: 'Lower dumbbell behind head and extend.', 
        imageUrl: 'https://images.unsplash.com/photo-1583454110551-21f2fa2afe61?w=800&q=80',
        instructions: [
          "Sit or stand holding one dumbbell with both hands.",
          "Lift weight overhead, arms extended.",
          "Lower weight behind head by bending elbows.",
          "Extend arms back to top position.",
          "Keep elbows close to head."
        ]
      }
    ]
  },
  2: { // Tuesday
    title: "Back & Biceps",
    focus: "Pull Day",
    exercises: [
      { 
        id: 'g6', 
        name: 'Lat Pulldown', 
        sets: 4, 
        reps: '12 reps', 
        description: 'Wide grip, pull bar to upper chest.', 
        imageUrl: 'https://images.unsplash.com/photo-1605296867304-46d5465a13f1?w=800&q=80',
        instructions: [
          "Sit at machine, adjust knee pads.",
          "Grip bar wider than shoulder width.",
          "Pull bar down to upper chest.",
          "Squeeze shoulder blades together.",
          "Return bar slowly."
        ]
      },
      { 
        id: 'g7', 
        name: 'Seated Cable Row', 
        sets: 3, 
        reps: '12 reps', 
        description: 'Keep back straight, pull handle to stomach.', 
        imageUrl: 'https://images.unsplash.com/photo-1599058945522-28d584b6f0ff?w=800&q=80',
        instructions: [
          "Sit with feet on platform, knees slightly bent.",
          "Grip handle, back straight.",
          "Pull handle towards lower abdomen.",
          "Squeeze back muscles.",
          "Extend arms to return."
        ]
      },
      { 
        id: 'g8', 
        name: 'Face Pulls', 
        sets: 3, 
        reps: '15 reps', 
        description: 'Pull rope towards forehead for rear delts.', 
        imageUrl: 'https://images.unsplash.com/photo-1541534741688-6078c6bfb5c5?w=800&q=80',
        instructions: [
          "Set cable pulley to face height with rope attachment.",
          "Pull rope towards forehead, separating hands.",
          "Keep elbows high.",
          "Squeeze rear delts.",
          "Return to start."
        ]
      },
      { 
        id: 'g9', 
        name: 'Dumbbell Bicep Curls', 
        sets: 4, 
        reps: '12 reps', 
        description: 'Curl weights with palms facing up.', 
        imageUrl: 'https://images.unsplash.com/photo-1581009146145-b5ef050c2e1e?w=800&q=80',
        instructions: [
          "Stand holding dumbbells at sides.",
          "Keep elbows close to torso.",
          "Curl weights up while rotating palms up.",
          "Squeeze biceps at top.",
          "Lower slowly."
        ]
      },
      { 
        id: 'g10', 
        name: 'Hammer Curls', 
        sets: 3, 
        reps: '12 reps', 
        description: 'Neutral grip curls for forearm/brachialis.', 
        imageUrl: 'https://images.unsplash.com/photo-1583454110551-21f2fa2afe61?w=800&q=80',
        instructions: [
          "Hold dumbbells with palms facing torso.",
          "Curl weights up keeping palms facing each other.",
          "No wrist rotation.",
          "Lower slowly."
        ]
      }
    ]
  },
  3: { // Wednesday
    title: "Legs & Glutes",
    focus: "Leg Day",
    exercises: [
      { 
        id: 'g11', 
        name: 'Leg Press', 
        sets: 4, 
        reps: '15 reps', 
        description: 'Press weight through heels, don\'t lock knees.', 
        imageUrl: 'https://burnfit.io/wp-content/uploads/2023/11/LEG_PRESS.gif',
        instructions: [
          "Sit in machine, feet shoulder-width on platform.",
          "Lower weight until knees are at 90 degrees.",
          "Drive through heels to push back up.",
          "Do not lock out knees at top."
        ]
      },
      { 
        id: 'g12', 
        name: 'Leg Extension Machine', 
        sets: 3, 
        reps: '15 reps', 
        description: 'Squeeze quads at the top.', 
        imageUrl: 'https://fitnessprogramer.com/wp-content/uploads/2022/07/Single-Leg-Extension.gif',
        instructions: [
          "Adjust pad to sit on shins.",
          "Extend legs until straight.",
          "Squeeze quadriceps firmly.",
          "Lower slowly."
        ]
      },
      { 
        id: 'g13', 
        name: 'Lying Leg Curl', 
        sets: 3, 
        reps: '12 reps', 
        description: 'Curl weight towards glutes.', 
        imageUrl: 'https://fitnessprogramer.com/wp-content/uploads/2022/04/Lying-Dumbbell-Leg-Curl.gif',
        instructions: [
          "Lie face down on machine.",
          "Pad should be on back of ankles.",
          "Curl legs up towards buttocks.",
          "Squeeze hamstrings.",
          "Lower under control."
        ]
      },
      { 
        id: 'g14', 
        name: 'Goblet Squats', 
        sets: 4, 
        reps: '12 reps', 
        description: 'Hold dumbbell at chest, squat deep.', 
        imageUrl: 'https://www.inspireusafoundation.org/file/2023/08/kettlebell-goblet-squat-muscles.gif',
        instructions: [
          "Hold one dumbbell vertically against chest.",
          "Feet shoulder-width apart.",
          "Squat down keeping chest up.",
          "Elbows should touch inside of knees.",
          "Stand back up."
        ]
      },
      { 
        id: 'g15', 
        name: 'Calf Raises', 
        sets: 4, 
        reps: '20 reps', 
        description: 'Raise heels as high as possible.', 
        imageUrl: 'https://fitnessprogramer.com/wp-content/uploads/2021/02/Dumbbell-Calf-Raise.gif',
        instructions: [
          "Stand on edge of step or machine.",
          "Lower heels below platform level.",
          "Raise up onto toes as high as possible.",
          "Hold briefly at top.",
          "Lower slowly."
        ]
      }
    ]
  },
  4: { // Thursday
    title: "Shoulders",
    focus: "Delts Focus",
    exercises: [
      { 
        id: 'g16', 
        name: 'Seated Dumbbell Press', 
        sets: 4, 
        reps: '10 reps', 
        description: 'Press dumbbells overhead.', 
        imageUrl: 'https://images.unsplash.com/photo-1541534741688-6078c6bfb5c5?w=800&q=80',
        instructions: [
          "Sit on bench with back support.",
          "Hold dumbbells at shoulder height.",
          "Press weights overhead until arms extended.",
          "Lower back to shoulder height."
        ]
      },
      { 
        id: 'g17', 
        name: 'Lateral Raises', 
        sets: 4, 
        reps: '15 reps', 
        description: 'Lift arms to side until parallel with floor.', 
        imageUrl: 'https://images.unsplash.com/photo-1581009146145-b5ef050c2e1e?w=800&q=80',
        instructions: [
          "Stand holding dumbbells at sides.",
          "Lift arms out to the sides.",
          "Stop when arms are parallel to floor.",
          "Lower slowly.",
          "Lead with elbows."
        ]
      },
      { 
        id: 'g18', 
        name: 'Front Raises', 
        sets: 3, 
        reps: '12 reps', 
        description: 'Lift weight in front of you.', 
        imageUrl: 'https://images.unsplash.com/photo-1599058945522-28d584b6f0ff?w=800&q=80',
        instructions: [
          "Hold dumbbells in front of thighs.",
          "Lift one or both arms forward.",
          "Raise to shoulder height.",
          "Lower under control."
        ]
      },
      { 
        id: 'g19', 
        name: 'Dumbbell Shrugs', 
        sets: 3, 
        reps: '15 reps', 
        description: 'Lift shoulders towards ears.', 
        imageUrl: 'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=800&q=80',
        instructions: [
          "Hold heavy dumbbells at sides.",
          "Shrug shoulders straight up towards ears.",
          "Hold at top for a second.",
          "Lower fully.",
          "Do not roll shoulders."
        ]
      }
    ]
  },
  5: { // Friday
    title: "Arms (Bi & Tri)",
    focus: "Arm Pump",
    exercises: [
      { 
        id: 'g20', 
        name: 'Barbell Curls', 
        sets: 4, 
        reps: '10 reps', 
        description: 'Standard bicep curl with barbell.', 
        imageUrl: 'https://images.unsplash.com/photo-1581009146145-b5ef050c2e1e?w=800&q=80',
        instructions: [
          "Hold barbell with underhand grip.",
          "Curl bar towards chest.",
          "Keep elbows fixed at sides.",
          "Lower bar slowly to full extension."
        ]
      },
      { 
        id: 'g21', 
        name: 'Tricep Dips (Machine)', 
        sets: 4, 
        reps: '12 reps', 
        description: 'Focus on triceps pushing down.', 
        imageUrl: 'https://images.unsplash.com/photo-1599058945522-28d584b6f0ff?w=800&q=80',
        instructions: [
          "Sit in dip machine.",
          "Press handles down until arms extended.",
          "Keep elbows tucked back.",
          "Slowly raise handles."
        ]
      },
      { 
        id: 'g22', 
        name: 'Preacher Curl Machine', 
        sets: 3, 
        reps: '12 reps', 
        description: 'Isolate the biceps.', 
        imageUrl: 'https://images.unsplash.com/photo-1583454110551-21f2fa2afe61?w=800&q=80',
        instructions: [
          "Adjust seat so armpits rest over pad.",
          "Grip handles.",
          "Curl weight towards you.",
          "Squeeze biceps hard.",
          "Lower until arms straight."
        ]
      },
      { 
        id: 'g23', 
        name: 'Skull Crushers', 
        sets: 3, 
        reps: '12 reps', 
        description: 'Lying tricep extensions.', 
        imageUrl: 'https://images.unsplash.com/photo-1517836357463-d25dfeac3438?w=800&q=80',
        instructions: [
          "Lie on bench holding EZ bar above chest.",
          "Bend elbows to lower bar to forehead.",
          "Keep elbows pointing up.",
          "Extend arms back to start."
        ]
      }
    ]
  },
  6: { // Saturday
    title: "Full Body",
    focus: "Metabolic Conditioning",
    exercises: [
      { 
        id: 'g24', 
        name: 'Kettlebell Swings', 
        sets: 4, 
        reps: '20 reps', 
        description: 'Explosive hip hinge movement.', 
        imageUrl: 'https://images.unsplash.com/photo-1599058945522-28d584b6f0ff?w=800&q=80',
        instructions: [
          "Stand feet wide, holding KB with both hands.",
          "Hinge hips back.",
          "Snap hips forward to swing KB to eye level.",
          "Let it swing back between legs.",
          "Keep back flat."
        ]
      },
      { 
        id: 'g25', 
        name: 'Dumbbell Clean & Press', 
        sets: 3, 
        reps: '12 reps', 
        description: 'Full body power movement.', 
        imageUrl: 'https://images.unsplash.com/photo-1517963879466-e9b549843e95?w=800&q=80',
        instructions: [
          "Squat to grab dumbbells.",
          "Explode up, pulling weights to shoulders.",
          "Press weights overhead.",
          "Reverse motion to floor."
        ]
      },
      { 
        id: 'g26', 
        name: 'Box Jumps', 
        sets: 3, 
        reps: '15 reps', 
        description: 'Jump onto box and stand tall.', 
        imageUrl: 'https://images.unsplash.com/photo-1434608519344-49d77a699ded?w=800&q=80',
        instructions: [
          "Stand in front of sturdy box.",
          "Squat slightly and swing arms.",
          "Jump onto box landing softly.",
          "Stand up fully.",
          "Step down."
        ]
      },
      { 
        id: 'g27', 
        name: 'Plank', 
        sets: 3, 
        reps: '60 sec', 
        description: 'Hold core tight.', 
        imageUrl: 'https://images.unsplash.com/photo-1517836357463-d25dfeac3438?w=800&q=80',
        instructions: [
          "Forearms on ground, legs extended.",
          "Maintain straight line head to heels.",
          "Tighten abs and glutes.",
          "Breathe normally."
        ]
      },
      { 
        id: 'g28', 
        name: 'Battle Ropes', 
        sets: 3, 
        reps: '30 sec', 
        description: 'High intensity cardio finisher.', 
        imageUrl: 'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=800&q=80',
        instructions: [
          "Hold rope ends, slight squat stance.",
          "Whip ropes up and down alternating arms.",
          "Keep intensity high.",
          "Keep core engaged."
        ]
      }
    ]
  },
  0: { // Sunday
    title: "Rest Day",
    focus: "Active Recovery",
    exercises: [
      { 
        id: 'g0', 
        name: 'Light Stretching', 
        sets: 1, 
        reps: '15 min', 
        description: 'Full body static stretching.', 
        imageUrl: 'https://images.unsplash.com/photo-1517130038641-a774d04afb3c?w=800&q=80',
        instructions: [
          "Stretch hamstrings, quads, and chest.",
          "Hold each stretch for 30 seconds.",
          "Do not bounce.",
          "Relax and breathe."
        ]
      },
      { 
        id: 'g01', 
        name: 'Walking', 
        sets: 1, 
        reps: '30 min', 
        description: 'Light cardio to promote blood flow.', 
        imageUrl: 'https://images.unsplash.com/photo-1476480862126-209bfaa8edc8?w=800&q=80',
        instructions: [
          "Walk at a comfortable pace.",
          "Enjoy fresh air.",
          "Focus on relaxing."
        ]
      }
    ]
  }
};

function App() {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [loadingAuth, setLoadingAuth] = useState(true);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [view, setView] = useState<'home' | 'progress' | 'workouts' | 'settings' | 'analysis'>('home');
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [scans, setScans] = useState<ScanHistoryItem[]>(INITIAL_SCANS);
  const [isPremium, setIsPremium] = useState(false);
  const [showPremiumModal, setShowPremiumModal] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [currentAnalysis, setCurrentAnalysis] = useState<FoodAnalysis | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  
  // Workouts State
  const [activeWorkout, setActiveWorkout] = useState<boolean>(false);
  const [selectedExercise, setSelectedExercise] = useState<Exercise | null>(null);
  
  // Dynamic Goals State
  const [dailyGoals, setDailyGoals] = useState({
    calories: 2000,
    protein: 150,
    carbs: 250,
    fat: 65
  });
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const progressFileInputRef = useRef<HTMLInputElement>(null);

  // Auth Listener
  useEffect(() => {
    // Safety timeout: If Firebase takes longer than 3 seconds, stop loading
    // This allows the user to see the Login screen if firebase fails silently or network is slow
    const timeoutId = setTimeout(() => {
      setLoadingAuth(false);
    }, 3000);

    const unsubscribe = onAuthStateChanged(auth, (user) => {
      clearTimeout(timeoutId);
      setCurrentUser(user);
      setLoadingAuth(false);
      
      if (user) {
        // Load specific profile for this user
        const savedProfile = localStorage.getItem(`drfoodie_profile_${user.uid}`);
        if (savedProfile) {
          const parsedProfile = JSON.parse(savedProfile);
          if (!parsedProfile.progressPhotos) {
            parsedProfile.progressPhotos = [];
          }
          setUserProfile(parsedProfile);
          setIsPremium(!!parsedProfile.isPremium);
          calculateDailyGoals(parsedProfile);
        } else {
          // New user, trigger onboarding
          setUserProfile(null);
        }
      }
    });

    return () => {
      clearTimeout(timeoutId);
      unsubscribe();
    };
  }, []);

  const calculateDailyGoals = (profile: UserProfile) => {
    // Mifflin-St Jeor Equation
    // Default height to 170 if missing (backward compatibility)
    const height = profile.height || 170;
    
    let bmr = (10 * profile.weight) + (6.25 * height) - (5 * profile.age);
    
    if (profile.gender === Gender.MALE) {
      bmr += 5;
    } else {
      bmr -= 161;
    }

    // TDEE - Assuming 'Lightly Active' (1.375) as a safe baseline for a general app
    let tdee = bmr * 1.375;

    // Goal Adjustment
    if (profile.goal === Goal.LOSE_WEIGHT) {
      tdee -= 500; // Deficit
    } else if (profile.goal === Goal.GAIN_WEIGHT) {
      tdee += 400; // Surplus
    }
    // Maintain stays at TDEE

    const totalCalories = Math.round(tdee);

    // Macro Split (Approximate 30% P / 40% C / 30% F)
    const protein = Math.round((totalCalories * 0.30) / 4);
    const carbs = Math.round((totalCalories * 0.40) / 4);
    const fat = Math.round((totalCalories * 0.30) / 9);

    setDailyGoals({
      calories: totalCalories,
      protein,
      carbs,
      fat
    });
  };

  const handleOnboardingComplete = (profile: UserProfile) => {
    if (!currentUser) return;
    
    const newProfile = { 
        ...profile, 
        progressPhotos: userProfile?.progressPhotos || [],
        isPremium: userProfile?.isPremium || false
    };
    setUserProfile(newProfile);
    setIsPremium(!!newProfile.isPremium);
    
    // Save to local storage with UID prefix
    localStorage.setItem(`drfoodie_profile_${currentUser.uid}`, JSON.stringify(newProfile));
    
    calculateDailyGoals(newProfile);
    setIsEditingProfile(false);
  };

  const updateWorkoutGoal = (goal: WorkoutGoal) => {
    if (!userProfile || !currentUser) return;
    const newProfile = { ...userProfile, workoutGoal: goal };
    setUserProfile(newProfile);
    localStorage.setItem(`drfoodie_profile_${currentUser.uid}`, JSON.stringify(newProfile));
  };

  const updateWorkoutLocation = (location: WorkoutLocation) => {
    if (!userProfile || !currentUser) return;
    const newProfile = { ...userProfile, workoutLocation: location, workoutGoal: undefined }; 
    setUserProfile(newProfile);
    localStorage.setItem(`drfoodie_profile_${currentUser.uid}`, JSON.stringify(newProfile));
  };

  const changeWorkoutSettings = () => {
    if (!userProfile || !currentUser) return;
    const newProfile = { ...userProfile, workoutGoal: undefined, workoutLocation: undefined };
    setUserProfile(newProfile);
    localStorage.setItem(`drfoodie_profile_${currentUser.uid}`, JSON.stringify(newProfile));
  };

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!isPremium && scans.length >= MAX_FREE_SCANS) {
      setShowPremiumModal(true);
      if (fileInputRef.current) fileInputRef.current.value = ''; 
      return;
    }

    setIsAnalyzing(true);
    setView('analysis');
    setErrorMsg(null);

    try {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = async () => {
        const base64String = (reader.result as string).split(',')[1];
        const imageUrl = reader.result as string; // Store for display
        
        try {
          const result: FoodAnalysis = await analyzeFoodImage(base64String, userProfile!);
          
          const newScan: ScanHistoryItem = {
            ...result,
            imageUrl: imageUrl, // Add image url to object
            id: Date.now().toString(),
            timestamp: new Date().toISOString(),
          };

          setScans([newScan, ...scans]);
          setCurrentAnalysis(newScan);
        } catch (err) {
          setErrorMsg("Failed to analyze image. Please try again with a clearer photo.");
        } finally {
          setIsAnalyzing(false);
        }
      };
    } catch (e) {
      setErrorMsg("Error reading file.");
      setIsAnalyzing(false);
    }
  };

  const handleProgressPhotoSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !userProfile || !currentUser) return;

    try {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => {
        const imageUrl = reader.result as string;
        const newPhoto: ProgressPhoto = {
          id: Date.now().toString(),
          imageUrl,
          date: new Date().toISOString()
        };
        
        const updatedProfile = {
          ...userProfile,
          progressPhotos: [newPhoto, ...(userProfile.progressPhotos || [])]
        };
        
        setUserProfile(updatedProfile);
        localStorage.setItem(`drfoodie_profile_${currentUser.uid}`, JSON.stringify(updatedProfile));
      };
    } catch (e) {
      alert("Error uploading photo");
    }
    
    // Reset input
    if (progressFileInputRef.current) progressFileInputRef.current.value = '';
  };

  const deleteProgressPhoto = (id: string) => {
    if (!userProfile || !currentUser) return;
    const updatedPhotos = userProfile.progressPhotos?.filter(p => p.id !== id) || [];
    const updatedProfile = { ...userProfile, progressPhotos: updatedPhotos };
    setUserProfile(updatedProfile);
    localStorage.setItem(`drfoodie_profile_${currentUser.uid}`, JSON.stringify(updatedProfile));
  };

  const triggerCamera = () => {
    if (!isPremium && scans.length >= MAX_FREE_SCANS) {
      setShowPremiumModal(true);
      return;
    }
    fileInputRef.current?.click();
  };

  const triggerProgressPhoto = () => {
    progressFileInputRef.current?.click();
  };

  const handleSignOut = () => {
    signOut(auth);
    setUserProfile(null);
    setScans(INITIAL_SCANS);
  };

  // Generate a week of dates centered around selectedDate or just current week
  const getWeekDays = () => {
    const dates = [];
    const today = new Date(); // Anchor to today so the week is fixed relative to now
    // Let's show previous 3 days, today, next 3 days
    for (let i = -3; i <= 3; i++) {
      const d = new Date(today);
      d.setDate(today.getDate() + i);
      dates.push(d);
    }
    return dates;
  };

  // BMI Helper
  const getBMIInfo = () => {
    if (!userProfile) return { value: 0, status: 'Unknown', color: '#ccc', percentage: 0 };
    
    const heightM = userProfile.height / 100;
    const bmi = userProfile.weight / (heightM * heightM);
    const formattedBMI = parseFloat(bmi.toFixed(1));

    let status = '';
    let color = '';
    // Percentage for slider (0-100 where 15 is 0% and 35 is 100% roughly)
    // Range 15 -> 35
    let percentage = ((bmi - 15) / (35 - 15)) * 100;
    percentage = Math.max(5, Math.min(95, percentage)); // Clamp

    if (bmi < 18.5) {
      status = 'Underweight';
      color = '#3b82f6'; // Blue
    } else if (bmi < 25) {
      status = 'Healthy';
      color = '#22c55e'; // Green
    } else if (bmi < 30) {
      status = 'Overweight';
      color = '#eab308'; // Yellow
    } else {
      status = 'Obese';
      color = '#ef4444'; // Red
    }

    return { value: formattedBMI, status, color, percentage };
  };

  // Streak Helper
  const getStreak = () => {
    // Basic streak: consecutive days with scans
    if (scans.length === 0) return 0;
    
    const uniqueDates = Array.from<string>(new Set(scans.map(s => new Date(s.timestamp).toDateString())));
    const sortedDates = uniqueDates.sort((a, b) => new Date(b).getTime() - new Date(a).getTime());
    
    let streak = 0;
    const today = new Date().toDateString();
    const yesterday = new Date(Date.now() - 86400000).toDateString();
    
    // Check if user scanned today
    if (sortedDates[0] === today) {
      streak = 1;
      // Check previous days
      let checkDate = new Date(Date.now() - 86400000);
      let idx = 1;
      while (idx < sortedDates.length) {
         if (sortedDates[idx] === checkDate.toDateString()) {
           streak++;
           checkDate.setDate(checkDate.getDate() - 1);
           idx++;
         } else {
           break;
         }
      }
    } else if (sortedDates[0] === yesterday) {
      streak = 1;
    }

    return streak;
  };

  // --- COMPONENT: MACRO PROGRESS CIRCLE ---
  const MacroCircle = ({ value, total, color, bg, icon: Icon }: { value: number, total: number, color: string, bg: string, icon: any }) => {
    const data = [
      { value: value, color: color },
      { value: Math.max(0, total - value), color: 'transparent' }
    ];
    
    return (
      <div className="relative w-16 h-16 flex items-center justify-center">
        <div className="absolute inset-0 rounded-full" style={{ backgroundColor: bg }}></div>
        <div className="absolute inset-0">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={data}
                cx="50%"
                cy="50%"
                innerRadius={0}
                outerRadius={32}
                startAngle={90}
                endAngle={-270}
                dataKey="value"
                stroke="none"
              >
                {data.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
            </PieChart>
          </ResponsiveContainer>
        </div>
        <div className="absolute w-10 h-10 bg-white rounded-full flex items-center justify-center z-10 shadow-sm">
           <Icon size={16} color={color} fill={color} fillOpacity={0.2} />
        </div>
      </div>
    );
  };

  // --- RENDER VIEWS ---

  const renderHome = () => {
    // Filter scans for selected date (mock logic: if selected date is today, show all scans, otherwise show empty)
    const isToday = selectedDate.toDateString() === new Date().toDateString();
    const displayScans = isToday ? scans : [];

    const totalCals = displayScans.reduce((acc, curr) => acc + curr.calories, 0);
    const totalProtein = displayScans.reduce((acc, curr) => acc + curr.protein, 0);
    const totalCarbs = displayScans.reduce((acc, curr) => acc + curr.carbs, 0);
    const totalFat = displayScans.reduce((acc, curr) => acc + curr.fat, 0);

    const calorieData = [
      { name: 'Eaten', value: totalCals, color: '#000000' },
      { name: 'Remaining', value: Math.max(0, dailyGoals.calories - totalCals), color: '#F2F2F7' }
    ];

    const weekDays = getWeekDays();

    return (
      <div className="pb-32 animate-fade-in">
        {/* Header - LOGO ONLY */}
        <header className="flex justify-between items-center mb-6 pt-2">
          <div className="flex items-center gap-2">
            <img src="https://www.foodieqr.com/assets/img/logo.svg" alt="Dr Foodie Logo" className="h-8 w-auto" />
          </div>
          
          {/* Free Scans Counter */}
          <button 
             onClick={() => setShowPremiumModal(true)}
             className={`flex items-center gap-2 px-3 py-1.5 rounded-full shadow-sm border ${isPremium ? 'bg-black text-white border-black' : 'bg-white border-gray-100'}`}
          >
            {isPremium ? (
              <Flame size={18} className="text-yellow-400 fill-yellow-400" />
            ) : (
               <div className="flex items-center gap-1 text-xs font-bold">
                 <span className={scans.length >= MAX_FREE_SCANS ? "text-red-500" : "text-black"}>
                    {Math.max(0, MAX_FREE_SCANS - scans.length)}
                 </span>
                 <span className="text-gray-400">/ {MAX_FREE_SCANS} Free</span>
               </div>
            )}
          </button>
        </header>

        {/* Date Strip */}
        <div className="flex justify-between mb-8 overflow-x-auto no-scrollbar gap-2 px-1">
          {weekDays.map((date, i) => {
             const isSelected = date.toDateString() === selectedDate.toDateString();
             const isTodayDate = date.toDateString() === new Date().toDateString();
             
             return (
              <div 
                key={i} 
                onClick={() => setSelectedDate(date)}
                className={`flex flex-col items-center justify-center min-w-[48px] h-[72px] rounded-full cursor-pointer transition-all ${isSelected ? 'bg-white shadow-card scale-105' : 'text-grayText hover:bg-gray-100'}`}
              >
                <span className="text-xs font-medium mb-1">{date.toLocaleDateString('en-US', { weekday: 'short' })}</span>
                <div className={`w-9 h-9 flex items-center justify-center rounded-full text-sm font-bold ${isSelected ? 'border-2 border-black' : ''} ${isTodayDate && !isSelected ? 'text-primary' : ''}`}>
                  {date.getDate()}
                </div>
              </div>
            );
          })}
        </div>

        {/* Main Calorie Card */}
        <div className="bg-white rounded-[32px] p-6 shadow-card mb-4 flex items-center justify-between relative overflow-hidden">
          <div>
            <div className="flex items-baseline gap-1">
              <span className="text-5xl font-heading font-bold text-black">{totalCals}</span>
              <span className="text-xl text-grayText font-medium">/{dailyGoals.calories}</span>
            </div>
            <div className="text-grayText font-medium mt-1">Calories eaten</div>
          </div>
          
          <div className="w-28 h-28 relative">
             <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={calorieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={42}
                    outerRadius={56}
                    startAngle={90}
                    endAngle={-270}
                    dataKey="value"
                    stroke="none"
                    cornerRadius={10}
                  >
                     <Cell key="cell-0" fill="#000000" />
                     <Cell key="cell-1" fill="#F2F2F7" />
                  </Pie>
                </PieChart>
             </ResponsiveContainer>
             <div className="absolute inset-0 flex items-center justify-center">
                <Flame size={24} className="text-black fill-black" />
             </div>
          </div>
        </div>

        {/* Macros Grid */}
        <div className="grid grid-cols-3 gap-3 mb-8">
          <div className="bg-white rounded-[24px] p-4 flex flex-col items-center shadow-card h-40 justify-between">
            <div className="text-left w-full">
               <div className="text-xl font-bold font-heading">{Math.max(0, dailyGoals.protein - Math.round(totalProtein))}g</div>
               <div className="text-xs text-grayText">Protein left</div>
            </div>
            <MacroCircle value={totalProtein} total={dailyGoals.protein} color="#FF5252" bg="#FFEBEE" icon={Beef} />
          </div>

          <div className="bg-white rounded-[24px] p-4 flex flex-col items-center shadow-card h-40 justify-between">
            <div className="text-left w-full">
               <div className="text-xl font-bold font-heading">{Math.max(0, dailyGoals.carbs - Math.round(totalCarbs))}g</div>
               <div className="text-xs text-grayText">Carbs left</div>
            </div>
            <MacroCircle value={totalCarbs} total={dailyGoals.carbs} color="#FFB74D" bg="#FFF3E0" icon={Wheat} />
          </div>

           <div className="bg-white rounded-[24px] p-4 flex flex-col items-center shadow-card h-40 justify-between">
            <div className="text-left w-full">
               <div className="text-xl font-bold font-heading">{Math.max(0, dailyGoals.fat - Math.round(totalFat))}g</div>
               <div className="text-xs text-grayText">Fats left</div>
            </div>
            <MacroCircle value={totalFat} total={dailyGoals.fat} color="#42A5F5" bg="#E3F2FD" icon={Droplet} />
          </div>
        </div>

        {/* Recently Uploaded */}
        <div className="mb-4">
          <h2 className="text-lg font-bold font-heading mb-4">Recently uploaded</h2>
          <div className="space-y-3">
             {displayScans.length === 0 ? (
               <div className="bg-white rounded-[24px] p-8 text-center border border-dashed border-gray-300">
                  <p className="text-grayText">No meals scanned for {selectedDate.toLocaleDateString('en-US', { weekday: 'long' })}</p>
                  {isToday && (
                     <button onClick={triggerCamera} className="mt-2 text-primary font-semibold">Add your first meal</button>
                  )}
               </div>
             ) : (
                displayScans.slice(0, 3).map(scan => (
                   <div key={scan.id} onClick={() => { setCurrentAnalysis(scan); setView('analysis'); }} className="bg-white p-3 rounded-[24px] flex items-center gap-4 shadow-card hover:bg-gray-50 transition-colors cursor-pointer">
                      <div className="w-16 h-16 bg-gray-100 rounded-2xl overflow-hidden flex-shrink-0">
                         {scan.imageUrl ? (
                           <img src={scan.imageUrl} alt={scan.foodName} className="w-full h-full object-cover" />
                         ) : (
                           <div className="w-full h-full flex items-center justify-center text-2xl">🥗</div>
                         )}
                      </div>
                      <div className="flex-1">
                        <h3 className="font-bold text-sm">{scan.foodName}</h3>
                        <div className="flex gap-2 text-xs text-grayText mt-1">
                          <span className="font-medium text-black">{scan.calories} kcal</span>
                          <span>•</span>
                          <span>{scan.protein}g Protein</span>
                        </div>
                      </div>
                      <ChevronRight size={20} className="text-gray-300 mr-2" />
                   </div>
                ))
             )}
          </div>
        </div>
      </div>
    );
  };

  const renderAnalysis = () => {
    if (isAnalyzing) {
       return (
          <div className="flex flex-col items-center justify-center h-[80vh]">
             <div className="w-20 h-20 bg-black rounded-full flex items-center justify-center mb-6 animate-pulse">
                <Flame size={32} className="text-white" />
             </div>
             <h2 className="text-2xl font-bold font-heading mb-2">Analyzing Meal</h2>
             <p className="text-grayText text-center max-w-xs">Identifying ingredients & calculating macros for {userProfile?.goal}</p>
          </div>
       );
    }

    if (errorMsg) {
       return (
        <div className="flex flex-col items-center justify-center h-[80vh] px-6 text-center">
           <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mb-4 text-red-500">
              <X size={32} />
           </div>
           <h2 className="text-xl font-bold mb-2">Analysis Failed</h2>
           <p className="text-grayText mb-6">{errorMsg}</p>
           <button onClick={() => setView('home')} className="bg-black text-white px-8 py-3 rounded-full font-bold">Close</button>
        </div>
       );
    }

    if (!currentAnalysis) return null;

    return (
      <div className="pt-6 pb-32">
        <div className="flex items-center gap-4 mb-6">
           <button onClick={() => setView('home')} className="p-2 bg-white rounded-full shadow-sm hover:bg-gray-100"><ArrowLeft size={20} /></button>
           <h2 className="text-xl font-bold font-heading">Meal Analysis</h2>
        </div>

        <div className="bg-white rounded-[32px] overflow-hidden shadow-card mb-6">
           {/* Image Display */}
           <div className="h-64 bg-gray-100 flex items-center justify-center relative">
              {currentAnalysis.imageUrl ? (
                <img src={currentAnalysis.imageUrl} alt={currentAnalysis.foodName} className="w-full h-full object-cover" />
              ) : (
                <span className="text-6xl">🥗</span>
              )}
              <div className="absolute bottom-4 right-4 bg-white/90 backdrop-blur-sm px-3 py-1 rounded-full text-xs font-bold text-green-700 shadow-sm">
                 Health Score: {currentAnalysis.healthScore}/10
              </div>
           </div>

           <div className="p-6">
              <h1 className="text-3xl font-bold font-heading mb-1">{currentAnalysis.foodName}</h1>
              <div className="flex items-center gap-2 mb-6">
                 <span className="text-grayText text-sm font-medium">{new Date(currentAnalysis.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})} • Dr Foodie Scan</span>
              </div>

              <div className="flex justify-between items-end mb-6 border-b border-gray-100 pb-6">
                 <div>
                    <div className="text-sm text-grayText mb-1 font-medium uppercase tracking-wide">Calories</div>
                    <div className="text-4xl font-heading font-bold">{currentAnalysis.calories}</div>
                 </div>
                 <div className="flex gap-4">
                    <div className="text-center p-2 bg-red-50 rounded-2xl min-w-[60px]">
                       <div className="text-[10px] text-grayText mb-1 font-bold">PROT</div>
                       <div className="font-bold text-protein text-lg">{currentAnalysis.protein}g</div>
                    </div>
                    <div className="text-center p-2 bg-orange-50 rounded-2xl min-w-[60px]">
                       <div className="text-[10px] text-grayText mb-1 font-bold">CARB</div>
                       <div className="font-bold text-carbs text-lg">{currentAnalysis.carbs}g</div>
                    </div>
                    <div className="text-center p-2 bg-blue-50 rounded-2xl min-w-[60px]">
                       <div className="text-[10px] text-grayText mb-1 font-bold">FAT</div>
                       <div className="font-bold text-fats text-lg">{currentAnalysis.fat}g</div>
                    </div>
                 </div>
              </div>

              <div>
                 <h3 className="font-bold mb-3 flex items-center gap-2 text-lg">
                    <Apple size={20} className="fill-black" /> Dr Foodie's Insight
                 </h3>
                 <div className="bg-gray-50 p-5 rounded-[24px] border border-gray-100">
                    <p className="text-gray-700 text-sm leading-relaxed">
                       {currentAnalysis.microAnalysis}
                    </p>
                    <div className="mt-4 pt-4 border-t border-gray-200 flex items-center justify-between text-xs text-gray-500 font-medium">
                       <span>Target: {userProfile?.targetWeight}kg</span>
                       <span>Duration: {userProfile?.durationWeeks} weeks</span>
                    </div>
                 </div>
              </div>
           </div>
        </div>
        
        <button onClick={triggerCamera} className="w-full bg-black text-white py-4 rounded-[20px] font-bold text-lg shadow-floating hover:scale-[1.01] transition-transform">
           Scan Another Meal
        </button>
      </div>
    );
  };

  const renderExerciseDetail = () => {
    if (!selectedExercise) return null;

    return (
       <div className="pb-32 pt-6 animate-fade-in fixed inset-0 bg-white z-50 overflow-y-auto">
          <div className="px-6">
             {/* Header */}
             <div className="flex items-center justify-between mb-6 sticky top-6 z-10">
                <button 
                  onClick={() => setSelectedExercise(null)} 
                  className="w-10 h-10 bg-white rounded-full shadow-lg flex items-center justify-center hover:bg-gray-50 border border-gray-100"
                >
                   <ArrowLeft size={20} />
                </button>
                <h2 className="text-lg font-bold font-heading truncate max-w-[200px]">{selectedExercise.name}</h2>
                <div className="w-10"></div> {/* Spacer */}
             </div>

             {/* Large Image */}
             <div className="w-full h-80 rounded-[32px] bg-gray-100 overflow-hidden shadow-card mb-8 relative">
                <img 
                   src={selectedExercise.imageUrl} 
                   alt={selectedExercise.name} 
                   className="w-full h-full object-cover" 
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent"></div>
                <div className="absolute bottom-6 left-6 text-white">
                   <h1 className="text-3xl font-bold font-heading mb-2">{selectedExercise.name}</h1>
                   <div className="flex items-center gap-4 text-sm font-medium opacity-90">
                      <span className="bg-white/20 backdrop-blur-md px-3 py-1 rounded-full">{selectedExercise.sets} Sets</span>
                      <span className="bg-white/20 backdrop-blur-md px-3 py-1 rounded-full">{selectedExercise.reps}</span>
                   </div>
                </div>
             </div>

             {/* Instructions Content */}
             <div className="space-y-8">
                <div>
                   <h3 className="text-xl font-bold mb-3 flex items-center gap-2">
                      <List className="text-primary" size={24} /> Instructions
                   </h3>
                   <div className="bg-gray-50 rounded-[24px] p-6 border border-gray-100">
                      {selectedExercise.instructions && selectedExercise.instructions.length > 0 ? (
                         <div className="space-y-6">
                            {selectedExercise.instructions.map((step, index) => (
                               <div key={index} className="flex gap-4">
                                  <div className="w-8 h-8 rounded-full bg-black text-white flex-shrink-0 flex items-center justify-center font-bold text-sm shadow-md">
                                     {index + 1}
                                  </div>
                                  <p className="text-gray-700 leading-relaxed pt-1 font-medium">{step}</p>
                               </div>
                            ))}
                         </div>
                      ) : (
                         <p className="text-gray-500">{selectedExercise.description}</p>
                      )}
                   </div>
                </div>

                <div className="bg-blue-50 p-6 rounded-[24px] border border-blue-100 mb-8">
                   <h4 className="font-bold text-blue-900 mb-2 flex items-center gap-2">
                      <Activity size={18} /> Pro Tip
                   </h4>
                   <p className="text-blue-800 text-sm leading-relaxed">
                      Focus on form over weight. Ensure controlled movements during both the lifting and lowering phases to maximize muscle engagement and prevent injury.
                   </p>
                </div>
             </div>

             {/* Close Button at bottom */}
             <button 
                onClick={() => setSelectedExercise(null)} 
                className="w-full bg-black text-white py-4 rounded-xl font-bold text-lg shadow-floating hover:scale-[1.02] transition-transform mb-8"
             >
                Close Details
             </button>
          </div>
       </div>
    );
  };

  const renderProgress = () => {
    const bmiInfo = getBMIInfo();
    const streak = getStreak();
    
    return (
      <div className="pb-32 pt-6 animate-fade-in">
        <h1 className="text-2xl font-bold font-heading mb-6">Your Progress</h1>
        
        {/* BMI Card */}
        <div className="bg-white rounded-[32px] p-6 shadow-card mb-6 relative overflow-hidden">
          <div className="flex justify-between items-start mb-4 relative z-10">
            <div>
              <div className="text-sm text-grayText font-bold uppercase mb-1">BMI Score</div>
              <div className="text-4xl font-heading font-bold" style={{ color: bmiInfo.color }}>
                {bmiInfo.value}
              </div>
              <div className="text-sm font-medium mt-1" style={{ color: bmiInfo.color }}>
                {bmiInfo.status}
              </div>
            </div>
            <div className="bg-gray-50 p-3 rounded-2xl">
               <Activity size={24} className="text-black" />
            </div>
          </div>
          
          {/* Simple BMI Bar */}
          <div className="relative h-4 bg-gray-100 rounded-full overflow-hidden mt-2 z-10">
            <div 
              className="absolute top-0 bottom-0 left-0 transition-all duration-1000 ease-out"
              style={{ width: `${bmiInfo.percentage}%`, backgroundColor: bmiInfo.color }}
            ></div>
          </div>
          
          {/* Decorative */}
          <div className="absolute -right-4 -bottom-4 opacity-5">
             <Scale size={120} />
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 gap-4 mb-8">
           <div className="bg-white p-5 rounded-[24px] shadow-card">
              <div className="flex items-center gap-2 mb-2 text-grayText text-xs font-bold uppercase">
                 <Scale size={14} /> Current
              </div>
              <div className="text-2xl font-bold">{userProfile?.weight} <span className="text-sm font-normal text-gray-400">kg</span></div>
           </div>
           
           <div className="bg-white p-5 rounded-[24px] shadow-card">
              <div className="flex items-center gap-2 mb-2 text-grayText text-xs font-bold uppercase">
                 <Target size={14} /> Target
              </div>
              <div className="text-2xl font-bold">{userProfile?.targetWeight} <span className="text-sm font-normal text-gray-400">kg</span></div>
           </div>
           
           <div className="bg-white p-5 rounded-[24px] shadow-card col-span-2 flex items-center justify-between">
              <div>
                 <div className="flex items-center gap-2 mb-1 text-grayText text-xs font-bold uppercase">
                    <Flame size={14} /> Streak
                 </div>
                 <div className="text-2xl font-bold">{streak} <span className="text-sm font-normal text-gray-400">days</span></div>
              </div>
              <div className="flex gap-1">
                 {[...Array(7)].map((_, i) => (
                    <div key={i} className={`w-3 h-8 rounded-full ${i < (streak % 7) || (streak >= 7 && i < 7) ? 'bg-orange-400' : 'bg-gray-100'}`}></div>
                 ))}
              </div>
           </div>
        </div>

        {/* Progress Photos */}
        <div>
           <div className="flex justify-between items-end mb-4">
              <h2 className="text-lg font-bold font-heading">Body Transformation</h2>
              <button onClick={triggerProgressPhoto} className="text-sm font-bold text-primary flex items-center gap-1">
                 <Camera size={16} /> Add Photo
              </button>
           </div>
           
           {(!userProfile?.progressPhotos || userProfile.progressPhotos.length === 0) ? (
              <div className="bg-white rounded-[24px] p-8 text-center border-2 border-dashed border-gray-200">
                 <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-4 text-gray-400">
                    <Camera size={24} />
                 </div>
                 <h3 className="font-bold mb-1">No photos yet</h3>
                 <p className="text-sm text-grayText mb-4">Track your body changes over time</p>
                 <button onClick={triggerProgressPhoto} className="bg-black text-white px-6 py-3 rounded-xl font-bold text-sm">
                    Upload First Photo
                 </button>
              </div>
           ) : (
              <div className="grid grid-cols-2 gap-3">
                 {userProfile.progressPhotos.map((photo) => (
                    <div key={photo.id} className="relative aspect-[3/4] rounded-2xl overflow-hidden group shadow-card">
                       <img src={photo.imageUrl} alt="Progress" className="w-full h-full object-cover" />
                       <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-100"></div>
                       <div className="absolute bottom-3 left-3 right-3 flex justify-between items-end">
                          <span className="text-white text-xs font-bold">{new Date(photo.date).toLocaleDateString()}</span>
                          <button 
                             onClick={(e) => { e.stopPropagation(); deleteProgressPhoto(photo.id); }}
                             className="p-1.5 bg-white/20 backdrop-blur-md rounded-full text-white hover:bg-red-500/80 transition-colors"
                          >
                             <Trash2 size={14} />
                          </button>
                       </div>
                    </div>
                 ))}
                 <button 
                   onClick={triggerProgressPhoto}
                   className="aspect-[3/4] rounded-2xl border-2 border-dashed border-gray-200 flex flex-col items-center justify-center gap-2 text-gray-400 hover:bg-gray-50 transition-colors"
                 >
                    <Plus size={24} />
                    <span className="text-xs font-bold">Add New</span>
                 </button>
              </div>
           )}
        </div>
      </div>
    );
  };

  const renderWorkouts = () => {
    // Premium Check
    if (!isPremium) {
       return (
        <div className="pb-32 pt-6 animate-fade-in h-full flex flex-col items-center justify-center text-center px-6 mt-20">
           <div className="w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mb-6 text-gray-400">
              <Lock size={40} />
           </div>
           <h1 className="text-2xl font-bold font-heading mb-2">Premium Feature</h1>
           <p className="text-grayText mb-8 max-w-xs mx-auto">
             Personalized workout plans are available exclusively for Dr Foodie Pro members.
           </p>
           <button 
              onClick={() => setShowPremiumModal(true)}
              className="bg-black text-white px-8 py-4 rounded-2xl font-bold shadow-floating hover:scale-105 transition-transform flex items-center gap-2 w-full justify-center"
           >
              <Crown size={20} className="text-yellow-400 fill-yellow-400" />
              Upgrade to Unlock
           </button>
        </div>
       );
    }

    // If workout location is not set
    if (!userProfile?.workoutLocation) {
      return (
        <div className="pb-32 pt-6 animate-fade-in">
           <h1 className="text-2xl font-bold font-heading mb-6">Workouts</h1>
           <div className="bg-white rounded-[32px] p-8 shadow-card text-center">
              <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-6 text-gray-400">
                <Dumbbell size={32} />
              </div>
              <h2 className="text-xl font-bold mb-2">Where do you workout?</h2>
              <p className="text-grayText mb-8">We will personalize your plan based on your equipment.</p>
              
              <div className="space-y-4">
                 <button 
                    onClick={() => updateWorkoutLocation(WorkoutLocation.GYM)}
                    className="w-full bg-black text-white p-5 rounded-2xl font-bold flex items-center justify-between hover:scale-[1.02] transition-transform shadow-lg"
                 >
                    <span className="flex items-center gap-3"><Building2 size={24} /> Gym</span>
                    <ChevronRight size={20} />
                 </button>
                 <button 
                    onClick={() => updateWorkoutLocation(WorkoutLocation.HOME)}
                    className="w-full bg-white border border-gray-200 text-black p-5 rounded-2xl font-bold flex items-center justify-between hover:bg-gray-50 transition-colors"
                 >
                    <span className="flex items-center gap-3"><HomeIcon size={24} /> Home</span>
                    <ChevronRight size={20} />
                 </button>
              </div>
           </div>
        </div>
      );
    }

    // If Home workout is selected but no specific goal
    if (userProfile.workoutLocation === WorkoutLocation.HOME && !userProfile.workoutGoal) {
       return (
        <div className="pb-32 pt-6 animate-fade-in">
           <div className="flex items-center gap-4 mb-6">
              <button onClick={changeWorkoutSettings} className="p-2 bg-white rounded-full shadow-sm hover:bg-gray-100"><ArrowLeft size={20} /></button>
              <h1 className="text-2xl font-bold font-heading">Home Workout Goal</h1>
           </div>
           
           <div className="grid gap-4">
              {Object.values(WorkoutGoal).map((g) => (
                 <button
                    key={g}
                    onClick={() => updateWorkoutGoal(g)}
                    className="bg-white p-6 rounded-[24px] shadow-card text-left flex justify-between items-center hover:scale-[1.01] transition-transform"
                 >
                    <span className="font-bold text-lg">{g}</span>
                    <ChevronRight size={20} className="text-gray-300" />
                 </button>
              ))}
           </div>
        </div>
       );
    }

    // Render Actual Workout List
    const isGym = userProfile.workoutLocation === WorkoutLocation.GYM;
    let exercises: Exercise[] = [];
    let title = "";
    let subtitle = "";

    if (isGym) {
       const todayDay = new Date().getDay();
       const plan = GYM_WEEKLY_PLAN[todayDay];
       exercises = plan.exercises;
       title = plan.title;
       subtitle = plan.focus;
    } else {
       // Home
       const goal = userProfile.workoutGoal || WorkoutGoal.OVERALL_FAT_LOSS; // Default fallback
       exercises = HOME_WORKOUTS[goal] || HOME_WORKOUTS['default'];
       title = "Home Circuit";
       subtitle = goal;
    }

    return (
      <div className="pb-32 pt-6 animate-fade-in">
          {/* Detail View Overlay */}
          {selectedExercise && renderExerciseDetail()}

         <div className="flex justify-between items-start mb-6">
            <div>
               <h1 className="text-2xl font-bold font-heading">{title}</h1>
               <div className="flex items-center gap-2 text-grayText text-sm mt-1">
                  <span className="font-medium bg-gray-100 px-2 py-0.5 rounded text-black">{subtitle}</span>
                  <span>•</span>
                  <span>{exercises.length} Exercises</span>
               </div>
            </div>
            <button onClick={changeWorkoutSettings} className="p-2 bg-gray-100 rounded-full text-gray-500 hover:bg-gray-200 transition-colors">
               <Settings size={20} />
            </button>
         </div>

         {/* Start Workout Card */}
         <div className="bg-black text-white rounded-[32px] p-6 shadow-xl mb-8 relative overflow-hidden">
             <div className="relative z-10">
                <h3 className="text-xl font-bold mb-2">Ready to sweat?</h3>
                <p className="text-gray-400 text-sm mb-6 max-w-[200px]">Complete this routine to stay on track with your {userProfile.goal} goal.</p>
                <button 
                   onClick={() => setActiveWorkout(true)} 
                   className="bg-white text-black px-6 py-3 rounded-xl font-bold flex items-center gap-2 hover:bg-gray-100 transition-colors"
                >
                   <PlayCircle size={20} /> Start Workout
                </button>
             </div>
             <div className="absolute right-0 bottom-0 opacity-20 transform translate-x-4 translate-y-4">
                <Timer size={140} />
             </div>
         </div>

         <h3 className="font-bold text-lg mb-4">Routine</h3>
         <div className="space-y-4">
            {exercises.map((ex, i) => (
               <div 
                  key={ex.id} 
                  onClick={() => setSelectedExercise(ex)}
                  className="bg-white p-4 rounded-[24px] flex items-center gap-4 shadow-card hover:bg-gray-50 transition-colors cursor-pointer group"
               >
                  <div className="w-12 h-12 bg-gray-100 rounded-2xl flex items-center justify-center font-bold text-gray-400 group-hover:bg-black group-hover:text-white transition-colors">
                     {i + 1}
                  </div>
                  <div className="flex-1">
                     <h4 className="font-bold text-base">{ex.name}</h4>
                     <div className="text-xs text-grayText mt-1">{ex.sets} Sets • {ex.reps}</div>
                  </div>
                  <ChevronRight size={20} className="text-gray-300" />
               </div>
            ))}
         </div>
         
         {isGym && (
            <div className="mt-8 bg-blue-50 p-4 rounded-2xl text-center">
               <p className="text-blue-800 text-sm font-medium">This is your daily suggested gym routine based on a standard Push/Pull/Legs split.</p>
            </div>
         )}
      </div>
    );
  };

  // --- MAIN RENDER ---

  if (loadingAuth) {
    return (
      <div className="min-h-screen bg-white flex flex-col items-center justify-center">
        <img src="https://www.foodieqr.com/assets/img/logo.svg" alt="Dr Foodie" className="h-16 mb-4" />
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-black"></div>
      </div>
    );
  }

  // Gate content behind Auth
  if (!currentUser) {
    return <Auth />;
  }

  if (isEditingProfile) {
    return <Onboarding onComplete={handleOnboardingComplete} initialData={userProfile} />;
  }

  if (!userProfile) {
    return <Onboarding onComplete={handleOnboardingComplete} />;
  }

  return (
    <div className="min-h-screen bg-background text-black font-sans max-w-md mx-auto relative overflow-hidden sm:border-x sm:border-gray-200">
      <input 
        type="file" 
        accept="image/*" 
        capture="environment" 
        className="hidden" 
        ref={fileInputRef} 
        onChange={handleFileSelect}
      />
      
      {/* Hidden input for progress photos */}
      <input 
        type="file" 
        accept="image/*" 
        className="hidden" 
        ref={progressFileInputRef} 
        onChange={handleProgressPhotoSelect}
      />

      {/* Main Content Area */}
      <div className="px-6 h-full overflow-y-auto min-h-screen scroll-smooth pt-4">
        {view === 'home' && renderHome()}
        {view === 'analysis' && renderAnalysis()}
        {view === 'progress' && renderProgress()}
        {view === 'workouts' && renderWorkouts()}
        {view === 'settings' && (
           <div className="pt-6 pb-32">
              <h1 className="text-2xl font-bold font-heading mb-6">Settings</h1>
              <div className="bg-white p-6 rounded-[32px] shadow-card">
                 <div className="flex items-center gap-4 mb-6 pb-6 border-b border-gray-100">
                    <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center text-2xl font-bold text-gray-400">
                       {userProfile.name.charAt(0)}
                    </div>
                    <div>
                       <h2 className="font-bold text-lg">{userProfile.name}</h2>
                       <div className="flex items-center gap-2 mt-1">
                          <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${isPremium ? 'bg-black text-white' : 'bg-gray-100 text-gray-500'}`}>
                              {isPremium ? 'PREMIUM PLAN' : 'FREE PLAN'}
                          </span>
                       </div>
                       <p className="text-sm text-grayText mt-1">{userProfile.weight}kg → {userProfile.targetWeight}kg</p>
                    </div>
                 </div>
                 
                 <button className="w-full text-left py-3 font-medium flex justify-between items-center" onClick={() => setIsEditingProfile(true)}>
                    <span className="flex items-center gap-3"><UserPen size={20} /> Edit Profile Options</span>
                    <ChevronRight size={20} className="text-gray-300" />
                 </button>

                 <button className="w-full text-left py-3 font-medium flex justify-between items-center" onClick={() => setShowPremiumModal(true)}>
                    <span className="flex items-center gap-3"><Flame size={20} /> Manage Subscription</span>
                    <ChevronRight size={20} className="text-gray-300" />
                 </button>
                 
                 <button className="w-full text-left py-3 font-medium flex justify-between items-center text-red-500" onClick={() => {
                    if(confirm("Are you sure you want to reset your profile? All data will be lost.")) {
                       localStorage.removeItem(`drfoodie_profile_${currentUser.uid}`);
                       window.location.reload();
                    }
                 }}>
                    <span className="flex items-center gap-3"><Trash2 size={20} /> Reset Profile</span>
                 </button>

                 <button className="w-full text-left py-3 font-medium flex justify-between items-center text-red-500" onClick={handleSignOut}>
                    <span className="flex items-center gap-3"><LogOut size={20} /> Sign Out</span>
                 </button>
              </div>
           </div>
        )}
      </div>

      {/* Bottom Navigation */}
      {view !== 'analysis' && (
        <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-100 pb-6 pt-2 px-6 flex justify-between items-end z-40 max-w-md mx-auto">
          <button 
            onClick={() => setView('home')}
            className={`flex flex-col items-center gap-1 w-16 ${view === 'home' ? 'text-black' : 'text-gray-400'}`}
          >
            <Home size={24} strokeWidth={view === 'home' ? 2.5 : 2} />
            <span className="text-[10px] font-medium">Home</span>
          </button>

          <button 
            onClick={() => setView('progress')}
            className={`flex flex-col items-center gap-1 w-16 ${view === 'progress' ? 'text-black' : 'text-gray-400'}`}
          >
            <BarChart2 size={24} strokeWidth={view === 'progress' ? 2.5 : 2} />
            <span className="text-[10px] font-medium">Progress</span>
          </button>

          <button 
            onClick={() => setView('workouts')}
            className={`flex flex-col items-center gap-1 w-16 ${view === 'workouts' ? 'text-black' : 'text-gray-400'}`}
          >
            <Dumbbell size={24} strokeWidth={view === 'workouts' ? 2.5 : 2} />
            <span className="text-[10px] font-medium">Workouts</span>
          </button>

          <button 
            onClick={() => setView('settings')} 
            className={`flex flex-col items-center gap-1 w-16 ${view === 'settings' ? 'text-black' : 'text-gray-400'}`}
          >
            <Settings size={24} strokeWidth={view === 'settings' ? 2.5 : 2} />
            <span className="text-[10px] font-medium">Settings</span>
          </button>
           
          {/* Scan FAB - Positioned absolutely to avoid disrupting flow */}
           <div className="absolute left-1/2 -translate-x-1/2 -top-6">
            <button 
              onClick={triggerCamera}
              className="w-14 h-14 bg-secondary rounded-full flex items-center justify-center text-white shadow-floating hover:scale-105 transition-transform border-4 border-white"
            >
              <Plus size={28} />
            </button>
          </div>
        </div>
      )}

      <PremiumModal 
        isOpen={showPremiumModal} 
        onClose={() => setShowPremiumModal(false)} 
        onUpgrade={() => {
            const updatedProfile = { ...userProfile!, isPremium: true };
            setUserProfile(updatedProfile);
            setIsPremium(true);
            if (currentUser) {
                localStorage.setItem(`drfoodie_profile_${currentUser.uid}`, JSON.stringify(updatedProfile));
            }
            setShowPremiumModal(false);
            alert("Welcome to Dr Foodie Pro! You now have unlimited scans and workouts.");
        }} 
      />
    </div>
  );
}

export default App;