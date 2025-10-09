"use client";

import { useEffect, useMemo, useState } from "react";
import { useI18n } from "@/app/i18n/I18nProvider";
import { useCurrency } from "@/app/lib/CurrencyProvider";
import RequireAuth from "@/app/lib/RequireAuth";
import { API_URL } from "@/app/lib/api";

type Payment = {
  id: number;
  clientId: number;
  amount: number;
  paymentDate: string; // ISO string
  nextPaymentDate?: string | null; // ISO string
};

type Client = { id: number };

type Promotion = { id: number; active: boolean };
type Coach = { id: number };

type PresenceEntry = { id: number; clientId: number; time: string };

export default function DashboardPage() {
  const { t } = useI18n();
  const { format } = useCurrency();
  const [payments, setPayments] = useState<Payment[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [promotions, setPromotions] = useState<Promotion[]>([]);
  const [coaches, setCoaches] = useState<Coach[]>([]);
  const [loading, setLoading] = useState(true);
  const [range, setRange] = useState<"DAY" | "MONTH" | "YEAR">("DAY");
  const [_newUsersRange, _setNewUsersRange] = useState<"MONTH" | "YEAR">("MONTH");
  const [selectedRevenueDay, setSelectedRevenueDay] = useState<string>(() => new Date().toISOString().slice(0,10));
  const [presence, setPresence] = useState<PresenceEntry[]>([]);
  const [presenceRange, setPresenceRange] = useState<"DAY" | "MONTH" | "YEAR">("DAY");
  const [presenceDay, setPresenceDay] = useState<string>(() => new Date().toISOString().slice(0,10));
  const yearsAvailable = useMemo(() => {
    const ys = new Set<number>();
    for (const p of payments) ys.add(new Date(p.paymentDate).getUTCFullYear());
    return Array.from(ys).sort();
  }, [payments]);
  const [selectedYear, setSelectedYear] = useState<number | null>(null);
  const [selectedMonth, setSelectedMonth] = useState<number | "">("");

  useEffect(() => {
    void (async () => {
      try {
        const [cRes, pRes, prRes, coRes, peRes] = await Promise.all([
          fetch(`${API_URL}/clients.php`).catch(() => undefined),
          fetch(`${API_URL}/payments.php`).catch(() => undefined),
          fetch(`${API_URL}/promotions.php`).catch(() => undefined),
          fetch(`${API_URL}/coaches.php`).catch(() => undefined),
          fetch(`${API_URL}/presence.php`).catch(() => undefined),
        ]);
        // Process all responses in parallel
        const [clientsData, paymentsData, promotionsData, coachesData, presenceData] = await Promise.all([
          cRes?.ok ? cRes.json() : Promise.resolve([]),
          pRes?.ok ? pRes.json() : Promise.resolve([]),
          prRes?.ok ? prRes.json() : Promise.resolve([]),
          coRes?.ok ? coRes.json() : Promise.resolve([]),
          peRes?.ok ? peRes.json() : Promise.resolve([]),
        ]);
        
        setClients(Array.isArray(clientsData) ? clientsData : []);
        setPayments(Array.isArray(paymentsData) ? paymentsData : []);
        setPromotions(Array.isArray(promotionsData) ? promotionsData : []);
        setCoaches(Array.isArray(coachesData) ? coachesData : []);
        
        if (Array.isArray(presenceData)) {
          const mapped: PresenceEntry[] = presenceData.map((p: { id: number; clientId: number; time: string }) => ({ 
            id: p.id, 
            clientId: p.clientId, 
            time: p.time 
          }));
          setPresence(mapped);
        } else {
          setPresence([]);
        }
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const kpis = useMemo(() => {
    const totalClients = clients.length;
    const totalCoaches = coaches.length;

    let totalRevenue = 0;
    let revenueDay = 0;
    let revenueMonth = 0;
    let revenueYear = 0;

    const now = new Date();
    const _startOfDay = new Date(selectedRevenueDay + "T00:00:00.000Z");
    const startOfMonth = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
    const startOfYear = new Date(Date.UTC(now.getUTCFullYear(), 0, 1));

    for (const p of payments) {
      totalRevenue += p.amount || 0;
      if (p.paymentDate) {
        const d = new Date(p.paymentDate);
        if (!isNaN(d.getTime())) {
          const dayStr = d.toISOString().slice(0,10);
          if (dayStr === selectedRevenueDay) revenueDay += p.amount || 0;
          if (d >= startOfMonth) revenueMonth += p.amount || 0;
          if (d >= startOfYear) revenueYear += p.amount || 0;
        }
      }
    }

    const activePromotions = promotions.filter((p) => p.active).length;

    // Client payment status using nextPaymentDate when available
    const byClient = new Map<number, Payment[]>();
    for (const p of payments) {
      const arr = byClient.get(p.clientId) || [];
      arr.push(p);
      byClient.set(p.clientId, arr);
    }
    let upToDate = 0;
    let notUpToDate = 0;
    let newClientsMonth = 0;
    let newClientsYear = 0;
    for (const [, arr] of byClient) {
      arr.sort((a,b) => {
        const aTime = a.paymentDate ? new Date(a.paymentDate).getTime() : 0;
        const bTime = b.paymentDate ? new Date(b.paymentDate).getTime() : 0;
        return aTime - bTime;
      });
      const first = arr[0];
      const last = arr[arr.length - 1];
      const firstD = first.paymentDate ? new Date(first.paymentDate) : null;
      if (firstD && !isNaN(firstD.getTime())) {
        if (firstD >= startOfMonth) newClientsMonth++;
        if (firstD >= startOfYear) newClientsYear++;
      }
      const lastD = last.paymentDate ? new Date(last.paymentDate) : null;
      // Preferred: if nextPaymentDate exists, compare against now; else fallback to month heuristic
      const nextD = last.nextPaymentDate ? new Date(last.nextPaymentDate) : null;
      if (nextD && !isNaN(nextD.getTime())) {
        if (nextD >= now) upToDate++; else notUpToDate++;
      } else if (lastD && !isNaN(lastD.getTime())) {
        if (lastD >= startOfMonth) upToDate++; else notUpToDate++;
      }
    }

    return { totalClients, totalCoaches, totalRevenue, revenueDay, revenueMonth, revenueYear, activePromotions, upToDate, notUpToDate, newClientsMonth, newClientsYear };
  }, [clients, payments, promotions, coaches, selectedRevenueDay]);

  const presenceStats = useMemo(() => {
    const dayCount = presence.filter(p => {
      if (!p.time) return false;
      const d = new Date(p.time);
      return !isNaN(d.getTime()) && d.toISOString().slice(0,10) === presenceDay;
    }).length;
    const now = new Date();
    const y = selectedYear ?? now.getUTCFullYear();
    const m = selectedMonth || '';
    const monthCount = presence.filter(p => {
      if (!p.time) return false;
      const d = new Date(p.time);
      return !isNaN(d.getTime()) && d.getUTCFullYear() === y && d.getUTCMonth()+1 === (m || now.getUTCMonth()+1);
    }).length;
    const yearCount = presence.filter(p => {
      if (!p.time) return false;
      const d = new Date(p.time);
      return !isNaN(d.getTime()) && d.getUTCFullYear() === y;
    }).length;
    return { dayCount, monthCount, yearCount };
  }, [presence, presenceDay, selectedMonth, selectedYear]);

  // Monthly revenue for current year (simple bar chart)
  const monthlyRevenue = useMemo(() => {
    const now = new Date();
    const year = selectedYear ?? now.getUTCFullYear();
    const arr = Array.from({ length: 12 }, () => 0);
    for (const p of payments) {
      if (p.paymentDate) {
        const d = new Date(p.paymentDate);
        if (!isNaN(d.getTime()) && d.getUTCFullYear() === year) {
          arr[d.getUTCMonth()] += p.amount || 0;
        }
      }
    }
    const max = Math.max(1, ...arr);
    return { arr, max, year };
  }, [payments, selectedYear]);

  if (loading) {
    return (
      <RequireAuth>
        <main className="space-y-6 py-8">
          <div className="flex items-center justify-center min-h-[400px]">
            <div className="flex flex-col items-center space-y-6">
              <div className="relative">
                <div className="animate-spin rounded-full h-16 w-16 border-4 border-gray-200"></div>
                <div className="animate-spin rounded-full h-16 w-16 border-4 border-yellow-600 border-t-transparent absolute top-0 left-0"></div>
              </div>
              <div className="text-center">
                <div className="text-xl font-semibold text-gray-800">Chargement du tableau de bord...</div>
                <div className="text-sm text-gray-500 mt-1">Récupération des données en cours</div>
              </div>
            </div>
          </div>
        </main>
      </RequireAuth>
    );
  }

  return (
    <RequireAuth>
    <main className="space-y-6 py-8">
      <div>
        <div>
          <header className="mb-2 flex flex-col gap-1 sm:flex-row sm:items-baseline sm:justify-between">
            <h1 className="text-2xl font-extrabold tracking-tight text-yellow-600">{t("dashboard.title", "Dashboard")}</h1>
            <p className="text-sm text-amber-700">{t("dashboard.subtitle", "Overview and performance")}</p>
          </header>

      <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard title={t("kpi.totalClients", "Total Clients")} value={kpis.totalClients.toString()} />
        <KpiCard title={t("kpi.totalCoaches", "Coaches")} value={kpis.totalCoaches.toString()} />
        <KpiCard title={t("kpi.totalRevenue", "Total Revenue")} value={format(kpis.totalRevenue)} />
        <div className="space-y-2">
          <div className="flex items-center justify-between gap-2">
            <div className="text-xs uppercase tracking-wide text-slate-500">{t("dashboard.revenue", "Revenue")}</div>
            <div className="flex items-center gap-2">
            <select className="rounded-md border border-slate-300 bg-white px-2 py-1 text-xs text-slate-700" value={range} onChange={(e) => setRange(e.target.value as "DAY" | "MONTH" | "YEAR")}>
              <option value="DAY">{t("dashboard.today", "Today")}</option>
              <option value="MONTH">{t("dashboard.thisMonth", "This month")}</option>
              <option value="YEAR">{t("dashboard.thisYear", "This year")}</option>
            </select>
            {range === "DAY" && (
              <input type="date" className="rounded border border-yellow-300 px-2 py-1 text-xs" value={selectedRevenueDay} onChange={(e)=>setSelectedRevenueDay(e.target.value)} />
            )}
            </div>
          </div>
          <Card>
            <div className="text-3xl font-extrabold text-black">
              {range === "DAY" ? format(kpis.revenueDay) : range === "MONTH" ? format(kpis.revenueMonth) : format(kpis.revenueYear)}
            </div>
          </Card>
        </div>
        <KpiCard title={t("kpi.activePromotions", "Active Promotions")} value={kpis.activePromotions.toString()} />
      </section>

      <section className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="sm:col-span-3">
        <Card>
          <div className="flex items-center justify-between mb-3">
            <div className="text-xs uppercase tracking-wide text-slate-500">Présences</div>
            <div className="flex items-center gap-2">
              <select className="rounded border border-slate-300 bg-white px-2 py-0.5 text-xs text-slate-700" value={presenceRange} onChange={(e)=>setPresenceRange(e.target.value as "DAY" | "MONTH" | "YEAR")}>
                <option value="DAY">Jour</option>
                <option value="MONTH">Mois</option>
                <option value="YEAR">Année</option>
              </select>
              {presenceRange === 'DAY' && (
                <input type="date" className="rounded border border-yellow-300 px-2 py-0.5 text-xs" value={presenceDay} onChange={(e)=>setPresenceDay(e.target.value)} />
              )}
            </div>
          </div>
          <div className="text-4xl font-extrabold text-black min-h-12 flex items-center">
            {presenceRange === 'DAY' ? presenceStats.dayCount : presenceRange === 'MONTH' ? presenceStats.monthCount : presenceStats.yearCount}
          </div>
        </Card>
        </div>
        <div className="sm:col-span-3">
        <Card>
          <div className="flex items-center justify-between mb-3">
            <div className="text-xs uppercase tracking-wide text-slate-500">{t("dashboard.turnover", "Turnover")}</div>
            <div className="flex items-center gap-2">
              <select className="rounded border border-slate-300 bg-white px-2 py-0.5 text-xs text-slate-700" value={selectedYear ?? ''} onChange={(e) => setSelectedYear(e.target.value ? Number(e.target.value) : null)}>
                <option value="">{t("dashboard.currentYear", "Current year")}</option>
                {yearsAvailable.map((y) => (
                  <option key={y} value={y}>{y}</option>
                ))}
              </select>
              <select className="rounded border border-slate-300 bg-white px-2 py-0.5 text-xs text-slate-700" value={selectedMonth} onChange={(e) => setSelectedMonth(e.target.value ? Number(e.target.value) : '')}>
                <option value="">{t("dashboard.monthAll", "Month (all)")}</option>
                {Array.from({ length: 12 }, (_, i) => i+1).map(m => (
                  <option key={m} value={m}>{m}</option>
                ))}
              </select>
            </div>
          </div>
          <div className="flex items-end gap-1 h-64">
            {monthlyRevenue.arr.map((v, i) => (
              <div
                key={i}
                className={`flex-1 ${selectedMonth === '' || selectedMonth-1 === i ? 'bg-red-400' : 'bg-red-200'}`}
                style={{ height: `${(v / monthlyRevenue.max) * 100}%` }}
                title={`M${i+1}: ${format(v)}`}
              />
            ))}
          </div>
          <div className="mt-3 flex items-center justify-between">
            <div className="flex justify-between text-[10px] text-slate-500 w-full">
              {Array.from({ length: 12 }, (_, i) => i+1).map(m => (
                <span key={m} className={`${selectedMonth === m ? 'text-red-700 font-semibold' : ''}`}>{m}</span>
              ))}
            </div>
            {selectedMonth !== '' && (
              <div className="ml-3 text-sm text-red-700 whitespace-nowrap">{t("dashboard.totalMonth", "Total M")} {selectedMonth}: <span className="font-semibold">{format(monthlyRevenue.arr[(selectedMonth as number)-1])}</span></div>
            )}
          </div>
        </Card>
        </div>
      </section>

          {loading && (
            <div className="text-xs text-slate-500">{t("common.loading", "Chargement…")}</div>
          )}
        </div>
      </div>
    </main>
    </RequireAuth>
  );
}

function Card({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-yellow-300 bg-white p-5 shadow-sm">
      {children}
    </div>
  );
}

function KpiCard({ title, value }: { title: string; value: string }) {
  return (
    <Card>
      <div className="text-xs uppercase tracking-wide text-slate-600">{title}</div>
      <div className="mt-2 text-3xl font-extrabold text-red-700">{value}</div>
    </Card>
  );
}

function _MiniStat({ label, value, color }: { label: string; value: number | string; color?: string }) {
  return (
    <div className="rounded-lg border border-yellow-300 bg-white p-3">
      <div className="text-[10px] uppercase tracking-wide text-slate-600">{label}</div>
      <div className={`mt-1 text-2xl font-extrabold ${color || 'text-red-700'}`}>{value}</div>
    </div>
  );
}
