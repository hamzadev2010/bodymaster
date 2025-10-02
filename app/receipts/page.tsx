"use client";

import { useEffect, useMemo, useState } from "react";
import { useI18n } from "@/app/i18n/I18nProvider";
import { useCurrency } from "@/app/lib/CurrencyProvider";
import RequireAuth from "@/app/lib/RequireAuth";

type Period = "MONTHLY" | "QUARTERLY" | "ANNUAL";

type Payment = {
  id: number;
  clientId: number;
  amount: number;
  paymentDate: string;
  nextPaymentDate: string;
  subscriptionPeriod: Period;
  notes?: string | null;
  client?: { id: number; fullName: string };
  promotion?: { id: number; name: string; subscriptionMonths?: number | null } | null;
};

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

function isDailyPass(p: Payment): boolean {
  try {
    const start = new Date(p.paymentDate);
    const next = new Date(p.nextPaymentDate);
    const diff = (next.getTime() - start.getTime()) / (24 * 60 * 60 * 1000);
    // Allow small timezone rounding differences
    return Math.abs(diff - 1) < 0.01;
  } catch {
    return false;
  }
}

function formatISODate(dateStr: string) {
  try {
    const d = new Date(dateStr);
    if (Number.isNaN(d.getTime())) return "";
    return d.toISOString().slice(0, 10);
  } catch {
    return "";
  }
}

