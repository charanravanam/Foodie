
import React, { useState, useEffect } from 'react';
import { Goal, UserProfile, Gender } from '../types';
import { ChevronRight, User, Scale, Edit2, Zap, ArrowLeft, Check, Target } from 'lucide-react';

interface OnboardingProps {
  onComplete: (profile: UserProfile) => void;
  onBack?: () => void;
  initialData?: UserProfile | null;
}

const Onboarding: React.FC<OnboardingProps> = ({ onComplete, onBack, initialData }) => {
  const [step, setStep] = useState(1);
  const [countdown, setCountdown] = useState(5);
  
  // Basic Info
  const [name, setName] = useState(initialData?.name || '');
  const [age, setAge] = useState<string>(initialData?.age?.toString() || '25');
  const [gender, setGender] = useState<Gender>(initialData?.gender || Gender.MALE);
  
  // Height Logic
  const [heightUnit, setHeightUnit] = useState<'cm' | 'ft'>('cm');
  const [heightCM, setHeightCM] = useState<string>(initialData?.height?.toString() || '175');
  const [heightFt, setHeightFt] = useState<string>('5');
  const [heightIn, setHeightIn] = useState<string>('9');
  
  // Weight Logic
  const [weight, setWeight] = useState<number>(initialData?.weight || 70);
  const [targetWeight, setTargetWeight] = useState<number>(initialData?.targetWeight || 65);
  
  // Goals
  const [goal, setGoal] = useState<Goal>(initialData?.goal || Goal.LOSE_WEIGHT);
  const [durationWeeks, setDurationWeeks] = useState<number>(initialData?.durationWeeks || 12);

  const isUpdateMode = !!initialData;

  const syncFtInToCM = (ft: string, inc: string) => {
    const f = parseFloat(ft) || 0;
    const i = parseFloat(inc) || 0;
    const totalInches = (f * 12) + i;
    const cm = Math.round(totalInches * 2.54);
    setHeightCM(cm.toString());
  };

  const syncCMToFtIn = (cmValue: string) => {
    const cm = parseFloat(cmValue) || 0;
    const realInches = cm / 2.54;
    const ft = Math.floor(realInches / 12);
    const inc = Math.round(realInches % 12);
    setHeightFt(ft.toString());
    setHeightIn(inc.toString());
  };

  useEffect(() => {
    let timer: number;
    if (step === 4 && countdown > 0) {
      timer = window.setInterval(() => {
        setCountdown(prev => prev - 1);
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [step, countdown]);

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
    if (step < 4) {
      if (step === 3) setCountdown(5);
      setStep(step + 1);
    } else {
      onComplete({
        name,
        age: parseInt(age) || 0,
        gender,
        height: parseInt(heightCM) || 0,
        weight,
        targetWeight,
        goal,
        durationWeeks,
        isOnboarded: true,
        progressPhotos: initialData?.progressPhotos || [],
        referralCode: initialData?.referralCode || ''
      });
    }
  };

  const handleBack = () => {
    if (step > 1) {
      setStep(step - 1);
    } else if (onBack) {
      onBack();
    }
  };

  const handleNumericInput = (val: string, setter: (s: string) => void, syncFn?: (v: string) => void) => {
    const cleaned = val.replace(/[^0-9.]/g, '').replace(/^0+/, '');
    const final = cleaned === '' && val !== '' ? '0' : cleaned;
    setter(final);
    if (syncFn) syncFn(final);
  };

  const getSummaryMessage = () => {
    const base = `You want to <span class="text-black font-black underline decoration-black/10 underline-offset-4">${goal.toLowerCase()}</span>. Your current weight is <span class="text-black font-black">${weight}kgs</span>`;
    if (goal === Goal.LOSE_WEIGHT) return `${base} and plan to reach <span class="text-black font-black">${targetWeight}kgs</span> in <span class="text-black font-black">${durationWeeks} weeks</span>.`;
    if (goal === Goal.GAIN_WEIGHT) return `${base} and plan to reach <span class="text-black font-black">${targetWeight}kgs</span> in <span class="text-black font-black">${durationWeeks} weeks</span>.`;
    return `${base} and plan to stay here for <span class="text-black font-black">${durationWeeks} weeks</span>.`;
  };

  return (
    <div className="min-h-screen bg-[#F2F2F7] flex flex-col items-center justify-center p-6 text-slate-800 font-sans">
      <div className="w-full max-w-md space-y-6 animate-fade-in">
        <div className="flex items-center justify-between px-2">
          {(step > 1 || isUpdateMode) && (
            <button onClick={handleBack} className="p-4 bg-white rounded-2xl shadow-card active:scale-95 transition-all">
              <ArrowLeft size={20} className="text-black" />
            </button>
          )}
          <div className="flex-1 text-center">
             <div className="w-12 h-12 bg-black rounded-2xl flex items-center justify-center mx-auto mb-2 shadow-lg">
                <Zap className="text-white fill-white" size={24} />
             </div>
             <h1 className="text-xl font-black tracking-tight">Dr Foodie</h1>
          </div>
          <div className="w-12" /> {/* Spacer */}
        </div>

        {step < 4 && (
          <div className="w-full bg-gray-200 h-1.5 rounded-full overflow-hidden">
            <div className="bg-black h-full transition-all duration-500 ease-out" style={{ width: `${(step / 4) * 100}%` }} />
          </div>
        )}

        <div className="bg-white rounded-[40px] p-8 shadow-card border border-gray-100 min-h-[500px] flex flex-col relative overflow-hidden">
          {step === 1 && (
            <div className="space-y-6 animate-fade-in flex-1">
              <h2 className="text-2xl font-black tracking-tight flex items-center gap-2"><User className="text-black" size={24} /> Profile</h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-[10px] font-black uppercase text-gray-400 mb-2 tracking-widest px-1">First Name</label>
                  <input type="text" value={name} onChange={(e) => setName(e.target.value)} className="w-full p-5 rounded-2xl bg-gray-50 border-none focus:ring-2 focus:ring-black font-bold shadow-inner" placeholder="e.g. Alex" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] font-black uppercase text-gray-400 mb-2 tracking-widest px-1">Age</label>
                    <input type="text" inputMode="numeric" value={age} onChange={(e) => handleNumericInput(e.target.value, setAge)} className="w-full p-5 rounded-2xl bg-gray-50 border-none focus:ring-2 focus:ring-black font-bold shadow-inner" />
                  </div>
                  <div>
                    <label className="block text-[10px] font-black uppercase text-gray-400 mb-2 tracking-widest px-1">Gender</label>
                    <select value={gender} onChange={(e) => setGender(e.target.value as Gender)} className="w-full p-5 rounded-2xl bg-gray-50 border-none focus:ring-2 focus:ring-black font-bold appearance-none shadow-inner">
                      {Object.values(Gender).map(g => <option key={g} value={g}>{g}</option>)}
                    </select>
                  </div>
                </div>
                <div className="space-y-3 pt-2">
                  <div className="flex justify-between items-center px-1">
                    <label className="text-[10px] font-black uppercase text-gray-400 tracking-widest">Height</label>
                    <div className="flex bg-gray-100 p-1 rounded-xl">
                      <button onClick={() => setHeightUnit('cm')} className={`px-3 py-1 text-[9px] font-black uppercase rounded-lg transition-all ${heightUnit === 'cm' ? 'bg-black text-white' : 'text-gray-400'}`}>CM</button>
                      <button onClick={() => setHeightUnit('ft')} className={`px-3 py-1 text-[9px] font-black uppercase rounded-lg transition-all ${heightUnit === 'ft' ? 'bg-black text-white' : 'text-gray-400'}`}>FT/IN</button>
                    </div>
                  </div>
                  {heightUnit === 'cm' ? (
                    <div className="relative animate-fade-in">
                      <input type="text" inputMode="numeric" value={heightCM} onChange={(e) => handleNumericInput(e.target.value, setHeightCM, syncCMToFtIn)} className="w-full p-5 rounded-2xl bg-gray-50 border-none focus:ring-2 focus:ring-black font-bold shadow-inner pr-12" placeholder="Height in CM" />
                      <span className="absolute right-4 top-1/2 -translate-y-1/2 text-[10px] font-black text-gray-300 uppercase">CM</span>
                    </div>
                  ) : (
                    <div className="flex gap-3 animate-fade-in">
                      <div className="relative flex-1">
                        <input type="text" inputMode="numeric" value={heightFt} onChange={(e) => handleNumericInput(e.target.value, setHeightFt, (v) => syncFtInToCM(v, heightIn))} className="w-full p-5 rounded-2xl bg-gray-50 border-none focus:ring-2 focus:ring-black font-bold shadow-inner pr-10" placeholder="FT" />
                        <span className="absolute right-4 top-1/2 -translate-y-1/2 text-[10px] font-black text-gray-300 uppercase">FT</span>
                      </div>
                      <div className="relative flex-1">
                        <input type="text" inputMode="numeric" value={heightIn} onChange={(e) => handleNumericInput(e.target.value, setHeightIn, (v) => syncFtInToCM(heightFt, v))} className="w-full p-5 rounded-2xl bg-gray-50 border-none focus:ring-2 focus:ring-black font-bold shadow-inner pr-10" placeholder="IN" />
                        <span className="absolute right-4 top-1/2 -translate-y-1/2 text-[10px] font-black text-gray-300 uppercase">IN</span>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-6 animate-fade-in flex-1">
              <h2 className="text-2xl font-black tracking-tight flex items-center gap-2"><Target className="text-black" size={24} /> Objective</h2>
              <div className="grid grid-cols-1 gap-3">
                {Object.values(Goal).map((g) => (
                  <button key={g} onClick={() => setGoal(g)} className={`p-6 rounded-3xl text-left font-bold transition-all flex justify-between items-center group ${goal === g ? 'bg-black text-white shadow-xl scale-[1.02]' : 'bg-gray-50 text-gray-500 hover:bg-gray-100'}`}>
                    <span className="text-lg tracking-tight">{g}</span>
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center transition-colors ${goal === g ? 'bg-white/20' : 'bg-gray-200 group-hover:bg-gray-300'}`}>
                      {goal === g ? <Check size={16} /> : <ChevronRight size={16} />}
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-6 animate-fade-in flex-1">
              <h2 className="text-2xl font-black tracking-tight flex items-center gap-2"><Scale className="text-black" size={24} /> Targets</h2>
              <div className="space-y-5">
                <div className="bg-gray-50 p-6 rounded-[32px] border border-gray-100">
                  <label className="block text-[10px] font-black uppercase text-gray-400 mb-4 text-center tracking-widest">Current Weight</label>
                  <div className="flex items-center justify-center gap-8">
                    <button onClick={() => setWeight(Math.max(30, weight - 1))} className="w-12 h-12 rounded-2xl bg-white shadow-sm font-black text-xl hover:bg-gray-100 active:scale-90 transition-all">-</button>
                    <div className="flex flex-col items-center"><span className="text-5xl font-black tracking-tighter">{weight}</span><span className="text-[10px] font-black text-gray-300 uppercase">KGS</span></div>
                    <button onClick={() => setWeight(weight + 1)} className="w-12 h-12 rounded-2xl bg-white shadow-sm font-black text-xl hover:bg-gray-100 active:scale-90 transition-all">+</button>
                  </div>
                </div>
                {goal !== Goal.MAINTAIN && (
                  <div className="bg-black text-white p-6 rounded-[32px] shadow-2xl relative overflow-hidden">
                    <div className="absolute top-0 right-0 p-4 opacity-10"><Target size={80}/></div>
                    <label className="block text-[10px] font-black uppercase text-gray-500 mb-4 text-center tracking-widest relative z-10">Target Weight</label>
                    <div className="flex items-center justify-center gap-8 relative z-10">
                      <button onClick={() => setTargetWeight(Math.max(30, targetWeight - 1))} className="w-12 h-12 rounded-2xl bg-white/10 font-black text-xl hover:bg-white/20 active:scale-90 transition-all">-</button>
                      <div className="flex flex-col items-center"><span className="text-5xl font-black tracking-tighter">{targetWeight}</span><span className="text-[10px] font-black text-white/30 uppercase">KGS</span></div>
                      <button onClick={() => setTargetWeight(targetWeight + 1)} className="w-12 h-12 rounded-2xl bg-white/10 font-black text-xl hover:bg-white/20 active:scale-90 transition-all">+</button>
                    </div>
                  </div>
                )}
                <div className="bg-gray-50 p-6 rounded-[32px] border border-gray-100">
                  <div className="flex justify-between items-center mb-4">
                    <label className="text-[10px] font-black uppercase text-gray-400 tracking-widest">Timeline</label>
                    <div className="bg-black text-white px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider">{durationWeeks} Weeks</div>
                  </div>
                  <input type="range" min="4" max="52" step="1" value={durationWeeks} onChange={(e) => setDurationWeeks(Number(e.target.value))} className="w-full accent-black h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer" />
                </div>
              </div>
            </div>
          )}

          {step === 4 && (
            <div className="space-y-8 animate-fade-in flex flex-col flex-1 py-4">
              <div className="text-center">
                <div className="w-20 h-20 bg-green-50 rounded-full flex items-center justify-center mx-auto mb-4 border-4 border-white shadow-xl">
                  <Check className="text-green-500" size={40} strokeWidth={3} />
                </div>
                <h2 className="text-3xl font-black tracking-tight mb-1">Your Plan</h2>
                <p className="text-gray-400 text-[10px] font-black uppercase tracking-widest">Summary & Confirmation</p>
              </div>
              <div className="bg-gray-50 p-8 rounded-[40px] border border-gray-100 space-y-6 relative group transition-all">
                <p className="text-gray-600 font-medium leading-relaxed text-center italic" dangerouslySetInnerHTML={{ __html: getSummaryMessage() }} />
              </div>
              <div className="space-y-3 mt-auto">
                <button onClick={handleNext} disabled={countdown > 0} className={`w-full py-6 rounded-[32px] font-black text-xl shadow-2xl flex items-center justify-center gap-3 transition-all relative overflow-hidden ${countdown > 0 ? 'bg-gray-200 text-gray-400' : 'bg-black text-white active:scale-95'}`}>
                  {countdown > 0 && <div className="absolute inset-0 bg-black/5" style={{ width: `${((5 - countdown) / 5) * 100}%`, transition: 'width 1s linear' }} />}
                  <span className="relative z-10">{countdown > 0 ? `Please Read (${countdown}s)` : (isUpdateMode ? "Commit Updates" : "Yeahh, that's right!")}</span>
                </button>
                <button onClick={() => setStep(1)} className="w-full py-4 rounded-[24px] font-black text-[10px] uppercase tracking-widest text-gray-400 hover:text-black flex items-center justify-center gap-2 transition-colors">
                  <Edit2 size={12}/> Edit choices
                </button>
              </div>
            </div>
          )}

          {step < 4 && (
            <button onClick={handleNext} disabled={step === 1 && (!name || heightCM === '' || age === '')} className="w-full mt-auto bg-black text-white py-5 px-6 rounded-[32px] font-black text-lg hover:bg-zinc-800 transition-all flex items-center justify-center gap-2 disabled:opacity-50 shadow-2xl">
              Continue <ChevronRight size={22} />
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default Onboarding;
