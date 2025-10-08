"use client";

import { useEffect, useMemo, useState, useCallback } from "react";
import RequireAuth from "@/app/lib/RequireAuth";
import type { CSVData, CSVRow, CSVFormatter, CellFormatter } from "@/app/types";

type Client = { id: number; fullName: string; phone?: string | null; nationalId?: string | null };

type PresenceEntry = {
  id: number;
  clientId: number;
  clientName: string;
  timeISO: string;
};

type PresenceWithClient = {
  id: number;
  clientId: number;
  time: string;
  client: Client | null;
};

const toCSV: CSVFormatter = (rows: CSVData): string => {
  return rows.map((r) => r.map((c) => formatCSVCell(c)).join(",")).join("\n");
};

const formatCSVCell: CellFormatter = (v: unknown): string => {
  const s = (v ?? "").toString();
  if (s.includes(",") || s.includes("\n") || s.includes('"')) {
    return '"' + s.replace(/"/g, '""') + '"';
  }
  return s;
};

export default function PresencePage() {
  const [clients, setClients] = useState<Client[]>([]);
  const [q, setQ] = useState("");
  const [entries, setEntries] = useState<PresenceEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [error, setError] = useState<string>("");
  const [selectedDate, setSelectedDate] = useState<string>(() => new Date().toISOString().slice(0,10));

  // Load clients
  useEffect(() => {
    void (async () => {
      try {
        const res = await fetch("/api/clients");
        if (res.ok) {
          setClients(await res.json());
        } else {
          const errorData = await res.json().catch(() => ({}));
          setError(`Erreur ${res.status}: ${errorData.error || "Impossible de charger la liste des clients."}`);
        }
      } catch (err) {
        setError("Erreur de connexion au serveur.");
      }
    })();
  }, []);

  // Load presence for selected date from server (fallback to filtering if endpoint doesn't support date)
  useEffect(() => {
    void (async () => {
      try {
        setLoading(true);
        let res = await fetch(`/api/presence?date=${selectedDate}`).catch(() => undefined);
        if (!res || !res.ok) {
          // Fallback to default endpoint and filter client-side if needed
          res = await fetch("/api/presence").catch(() => undefined);
        }
        if (res && res.ok) {
          const list = await res.json();
          const arr: PresenceWithClient[] = Array.isArray(list) ? list : [];
          // If API returned mixed dates, filter by selectedDate
          const mapped: PresenceEntry[] = arr
            .filter((p: PresenceWithClient) => {
              const d = new Date(p.time);
              return d.toISOString().slice(0,10) === selectedDate;
            })
            .map((p: PresenceWithClient) => ({ id: p.id, clientId: p.clientId, clientName: p.client?.fullName || "", timeISO: p.time }));
          setEntries(mapped);
        } else {
          const errorData = await res?.json().catch(() => ({})) || {};
          const status = res?.status || 500;
          setError(`Erreur ${status}: ${errorData.error || "Impossible de charger les présences."}`);
        }
      } finally {
        setLoading(false);
        setInitialLoading(false);
      }
    })();
  }, [selectedDate]);

  const filtered = useMemo(() => {
    const needle = q.toLowerCase().trim().replace(/\s+/g, "");
    if (!needle) return clients;
    return clients.filter((c) => {
      const name = (c.fullName || "").toLowerCase();
      const phone = (c.phone || "").replace(/\s+/g, "").replace(/\D/g, "");
      const cin = (c.nationalId || "").toLowerCase().replace(/\s+/g, "").replace(/\D/g, "");
      const needleNumbers = needle.replace(/\D/g, "");
      return name.includes(needle) || phone.includes(needleNumbers) || cin.includes(needleNumbers);
    });
  }, [clients, q]);

  async function checkIn(client: Client) {
    try {
      setError("");
      const res = await fetch("/api/presence", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ clientId: client.id }) });
      if (res.ok) {
        const created = await res.json();
        const entry: PresenceEntry = { id: created.id, clientId: client.id, clientName: client.fullName, timeISO: created.time };
        setEntries((prev) => [entry, ...prev]);
      } else {
        const msg = await res.json().catch(()=>({ error: "Erreur inconnue" }));
        setError(msg?.error || "Échec de pointage du client.");
      }
    } catch (e: unknown) {
      const error = e instanceof Error ? e.message : "Échec réseau lors du pointage.";
      setError(error);
    }
  }

  async function removeEntry(id: number) {
    try {
      setError("");
      if (!confirm("Confirmer la suppression de ce pointage ?")) return;
      const res = await fetch(`/api/presence/${id}`, { method: "DELETE" });
      if (res.ok) setEntries((prev) => prev.filter((e) => e.id !== id));
      else {
        const msg = await res.json().catch(()=>({ error: "Erreur inconnue" }));
        setError(msg?.error || "Échec de suppression de la présence.");
      }
    } catch (e: unknown) {
      const error = e instanceof Error ? e.message : "Échec réseau lors de la suppression.";
      setError(error);
    }
  }

  const exportCSV = useCallback(() => {
    const header: CSVRow = ["date_iso", "jour", "heure", "client_id", "client_nom"];
    const rows: CSVData = entries
      .slice()
      .sort((a, b) => new Date(a.timeISO).getTime() - new Date(b.timeISO).getTime())
      .map((e) => {
        const dt = new Date(e.timeISO);
        const dateIso = dt.toISOString().slice(0, 10);
        const jour = new Intl.DateTimeFormat('fr-FR', { weekday: 'long' }).format(dt);
        const hh = String(dt.getHours()).padStart(2, '0');
        const mm = String(dt.getMinutes()).padStart(2, '0');
        const ss = String(dt.getSeconds()).padStart(2, '0');
        const heure = `${hh}:${mm}:${ss}`;
        return [dateIso, jour, heure, e.clientId.toString(), e.clientName];
      });
    const csv = toCSV([header, ...rows]);
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `presence-${selectedDate}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }, [entries, selectedDate]);

  // Auto-download CSV once per day (today) on first visit
  useEffect(() => {
    try {
      const today = new Date().toISOString().slice(0,10);
      const key = `presence.autodownload.${today}`;
      if (!localStorage.getItem(key)) {
        // Only auto-download for today's date to avoid surprising past fetches
        if (selectedDate === today && entries.length > 0) {
          exportCSV();
          localStorage.setItem(key, "1");
        }
      }
    } catch {}
  }, [selectedDate, entries.length, exportCSV]);

  if (initialLoading) {
    return (
      <RequireAuth>
        <main className="mx-auto max-w-6xl space-y-6 p-6">
          <div className="flex items-center justify-center min-h-[400px]">
            <div className="flex flex-col items-center space-y-4">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-yellow-600"></div>
              <div className="text-lg font-medium text-gray-700">Chargement de la présence...</div>
            </div>
          </div>
        </main>
      </RequireAuth>
    );
  }

  return (
    <RequireAuth>
      <main className="mx-auto max-w-6xl space-y-6 p-6">
        <header className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-extrabold tracking-tight text-yellow-600">Présence</h1>
            <p className="mt-1 text-sm text-amber-700">Pointage du jour (stocké en base de données). Export CSV disponible.</p>
          </div>
          <div className="flex items-center gap-2">
            <input type="date" className="rounded-md border border-yellow-300 px-3 py-1.5 text-sm" value={selectedDate} onChange={(e)=>setSelectedDate(e.target.value)} />
            <button className="rounded-md border border-red-300 bg-white px-3 py-1.5 text-xs font-medium text-red-700 hover:bg-red-50" onClick={exportCSV}>Exporter CSV</button>
          </div>
        </header>

        {error && (
          <div className="rounded-md border border-red-500/40 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}

        <section className="rounded-xl border border-yellow-300 bg-white p-5 shadow-sm">
          <div className="mb-3">
            <input className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800 placeholder:text-slate-400" placeholder="Rechercher par nom, téléphone ou CIN..." value={q} onChange={(e)=>setQ(e.target.value)} />
          </div>
          <div className="grid grid-cols-1 gap-2 md:grid-cols-2 lg:grid-cols-3">
            {filtered.map((c) => (
              <button key={c.id} className="rounded-md border border-slate-300 bg-white px-3 py-2 text-left text-sm text-slate-700 hover:bg-red-50 hover:border-red-300" onClick={() => checkIn(c)}>
                #{c.id} — {c.fullName}
                <span className="ml-2 rounded bg-red-100 px-1.5 py-0.5 text-[10px] font-semibold text-red-700">Pointer</span>
              </button>
            ))}
            {filtered.length === 0 && (
              <div className="text-sm text-slate-500">Aucun client.</div>
            )}
          </div>
        </section>

        <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="mb-3 text-xs uppercase tracking-wide text-slate-500">Présences du jour</div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200">
              <thead>
                <tr className="bg-slate-50">
                  <th className="px-3 py-2 text-left text-xs font-semibold text-slate-600">#</th>
                  <th className="px-3 py-2 text-left text-xs font-semibold text-slate-600">Client</th>
                  <th className="px-3 py-2 text-left text-xs font-semibold text-slate-600">Heure</th>
                  <th className="px-3 py-2 text-right text-xs font-semibold text-slate-600">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {loading && (
                  <tr><td colSpan={4} className="px-3 py-3 text-xs text-slate-500">Chargement…</td></tr>
                )}
                {entries.map((e) => (
                  <tr key={e.id} className="hover:bg-slate-50">
                    <td className="px-3 py-2 text-sm text-slate-700">{e.id}</td>
                    <td className="px-3 py-2 text-sm font-medium text-slate-800">{e.clientName}</td>
                    <td className="px-3 py-2 text-sm text-slate-700">{new Date(e.timeISO).toLocaleTimeString()}</td>
                    <td className="px-3 py-2 text-right">
                      <button className="rounded-md border border-red-300 bg-white px-2 py-1 text-xs text-red-700 hover:bg-red-50" onClick={() => removeEntry(e.id)}>Retirer</button>
                    </td>
                  </tr>
                ))}
                {entries.length === 0 && !loading && (
                  <tr><td colSpan={4} className="px-3 py-4 text-sm text-slate-500">Aucun pointage effectué aujourd&apos;hui.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </section>
      </main>
    </RequireAuth>
  );
}