export default function ReceiptsPage() {
  const { t } = useI18n();
  const { format } = useCurrency();
  const [payments, setPayments] = useState<Payment[]>([]);
  const [clients, setClients] = useState<{ id: number; fullName: string }[]>([]);
  const [q, setQ] = useState("");
  const [year, setYear] = useState<string>("");
  const [month, setMonth] = useState<string>("");
  const [day, setDay] = useState<string>("");
  const [page, setPage] = useState(1);
  const PER_PAGE = 10;
  const [receipt, setReceipt] = useState<Payment | null>(null);

  useEffect(() => {
    void (async () => {
      const [pRes, cRes] = await Promise.all([
        fetch("/api/payments").catch(() => undefined),
        fetch("/api/clients").catch(() => undefined),
      ]);
      if (pRes?.ok) setPayments(await pRes.json());
      if (cRes?.ok) setClients(await cRes.json());
    })();
    // Restore filters
    try {
      const savedQ = localStorage.getItem("receipts.q");
      const savedY = localStorage.getItem("receipts.year");
      const savedM = localStorage.getItem("receipts.month");
      const savedD = localStorage.getItem("receipts.day");
      if (typeof savedQ === "string") setQ(savedQ);
      if (typeof savedY === "string") setYear(savedY);
      if (typeof savedM === "string") setMonth(savedM);
      if (typeof savedD === "string") setDay(savedD);
    } catch {}
  }, []);

  const filtered = useMemo(() => {
    let arr = payments;
    if (q.trim()) {
      const qq = q.toLowerCase().trim();
      arr = arr.filter((p) => {
        const name = (p.client?.fullName || clients.find(c => c.id === p.clientId)?.fullName || "").toLowerCase();
        return String(p.id).includes(qq) || name.includes(qq);
      });
    }
    if (year) {
      arr = arr.filter((p) => formatISODate(p.paymentDate).startsWith(year + "-"));
    }
    if (month) {
      arr = arr.filter((p) => formatISODate(p.paymentDate).slice(5,7) === month);
    }
    if (day) {
      arr = arr.filter((p) => formatISODate(p.paymentDate).slice(8,10) === day);
    }
    return arr.sort((a,b) => new Date(b.paymentDate).getTime() - new Date(a.paymentDate).getTime());
  }, [payments, clients, q, year, month, day]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PER_PAGE));
  const curPage = Math.min(page, totalPages);
  const slice = filtered.slice((curPage - 1) * PER_PAGE, (curPage) * PER_PAGE);

  return (
    <RequireAuth>
    <main className="mx-auto max-w-6xl space-y-8 p-6">
      <header className="flex flex-col gap-1 sm:flex-row sm:items-baseline sm:justify-between">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-yellow-600">{t("receipts.title", "Reçus")}</h1>
          <p className="mt-1 text-sm text-amber-700">{t("receipts.subtitle", "Historique des reçus avec recherche et archives.")}</p>
        </div>
      </header>

      <section className="rounded-xl border border-yellow-300 bg-white p-5 shadow-sm">
        <div className="mb-3 grid grid-cols-1 gap-3 md:grid-cols-5">
          <input className="w-full rounded-md border px-3 py-2 text-sm" placeholder="Rechercher par nom ou reçu #..." value={q} onChange={(e) => { setQ(e.target.value); setPage(1); try { localStorage.setItem("receipts.q", e.target.value); } catch {} }} />
          <select className="w-full rounded-md border border-neutral-300 px-3 py-2 text-gray-900" value={year} onChange={(e) => { setYear(e.target.value); setPage(1); try { localStorage.setItem("receipts.year", e.target.value); } catch {} }}>
            <option value="">Année</option>
            {Array.from(new Set(payments.map(p => formatISODate(p.paymentDate).slice(0,4)))).filter(Boolean).sort().map(y => (
              <option key={y} value={y}>{y}</option>
            ))}
          </select>
          <select className="w-full rounded-md border border-neutral-300 px-3 py-2 text-gray-900" value={month} onChange={(e) => { setMonth(e.target.value); setPage(1); try { localStorage.setItem("receipts.month", e.target.value); } catch {} }}>
            <option value="">Mois</option>
            {Array.from({ length: 12 }, (_, i) => String(i+1).padStart(2, '0')).map(m => (
              <option key={m} value={m}>{m}</option>
            ))}
          </select>
          <select className="w-full rounded-md border border-neutral-300 px-3 py-2 text-gray-900" value={day} onChange={(e) => { setDay(e.target.value); setPage(1); try { localStorage.setItem("receipts.day", e.target.value); } catch {} }}>
            <option value="">Jour</option>
            {Array.from({ length: 31 }, (_, i) => String(i+1).padStart(2, '0')).map(d => (
              <option key={d} value={d}>{d}</option>
            ))}
          </select>
        </div>

        <ul className="divide-y divide-gray-100">
          {slice.map((p) => (
            <li key={p.id} className="grid grid-cols-[80px_1fr_auto] items-center gap-3 py-3">
              <div className="text-xs text-gray-500">Reçu #{p.id}</div>
              <div>
                <p className="font-medium text-gray-900">{p.client?.fullName || clients.find(c => c.id === p.clientId)?.fullName || "Client"}</p>
                <p className="text-xs text-gray-500">{formatISODate(p.paymentDate)} → {formatISODate(p.nextPaymentDate)} · {p.promotion?.subscriptionMonths ? `${p.promotion.subscriptionMonths} mois` : periodLabel(p.subscriptionPeriod)}</p>
                {p.promotion ? <p className="text-xs text-gray-500">Promotion: {p.promotion.name}</p> : null}
              </div>
              <div className="flex items-center gap-3">
                <button className="rounded-md border px-2 py-1 text-xs hover:bg-gray-50" onClick={() => setReceipt(p)}>Reçu</button>
                <div className="text-sm font-semibold text-gray-900">{format(p.amount)}</div>
              </div>
            </li>
          ))}
          {slice.length === 0 && (
            <li className="py-6 text-sm text-gray-500">Aucun reçu.</li>
          )}
        </ul>

        <div className="mt-3 flex items-center justify-between text-xs text-gray-600">
          <button className="rounded border px-2 py-1 disabled:opacity-50" onClick={() => setPage(p => Math.max(1, p-1))} disabled={curPage <= 1}>← Précédent</button>
          <div>{t("common.pageOf", "Page")} {curPage} / {totalPages}</div>
          <button className="rounded border px-2 py-1 disabled:opacity-50" onClick={() => setPage(p => Math.min(totalPages, p+1))} disabled={curPage >= totalPages}>{t("common.next", "Suivant")} →</button>
        </div>
      </section>

      <ReceiptModal receipt={receipt} onClose={() => setReceipt(null)} clients={clients} />
    </main>
    </RequireAuth>
  );
}

