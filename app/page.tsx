"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useI18n } from "@/app/i18n/I18nProvider";
import Image from "next/image";

export default function LoginPage() {
  const router = useRouter();
  const { t } = useI18n();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>("");
  const [showPwd, setShowPwd] = useState(false);
  const [introComplete, setIntroComplete] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    // Prevent flash of unstyled content
    setIsLoaded(true);
    
    // Trigger intro animation after component mounts - faster loading
    const timer = setTimeout(() => {
      setIntroComplete(true);
    }, 800); // Reduced from 2000ms to 800ms for faster loading
    return () => clearTimeout(timer);
  }, []);

  if (!isLoaded) {
    return (
      <div className="login-page min-h-screen bg-gradient-to-br from-black via-slate-900 to-gray-900 flex items-center justify-center">
        <div className="text-white text-xl">Loading...</div>
      </div>
    );
  }

  return (
    <div className="login-page min-h-screen bg-gradient-to-br from-black via-slate-900 to-gray-900 relative overflow-hidden">
      {/* Simple Background */}
      <div className="absolute inset-0">
        {/* Simple gradient background */}
        <div className="absolute inset-0 bg-gradient-to-br from-slate-900 via-gray-900 to-black"></div>
      </div>

      {/* Main Content */}
      <main className="relative z-10 flex min-h-screen items-center justify-center p-6">
        <div className="w-full max-w-md">
          {/* Logo and Intro Animation */}
          <div className={`text-center mb-12 transition-all duration-500 relative z-20 flex flex-col items-center ${introComplete ? 'opacity-100 transform translate-y-0' : 'opacity-0 transform translate-y-8'}`}>
            <div className="relative mb-8">
              <Image 
                src="/images/logo.png" 
                alt="BODY MASTER Logo" 
                width={160}
                height={160}
                className="relative w-32 h-32 mx-auto object-contain"
                priority
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
          <div className={`bg-white/10 backdrop-blur-lg rounded-2xl border border-white/20 p-6 shadow-lg transition-all duration-300 ${introComplete ? 'opacity-100 transform translate-y-0' : 'opacity-0 transform translate-y-4'}`}>
            <div className="text-center mb-8">
              <h1 className="text-2xl font-bold text-white mb-2">{t("login.title", "Welcome Back")}</h1>
              <p className="text-white/80 text-sm">{t("login.subtitle", "Sign in to access your dashboard")}</p>
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
                <label className="block text-sm font-semibold text-white">
                  {t("login.username", "Username")}
                </label>
                <div className="relative">
                  <input
                    className="w-full rounded-lg border border-white/30 bg-white/10 px-4 py-3 text-white placeholder-white/60 focus:border-white focus:bg-white/20 transition-all duration-200"
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder={t("login.username.placeholder", "Enter your username")}
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="block text-sm font-semibold text-white">
                  {t("login.password", "Password")}
                </label>
                <div className="relative">
                  <input
                    className="w-full rounded-lg border border-white/30 bg-white/10 px-4 py-3 pr-12 text-white placeholder-white/60 focus:border-white focus:bg-white/20 transition-all duration-200"
                    type={showPwd ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    minLength={4}
                    required
                  />
                  <button
                    type="button"
                    className="absolute inset-y-0 right-0 flex items-center px-4 text-sm text-white/70 hover:text-white transition-colors duration-200"
                    onClick={() => setShowPwd((v) => !v)}
                    aria-label={showPwd ? t("login.hidePassword", "Hide password") : t("login.showPassword", "Show password")}
                  >
                    {showPwd ? "👁️" : "👁️‍🗨️"}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full rounded-xl bg-gradient-to-r from-yellow-500 to-amber-600 px-8 py-4 font-bold text-lg text-black shadow-2xl hover:from-yellow-400 hover:to-amber-500 hover:shadow-yellow-500/50 hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 transition-all duration-300 transform relative overflow-hidden group border-2 border-yellow-400"
              >
                <span className="relative z-10 font-black text-black">
                  {loading ? (
                    <div className="flex items-center justify-center">
                      <div className="w-5 h-5 border-3 border-black/40 border-t-black rounded-full animate-spin mr-3"></div>
                      <span className="font-black text-black">{t("login.loading", "Connexion...")}</span>
                    </div>
                  ) : (
                    <span className="font-black text-black">{t("login.submit", "Se connecter")}</span>
                  )}
                </span>
                <div className="absolute inset-0 bg-gradient-to-r from-yellow-400 to-amber-400 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
              </button>
            </form>

            {/* Additional Info */}
            <div className="mt-8 text-center">
              <p className="text-xs text-white/70">
                {t("login.footer", "Ready to transform your body? Let's get started!")}
              </p>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

