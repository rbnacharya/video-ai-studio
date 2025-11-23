'use client';

import React from 'react';
import { Aperture, Check } from 'lucide-react';
import { signInWithGoogle } from '../services/firebase';

const Auth: React.FC = () => {
  const handleLogin = async () => {
    try {
      await signInWithGoogle();
    } catch (e) {
      console.error("Login failed", e);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-zinc-50">
      <div className="w-full max-w-5xl h-[600px] flex bg-white rounded-3xl shadow-2xl overflow-hidden border border-zinc-200 m-4">
        
        {/* Left Side - Brand */}
        <div className="w-1/2 bg-zinc-900 text-white p-12 flex flex-col justify-between relative overflow-hidden hidden md:flex">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,_var(--tw-gradient-stops))] from-rose-900/40 via-zinc-900 to-zinc-900"></div>
          
          <div className="relative z-10">
            <div className="w-12 h-12 bg-rose-600 rounded-2xl flex items-center justify-center mb-6 shadow-lg shadow-rose-900/20 rotate-3">
              <Aperture className="w-7 h-7 text-white" />
            </div>
            <h1 className="text-4xl font-bold tracking-tight mb-4">Kroma Studio</h1>
            <p className="text-zinc-400 text-lg">The AI Director Suite for cinematic video production.</p>
          </div>

          <div className="space-y-4 relative z-10">
            <div className="flex items-center gap-3">
              <div className="w-6 h-6 rounded-full bg-rose-500/20 flex items-center justify-center">
                <Check className="w-3 h-3 text-rose-400" />
              </div>
              <span className="text-zinc-300">Veo 3.1 Video Generation</span>
            </div>
            <div className="flex items-center gap-3">
               <div className="w-6 h-6 rounded-full bg-rose-500/20 flex items-center justify-center">
                <Check className="w-3 h-3 text-rose-400" />
              </div>
              <span className="text-zinc-300">Intelligent Script Writing</span>
            </div>
            <div className="flex items-center gap-3">
               <div className="w-6 h-6 rounded-full bg-rose-500/20 flex items-center justify-center">
                <Check className="w-3 h-3 text-rose-400" />
              </div>
              <span className="text-zinc-300">Character Consistency</span>
            </div>
          </div>
        </div>

        {/* Right Side - Login */}
        <div className="w-full md:w-1/2 p-12 flex flex-col items-center justify-center text-center">
          <div className="md:hidden w-12 h-12 bg-rose-600 rounded-2xl flex items-center justify-center mb-6 shadow-lg shadow-rose-200 rotate-3">
             <Aperture className="w-7 h-7 text-white" />
          </div>
          
          <h2 className="text-2xl font-bold text-zinc-900 mb-2">Welcome Back</h2>
          <p className="text-zinc-500 mb-8">Sign in to access your projects and studio credits.</p>

          <button
            onClick={handleLogin}
            className="w-full max-w-sm flex items-center justify-center gap-3 bg-white border border-zinc-200 hover:bg-zinc-50 text-zinc-700 font-semibold py-3.5 px-4 rounded-xl transition-all shadow-sm hover:shadow-md group"
          >
            <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" className="w-5 h-5" alt="Google" />
            <span className="group-hover:text-zinc-900">Continue with Google</span>
          </button>

          <p className="mt-8 text-xs text-zinc-400">
            By continuing, you agree to Kroma Studio's Terms of Service and Privacy Policy.
          </p>
        </div>
      </div>
    </div>
  );
};

export default Auth;