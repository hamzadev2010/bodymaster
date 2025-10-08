"use client";

import { useEffect, useMemo, useState } from "react";
import RequireAuth from "@/app/lib/RequireAuth";
import { useI18n } from "@/app/i18n/I18nProvider";
import { useCurrency } from "@/app/lib/CurrencyProvider";

type Period = "MONTHLY" | "QUARTERLY" | "ANNUAL";

type Client = {
  id: number;
  fullName: string;
  subscriptionPeriod?: Period | null;
};

type Payment = {
  id: number;
  clientId: number;
  amount: number;
  paymentDate: string;
  nextPaymentDate: string;
  subscriptionPeriod: Period;
  notes?: string | null;
  createdAt: string;
  updatedAt: string;
  client?: { id: number; fullName: string };
  promotion?: { id: number; name: string; subscriptionMonths?: number | null } | null;
};

type Promotion = {
  id: number;
  name: string;
  fixedPrice: number;
  startDate: string;
  endDate?: string | null;
  active: boolean;
  subscriptionMonths?: number | null;
};

function Modal({ open, title, children, onClose, maxWidthClass = "max-w-lg" }: { open: boolean; title: string; children: React.ReactNode; onClose: () => void; maxWidthClass?: string }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className={`relative w-full ${maxWidthClass} rounded-lg bg-white p-5 shadow-xl`}>
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-base font-semibold text-gray-900">{title}</h3>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700">✕</button>
        </div>
        {children}
      </div>
    </div>
  );
}

function addMonths(date: Date, months: number) {
  const d = new Date(date.getTime());
  const day = d.getDate();
  d.setMonth(d.getMonth() + months);
  if (d.getDate() < day) {
    d.setDate(0);
  }
  return d;
}

function nextDateFromPeriod(paymentDate: Date, period: Period) {
  switch (period) {
    case "MONTHLY":
      return addMonths(paymentDate, 1);
    case "QUARTERLY":
      return addMonths(paymentDate, 3);
    case "ANNUAL":
      return addMonths(paymentDate, 12);
    default:
      return addMonths(paymentDate, 1);
  }
}

// Stable date formatter (yyyy-MM-dd) to avoid SSR/CSR locale mismatches

type ClientStatus = "ALL" | "UNPAID" | "LATE" | "UP_TO_DATE" | "NEW_THIS_MONTH";

function formatISODate(dateStr: string) {
  try {
    const d = new Date(dateStr);
    if (Number.isNaN(d.getTime())) return "";
    return d.toISOString().slice(0, 10);
  } catch {
    return "";
  }
}

function isPaymentValid(payment: Payment): boolean {
  try {
    if (!payment.nextPaymentDate) return false;
    const nextDate = new Date(payment.nextPaymentDate);
    const today = new Date();
    return !isNaN(nextDate.getTime()) && nextDate >= today;
  } catch {
    return false;
  }
}

function periodLabel(period: Period) {
  switch (period) {
    case "MONTHLY":
      return "Mensuel";
    case "QUARTERLY":
      return "3 mois";
    case "ANNUAL":
      return "Annuel";
    default:
      return String(period);
  }
}

