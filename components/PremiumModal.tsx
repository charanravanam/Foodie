import React, { useState } from 'react';
import { Check, X, Crown, Loader2 } from 'lucide-react';

interface PremiumModalProps {
  isOpen: boolean;
  onClose: () => void;
  onUpgrade: () => void;
}

declare global {
  interface Window {
    Razorpay: any;
  }
}

const PremiumModal: React.FC<PremiumModalProps> = ({ isOpen, onClose, onUpgrade }) => {
  const [isLoading, setIsLoading] = useState(false);

  if (!isOpen) return null;

  const handleRazorpayPayment = () => {
    setIsLoading(true);
    
    const options = {
      key: "rzp_live_Rp3PKVq2k7vnBq",
      amount: 4900, // ₹49.00
      currency: "INR",
      name: "Dr Foodie",
      description: "Pro Monthly Subscription",
      image: "https://www.foodieqr.com/assets/img/logo.svg",
      handler: function (response: any) {
        setIsLoading(false);
        onUpgrade();
      },
      prefill: {
        name: "",
        email: "",
        contact: ""
      },
      theme: {
        color: "#000000"
      },
      modal: {
        ondismiss: function() {
          setIsLoading(false);
        }
      }
    };

    try {
      const rzp1 = new window.Razorpay(options);
      rzp1.on('payment.failed', function (response: any){
        alert("Payment Failed: " + response.error.description);
        setIsLoading(false);
      });
      rzp1.open();
    } catch (error) {
      console.error("Razorpay Error:", error);
      alert("Payment gateway unavailable. Please try again later.");
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-md animate-fade-in">
      <div className="bg-white rounded-[40px] w-full max-w-sm overflow-hidden relative shadow-2xl">
        <button 
          onClick={onClose}
          disabled={isLoading}
          className="absolute top-6 right-6 p-2 bg-gray-100 rounded-full hover:bg-gray-200 transition-colors z-10"
        >
          <X size={20} className="text-gray-600" />
        </button>

        <div className="bg-gradient-to-br from-black via-gray-900 to-gray-800 p-10 text-center text-white">
          <div className="w-16 h-16 bg-white/10 rounded-full flex items-center justify-center mx-auto mb-4 backdrop-blur-sm">
            <Crown size={32} className="text-yellow-400 fill-yellow-400" />
          </div>
          <h2 className="text-3xl font-heading font-bold mb-1">Dr Foodie Pro</h2>
          <p className="opacity-70 text-sm">Elevate Your Nutrition Journey</p>
        </div>

        <div className="p-8 space-y-6">
          <div className="space-y-4">
            {[
              "Unlimited Food Scans",
              "AI Personalized Workout Plans",
              "Deep Body Metric Insights",
              "Priority Support",
              "No Advertisements"
            ].map((feature, i) => (
              <div key={i} className="flex items-center gap-3">
                <div className="bg-green-50 p-1 rounded-full">
                  <Check size={14} className="text-green-600" />
                </div>
                <span className="text-gray-700 font-medium text-sm">{feature}</span>
              </div>
            ))}
          </div>

          <div className="text-center pt-2">
            <div className="text-4xl font-heading font-bold text-black">₹49<span className="text-lg text-gray-400 font-medium"> / mo</span></div>
            <p className="text-xs text-gray-400 mt-1 uppercase tracking-widest font-bold">Cancel Anytime</p>
          </div>

          <button
            onClick={handleRazorpayPayment}
            disabled={isLoading}
            className="w-full bg-black hover:bg-gray-900 text-white font-bold py-5 rounded-2xl transition-all shadow-xl flex items-center justify-center gap-2 disabled:opacity-70"
          >
            {isLoading ? (
              <Loader2 className="animate-spin" size={24} />
            ) : (
              "Upgrade to Pro"
            )}
          </button>
          
          <p className="text-[10px] text-center text-gray-400 px-4">
            By upgrading, you agree to our Terms of Service. Secure payments processed by Razorpay.
          </p>
        </div>
      </div>
    </div>
  );
};

export default PremiumModal;