"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useI18n } from "@/app/i18n/I18nProvider";

export default function LoginPage() {
  const router = useRouter();
  const { t } = useI18n();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>("");
  const [showPwd, setShowPwd] = useState(false);
  const [introComplete, setIntroComplete] = useState(false);

  useEffect(() => {
    // Trigger intro animation after component mounts
    const timer = setTimeout(() => {
      setIntroComplete(true);
    }, 2000);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-black via-slate-900 to-gray-900 relative overflow-hidden">
      {/* 3D Animated Background - Full Page Coverage */}
      <div className="absolute inset-0">
        {/* Large Floating 3D Elements - Covering entire page */}
        <div className="absolute top-10 left-5 w-32 h-32 bg-gradient-to-r from-amber-400 to-yellow-500 rounded-full opacity-10 animate-float-1"></div>
        <div className="absolute top-20 right-10 w-24 h-24 bg-gradient-to-r from-amber-500 to-orange-500 rounded-full opacity-12 animate-float-2"></div>
        <div className="absolute top-1/3 left-1/4 w-40 h-40 bg-gradient-to-r from-yellow-400 to-amber-500 rounded-full opacity-8 animate-float-3"></div>
        <div className="absolute top-1/2 right-1/4 w-28 h-28 bg-gradient-to-r from-amber-300 to-yellow-400 rounded-full opacity-10 animate-float-4"></div>
        <div className="absolute bottom-1/3 left-10 w-36 h-36 bg-gradient-to-r from-amber-400 to-yellow-500 rounded-full opacity-9 animate-float-1"></div>
        <div className="absolute bottom-20 right-5 w-20 h-20 bg-gradient-to-r from-yellow-500 to-amber-600 rounded-full opacity-11 animate-float-2"></div>
        <div className="absolute bottom-10 left-1/3 w-24 h-24 bg-gradient-to-r from-amber-500 to-orange-500 rounded-full opacity-8 animate-float-3"></div>
        
        {/* Large Geometric 3D Shapes */}
        <div className="absolute top-1/4 right-1/3 w-16 h-16 bg-amber-500 transform rotate-45 opacity-15 animate-spin-slow"></div>
        <div className="absolute bottom-1/4 left-1/3 w-12 h-12 bg-yellow-500 transform rotate-12 opacity-18 animate-pulse"></div>
        <div className="absolute top-1/2 left-10 w-14 h-14 bg-amber-400 transform rotate-30 opacity-12 animate-spin-slow"></div>
        <div className="absolute bottom-1/3 right-10 w-10 h-10 bg-yellow-400 transform rotate-60 opacity-15 animate-pulse"></div>
        
        {/* Full Page Grid Pattern */}
        <div className="absolute inset-0 opacity-8">
          <div className="grid-pattern-full"></div>
        </div>
        
        {/* Large Background Gradients */}
        <div className="absolute top-0 left-0 w-full h-1/3 bg-gradient-to-b from-amber-500/5 to-transparent"></div>
        <div className="absolute bottom-0 right-0 w-full h-1/3 bg-gradient-to-t from-yellow-500/5 to-transparent"></div>
        <div className="absolute top-1/3 left-0 w-1/2 h-1/3 bg-gradient-to-r from-amber-400/4 to-transparent"></div>
        <div className="absolute bottom-1/3 right-0 w-1/2 h-1/3 bg-gradient-to-l from-yellow-400/4 to-transparent"></div>
      </div>

      {/* Main Content */}
      <main className="relative z-10 flex min-h-screen items-center justify-center p-6">
        <div className="w-full max-w-md">
          {/* Logo and Intro Animation */}
          <div className={`text-center mb-12 transition-all duration-1000 relative z-20 flex flex-col items-center ${introComplete ? 'opacity-100 transform translate-y-0' : 'opacity-0 transform translate-y-8'}`}>
            <div className="relative mb-8">
              <div className="absolute inset-0 bg-gradient-to-r from-amber-400 to-yellow-500 rounded-full blur-2xl opacity-40 animate-pulse scale-150"></div>
              <img 
                src="/images/logo.png" 
                alt="BODY MASTER Logo" 
                className="relative w-40 h-40 mx-auto object-contain animate-logo-glow"
              />
            </div>
            <div className="relative inline-block px-12 py-6 bg-black/60 backdrop-blur-md rounded-3xl border-2 border-yellow-400/60 shadow-[0_0_30px_rgba(251,191,36,0.3)] hover:border-yellow-400 hover:shadow-[0_0_50px_rgba(251,191,36,0.5)] transition-all duration-500">
              {/* Strong Background for Text */}
              <div className="absolute inset-0 bg-gradient-to-r from-black/80 via-slate-900/80 to-black/80 rounded-3xl"></div>
              {/* Glowing Inner Border */}
              <div className="absolute inset-0 rounded-3xl border border-amber-400/30"></div>
              <div className="relative text-5xl sm:text-6xl font-black text-yellow-400 mb-4 animate-text-glow whitespace-nowrap" style={{ textShadow: '0 0 20px rgba(251, 191, 36, 1), 0 0 40px rgba(251, 191, 36, 0.8), 0 2px 4px rgba(0, 0, 0, 0.8)' }}>
                BODY MASTER
              </div>
              <div className="relative text-base sm:text-lg font-semibold text-yellow-300 tracking-widest uppercase text-center">
                {t("login.subtitle", "Transform Your Body, Transform Your Life")}
              </div>
            </div>
          </div>

          {/* Login Form */}
          <div className={`bg-black/20 backdrop-blur-lg rounded-3xl border border-yellow-300/30 p-8 shadow-2xl transition-all duration-1000 delay-500 ${introComplete ? 'opacity-100 transform translate-y-0' : 'opacity-0 transform translate-y-8'}`}>
            <div className="text-center mb-8">
              <h1 className="text-2xl font-bold text-yellow-300 mb-2">{t("login.title", "Welcome Back")}</h1>
              <p className="text-gray-300 text-sm">{t("login.subtitle", "Sign in to access your dashboard")}</p>
            </div>

            {error && (
              <div className="mb-6 rounded-xl border border-red-400/50 bg-red-500/10 px-4 py-3 text-sm text-red-300 backdrop-blur-sm animate-shake">
                {error}
              </div>
            )}

            <form
              onSubmit={async (e) => {
                e.preventDefault();
                setError("");
                setLoading(true);
                try {
                  const res = await fetch("/api/auth", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ username, password }),
                  });
                  if (!res.ok) {
                    const j = await res.json().catch(() => ({}));
                    throw new Error(j?.error || `HTTP ${res.status}`);
                  }
                  // success
                  localStorage.setItem("loggedIn", "1");
                  localStorage.setItem("loggedUser", username);
                  router.replace("/dashboard");
                } catch (err: unknown) {
                  const error = err instanceof Error ? err.message : t("login.error", "Login failed");
                  setError(error);
                } finally {
                  setLoading(false);
                }
              }}
              className="space-y-6"
            >
              <div className="space-y-2">
                <label className="block text-sm font-semibold text-yellow-300">
                  {t("login.username", "Username")}
                </label>
                <div className="relative">
                  <input
                    className="w-full rounded-xl border border-yellow-300/30 bg-black/20 px-4 py-3 text-white placeholder-gray-400 focus:border-yellow-400 focus:bg-black/30 transition-all duration-300 backdrop-blur-sm"
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder={t("login.username.placeholder", "Enter your username")}
                    required
                  />
                  <div className="absolute inset-0 rounded-xl bg-gradient-to-r from-amber-400/20 to-yellow-500/20 opacity-0 hover:opacity-100 transition-opacity duration-300 pointer-events-none"></div>
                </div>
              </div>

              <div className="space-y-2">
                <label className="block text-sm font-semibold text-yellow-300">
                  {t("login.password", "Password")}
                </label>
                <div className="relative">
                  <input
                    className="w-full rounded-xl border border-yellow-300/30 bg-black/20 px-4 py-3 pr-12 text-white placeholder-gray-400 focus:border-yellow-400 focus:bg-black/30 transition-all duration-300 backdrop-blur-sm"
                    type={showPwd ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    minLength={4}
                    required
                  />
                  <button
                    type="button"
                    className="absolute inset-y-0 right-0 flex items-center px-4 text-sm text-gray-400 hover:text-yellow-400 transition-colors duration-300"
                    onClick={() => setShowPwd((v) => !v)}
                    aria-label={showPwd ? t("login.hidePassword", "Hide password") : t("login.showPassword", "Show password")}
                  >
                    {showPwd ? "👁️" : "👁️‍🗨️"}
                  </button>
                  <div className="absolute inset-0 rounded-xl bg-gradient-to-r from-amber-400/20 to-yellow-500/20 opacity-0 hover:opacity-100 transition-opacity duration-300 pointer-events-none"></div>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full rounded-xl bg-gradient-to-r from-amber-500 to-yellow-600 px-6 py-4 font-black text-xl shadow-2xl hover:from-amber-600 hover:to-yellow-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300 transform hover:scale-105 hover:shadow-yellow-500/50 relative overflow-hidden group border-2 border-yellow-400"
                style={{ color: '#000000', textShadow: '0 1px 2px rgba(0, 0, 0, 0.3)' }}
              >
                <span className="relative z-10 font-black text-black">
                  {loading ? (
                    <div className="flex items-center justify-center">
                      <div className="w-5 h-5 border-3 border-black/40 border-t-black rounded-full animate-spin mr-2"></div>
                      <span className="font-black text-black">{t("login.loading", "Signing in...")}</span>
                    </div>
                  ) : (
                    <span className="font-black text-black">{t("login.submit", "Sign In")}</span>
                  )}
                </span>
                <div className="absolute inset-0 bg-gradient-to-r from-yellow-400 to-amber-400 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
              </button>
            </form>

            {/* Additional Info */}
            <div className="mt-8 text-center">
              <p className="text-xs text-gray-400">
                {t("login.footer", "Ready to transform your body? Let's get started!")}
              </p>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

