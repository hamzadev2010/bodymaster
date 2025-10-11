"use client";

import React, { useState, useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import { I18nProvider, useI18n } from "@/app/i18n/I18nProvider";
import { CurrencyProvider, useCurrency } from "@/app/lib/CurrencyProvider";
import LoadingSpinner from "@/app/components/LoadingSpinner";
import Image from "next/image";

function Nav() {
  const { t } = useI18n();
  const { currency, setCurrency } = useCurrency();
  const [loading, setLoading] = useState(false);
  // Use SSR-stable initial values to avoid hydration mismatch
  const [isLogged, setIsLogged] = useState<boolean>(false);
  const [path, setPath] = useState<string>("");
  const [mounted, setMounted] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const router = useRouter();
  const pathname = usePathname();

  const navItems = [
    { href: "/dashboard", label: t("nav.dashboard", "Dashboard"), icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></svg>
    ) },
    { href: "/clients", label: t("nav.clients", "Clients"), icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
    ) },
    { href: "/coaches", label: t("nav.coaches", "Coaches"), icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 5v14"/><path d="M5 12h14"/></svg>
    ) },
    { href: "/promotions", label: t("nav.promotions", "Promotions"), icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5l-3-3V5a2 2 0 0 1 2-2h11"/></svg>
    ) },
    { href: "/payments", label: t("nav.payments", "Payments"), icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="1" y="4" width="22" height="16" rx="2" ry="2"/><line x1="1" y1="10" x2="23" y2="10"/></svg>
    ) },
    { href: "/receipts", label: t("nav.receipts", "Receipts"), icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16l4-2 4 2 4-2 4 2V8z"/></svg>
    ) },
    { href: "/presence", label: t("nav.presence", "Présence"), icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
    ) },
  ];

  const handleNavigation = (href: string) => {
    setLoading(true);
    router.push(href);
    // Hide loading after a short delay
    setTimeout(() => setLoading(false), 1000);
  };

  useEffect(() => {
    setMounted(true);
    const check = () => {
      const logged = typeof window !== "undefined" && localStorage.getItem("loggedIn") === "1";
      setIsLogged(!!logged);
      if (typeof window !== "undefined") setPath(window.location.pathname);
    };
    check();
    const onStorage = (e: StorageEvent) => {
      if (e.key === "loggedIn") check();
    };
    const onPop = () => check();
    if (typeof window !== "undefined") window.addEventListener("storage", onStorage);
    if (typeof window !== "undefined") window.addEventListener("popstate", onPop);
    return () => {
      if (typeof window !== "undefined") window.removeEventListener("storage", onStorage);
      if (typeof window !== "undefined") window.removeEventListener("popstate", onPop);
    };
  }, []);

  // Ensure auth state updates immediately on route changes within the same tab
  useEffect(() => {
    const logged = typeof window !== "undefined" && localStorage.getItem("loggedIn") === "1";
    setIsLogged(!!logged);
    if (typeof window !== "undefined") setPath(window.location.pathname);
  }, [pathname]);

  // Register service worker for PWA installability
  useEffect(() => {
    if (typeof window !== "undefined" && "serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").catch(() => void 0);
    }
  }, []);

  const isLoginPage = pathname === "/";

  return (
    <>
      {mounted && isLogged && !isLoginPage && (
      <nav className="sticky top-0 z-40 border-b border-yellow-300 bg-white/90 text-slate-800 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between p-4">
          <div className="flex items-center gap-3">
            <Image 
              src="/images/logo.png" 
              alt="BODY MASTER Logo" 
              width={64}
              height={64}
              className="w-16 h-16 object-contain"
            />
            <a href="/dashboard" className="text-sm font-extrabold tracking-tight text-amber-700 hover:text-amber-800 transition-colors">BODY MASTER</a>
          </div>
          <div className="flex items-center gap-2 text-sm">
            {/* Mobile hamburger */}
            <button className="md:hidden rounded-md border border-slate-200 px-2 py-1 text-slate-700 hover:bg-slate-50" onClick={() => setMobileOpen(true)} aria-label="Menu">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="18" x2="21" y2="18"/></svg>
            </button>
            <select
              className="rounded-md border border-slate-300 bg-white px-2 py-1 text-xs text-slate-700"
              value={currency}
              onChange={(e) => setCurrency(e.target.value as "USD" | "EUR" | "MAD")}
              aria-label="Currency"
            >
              <option value="MAD">MAD</option>
              <option value="USD">USD</option>
              <option value="EUR">EUR</option>
            </select>
            <button
              className="rounded-md border border-slate-300 bg-white px-2 py-1 text-xs text-slate-700 hover:bg-slate-50"
              onClick={() => {
                if (typeof window !== "undefined") {
                  localStorage.removeItem("loggedIn");
                  window.location.href = "/";
                }
              }}
            >
              {t("common.logout", "Logout")}
            </button>
          </div>
        </div>
      </nav>
      )}
      {/* Desktop sidebar */}
      {mounted && isLogged && !isLoginPage && (
        <aside className="hidden md:block fixed left-0 top-[96px] z-30 h-[calc(100dvh-96px)] w-14 hover:w-56 transition-[width] duration-200 overflow-hidden border-r border-yellow-300 bg-black group">
          <nav className="flex flex-col gap-1 p-2">
            {navItems.map((item) => (
              <button
                key={item.href}
                onClick={() => handleNavigation(item.href)}
                className={`flex items-center gap-3 rounded-md px-3 py-2 text-left text-sm border border-transparent text-yellow-300 hover:bg-neutral-900 hover:border-yellow-500 ${path === item.href ? 'bg-neutral-900 border-yellow-500 text-yellow-400' : ''}`}
                title={item.label}
              >
                <span className="flex h-6 w-6 items-center justify-center">{item.icon}</span>
                <span className="whitespace-nowrap opacity-0 transition-opacity duration-150 group-hover:opacity-100">
                  {item.label}
                </span>
              </button>
            ))}
          </nav>
        </aside>
      )}
      {/* Mobile drawer */}
      {mounted && isLogged && !isLoginPage && mobileOpen && (
        <div className="fixed inset-0 z-50 md:hidden">
          <div className="absolute inset-0 bg-black/30" onClick={() => setMobileOpen(false)} />
          <div className="absolute left-0 top-0 h-full w-64 bg-black border-r border-yellow-300 p-3">
            <div className="mb-3 flex items-center justify-between text-slate-700">
              <div className="font-semibold text-yellow-300">Menu</div>
              <button className="rounded-md border border-yellow-300 text-yellow-300 px-2 py-1" onClick={() => setMobileOpen(false)}>✕</button>
            </div>
            <nav className="flex flex-col gap-1">
              {navItems.map((item) => (
                <button
                  key={item.href}
                  onClick={() => { setMobileOpen(false); handleNavigation(item.href); }}
                  className={`flex items-center gap-3 rounded-md px-3 py-2 text-left text-sm text-yellow-300 border border-transparent hover:bg-neutral-900 hover:border-yellow-500 ${path === item.href ? 'bg-neutral-900 border-yellow-500 text-yellow-400' : ''}`}
                >
                  <span className="flex h-6 w-6 items-center justify-center">{item.icon}</span>
                  <span className="whitespace-nowrap">{item.label}</span>
                </button>
              ))}
            </nav>
          </div>
        </div>
      )}
      {loading && <LoadingSpinner />}
    </>
  );
}

function Footer() {
  const { t } = useI18n();
  return (
    <footer className="mt-16 bg-black py-8 text-center text-xs text-white">
      © {new Date().getFullYear()} BODY MASTER. {t("footer.copyright", "All rights reserved.")}
    </footer>
  );
}

export default function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <I18nProvider>
      <CurrencyProvider>
        <div className="min-h-dvh bg-slate-50 text-gray-900 text-[15px] md:text-base flex flex-col">
          <Nav />
          <div className="px-4 md:ml-14 flex-1">
            <div className="mx-auto max-w-6xl">{children}</div>
          </div>
          <Footer />
        </div>
      </CurrencyProvider>
    </I18nProvider>
  );
}
