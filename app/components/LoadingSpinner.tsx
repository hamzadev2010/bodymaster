"use client";

import Image from "next/image";

export default function LoadingSpinner() {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm">
      <div className="flex flex-col items-center gap-6">
        <div className="relative">
          <Image 
            src="/images/logo.png" 
            alt="BODY MASTER" 
            width={180} 
            height={180} 
            className="h-45 w-45 object-contain drop-shadow-[0_0_20px_rgba(251,191,36,0.8)] animate-logo-glow" 
            priority
          />
        </div>
        <div className="rounded-xl bg-black/40 backdrop-blur-lg px-8 py-6 shadow-2xl border border-yellow-400/30">
          <div className="flex items-center space-x-4">
            <div className="animate-spin rounded-full h-6 w-6 border-2 border-white/30 border-t-yellow-400"></div>
            <span className="text-white font-semibold text-lg">Loading...</span>
          </div>
        </div>
      </div>
    </div>
  );
}

