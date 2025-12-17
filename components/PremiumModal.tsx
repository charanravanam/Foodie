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
    
    // Client-side initialization with provided Key ID
    const options = {
      key: "rzp_live_Rp3PKVq2k7vnBq", // Updated with your provided live key
      amount: 4900, // ₹49.00
      currency: "INR",
      name: "Dr Foodie",
      description: "Dr Foodie Pro Monthly Subscription",
      image: "https://www.foodieqr.com/assets/img/logo.svg",
      handler: function (response: any) {
        // Successful payment
        // console.log(response.razorpay_payment_id);
        setIsLoading(false);
        onUpgrade();
      },
      prefill: {
        name: "", // Can be pre-filled from user profile if available
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
      alert("Could not initiate payment. Please check configuration.");
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
      <div className="bg-white rounded-3xl w-full max-w-sm overflow-hidden relative shadow-2xl">
        <button 
          onClick={onClose}
          disabled={isLoading}
          className="absolute top-4 right-4 p-2 bg-gray-100 rounded-full hover:bg-gray-200 transition-colors z-10"
        >
          <X size={20} className="text-gray-600" />
        </button>

        <div className="bg-gradient-to-br from-primary to-secondary p-8 text-center text-white">
          <Crown size={48} className="mx-auto mb-4 text-accent" />
          <h2 className="text-2xl font-bold mb-2">Dr Foodie Pro</h2>
          <p className="opacity-90">Unlock Unlimited Analysis</p>
        </div>

        <div className="p-6 space-y-6">
          <div className="space-y-3">
            {[
              "Unlimited Food Scans",
              "Advanced Micro-Analysis",
              "Deep Body Type Insights",
              "Export Health Reports",
              "Priority Processing"
            ].map((feature, i) => (
              <div key={i} className="flex items-center gap-3">
                <div className="bg-green-100 p-1 rounded-full">
                  <Check size={14} className="text-primary" />
                </div>
                <span className="text-gray-700 font-medium">{feature}</span>
              </div>
            ))}
          </div>

          <div className="text-center pt-2">
            <span className="text-3xl font-bold text-gray-900">₹49</span>
            <span className="text-gray-500"> / month</span>
          </div>

          <button
            onClick={handleRazorpayPayment}
            disabled={isLoading}
            className="w-full bg-primary hover:bg-secondary text-white font-bold py-4 rounded-xl transition-all shadow-lg shadow-primary/30 transform hover:scale-[1.02] disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {isLoading ? (
              <Loader2 className="animate-spin" size={20} />
            ) : (
              "Upgrade Now"
            )}
          </button>
          
          <p className="text-xs text-center text-gray-400">
            Secured by Razorpay. Cancel anytime.
          </p>
        </div>
      </div>
    </div>
  );
};

export default PremiumModal;