export default function PaymentsPage() {
  const { t } = useI18n();
  const { format } = useCurrency();
  const [clients, setClients] = useState<Client[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [promotions, setPromotions] = useState<Promotion[]>([]);

  const [clientId, setClientId] = useState<number | "">("");
  const [subscriptionPeriod, setSubscriptionPeriod] = useState<Period | "">("MONTHLY");
  const [amount, setAmount] = useState<string>("");
  const [paymentDate, setPaymentDate] = useState<string>("");
  const [notes, setNotes] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [editing, setEditing] = useState<Payment | null>(null);
  const [promotionId, setPromotionId] = useState<number | "">("");
  const [receipt, setReceipt] = useState<Payment | null>(null);
  const [manualMonths, setManualMonths] = useState<string>("");
  const [dailyPass, setDailyPass] = useState<boolean>(false);
  const [paymentsQuery, setPaymentsQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<ClientStatus>("ALL");
  // Pagination for clients list
  const [clientPage, setClientPage] = useState(1);
  const CLIENTS_PER_PAGE = 5;

  const selectedPromotion = useMemo(() => {
    if (!promotionId) return undefined;
    return promotions.find((p) => p.id === promotionId);
  }, [promotions, promotionId]);

  const deletePayment = async (paymentId: number) => {
    try {
      if (!confirm("Confirmer la suppression de ce paiement ?")) return;
      const res = await fetch(`/api/payments/${paymentId}`, { method: "DELETE" });
      if (res.ok) setPayments((prev) => prev.filter((p) => p.id !== paymentId));
      else {
        const msg = await res.json().catch(()=>({ error: "Erreur inconnue" }));
        alert(msg?.error || "Échec de suppression du paiement.");
      }
    } catch (e: unknown) {
      const error = e instanceof Error ? e.message : "Échec réseau lors de la suppression.";
      alert(error);
    }
  };

  useEffect(() => {
    // Initialize paymentDate on client to avoid SSR/client timezone mismatches
    if (!paymentDate) {
      setPaymentDate(new Date().toISOString().slice(0, 10));
    }
    // Restore persisted filters
    try {
      const sf = localStorage.getItem("payments.statusFilter");
      const q = localStorage.getItem("payments.clientQuery");
      if (sf === "ALL" || sf === "UNPAID" || sf === "LATE" || sf === "UP_TO_DATE" || sf === "NEW_THIS_MONTH") {
        setStatusFilter(sf as ClientStatus);
      }
      if (typeof q === "string") setQuery(q);
    } catch {}
  }, [paymentDate]);

  useEffect(() => {
    void (async () => {
      try {
        const [cRes, pRes, prRes] = await Promise.all([
          fetch("/api/clients").catch(() => undefined),
          fetch("/api/payments").catch(() => undefined),
          fetch("/api/promotions").catch(() => undefined),
        ]);

        // Process all responses in parallel for better performance
        const [clientsData, paymentsData, promotionsData] = await Promise.all([
          cRes?.ok ? cRes.json().catch(() => []) : Promise.resolve([]),
          pRes?.ok ? pRes.json().catch(() => []) : Promise.resolve([]),
          prRes?.ok ? prRes.json().catch(() => []) : Promise.resolve([]),
        ]);

        setClients(Array.isArray(clientsData) ? clientsData : []);
        setPayments(Array.isArray(paymentsData) ? paymentsData : []);
        
        const activePromotions = Array.isArray(promotionsData) 
          ? promotionsData.filter((p: Promotion) => p.active) 
          : [];
        setPromotions(activePromotions);
      } catch {
        // en cas d'erreur réseau globale
        setClients([]);
        setPayments([]);
        setPromotions([]);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  // Reset to page 1 on query change
  useEffect(() => {
    setClientPage(1);
    try { localStorage.setItem("payments.clientQuery", query); } catch {}
  }, [query]);

  // Persist status filter and reset page
  useEffect(() => {
    setClientPage(1);
    try { localStorage.setItem("payments.statusFilter", statusFilter); } catch {}
  }, [statusFilter]);

  const computedNextDate = useMemo(() => {
    try {
      const d = new Date(paymentDate);
      if (Number.isNaN(d.getTime())) return "";
      // Daily pass: next day
      if (dailyPass) {
        const n = new Date(d.getTime());
        n.setDate(n.getDate() + 1);
        return n.toISOString().slice(0, 10);
      }
      // If a promotion with subscriptionMonths is selected, use it for next date
      if (selectedPromotion?.subscriptionMonths && selectedPromotion.subscriptionMonths > 0) {
        const n = addMonths(d, Number(selectedPromotion.subscriptionMonths));
        return n.toISOString().slice(0, 10);
      }
      // If no promotion, and user entered manual months, use that
      const mm = manualMonths ? Number(manualMonths) : NaN;
      if (Number.isInteger(mm) && mm > 0) {
        const n = addMonths(d, mm);
        return n.toISOString().slice(0, 10);
      }
      if (!subscriptionPeriod) return "";
      const n = nextDateFromPeriod(d, subscriptionPeriod as Period);
      return n.toISOString().slice(0, 10);
    } catch {
      return "";
    }
  }, [paymentDate, subscriptionPeriod, selectedPromotion, manualMonths, dailyPass]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!clientId) {
      alert("Veuillez choisir un client");
      return;
    }
    if (!selectedPromotion) {
      // When no promotion, require either a daily pass or manual months > 0
      const mm = manualMonths ? Number(manualMonths) : NaN;
      if (!dailyPass && (!Number.isInteger(mm) || mm <= 0)) {
        alert("Veuillez choisir Pass journée ou saisir le nombre de mois (entier > 0)");
        return;
      }
    } else {
      // With promotion, still ensure a period is set (auto selected)
      if (!subscriptionPeriod) {
        alert("Veuillez choisir la période d'abonnement");
        return;
      }
    }
    const numAmount = parseFloat(amount);
    if (!(numAmount > 0) || Number.isNaN(numAmount)) {
      alert("Veuillez saisir un montant valide");
      return;
    }

    // Check for overlapping payment periods
    const clientPayments = payments.filter(p => p.clientId === clientId);
    const paymentStartDate = new Date(paymentDate);
    const paymentEndDate = new Date(computedNextDate);
    
    for (const existingPayment of clientPayments) {
      const existingStart = new Date(existingPayment.paymentDate);
      const existingEnd = new Date(existingPayment.nextPaymentDate);
      
      // Check if the new payment period overlaps with any existing payment
      if ((paymentStartDate < existingEnd && paymentEndDate > existingStart)) {
        const clientName = clients.find(c => c.id === clientId)?.fullName || "";
        const existingPeriod = existingPayment.promotion?.subscriptionMonths 
          ? `${existingPayment.promotion.subscriptionMonths} mois` 
          : periodLabel(existingPayment.subscriptionPeriod);
        
        alert(`❌ PAIEMENT IMPOSSIBLE !\n\nLe client "${clientName}" a déjà un paiement actif pour cette période.\n\nPaiement existant :\n• Du ${formatISODate(existingPayment.paymentDate)} au ${formatISODate(existingPayment.nextPaymentDate)}\n• Période : ${existingPeriod}\n• Reçu #${existingPayment.id}\n\nVous ne pouvez pas enregistrer un nouveau paiement qui se chevauche avec cette période.\n\nVeuillez attendre la fin de la période actuelle ou modifier la date de début.`);
        return;
      }
    }

    // Confirmation before saving
    const clientName = clients.find(c => c.id === clientId)?.fullName || "";
    const promoName = selectedPromotion ? selectedPromotion.name : "—";
    const monthsInfo = dailyPass
      ? `Journée`
      : selectedPromotion?.subscriptionMonths
        ? `${selectedPromotion.subscriptionMonths} mois (promo)`
        : (manualMonths ? `${manualMonths} mois (manuel)` : periodLabel(subscriptionPeriod as Period));
    const message = `Confirmer l'enregistrement du paiement ?\n\nClient: ${clientName}\nMontant: ${(numAmount || 0).toFixed(2)} DT\nDate: ${paymentDate}\nProchaine échéance: ${computedNextDate}\nPromotion: ${promoName}\nPériode: ${monthsInfo}`;
    if (!confirm(message)) return;
    setLoading(true);
    try {
      const res = await fetch("/api/payments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          clientId,
          amount: numAmount,
          subscriptionPeriod: subscriptionPeriod as Period,
          paymentDate,
          nextPaymentDate: computedNextDate,
          notes: notes?.trim() ? notes.trim() : undefined,
          promotionId: promotionId || undefined,
          // manualMonths is only for client-side computation; server relies on nextPaymentDate
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err?.error || `HTTP ${res.status}`);
      }
      const created: Payment = await res.json();
      setPayments((prev) => [created, ...prev]);
      // reset minimal
      setAmount("");
      setNotes("");
      setPromotionId("");
      setManualMonths("");
      setDailyPass(false);
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : "Erreur lors de l'enregistrement du paiement";
      alert(errorMessage);
    } finally {
      setLoading(false);
    }
  }

  async function updatePayment(values: Partial<Payment>) {
    if (!editing) return;
    try {
      const res = await fetch(`/api/payments/${editing.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err?.error || `HTTP ${res.status}`);
      }
      const updated: Payment = await res.json();
      setPayments((prev) => prev.map((p) => (p.id === updated.id ? updated : p)));
      setEditing(null);
    } catch (e: unknown) {
      const errorMessage = e instanceof Error ? e.message : "Erreur lors de la mise à jour";
      alert(errorMessage);
    }
  }

  async function _removePayment(id: number) {
    if (!confirm("Confirmer la suppression de ce paiement ?")) return;
    const res = await fetch(`/api/payments/${id}`, { method: "DELETE" });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      alert(err?.error || `HTTP ${res.status}`);
      return;
    }
    setPayments((prev) => prev.filter((p) => p.id !== id));
  }

  // Compute summary: latest payment per client, then up-to-date vs due today
  const summary = useMemo(() => {
    const latestByClient = new Map<number, Payment>();
    for (const p of payments) {
      const current = latestByClient.get(p.clientId);
      if (!current || new Date(p.paymentDate) > new Date(current.paymentDate)) {
        latestByClient.set(p.clientId, p);
      }
    }
    const todayStr = new Date().toISOString().slice(0, 10);
    let upToDate = 0;
    let dueTodayOrPast = 0;
    for (const p of latestByClient.values()) {
      if (p.nextPaymentDate) {
        const nextDate = new Date(p.nextPaymentDate);
        if (!isNaN(nextDate.getTime())) {
          const nextStr = nextDate.toISOString().slice(0, 10);
          if (nextStr > todayStr) upToDate++;
          else dueTodayOrPast++;
        }
      }
    }
    return { upToDate, dueTodayOrPast, totalTracked: latestByClient.size };
  }, [payments]);

  // Precompute payment info by client for filters
  const perClientPayments = useMemo(() => {
    const map = new Map<number, Payment[]>();
    for (const p of payments) {
      if (!map.has(p.clientId)) map.set(p.clientId, []);
      map.get(p.clientId)!.push(p);
    }
    for (const arr of map.values()) arr.sort((a,b) => new Date(a.paymentDate).getTime() - new Date(b.paymentDate).getTime());
    return map;
  }, [payments]);

  const todayStr = new Date().toISOString().slice(0,10);
  const now = new Date();
  const curYear = String(now.getUTCFullYear());
  const curMonth = String(now.getUTCMonth()+1).padStart(2, '0');

  if (loading) {
    return (
      <RequireAuth>
        <main className="mx-auto max-w-6xl space-y-8 p-6">
          <div className="flex items-center justify-center min-h-[400px]">
            <div className="flex flex-col items-center space-y-6">
              <div className="relative">
                <div className="animate-spin rounded-full h-16 w-16 border-4 border-gray-200"></div>
                <div className="animate-spin rounded-full h-16 w-16 border-4 border-yellow-600 border-t-transparent absolute top-0 left-0"></div>
              </div>
              <div className="text-center">
                <div className="text-xl font-semibold text-gray-800">Chargement des paiements...</div>
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
    <main className="mx-auto max-w-6xl space-y-8 p-6">
      <header className="flex flex-col gap-1 sm:flex-row sm:items-baseline sm:justify-between">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-yellow-600">{t("payments.title", "Paiements")}</h1>
          <p className="mt-1 text-sm text-amber-700">{t("payments.subtitle", "Enregistrer un paiement et consulter l&apos;historique.")}</p>
        </div>
      </header>

      {/* Summary cards */}
      <section className="rounded-xl border border-yellow-300 bg-white p-5 shadow-sm">
        <h2 className="mb-4 text-base font-semibold text-slate-800">{t("payments.summary.title", "Synthèse abonnements")}</h2>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <div className="rounded-lg border border-slate-200 bg-white p-4">
            <div className="text-xs text-slate-600">{t("payments.summary.tracked", "Clients suivis")}</div>
            <div className="text-2xl font-extrabold text-red-700">{summary.totalTracked}</div>
          </div>
          <div className="rounded-lg border border-slate-200 bg-white p-4">
            <div className="text-xs text-slate-600">{t("payments.summary.upToDate", "À jour (échéance future)")}</div>
            <div className="text-2xl font-extrabold text-green-700">{summary.upToDate}</div>
          </div>
          <div className="rounded-lg border border-slate-200 bg-white p-4">
            <div className="text-xs text-slate-600">{t("payments.summary.due", "Doivent payer (aujourd&apos;hui ou passé)")}</div>
            <div className="text-2xl font-extrabold text-red-700">{summary.dueTodayOrPast}</div>
          </div>
        </div>
      </section>

      <section className="rounded-xl border border-yellow-300 bg-white p-5 shadow-sm">
        <h2 className="mb-3 text-base font-semibold text-gray-900">{t("payments.clients.title", "Clients")}</h2>
        <div className="mb-3 flex flex-wrap items-center gap-2">
          <button
            className={`rounded-md border px-3 py-1.5 text-xs ${statusFilter === 'ALL' ? 'bg-yellow-100 border-yellow-300 text-yellow-800' : 'hover:bg-gray-50'}`}
            onClick={() => setStatusFilter('ALL')}
          >{t("payments.filters.all", "Tous")}</button>
          <button
            className={`rounded-md border px-3 py-1.5 text-xs ${statusFilter === 'UNPAID' ? 'bg-red-100 border-red-300 text-red-800' : 'hover:bg-gray-50'}`}
            onClick={() => setStatusFilter('UNPAID')}
          >{t("payments.filters.unpaid", "Sans paiement")}</button>
          <button
            className={`rounded-md border px-3 py-1.5 text-xs ${statusFilter === 'LATE' ? 'bg-orange-100 border-orange-300 text-orange-800' : 'hover:bg-gray-50'}`}
            onClick={() => setStatusFilter('LATE')}
          >{t("payments.filters.late", "En retard")}</button>
          <button
            className={`rounded-md border px-3 py-1.5 text-xs ${statusFilter === 'UP_TO_DATE' ? 'bg-green-100 border-green-300 text-green-800' : 'hover:bg-gray-50'}`}
            onClick={() => setStatusFilter('UP_TO_DATE')}
          >{t("payments.filters.upToDate", "À jour")}</button>
          <button
            className={`rounded-md border px-3 py-1.5 text-xs ${statusFilter === 'NEW_THIS_MONTH' ? 'bg-blue-100 border-blue-300 text-blue-800' : 'hover:bg-gray-50'}`}
            onClick={() => setStatusFilter('NEW_THIS_MONTH')}
          >{t("payments.filters.newThisMonth", "Nouveaux ce mois")}</button>
        </div>
        <div className="mb-3">
          <input
            className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
            placeholder={t("payments.searchClient", "Rechercher par nom, email ou N° Carte Nationale...")}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>
        {(() => {
          let filtered = clients.filter(c => 
            (((c as any).fullname?.toLowerCase() || "")).includes(query.toLowerCase()) ||
            ((((c as any).email || "")).toLowerCase()).includes(query.toLowerCase()) ||
            ((((c as any).nationalid || "")).toLowerCase()).includes(query.toLowerCase())
          );
          if (statusFilter !== 'ALL') {
            filtered = filtered.filter((c) => {
              const arr = perClientPayments.get(c.id) || [];
              if (statusFilter === 'UNPAID') {
                return arr.length === 0; // never paid only
              }
              if (statusFilter === 'LATE') {
                if (arr.length === 0) return false; // exclude never paid from LATE
                const last = arr[arr.length - 1];
                if (last.nextPaymentDate) {
                  const nextDate = new Date(last.nextPaymentDate);
                  if (!isNaN(nextDate.getTime())) {
                    const nextStr = nextDate.toISOString().slice(0,10);
                    return nextStr <= todayStr; // due today or past
                  }
                }
                return false;
              }
              if (statusFilter === 'UP_TO_DATE') {
                if (arr.length === 0) return false;
                const last = arr[arr.length - 1];
                if (last.nextPaymentDate) {
                  const nextDate = new Date(last.nextPaymentDate);
                  if (!isNaN(nextDate.getTime())) {
                    const nextStr = nextDate.toISOString().slice(0,10);
                    return nextStr > todayStr;
                  }
                }
                return false;
              }
              if (statusFilter === 'NEW_THIS_MONTH') {
                if (arr.length === 0) return false;
                const first = arr[0];
                if (first.paymentDate) {
                  const paymentDate = new Date(first.paymentDate);
                  if (!isNaN(paymentDate.getTime())) {
                    const y = paymentDate.toISOString().slice(0,4);
                    const m = paymentDate.toISOString().slice(5,7);
                    return y === curYear && m === curMonth;
                  }
                }
                return false;
              }
              return true;
            });
          }
          const totalPages = Math.max(1, Math.ceil(filtered.length / CLIENTS_PER_PAGE));
          const page = Math.min(clientPage, totalPages);
          const start = (page - 1) * CLIENTS_PER_PAGE;
          const slice = filtered.slice(start, start + CLIENTS_PER_PAGE);
          return (
            <>
              <ul className="divide-y divide-gray-100">
                {slice.map((c) => (
                  <li key={c.id} className="flex items-center justify-between py-2">
                    <div className="text-sm">
                      <p className="font-medium text-gray-900 flex items-center gap-2">
                        {(c as any).fullname}
                        {(() => {
                          const arr = perClientPayments.get(c.id) || [];
                          if (arr.length === 0) return <span className="rounded bg-red-100 px-1.5 py-0.5 text-[10px] font-semibold text-red-700">Sans paiement</span>;
                          const last = arr[arr.length - 1];
                          let nextStr = '';
                          if (last.nextPaymentDate) {
                            const nextDate = new Date(last.nextPaymentDate);
                            if (!isNaN(nextDate.getTime())) {
                              nextStr = nextDate.toISOString().slice(0,10);
                            }
                          }
                          const first = arr[0];
                          let isNew = false;
                          if (first.paymentDate) {
                            const firstDate = new Date(first.paymentDate);
                            if (!isNaN(firstDate.getTime())) {
                              isNew = firstDate.toISOString().slice(0,4) === curYear && firstDate.toISOString().slice(5,7) === curMonth;
                            }
                          }
                          if (nextStr > todayStr) {
                            return (
                              <>
                                <span className="rounded bg-green-100 px-1.5 py-0.5 text-[10px] font-semibold text-green-700">À jour</span>
                                {isNew && <span className="rounded bg-blue-100 px-1.5 py-0.5 text-[10px] font-semibold text-blue-700">Nouveau</span>}
                              </>
                            );
                          }
                          return <span className="rounded bg-red-100 px-1.5 py-0.5 text-[10px] font-semibold text-red-700">En retard</span>;
                        })()}
                      </p>
                    </div>
                    <button
                      className={`rounded-md border px-2 py-1 text-xs ${clientId === c.id ? 'bg-blue-50 border-blue-200 text-blue-700' : 'hover:bg-gray-50'}`}
                      onClick={() => setClientId(c.id)}
                    >
                      {clientId === c.id ? 'Sélectionné' : 'Choisir'}
                    </button>
                  </li>
                ))}
                {slice.length === 0 && (
                  <li className="py-4 text-sm text-gray-500">Aucun client trouvé.</li>
                )}
              </ul>
              <div className="mt-3 flex items-center justify-between text-xs text-gray-600">
                <button
                  className="rounded border px-2 py-1 disabled:opacity-50"
                  onClick={() => setClientPage((p) => Math.max(1, p - 1))}
                  disabled={page <= 1}
                >
                  ← Précédent
                </button>
                <div>Page {page} / {totalPages}</div>
                <button
                  className="rounded border px-2 py-1 disabled:opacity-50"
                  onClick={() => setClientPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page >= totalPages}
                >
                  Suivant →
                </button>
              </div>
            </>
          );
        })()}
      </section>

      <section className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
        <h2 className="mb-4 text-base font-semibold text-gray-900">Nouveau paiement</h2>
        <form onSubmit={submit} className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <label className="text-sm">
            <span className="mb-1 block text-sm font-semibold label-title">Client</span>
            <select
              className="w-full rounded-md border border-neutral-300 px-3 py-2 text-gray-900 disabled:bg-neutral-100 disabled:text-neutral-400"
              value={clientId.toString()}
              onChange={(e) => {
                const val = e.target.value ? Number(e.target.value) : "";
                setClientId(val);
                if (val !== "") {
                  const c = clients.find(cc => cc.id === Number(val));
                  if (c && (c as any).subscriptionperiod) setSubscriptionPeriod((c as any).subscriptionperiod);
                  else setSubscriptionPeriod("MONTHLY");
                } else {
                  setSubscriptionPeriod("MONTHLY");
                }
              }}
              required
            >
              <option value="">Choisir un client…</option>
              {clients.map((c) => (
                <option key={c.id} value={c.id}>{(c as any).fullname}</option>
              ))}
            </select>
          </label>

          <label className="text-sm">
            <span className="mb-1 block text-sm font-semibold label-title">Promotion (optionnel)</span>
            <select
              className="w-full rounded-md border border-neutral-300 px-3 py-2 text-gray-900 disabled:bg-neutral-100 disabled:text-neutral-400"
              value={promotionId.toString()}
              onChange={(e) => {
                const val = e.target.value ? Number(e.target.value) : "";
                setPromotionId(val);
                if (val !== "") {
                  const promo = promotions.find(p => p.id === val);
                  if (promo) {
                    // Always enforce amount from promotion when selected
                    setAmount(String(promo.fixedPrice));
                    // Map months to enum period for storage/display; next date will still use exact months
                    if (promo.subscriptionMonths) {
                      const m = Number(promo.subscriptionMonths);
                      if (m === 1) setSubscriptionPeriod("MONTHLY");
                      else if (m === 3) setSubscriptionPeriod("QUARTERLY");
                      else if (m === 12) setSubscriptionPeriod("ANNUAL");
                    }
                  }
                }
              }}
            >
              <option value="">—</option>
              {promotions.map((p) => (
                <option key={p.id} value={p.id}>{p.name} — {(p.fixedPrice || 0).toFixed(2)} DT</option>
              ))}
            </select>
          </label>

          <label className="text-sm">
            <span className="mb-1 block text-sm font-semibold label-title">Période d&apos;abonnement</span>
            <select
              className="w-full rounded-md border border-neutral-300 px-3 py-2 text-gray-900 disabled:bg-neutral-100 disabled:text-neutral-400"
              value={subscriptionPeriod}
              onChange={(e) => setSubscriptionPeriod(e.target.value as Period | "")}
              disabled={!!selectedPromotion}
              required
            >
              <option value="" disabled>— Sélectionner —</option>
              <option value="MONTHLY">Mensuel</option>
              <option value="QUARTERLY">3 mois</option>
              <option value="ANNUAL">Annuel</option>
            </select>
          </label>

          {!selectedPromotion && (
            <>
              <label className="text-sm flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={dailyPass}
                  onChange={(e) => {
                    setDailyPass(e.target.checked);
                    if (e.target.checked) setManualMonths("");
                  }}
                />
                <span className="mb-1 block text-sm font-semibold label-title">Pass journée (1 jour)</span>
              </label>

              <label className="text-sm">
                <span className="mb-1 block text-sm font-semibold label-title">Nombre de mois (manuel)</span>
                <input
                  className="w-full rounded-md border px-3 py-2"
                  type="number"
                  min={1}
                  step={1}
                  value={manualMonths}
                  onChange={(e) => setManualMonths(e.target.value)}
                  placeholder="Ex: 4, 5, 6…"
                  disabled={dailyPass}
                  required={!dailyPass}
                />
              </label>
            </>
          )}

          <label className="text-sm">
            <span className="mb-1 block text-sm font-semibold label-title">Montant payé</span>
            <input
              className="w-full rounded-md border border-neutral-300 px-3 py-2 text-gray-900 placeholder:text-neutral-400 disabled:bg-neutral-100 disabled:text-neutral-400"
              type="number"
              min="0"
              step="0.01"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0.00"
              disabled={!!selectedPromotion}
              required
            />
          </label>

          <label className="text-sm">
            <span className="mb-1 block text-sm font-semibold label-title">Date de paiement</span>
            <input
              className="w-full rounded-md border border-neutral-300 px-3 py-2 text-gray-900 placeholder:text-neutral-400 disabled:bg-neutral-100 disabled:text-neutral-400"
              type="date"
              value={paymentDate}
              onChange={(e) => setPaymentDate(e.target.value)}
            />
          </label>

          <label className="text-sm">
            <span className="mb-1 block text-sm font-semibold label-title">Prochaine échéance (auto {dailyPass ? '— Journée' : selectedPromotion?.subscriptionMonths ? `— ${selectedPromotion.subscriptionMonths} mois via promotion` : manualMonths ? `— ${manualMonths} mois` : ""})</span>
            <input className="w-full rounded-md border border-neutral-300 px-3 py-2 bg-gray-50 text-gray-900" type="date" value={computedNextDate} readOnly />
          </label>

          <label className="text-sm sm:col-span-2">
            <span className="mb-1 block text-sm font-semibold label-title">Notes</span>
            <input className="w-full rounded-md border border-neutral-300 px-3 py-2 text-gray-900 placeholder:text-neutral-400" value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Optionnel" />
          </label>

          <div className="sm:col-span-2 mt-2 flex justify-end">
            <button
              type="submit"
              disabled={loading}
              className="rounded-md bg-blue-600 px-3 py-1.5 text-sm font-medium text-white shadow hover:bg-blue-700 disabled:opacity-60"
            >
              {loading ? "Enregistrement…" : "Enregistrer le paiement"}
            </button>
          </div>
        </form>
      </section>

      <section className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
        <div className="mb-3 flex items-center justify-between gap-3">
          <h2 className="text-base font-semibold text-gray-900">Paiements récents</h2>
          <input
            className="w-64 rounded-md border px-3 py-2 text-sm"
            placeholder="Rechercher par nom ou reçu #..."
            value={paymentsQuery}
            onChange={(e) => setPaymentsQuery(e.target.value)}
          />
        </div>
        <ul className="divide-y divide-gray-100">
          {payments
            .filter((p) => {
              if (!paymentsQuery.trim()) return true;
              const name = (((clients.find(c => c.id === p.clientId) as any)?.fullname || (p.client as any)?.fullname || "")).toLowerCase();
              const idStr = String(p.id);
              const q = paymentsQuery.toLowerCase().trim();
              return name.includes(q) || idStr.includes(q);
            })
            .slice(0, 5)
            .map((p) => (
            <li key={p.id} className="grid grid-cols-[80px_1fr_auto] items-center gap-3 py-3">
              <div className="text-xs text-gray-500">Reçu #{p.id}</div>
              <div>
                <p className="font-medium text-gray-900">
                  {(clients.find(c => c.id === p.clientId) as any)?.fullname || (p.client as any)?.fullname || "Client"}
                </p>
                <p className="text-xs text-gray-500">
                  {formatISODate(p.paymentDate)} → {formatISODate(p.nextPaymentDate)} · {p.promotion?.subscriptionMonths ? `${p.promotion.subscriptionMonths} mois` : periodLabel(p.subscriptionPeriod)}
                </p>
                {p.promotion ? (
                  <p className="text-xs text-gray-500">Promotion: {p.promotion.name}</p>
                ) : null}
              </div>
              <div className="flex items-center gap-3">
                <button className="rounded-md border px-2 py-1 text-xs hover:bg-gray-50" onClick={() => setReceipt(p)}>Reçu</button>
                <button className="rounded-md border border-red-300 bg-red-50 px-2 py-1 text-xs text-red-700 hover:bg-red-100" onClick={() => deletePayment(p.id)}>Supprimer</button>
                <div className="text-sm font-semibold text-gray-900">{(p.amount || 0).toFixed(2)} DT</div>
              </div>
            </li>
          ))}
          {payments.length === 0 && (
            <li className="py-6 text-sm text-gray-500">{t("payments.none", "Aucun paiement enregistré.")}</li>
          )}
        </ul>
        {payments.length > 5 && (
          <div className="mt-3 text-right">
            <a href="/receipts" className="text-sm font-medium text-red-700 hover:underline">Voir tous les reçus →</a>
          </div>
        )}
      </section>

      <Modal open={false} title="Modifier paiement" onClose={() => setEditing(null)}>
        {editing && (
          <form
            className="space-y-3"
            onSubmit={(e) => {
              e.preventDefault();
              const form = e.currentTarget as HTMLFormElement & {
                amount: { value: string };
                subscriptionPeriod: { value: Period };
                paymentDate: { value: string };
                nextPaymentDate: { value: string };
                notes: { value: string };
              };
              updatePayment({
                amount: Number(form.amount.value),
                subscriptionPeriod: form.subscriptionPeriod.value,
                paymentDate: form.paymentDate.value,
                nextPaymentDate: form.nextPaymentDate.value,
                notes: form.notes.value,
              });
            }}
          >
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <label className="text-sm">
                <span className="mb-1 block text-gray-700">Montant</span>
                <input name="amount" className="w-full rounded-md border px-3 py-2" type="number" min="0" step="0.01" defaultValue={editing.amount} />
              </label>
              <label className="text-sm">
                <span className="mb-1 block text-gray-700">Période</span>
                <select name="subscriptionPeriod" className="w-full rounded-md border px-3 py-2" defaultValue={(editing as any).subscriptionperiod}>
                  <option value="MONTHLY">Mensuel</option>
                  <option value="QUARTERLY">3 mois</option>
                  <option value="ANNUAL">Annuel</option>
                </select>
              </label>
              <label className="text-sm">
                <span className="mb-1 block text-gray-700">Date de paiement</span>
                <input name="paymentDate" className="w-full rounded-md border px-3 py-2" type="date" defaultValue={editing.paymentDate.slice(0,10)} />
              </label>
              <label className="text-sm">
                <span className="mb-1 block text-gray-700">Prochaine échéance</span>
                <input name="nextPaymentDate" className="w-full rounded-md border px-3 py-2" type="date" defaultValue={editing.nextPaymentDate.slice(0,10)} />
              </label>
              <label className="text-sm sm:col-span-2">
                <span className="mb-1 block text-gray-700">Notes</span>
                <input name="notes" className="w-full rounded-md border px-3 py-2" defaultValue={editing.notes || ""} />
              </label>
            </div>
            <div className="mt-4 flex justify-end gap-2">
              <button type="button" className="rounded-md border border-slate-300 bg-white px-3 py-1.5 text-sm hover:bg-slate-50" onClick={() => setEditing(null)}>Annuler</button>
              <button type="submit" className="rounded-md border border-yellow-400 bg-black px-3 py-1.5 text-sm font-medium text-yellow-400 hover:bg-neutral-900">Enregistrer</button>
            </div>
          </form>
        )}
      </Modal>

      {/* Receipt Modal (A2 single page) */}
      <Modal open={!!receipt} title={t("receipt.modal.title", "Reçu de paiement (A4)")} onClose={() => setReceipt(null)} maxWidthClass="max-w-5xl">
        {receipt && (
          <div className="max-h-[80vh] overflow-y-auto">
            <style>{`
              @media print {
                @page { size: A4 portrait; margin: 12mm; }
                html, body { height: auto !important; overflow: visible !important; }
                body * { visibility: hidden !important; }
                .printable, .printable * { visibility: visible !important; }
                .no-print { display: none !important; }
                .printable { break-inside: avoid !important; page-break-inside: avoid !important; page-break-before: avoid !important; page-break-after: avoid !important; }
              }
            `}</style>
            <div className="mx-auto max-w-[900px]">
              <div className="printable rounded-xl border-2 border-yellow-700 p-6 text-sm">
                {/* Header with Logo and Payment Status */}
                <div className="mb-6 flex items-start justify-between">
                  <div className="flex items-center gap-4">
                    <img src="/images/logo.png" alt="BODY MASTER" className="h-16 w-16 object-contain" />
                    <div>
                      <h2 className="text-2xl font-extrabold tracking-tight text-yellow-700">BODY MASTER</h2>
                      <p className="mt-1 text-sm font-semibold text-yellow-600">{t("receipt.title", "Reçu de paiement")}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="mb-2">
                      <span className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-medium ${
                        isPaymentValid(receipt) 
                          ? 'bg-green-100 text-green-800' 
                          : 'bg-red-100 text-red-800'
                      }`}>
                        {isPaymentValid(receipt) ? '✓ PAYEMENT VALIDE' : '✗ PAYEMENT EXPIRÉ'}
                      </span>
                    </div>
                    <div className="text-xs text-gray-700">
                      <div>{t("receipt.number", "Reçu N°")} : <strong>#{receipt.id}</strong></div>
                      <div>{t("receipt.date", "Date")} : <strong>{formatISODate(receipt.paymentDate)}</strong></div>
                    </div>
                  </div>
                </div>

                {/* Client Information Section */}
                <div className="mb-6 rounded-lg bg-gray-50 p-4">
                  <h3 className="mb-3 text-sm font-bold text-gray-800">INFORMATIONS CLIENT</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <div><span className="font-semibold text-gray-700">Nom complet:</span> {(clients.find(c => c.id === receipt.clientId) as any)?.fullname || (receipt.client as any)?.fullname || "N/A"}</div>
                    </div>
                    <div className="space-y-2">
                      <div><span className="font-semibold text-gray-700">ID Client:</span> #{receipt.clientId}</div>
                    </div>
                  </div>
                </div>

                {/* Payment Information */}
                <div className="mb-6 grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <div><span className="font-semibold">{t("receipt.due", "Échéance")}:</span> {formatISODate(receipt.nextPaymentDate)}</div>
                    <div><span className="font-semibold">{t("receipt.period", "Période")}:</span> {receipt.promotion?.subscriptionMonths ? `${receipt.promotion.subscriptionMonths} ${t("common.months", "mois")}` : periodLabel(receipt.subscriptionPeriod)}</div>
                    {receipt.promotion && (
                      <div><span className="font-semibold">{t("receipt.promotion", "Promotion")}:</span> {receipt.promotion.name}</div>
                    )}
                  </div>
                  <div className="space-y-2">
                    <div><span className="font-semibold">Statut:</span> 
                      <span className={`ml-2 ${isPaymentValid(receipt) ? 'text-green-600 font-bold' : 'text-red-600 font-bold'}`}>
                        {isPaymentValid(receipt) ? 'ACTIF' : 'EXPIRÉ'}
                      </span>
                    </div>
                    <div><span className="font-semibold">Validité:</span> {isPaymentValid(receipt) ? 'Jusqu\'au ' + formatISODate(receipt.nextPaymentDate) : 'Expiré depuis le ' + formatISODate(receipt.nextPaymentDate)}</div>
                  </div>
                </div>

                {/* Amount Section */}
                <div className={`mb-6 rounded-lg p-4 text-2xl font-extrabold ${
                  isPaymentValid(receipt) ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'
                }`}>
                  <div className="flex items-center justify-between">
                    <span>{t("receipt.paidAmount", "Montant payé")} :</span>
                    <span>{format(receipt.amount)}</span>
                  </div>
                </div>

                {/* Notes */}
                {receipt.notes ? (
                  <div className="mb-8 rounded-lg bg-yellow-50/40 p-4 text-xs text-gray-700">
                    <div className="mb-1 font-semibold text-gray-800">{t("common.notes", "Notes")}</div>
                    <div>{receipt.notes}</div>
                  </div>
                ) : null}

                {/* Signatures */}
                <div className="mt-6 grid grid-cols-2 gap-6">
                  <div>
                    <div className="h-16 border-b-2 border-yellow-800" />
                    <div className="mt-2 text-xs text-gray-600">{t("receipt.sign.client", "Signature Client")}</div>
                  </div>
                  <div className="text-right">
                    <div className="h-16 border-b-2 border-yellow-800" />
                    <div className="mt-2 text-xs text-gray-600">{t("receipt.sign.gym", "Visa et Signature Salle")}</div>
                  </div>
                </div>
              </div>
            </div>
            <div className="mt-4 flex items-center justify-center gap-4 no-print">
              <button className="rounded-md bg-yellow-600 px-4 py-2 text-sm font-medium text-white hover:bg-yellow-700" onClick={() => window.print()}>🖨️ {t("common.printA4", "Imprimer (A4)")}</button>
              <button className="rounded-md border border-yellow-700 px-4 py-2 text-sm text-yellow-700 hover:bg-yellow-50" onClick={() => setReceipt(null)}>{t("common.close", "Fermer")}</button>
            </div>
          </div>
        )}
      </Modal>
    </main>
    </RequireAuth>
  );
}
