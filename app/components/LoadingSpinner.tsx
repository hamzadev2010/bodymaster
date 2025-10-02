"use client";

export default function LoadingSpinner() {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70">
      <div className="flex flex-col items-center gap-4">
        <img src="/images/logo.png" alt="BODY MASTER" className="h-56 w-56 object-contain drop-shadow-[0_0_28px_rgba(250,204,21,0.7)]" />
        <div className="rounded-lg bg-white/95 px-6 py-4 shadow-2xl">
          <div className="flex items-center space-x-3">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-yellow-600"></div>
            <span className="text-gray-800 font-semibold">Chargement…</span>
          </div>
        </div>
      </div>
    </div>
  );
}

