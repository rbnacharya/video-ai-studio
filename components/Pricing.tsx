'use client';

import React, { useState } from 'react';
import { Check, Loader2, Sparkles, CreditCard, ShieldCheck } from 'lucide-react';
import { PricingTier } from '../types';
import { addCredits } from '../services/firebase';

interface PricingProps {
  userId: string;
  onClose: () => void;
}

const TIERS: PricingTier[] = [
  {
    id: 'creator',
    name: 'Creator',
    price: 20,
    credits: 500,
    features: ['500 Studio Credits', '720p Video Generation', 'Standard Queue', '5 Projects'],
  },
  {
    id: 'director',
    name: 'Director',
    price: 50,
    credits: 1500,
    popular: true,
    features: ['1,500 Studio Credits', '1080p Video Generation', 'Priority Processing', 'Unlimited Projects', 'Commercial Usage Rights'],
  }
];

const Pricing: React.FC<PricingProps> = ({ userId, onClose }) => {
  const [processing, setProcessing] = useState<string | null>(null);

  const handlePurchase = async (tier: PricingTier) => {
    setProcessing(tier.id);
    
    // SIMULATED STRIPE PAYMENT FLOW
    // In a real app, this would create a Stripe Checkout Session via Cloud Functions
    // and redirect the user.
    setTimeout(async () => {
       await addCredits(userId, tier.credits);
       alert(`Payment Successful! Added ${tier.credits} credits to your account.`);
       setProcessing(null);
       onClose();
    }, 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-zinc-900/60 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="bg-white rounded-3xl max-w-4xl w-full p-8 shadow-2xl relative animate-in zoom-in-95 duration-200">
        <button onClick={onClose} className="absolute top-6 right-6 text-zinc-400 hover:text-zinc-900">✕</button>
        
        <div className="text-center mb-10">
          <h2 className="text-3xl font-bold text-zinc-900 mb-3">Upgrade your Studio</h2>
          <p className="text-zinc-500 max-w-md mx-auto">Purchase credits to generate scenes. Veo 3.1 video generation costs approx 150 credits per scene.</p>
        </div>

        <div className="grid md:grid-cols-2 gap-6 max-w-3xl mx-auto">
          {TIERS.map(tier => (
            <div 
              key={tier.id}
              className={`relative border rounded-2xl p-8 flex flex-col transition-all ${
                tier.popular 
                  ? 'border-rose-200 bg-rose-50/30 ring-4 ring-rose-100 shadow-xl scale-105 z-10' 
                  : 'border-zinc-200 hover:border-zinc-300 hover:shadow-lg bg-white'
              }`}
            >
              {tier.popular && (
                <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-rose-600 text-white text-xs font-bold px-3 py-1 rounded-full shadow-sm flex items-center gap-1">
                  <Sparkles className="w-3 h-3" /> BEST VALUE
                </div>
              )}

              <div className="mb-6">
                <h3 className="text-lg font-bold text-zinc-900">{tier.name}</h3>
                <div className="flex items-baseline gap-1 mt-2">
                  <span className="text-4xl font-bold text-zinc-900">${tier.price}</span>
                  <span className="text-zinc-500 font-medium">/ one-time</span>
                </div>
                <div className="text-rose-600 font-bold text-sm mt-2 flex items-center gap-1">
                   {tier.credits} Credits included
                </div>
              </div>

              <ul className="space-y-4 mb-8 flex-1">
                {tier.features.map((feature, i) => (
                  <li key={i} className="flex items-start gap-3 text-sm text-zinc-600">
                    <Check className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                    {feature}
                  </li>
                ))}
              </ul>

              <button
                onClick={() => handlePurchase(tier)}
                disabled={!!processing}
                className={`w-full py-4 rounded-xl font-bold flex items-center justify-center gap-2 transition-all ${
                  tier.popular
                    ? 'bg-rose-600 hover:bg-rose-700 text-white shadow-lg shadow-rose-200'
                    : 'bg-zinc-900 hover:bg-zinc-800 text-white'
                }`}
              >
                {processing === tier.id ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                    <>
                      <CreditCard className="w-4 h-4" /> Buy Credits
                    </>
                )}
              </button>
            </div>
          ))}
        </div>

        <div className="mt-12 text-center flex items-center justify-center gap-2 text-xs text-zinc-400">
            <ShieldCheck className="w-4 h-4" />
            Secure payment processing via Stripe. 100% Money back guarantee on failed generations.
        </div>
      </div>
    </div>
  );
};

export default Pricing;