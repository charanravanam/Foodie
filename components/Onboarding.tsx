
import React, { useState, useEffect } from 'react';
import { Goal, UserProfile, Gender } from '../types';
import { ChevronRight, User, Scale, Clock, Target } from 'lucide-react';

interface OnboardingProps {
  onComplete: (profile: UserProfile) => void;
  initialData?: UserProfile | null;
}

const Onboarding: React.FC<OnboardingProps> = ({ onComplete, initialData }) => {
  const [step, setStep] = useState(1);
  
  // State - using strings for numeric inputs to allow clearing and prevent leading zeros
  const [name, setName] = useState(initialData?.name || '');
  const [age, setAge] = useState<string>(initialData?.age?.toString() || '25');
  const [gender, setGender] = useState<Gender>(initialData?.gender || Gender.MALE);
  const [height, setHeight] = useState<string>(initialData?.height?.toString() || '175');
  
  const [weight, setWeight] = useState<number>(initialData?.weight || 70);
  const [targetWeight, setTargetWeight] = useState<number>(initialData?.targetWeight || 65);
  
  const [goal, setGoal] = useState<Goal>(initialData?.goal || Goal.LOSE_WEIGHT);
  const [durationWeeks, setDurationWeeks] = useState<number>(initialData?.durationWeeks || 12);

  // Sync validation when Current Weight or Goal changes
  useEffect(() => {
    if (goal === Goal.LOSE_WEIGHT) {
      if (targetWeight >= weight) setTargetWeight(weight - 1);
    } else if (goal === Goal.GAIN_WEIGHT) {
      if (targetWeight <= weight) setTargetWeight(weight + 1);
    } else if (goal === Goal.MAINTAIN) {
      if (targetWeight !== weight) setTargetWeight(weight);
    }
  }, [weight, goal]);

  const handleNext = () => {
    if (step < 3) {
      setStep(step + 1);
    } else {
      onComplete({
        name,
        age: parseInt(age) || 0,
        gender,
        height: parseInt(height) || 0,
        weight,
        targetWeight,
        goal,
        durationWeeks,
        isOnboarded: true,
        progressPhotos: initialData?.progressPhotos || []
      });
    }
  };

  const adjustTargetWeight = (increment: number) => {
    const newWeight = targetWeight + increment;
    if (goal === Goal.LOSE_WEIGHT && newWeight >= weight) return;
    if (goal === Goal.GAIN_WEIGHT && newWeight <= weight) return;
    if (goal === Goal.MAINTAIN) return;
    setTargetWeight(newWeight);
  };

  // Improved numeric input handler to solve "stuck 0" and leading zero issues
  const handleNumericInput = (val: string, setter: (s: string) => void) => {
    if (val === '') {
      setter('');
      return;
    }
    // Remove leading zeros
    const cleaned = val.replace(/^0+/, '');
    // If it was just '0', keep it, otherwise use cleaned
    setter(cleaned === '' && val !== '' ? '0' : cleaned);
  };

  return (
    <div className="min-h-screen bg-white flex flex-col items-center justify-center p-6 text-slate-800 font-sans">
      <div className="w-full max-w-md space-y-8">
        <div className="text-center">
          <img src="https://www.foodieqr.com/assets/img/logo.svg" alt="Dr Foodie" className="h-16 mx-auto mb-4" />
          <p className="text-gray-500">Your Personal Nutrition AI</p>
        </div>

        <div className="w-full bg-gray-100 h-2 rounded-full overflow-hidden">
          <div 
            className="bg-black h-full transition-all duration-300 ease-in-out" 
            style={{ width: `${(step / 3) * 100}%` }}
          />
        </div>

        <div className="bg-white rounded-[32px] p-8 shadow-card border border-gray-100 min-h-[450px] flex flex-col justify-between">
          {step === 1 && (
            <div className="space-y-6 animate-fade-in">
              <h2 className="text-2xl font-heading font-bold flex items-center gap-2">
                <User className="text-black" size={24} /> About You
              </h2>
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">First Name</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full p-4 rounded-xl bg-gray-50 border-none focus:ring-2 focus:ring-black focus:outline-none font-medium"
                  placeholder="e.g. Alex"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">Age</label>
                  <input
                    type="text"
                    inputMode="numeric"
                    value={age}
                    onChange={(e) => handleNumericInput(e.target.value, setAge)}
                    className="w-full p-4 rounded-xl bg-gray-50 border-none focus:ring-2 focus:ring-black focus:outline-none font-medium"
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">Gender</label>
                  <select 
                    value={gender}
                    onChange={(e) => setGender(e.target.value as Gender)}
                    className="w-full p-4 rounded-xl bg-gray-50 border-none focus:ring-2 focus:ring-black focus:outline-none font-medium appearance-none"
                  >
                    {Object.values(Gender).map(g => (
                      <option key={g} value={g}>{g}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">Height (cm)</label>
                <input
                  type="text"
                  inputMode="numeric"
                  value={height}
                  onChange={(e) => handleNumericInput(e.target.value, setHeight)}
                  className="w-full p-4 rounded-xl bg-gray-50 border-none focus:ring-2 focus:ring-black focus:outline-none font-medium"
                  placeholder="175"
                />
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-6 animate-fade-in">
              <h2 className="text-2xl font-heading font-bold flex items-center gap-2">
                <Target className="text-black" size={24} /> The Plan
              </h2>
              <p className="text-gray-500 text-sm">What is your primary objective?</p>
              <div className="grid grid-cols-1 gap-3">
                {Object.values(Goal).map((g) => (
                  <button
                    key={g}
                    onClick={() => setGoal(g)}
                    className={`p-5 rounded-xl text-left font-semibold transition-all flex justify-between items-center ${
                      goal === g 
                        ? 'bg-black text-white shadow-lg' 
                        : 'bg-gray-50 text-gray-600 hover:bg-gray-100'
                    }`}
                  >
                    <span>{g}</span>
                    {goal === g && <ChevronRight size={16} />}
                  </button>
                ))}
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-6 animate-fade-in">
              <h2 className="text-2xl font-heading font-bold flex items-center gap-2">
                <Scale className="text-black" size={24} /> Goals & Timeline
              </h2>
              <div className="space-y-4">
                <div className="bg-gray-50 p-4 rounded-2xl">
                  <label className="block text-sm font-bold text-gray-700 mb-2 text-center">Current Weight (kg)</label>
                  <div className="flex items-center justify-center gap-4">
                    <button onClick={() => setWeight(Math.max(30, weight - 1))} className="w-8 h-8 rounded-full bg-white shadow-sm font-bold text-lg hover:bg-gray-100 transition-colors">-</button>
                    <span className="text-3xl font-heading font-bold w-20 text-center">{weight}</span>
                    <button onClick={() => setWeight(weight + 1)} className="w-8 h-8 rounded-full bg-white shadow-sm font-bold text-lg hover:bg-gray-100 transition-colors">+</button>
                  </div>
                </div>
                <div className={`p-4 rounded-2xl transition-all ${goal === Goal.MAINTAIN ? 'bg-gray-100 opacity-70 cursor-not-allowed' : 'bg-black text-white'}`}>
                    <label className={`block text-sm font-bold mb-2 text-center ${goal === Goal.MAINTAIN ? 'text-gray-500' : 'text-gray-300'}`}>Target Weight (kg)</label>
                    <div className="flex items-center justify-center gap-4">
                      {goal === Goal.MAINTAIN ? (
                         <span className="text-3xl font-heading font-bold w-20 text-center text-gray-500">{targetWeight}</span>
                      ) : (
                        <>
                          <button onClick={() => adjustTargetWeight(-1)} className="w-8 h-8 rounded-full bg-white/20 hover:bg-white/30 text-white font-bold text-lg disabled:opacity-30">-</button>
                          <span className="text-3xl font-heading font-bold w-20 text-center">{targetWeight}</span>
                          <button onClick={() => adjustTargetWeight(1)} className="w-8 h-8 rounded-full bg-white/20 hover:bg-white/30 text-white font-bold text-lg disabled:opacity-30">+</button>
                        </>
                      )}
                    </div>
                </div>
              </div>
              <div className="pt-2">
                <div className="flex justify-between items-center mb-2">
                  <label className="block text-sm font-bold text-gray-700">Timeline</label>
                  <span className="text-sm font-bold text-primary bg-primary/10 px-2 py-1 rounded">{durationWeeks} Weeks</span>
                </div>
                <input 
                  type="range" 
                  min="4" max="52" step="1"
                  value={durationWeeks}
                  onChange={(e) => setDurationWeeks(Number(e.target.value))}
                  className="w-full accent-black h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                />
              </div>
            </div>
          )}

          <button
            onClick={handleNext}
            disabled={step === 1 && (!name || age === '')}
            className="w-full mt-auto bg-black text-white py-4 px-6 rounded-2xl font-bold text-lg hover:scale-[1.02] transition-transform flex items-center justify-center gap-2 disabled:opacity-50 shadow-xl"
          >
            {step === 3 ? (initialData ? "Save Changes" : "Start My Journey") : "Next Step"} <ChevronRight size={20} />
          </button>
        </div>
      </div>
    </div>
  );
};

export default Onboarding;
