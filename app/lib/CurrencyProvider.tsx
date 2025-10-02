"use client";

import React, { createContext, useContext, useEffect, useMemo, useState } from "react";

export type Currency = "MAD" | "USD" | "EUR";

type Ctx = {
  currency: Currency;
  setCurrency: (c: Currency) => void;
  format: (amount: number) => string;
};

const CurrencyCtx = createContext<Ctx | null>(null);

// Basic static rates; can be replaced by live rates later
const RATES: Record<Currency, number> = {
  MAD: 1,
  USD: 0.10, // ~ placeholder
  EUR: 0.095, // ~ placeholder
};

const SYMBOL: Record<Currency, string> = {
  MAD: "MAD",
  USD: "$",
  EUR: "€",
};

export function CurrencyProvider({ children }: { children: React.ReactNode }) {
  const [currency, setCurrency] = useState<Currency>((typeof window !== "undefined" && (localStorage.getItem("currency") as Currency)) || "MAD");

  useEffect(() => {
    if (typeof window !== "undefined") localStorage.setItem("currency", currency);
  }, [currency]);

  const value = useMemo<Ctx>(() => {
    return {
      currency,
      setCurrency,
      format: (amount: number) => {
        const rate = RATES[currency] ?? 1;
        const converted = (amount || 0) * rate;
        if (currency === "MAD") return `${converted.toFixed(2)} MAD`;
        return `${converted.toFixed(2)} ${SYMBOL[currency]}`;
      },
    };
  }, [currency]);

  return <CurrencyCtx.Provider value={value}>{children}</CurrencyCtx.Provider>;
}

export function useCurrency() {
  const ctx = useContext(CurrencyCtx);
  if (!ctx) throw new Error("useCurrency must be used within CurrencyProvider");
  return ctx;
}
