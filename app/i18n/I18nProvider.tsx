"use client";

import React, { createContext, useContext, useEffect, useMemo, useState } from "react";
import { defaultLang, languages, type Lang } from "@/app/i18n/config";
import fr from "@/app/i18n/strings/fr.json";

const dict: Record<Lang, Record<string, string>> = { fr } as const;

type I18nCtx = {
  lang: Lang;
  dir: "ltr" | "rtl";
  setLang: (l: Lang) => void;
  t: (key: string, fallback?: string) => string;
};

const Ctx = createContext<I18nCtx | null>(null);

export function I18nProvider({ children }: { children: React.ReactNode }) {
  // Important for hydration: always start with defaultLang on both server and first client render
  const [lang, setLang] = useState<Lang>(defaultLang);

  useEffect(() => {
    // After mount, read stored preference; if none, infer from browser language
    const stored = (typeof window !== "undefined" && localStorage.getItem("lang")) as Lang | null;
    if (stored) {
      if (stored !== lang) setLang(stored);
    } else if (typeof navigator !== "undefined") {
      const nav = navigator.language?.toLowerCase() || "";
      const match = languages.find(l => nav.startsWith(l.code));
      if (match && match.code !== lang) setLang(match.code as Lang);
    }
  }, []); // Empty dependency array - only run once on mount

  useEffect(() => {
    if (typeof window !== "undefined") localStorage.setItem("lang", lang);
    const entry = languages.find((l) => l.code === lang) || languages[0];
    document.documentElement.lang = lang;
    document.documentElement.dir = entry.dir;
  }, [lang]);

  const value = useMemo<I18nCtx>(() => {
    const entry = languages.find((l) => l.code === lang) || languages[0];
    const d = dict[lang] || {};
    return {
      lang,
      dir: entry.dir,
      setLang,
      t: (key: string, fallback?: string) => d[key] ?? fallback ?? key,
    };
  }, [lang]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useI18n() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useI18n must be used within I18nProvider");
  return ctx;
}
