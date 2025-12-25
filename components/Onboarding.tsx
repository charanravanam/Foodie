
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
  
  const [name, setName] = useState(initialData?.name || '');
  const [age, setAge] = useState<string>(initialData?.age?.toString() || '25');
  const [gender, setGender] = useState<Gender>(initialData?.gender || Gender.MALE);
  const [heightUnit, setHeightUnit] = useState<'cm' | 'ft'>('cm');
  const [heightCM, setHeightCM] = useState<string>(initialData?.height?.toString() || '175');
  const [heightFt, setHeightFt] = useState<string>('5');
  const [heightIn, setHeightIn] = useState<string>('9');
  const [weight, setWeight] = useState<number>(initialData?.weight || 70);
  const [targetWeight, setTargetWeight] = useState<number>(initialData?.targetWeight || 65);
  const [goal, setGoal] = useState<Goal>(initialData?.goal || Goal.LOSE_WEIGHT);
  const [durationWeeks, setDurationWeeks] = useState<number>(initialData?.durationWeeks || 12);

  const isUpdateMode = !!initialData;

  const syncFtInToCM = (ft: string, inc: string) => {
    const totalInches = (parseFloat(ft) || 0) * 12 + (parseFloat(inc) || 0);
    setHeightCM(Math.round(totalInches * 2.54).toString());
  };

  const syncCMToFtIn = (cmValue: string) => {
    const realInches = (parseFloat(cmValue) || 0) / 2.54;
    setHeightFt(Math.floor(realInches / 12).toString());
    setHeightIn(Math.round(realInches % 12).toString());
  };

  useEffect(() => {
    let timer: number;
    if (step === 4 && countdown > 0) {
      timer = window.setInterval(() => setCountdown(prev => prev - 1), 1000);
    }
    return () => clearInterval(timer);
  }, [step, countdown]);

  // Fix: Added getSummaryMessage to generate the summary text for the final onboarding step
  const getSummaryMessage = () => {
    const change = targetWeight - weight;
    const direction = change > 0 ? "gain" : "lose";
    const absChange = Math.abs(change);
    
    return `
      <b>Target Acquired:</b> ${name || 'Agent'}, we've mapped your trajectory.<br/><br/>
      To ${direction} <b>${absChange}kg</b> and reach <b>${targetWeight}kg</b>, your primary focus is <b>${goal}</b>. 
      Over the next <b>${durationWeeks} weeks</b>, our clinical AI will monitor every metabolic node to ensure peak efficiency. 
      Establishing connection in 3... 2... 1...
    `;
  };

  const handleNext = () => {
    if (step < 4) {
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
        referralCode: initialData?.referralCode || ''
      });
    }
  };

  const handleBack = () => {
    if (step > 1) setStep(step - 1);
    else if (onBack) onBack();
  };

  return (
    <div className="min-h-screen bg-[#F2F2F7] flex flex-col items-center justify-center p-5 text-slate-800 font-sans">
      <div className="w-full max-w-md space-y-4 animate-fade-in">
        <div className="flex items-center justify-between px-1">
          {(step > 1 || isUpdateMode) && (
            <button onClick={handleBack} className="p-3 bg-white rounded-2xl shadow-card active:scale-95 transition-all">
              <ArrowLeft size={18} className="text-black" />
            </button>
          )}
          <div className="flex-1 text-center">
             <div className="w-10 h-10 bg-black rounded-xl flex items-center justify-center mx-auto mb-1.5 shadow-lg">
                <Zap className="text-white fill-white" size={20} />
             </div>
             <h1 className="text-lg font-black tracking-tight uppercase">Dr Foodie</h1>
          </div>
          <div className="w-10" />
        </div>

        <div className="bg-white rounded-[32px] p-6 shadow-card border border-gray-100 min-h-[450px] flex flex-col">
          {step === 1 && (
            <div className="space-y-5 animate-fade-in flex-1">
              <h2 className="text-xl font-black tracking-tight flex items-center gap-2"><User className="text-black" size={20} /> Profile</h2>
              <div className="space-y-3">
                <div>
                  <label className="block text-[8px] font-black uppercase text-gray-400 mb-1 tracking-widest px-1">First Name</label>
                  <input type="text" value={name} onChange={(e) => setName(e.target.value)} className="w-full p-4 rounded-xl bg-gray-50 border-none font-bold text-sm shadow-inner" placeholder="e.g. Alex" />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[8px] font-black uppercase text-gray-400 mb-1 tracking-widest px-1">Age</label>
                    <input type="text" inputMode="numeric" value={age} onChange={(e) => setAge(e.target.value.replace(/\D/g, ''))} className="w-full p-4 rounded-xl bg-gray-50 border-none font-bold text-sm shadow-inner" />
                  </div>
                  <div>
                    <label className="block text-[8px] font-black uppercase text-gray-400 mb-1 tracking-widest px-1">Gender</label>
                    <select value={gender} onChange={(e) => setGender(e.target.value as Gender)} className="w-full p-4 rounded-xl bg-gray-50 border-none font-bold text-sm shadow-inner appearance-none">
                      {Object.values(Gender).map(g => <option key={g} value={g}>{g}</option>)}
                    </select>
                  </div>
                </div>
                <div className="space-y-2 pt-1">
                  <div className="flex justify-between items-center px-1">
                    <label className="text-[8px] font-black uppercase text-gray-400 tracking-widest">Height</label>
                    <div className="flex bg-gray-100 p-0.5 rounded-lg">
                      <button onClick={() => setHeightUnit('cm')} className={`px-2 py-0.5 text-[8px] font-black uppercase rounded-md ${heightUnit === 'cm' ? 'bg-black text-white' : 'text-gray-400'}`}>CM</button>
                      <button onClick={() => setHeightUnit('ft')} className={`px-2 py-0.5 text-[8px] font-black uppercase rounded-md ${heightUnit === 'ft' ? 'bg-black text-white' : 'text-gray-400'}`}>FT/IN</button>
                    </div>
                  </div>
                  {heightUnit === 'cm' ? (
                    <input type="text" inputMode="numeric" value={heightCM} onChange={(e) => { const v = e.target.value.replace(/\D/g, ''); setHeightCM(v); syncCMToFtIn(v); }} className="w-full p-4 rounded-xl bg-gray-50 border-none font-bold text-sm shadow-inner" placeholder="CM" />
                  ) : (
                    <div className="flex gap-2">
                      <input type="text" inputMode="numeric" value={heightFt} onChange={(e) => { const v = e.target.value.replace(/\D/g, ''); setHeightFt(v); syncFtInToCM(v, heightIn); }} className="w-full p-4 rounded-xl bg-gray-50 border-none font-bold text-sm shadow-inner" placeholder="FT" />
                      <input type="text" inputMode="numeric" value={heightIn} onChange={(e) => { const v = e.target.value.replace(/\D/g, ''); setHeightIn(v); syncFtInToCM(heightFt, v); }} className="w-full p-4 rounded-xl bg-gray-50 border-none font-bold text-sm shadow-inner" placeholder="IN" />
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-4 animate-fade-in flex-1">
              <h2 className="text-xl font-black tracking-tight flex items-center gap-2"><Target className="text-black" size={20} /> Objective</h2>
              <div className="grid grid-cols-1 gap-2">
                {Object.values(Goal).map((g) => (
                  <button key={g} onClick={() => setGoal(g)} className={`p-5 rounded-2xl text-left font-bold transition-all flex justify-between items-center ${goal === g ? 'bg-black text-white' : 'bg-gray-50 text-gray-500'}`}>
                    <span className="text-sm">{g}</span>
                    {goal === g && <Check size={14} />}
                  </button>
                ))}
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-5 animate-fade-in flex-1">
              <h2 className="text-xl font-black tracking-tight flex items-center gap-2"><Scale className="text-black" size={20} /> Targets</h2>
              <div className="space-y-4">
                <div className="bg-gray-50 p-5 rounded-2xl border border-gray-100 text-center">
                  <label className="text-[8px] font-black uppercase text-gray-400 mb-2 block tracking-widest">Weight (KGS)</label>
                  <div className="flex items-center justify-center gap-6">
                    <button onClick={() => setWeight(Math.max(30, weight - 1))} className="w-10 h-10 rounded-xl bg-white shadow-sm font-black">-</button>
                    <span className="text-4xl font-black tracking-tighter">{weight}</span>
                    <button onClick={() => setWeight(weight + 1)} className="w-10 h-10 rounded-xl bg-white shadow-sm font-black">+</button>
                  </div>
                </div>
                {goal !== Goal.MAINTAIN && (
                  <div className="bg-black text-white p-5 rounded-2xl shadow-xl text-center">
                    <label className="text-[8px] font-black uppercase text-gray-500 mb-2 block tracking-widest">Target Weight</label>
                    <div className="flex items-center justify-center gap-6">
                      <button onClick={() => setTargetWeight(Math.max(30, targetWeight - 1))} className="w-10 h-10 rounded-xl bg-white/10 font-black">-</button>
                      <span className="text-4xl font-black tracking-tighter">{targetWeight}</span>
                      <button onClick={() => setTargetWeight(targetWeight + 1)} className="w-10 h-10 rounded-xl bg-white/10 font-black">+</button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {step === 4 && (
            <div className="space-y-6 animate-fade-in flex flex-col flex-1 py-2">
              <div className="text-center">
                <div className="w-14 h-14 bg-green-50 rounded-full flex items-center justify-center mx-auto mb-3">
                  <Check className="text-green-500" size={28} strokeWidth={3} />
                </div>
                <h2 className="text-2xl font-black tracking-tight">Final Plan</h2>
              </div>
              <div className="bg-gray-50 p-6 rounded-[24px] border border-gray-100 flex-1 flex items-center justify-center">
                <p className="text-xs font-medium text-center text-gray-600 leading-relaxed" dangerouslySetInnerHTML={{ __html: getSummaryMessage() }} />
              </div>
            </div>
          )}

          <div className="mt-6 space-y-2">
            <button onClick={handleNext} disabled={step === 1 && (!name || !heightCM || !age)} className="w-full bg-black text-white py-4 rounded-[20px] font-black text-sm shadow-xl active:scale-95 transition-all flex items-center justify-center gap-2 disabled:opacity-40">
              {step === 4 ? (countdown > 0 ? `Read Carefully (${countdown}s)` : "Confirm Node") : "Continue"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Onboarding;