function ReceiptModal({ receipt, onClose, clients }: { receipt: Payment | null; onClose: () => void; clients: { id: number; fullName: string }[] }) {
  if (!receipt) return null;
  const { format } = useCurrency();
  const { t } = useI18n();
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative w-full max-w-5xl rounded-lg bg-white p-6 shadow-xl">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-base font-semibold text-gray-900">{t("receipt.modal.title", "Reçu de paiement (A4)")}</h3>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700" aria-label={t("common.close", "Fermer")}>
            ✕
          </button>
        </div>
        <div className="max-h-[80vh] overflow-y-auto">
          <style>{`
            @media print {
              @page { size: A2 portrait; margin: 12mm; }
              html, body { height: auto !important; overflow: visible !important; }
              body * { visibility: hidden !important; }
              .printable, .printable * { visibility: visible !important; }
              .no-print { display: none !important; }
              .printable { break-inside: avoid !important; page-break-inside: avoid !important; page-break-before: avoid !important; page-break-after: avoid !important; }
            }
          `}</style>
          <div className="mx-auto max-w-[900px]">
            <div className="printable rounded-xl border-2 border-yellow-700 p-5 text-sm">
              <div className="mb-6 flex items-start justify-between">
                <div>
                  <h2 className="text-xl font-extrabold tracking-tight text-yellow-700">BODY MASTER</h2>
                  <p className="mt-1 text-xs font-semibold text-yellow-600">{t("receipt.title", "Reçu de paiement")}</p>
                </div>
                <div className="text-right text-xs text-gray-200 md:text-gray-700">
                  <div>{t("receipt.number", "Reçu N°")} : <strong>#{receipt.id}</strong></div>
                  <div>{t("receipt.date", "Date")} : <strong>{formatISODate(receipt.paymentDate)}</strong></div>
                </div>
              </div>
              <div className="mb-6 grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <div><span className="font-semibold">{t("receipt.client", "Client")}:</span> {receipt.client?.fullName || clients.find(c => c.id === receipt.clientId)?.fullName || ""}</div>
                  {receipt.promotion && (
                    <div><span className="font-semibold">{t("receipt.promotion", "Promotion")}:</span> {receipt.promotion.name}</div>
                  )}
                </div>
                <div className="space-y-2">
                  <div><span className="font-semibold">{t("receipt.due", "Échéance")}:</span> {formatISODate(receipt.nextPaymentDate)}</div>
                  <div><span className="font-semibold">{t("receipt.period", "Période")}:</span> {isDailyPass(receipt) ? t("receipt.daypass", "Journée") : (receipt.promotion?.subscriptionMonths ? `${receipt.promotion.subscriptionMonths} ${t("common.months", "mois")}` : periodLabel(receipt.subscriptionPeriod))}</div>
                </div>
              </div>
              <div className="mb-6 rounded-lg bg-yellow-50 p-4 text-2xl font-extrabold text-yellow-700">
                {t("receipt.paidAmount", "Montant payé")} : {format(receipt.amount)}
              </div>
              {receipt.notes ? (
                <div className="mb-8 rounded-lg bg-yellow-50/40 p-4 text-xs text-gray-700">
                  <div className="mb-1 font-semibold text-gray-800">{t("common.notes", "Notes")}</div>
                  <div>{receipt.notes}</div>
                </div>
              ) : null}
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
            <button className="rounded-md bg-yellow-600 px-4 py-2 text-sm font-medium text-white hover:bg-yellow-700" onClick={() => window.print()}>🖨️ {t("common.printA2", "Imprimer (A2)")}</button>
            <button className="rounded-md border border-yellow-700 px-4 py-2 text-sm text-yellow-700 hover:bg-yellow-50" onClick={onClose}>{t("common.close", "Fermer")}</button>
          </div>
        </div>
      </div>
    </div>
  );
}
