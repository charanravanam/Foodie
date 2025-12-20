
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

  const handleRazorpayPayment = () => {
    setErrorMsg(null);
    setIsLoading(true);
    
    // Using the live key provided. Domain must be authorized in Razorpay dashboard.
    const options = {
      key: "rzp_live_Rp3PKVq2k7vnBq",
      amount: 4900, // ₹49 in paise
      currency: "INR",
      name: "Dr Foodie",
      description: "Pro Monthly Subscription",
      image: "https://www.foodieqr.com/assets/img/logo.svg",
      handler: function (response: any) {
        console.log("Payment successful:", response.razorpay_payment_id);
        setIsLoading(false);
        onUpgrade();
      },
      prefill: { 
        name: "", 
        email: "", 
        contact: "" 
      },
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
        console.error("Payment Error:", response.error);
        setErrorMsg(response.error.description || "Payment failed. Please try again.");
        setIsLoading(false);
      });
      rzp1.open();
    } catch (error) {
      console.error("SDK Load Error:", error);
      setErrorMsg("Razorpay gateway could not be reached. Please check your connection.");
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-lg animate-fade-in">
      <div className="bg-white rounded-[40px] w-full max-w-sm overflow-hidden relative shadow-2xl border border-white/20">
        <button 
          onClick={onClose} 
          disabled={isLoading} 
          className="absolute top-6 right-6 p-2 bg-gray-100 hover:bg-gray-200 rounded-full z-10 transition-colors"
        >
          <X size={20} className="text-gray-600" />
        </button>

        <div className="bg-black p-10 text-center text-white relative">
          <div className="absolute top-0 left-0 w-full h-full opacity-20 pointer-events-none">
            <div className="absolute top-4 left-4 w-12 h-12 bg-yellow-400 rounded-full blur-2xl"></div>
            <div className="absolute bottom-4 right-4 w-16 h-16 bg-blue-400 rounded-full blur-2xl"></div>
          </div>
          <div className="w-16 h-16 bg-white/10 rounded-full flex items-center justify-center mx-auto mb-4 backdrop-blur-md border border-white/10">
            <Crown size={32} className="text-yellow-400 fill-yellow-400" />
          </div>
          <h2 className="text-3xl font-heading font-bold mb-1 tracking-tight">Dr Foodie Pro</h2>
          <p className="opacity-60 text-xs font-bold uppercase tracking-widest">Unlimited Clinical Access</p>
        </div>

        <div className="p-8 space-y-6">
          <div className="space-y-3">
            {[
              "Unlimited AI Food Scans",
              "Weekly Health Trend Reports",
              "Smart Hydration Tracking",
              "Priority AI Metabolic Advice"
            ].map((f, i) => (
              <div key={i} className="flex items-center gap-3">
                <div className="bg-black p-1 rounded-full">
                  <Check size={10} className="text-white" />
                </div>
                <span className="text-gray-700 font-bold text-[11px] uppercase tracking-wide">{f}</span>
              </div>
            ))}
          </div>

          <div className="bg-gray-50 rounded-3xl p-6 text-center border border-gray-100">
            <div className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Monthly Plan</div>
            <div className="text-4xl font-heading font-bold">₹49<span className="text-sm text-gray-400 ml-1">/ mo</span></div>
          </div>

          <div className="space-y-3">
            <button
              onClick={handleRazorpayPayment}
              disabled={isLoading}
              className="w-full bg-black text-white py-4 rounded-2xl font-bold text-lg shadow-xl flex items-center justify-center gap-2 hover:bg-zinc-800 transition-all active:scale-95 disabled:opacity-70 disabled:active:scale-100"
            >
              {isLoading ? <Loader2 className="animate-spin" size={24} /> : "Upgrade Now"}
            </button>
            
            {errorMsg && (
              <div className="bg-red-50 p-4 rounded-2xl flex items-start gap-3 border border-red-100 animate-fade-in">
                <AlertCircle size={18} className="text-red-500 mt-0.5" />
                <div>
                  <p className="text-[11px] text-red-700 leading-tight font-bold">{errorMsg}</p>
                </div>
              </div>
            )}
          </div>
          
          <p className="text-[9px] text-center text-gray-400 font-medium px-4">
            Subscription auto-renews monthly. Secure end-to-end encrypted payments via Razorpay.
          </p>
        </div>
      </div>
    </div>
  );
};

export default PremiumModal;
