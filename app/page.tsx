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
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    setIsLoaded(true);
  }, []);

  if (!isLoaded) {
    return (
      <div className="min-h-screen w-full bg-white flex items-center justify-center">
        <div className="text-slate-700 text-xl">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen w-full bg-white flex flex-col">
      {/* Main Content */}
      <div className="flex-1 flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          {/* Logo */}
          <div className="text-center mb-8">
            <Image 
              src="/images/logo.png" 
              alt="BODY MASTER Logo" 
              width={120}
              height={120}
              className="mx-auto mb-4"
              priority
            />
            <h1 className="text-3xl font-bold text-slate-800 mb-2 animate-pulse" style={{ 
              textShadow: '0 0 10px rgba(251, 191, 36, 0.5), 0 0 20px rgba(251, 191, 36, 0.3), 0 0 30px rgba(251, 191, 36, 0.2)',
              background: 'linear-gradient(45deg, #fbbf24, #f59e0b, #d97706)',
              backgroundClip: 'text',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              animation: 'glow 2s ease-in-out infinite alternate'
            }}>
              BODY MASTER
            </h1>
            <p className="text-slate-600 text-sm">Transform Your Body, Transform Your Life</p>
          </div>

          {/* Login Form */}
          <div className="bg-white border border-slate-200 rounded-lg p-6 shadow-lg">
            <div className="text-center mb-6">
              <h2 className="text-lg font-semibold text-slate-800 mb-1">{t("login.title", "Welcome Back")}</h2>
              <p className="text-slate-600 text-sm">{t("login.subtitle", "Sign in to access your dashboard")}</p>
            </div>

            {error && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
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
              className="space-y-4"
            >
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  {t("login.username", "Username")}
                </label>
                <input
                  className="w-full px-3 py-2 bg-yellow-50 border border-yellow-400 rounded-lg text-slate-800 placeholder-slate-500 focus:outline-none focus:border-yellow-500 focus:bg-yellow-100 transition-colors"
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder={t("login.username.placeholder", "Enter your username")}
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  {t("login.password", "Password")}
                </label>
                <div className="relative">
                  <input
                    className="w-full px-3 py-2 pr-10 bg-yellow-50 border border-yellow-400 rounded-lg text-slate-800 placeholder-slate-500 focus:outline-none focus:border-yellow-500 focus:bg-yellow-100 transition-colors"
                    type={showPwd ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    minLength={4}
                    required
                  />
                  <button
                    type="button"
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-slate-500 hover:text-slate-700"
                    onClick={() => setShowPwd(!showPwd)}
                  >
                    {showPwd ? "👁️" : "👁️‍🗨️"}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-2.5 bg-gradient-to-r from-yellow-500 to-amber-600 text-black font-semibold rounded-lg hover:from-yellow-400 hover:to-amber-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300 shadow-md hover:shadow-lg hover:shadow-yellow-500/25 relative overflow-hidden group transform hover:scale-[1.02] active:scale-[0.98]"
                style={{
                  animation: loading ? 'button-pulse 1.5s ease-in-out infinite' : 'none'
                }}
              >
                {loading ? (
                  <div className="flex items-center justify-center">
                    <div className="relative">
                      <div className="w-5 h-5 border-3 border-black/20 rounded-full"></div>
                      <div className="w-5 h-5 border-3 border-transparent border-t-black border-r-black rounded-full animate-spin absolute top-0 left-0"></div>
                    </div>
                    <span className="ml-3 animate-pulse">{t("login.loading", "Connexion...")}</span>
                  </div>
                ) : (
                  <span className="relative z-10 group-hover:scale-105 transition-transform duration-200">
                    {t("login.submit", "Se connecter")}
                  </span>
                )}
                {/* Ripple effect background */}
                <div className="absolute inset-0 bg-gradient-to-r from-yellow-400 to-amber-400 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                {/* Shine effect */}
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -skew-x-12 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700"></div>
              </button>
            </form>

            <div className="mt-6 text-center">
              <p className="text-xs text-slate-500">
                {t("login.footer", "Ready to transform your body? Let's get started!")}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Copyright Footer */}
      <footer className="py-4 border-t border-slate-200">
        <div className="text-center text-sm text-slate-500">
          <p>&copy; 2024 BODY MASTER. All rights reserved.</p>
          <p className="mt-1">Transform Your Body, Transform Your Life</p>
        </div>
      </footer>
    </div>
  );
}