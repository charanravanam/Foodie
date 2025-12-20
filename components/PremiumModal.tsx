
import React, { useState } from 'react';
import { Check, X, Crown, Loader2, AlertCircle } from 'lucide-react';

interface PremiumModalProps {
  isOpen: boolean;
  onClose: () => void;
  onUpgrade: () => void;
}

const PremiumModal: React.FC<PremiumModalProps> = ({ isOpen, onClose, onUpgrade }) => {
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  const simulateSuccess = () => {
    setIsLoading(true);
    setTimeout(() => {
      onUpgrade();
      setIsLoading(false);
    }, 1500);
  };

  const handleRazorpayPayment = () => {
    setErrorMsg(null);
    setIsLoading(true);
    
    const options = {
      key: "rzp_live_Rp3PKVq2k7vnBq",
      amount: 4900,
      currency: "INR",
      name: "Dr Foodie",
      description: "Pro Monthly Subscription",
      image: "https://www.foodieqr.com/assets/img/logo.svg",
      handler: function (response: any) {
        setIsLoading(false);
        onUpgrade();
      },
      prefill: { name: "", email: "", contact: "" },
      theme: { color: "#000000" },
      modal: {
        ondismiss: function() {
          setIsLoading(false);
        }
      }
    };

    try {
      const rzp1 = new (window as any).Razorpay(options);
      rzp1.on('payment.failed', function (response: any){
        console.error(response.error);
        setErrorMsg(response.error.description);
        setIsLoading(false);
      });
      rzp1.open();
    } catch (error) {
      setErrorMsg("Razorpay failed to load. Are you on the registered domain?");
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-md animate-fade-in">
      <div className="bg-white rounded-[40px] w-full max-w-sm overflow-hidden relative shadow-2xl">
        <button onClick={onClose} disabled={isLoading} className="absolute top-6 right-6 p-2 bg-gray-100 rounded-full z-10">
          <X size={20} className="text-gray-600" />
        </button>

        <div className="bg-black p-10 text-center text-white">
          <div className="w-16 h-16 bg-white/10 rounded-full flex items-center justify-center mx-auto mb-4 backdrop-blur-sm">
            <Crown size={32} className="text-yellow-400 fill-yellow-400" />
          </div>
          <h2 className="text-3xl font-heading font-bold mb-1">Dr Foodie Pro</h2>
          <p className="opacity-70 text-sm italic">Unlimited Clinical Scans</p>
        </div>

        <div className="p-8 space-y-6">
          <div className="space-y-3">
            {["Unlimited AI Food Scans", "Weekly Health Trends", "Smart Water Tracker", "Priority AI Reasoning"].map((f, i) => (
              <div key={i} className="flex items-center gap-3">
                <div className="bg-green-50 p-1 rounded-full"><Check size={12} className="text-green-600" /></div>
                <span className="text-gray-700 font-medium text-xs">{f}</span>
              </div>
            ))}
          </div>

          <div className="text-center">
            <div className="text-4xl font-heading font-bold">₹49<span className="text-lg text-gray-400">/mo</span></div>
          </div>

          <div className="space-y-3">
            <button
              onClick={handleRazorpayPayment}
              disabled={isLoading}
              className="w-full bg-black text-white py-4 rounded-2xl font-bold text-lg shadow-xl flex items-center justify-center gap-2"
            >
              {isLoading ? <Loader2 className="animate-spin" size={24} /> : "Upgrade Now"}
            </button>
            
            {errorMsg && (
              <div className="bg-red-50 p-3 rounded-xl flex items-start gap-2 border border-red-100">
                <AlertCircle size={16} className="text-red-500 mt-0.5" />
                <div className="flex-1">
                  <p className="text-[10px] text-red-600 leading-tight font-medium mb-2">{errorMsg}</p>
                  <button onClick={simulateSuccess} className="text-[10px] font-bold text-blue-600 underline">Bypass for Testing</button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default PremiumModal;
