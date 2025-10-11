"use client";

import { useEffect, useMemo, useState, useCallback } from "react";
import RequireAuth from "@/app/lib/RequireAuth";
import type { CSVData, CSVRow, CSVFormatter, CellFormatter } from "@/app/types";
import { API_URL } from "@/app/lib/api";
import * as XLSX from 'xlsx-js-style';

type Client = { id: number; fullName: string; phone?: string | null };

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
        const res = await fetch(`${API_URL}/clients.php`);
        if (res.ok) setClients(await res.json());
        else setError("Impossible de charger la liste des clients.");
      } catch {}
    })();
  }, []);

  // Load presence for selected date from server (fallback to filtering if endpoint doesn't support date)
  useEffect(() => {
    void (async () => {
      try {
        setLoading(true);
        let res = await fetch(`${API_URL}/presence.php?date=${selectedDate}`).catch(() => undefined);
        if (!res || !res.ok) {
          // Fallback to default endpoint and filter client-side if needed
          res = await fetch(`${API_URL}/presence.php`).catch(() => undefined);
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
          setError("Impossible de charger les présences.");
        }
      } finally {
        setLoading(false);
        setInitialLoading(false);
      }
    })();
  }, [selectedDate]);

  const filtered = useMemo(() => {
    const needle = q.toLowerCase().trim();
    if (!needle) return clients;
    return clients.filter((c) => {
      const name = (c.fullName || "").toLowerCase();
      const phone = (c.phone || "").replace(/\s+/g, "");
      return name.includes(needle) || phone.includes(needle.replace(/\D/g, ""));
    });
  }, [clients, q]);

  async function checkIn(client: Client) {
    try {
      setError("");
      const res = await fetch(`${API_URL}/presence.php`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ clientId: client.id }) });
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
      const res = await fetch(`${API_URL}/presence-detail.php?id=${id}`, { method: "DELETE" });
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
    // Create styled Excel export with colors and auto-sized columns
    const sortedEntries = entries
      .slice()
      .sort((a, b) => new Date(a.timeISO).getTime() - new Date(b.timeISO).getTime());
    
    // Prepare data for Excel
    const excelData: any[][] = [];
    
    // Title section - 3 columns merged
    excelData.push(['BODYMASTER', '', '', '', '', '']);
    excelData.push(['Rapport de Présence', '', '', '', '', '']);
    excelData.push([`${new Date(selectedDate).toLocaleDateString('fr-FR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}`, '', '', '', 'Total:', `${sortedEntries.length}`]);
    excelData.push([]); // Empty row
    
    // Header row
    excelData.push(['N°', 'ID Client', 'Nom du Client', 'Date', 'Jour', 'Heure']);
    
    // Data rows
    sortedEntries.forEach((e, index) => {
        const dt = new Date(e.timeISO);
      const dateIso = dt.toLocaleDateString('fr-FR');
        const jour = new Intl.DateTimeFormat('fr-FR', { weekday: 'long' }).format(dt);
      const jourCap = jour.charAt(0).toUpperCase() + jour.slice(1);
        const hh = String(dt.getHours()).padStart(2, '0');
        const mm = String(dt.getMinutes()).padStart(2, '0');
      const heure = `${hh}:${mm}`;
      
      excelData.push([
        index + 1,
        e.clientId,
        e.clientName,
        dateIso,
        jourCap,
        heure
      ]);
    });
    
    // Create worksheet
    const ws = XLSX.utils.aoa_to_sheet(excelData);
    
    // Set column widths
    const colWidths = [
      { wch: 6 },   // N°
      { wch: 10 },  // ID Client
      { wch: 30 },  // Nom du Client
      { wch: 15 },  // Date
      { wch: 12 },  // Jour
      { wch: 10 }   // Heure
    ];
    ws['!cols'] = colWidths;
    
    // Merge cells for title
    ws['!merges'] = [
      { s: { r: 0, c: 0 }, e: { r: 0, c: 3 } }, // BODYMASTER
      { s: { r: 1, c: 0 }, e: { r: 1, c: 3 } }, // Rapport de Présence
      { s: { r: 2, c: 0 }, e: { r: 2, c: 3 } }  // Date
    ];
    
    // Style the header row (row 5) - Professional dark blue
    const headerCells = ['A5', 'B5', 'C5', 'D5', 'E5', 'F5'];
    headerCells.forEach((cell) => {
      if (ws[cell]) {
        ws[cell].s = {
          font: { bold: true, color: { rgb: "FFFFFF" }, sz: 12, name: "Arial" },
          fill: { fgColor: { rgb: "1E40AF" } }, // Blue-800 - professional dark blue
          alignment: { horizontal: "center", vertical: "center" },
          border: {
            top: { style: "thin", color: { rgb: "1E3A8A" } },
            bottom: { style: "thin", color: { rgb: "1E3A8A" } },
            left: { style: "thin", color: { rgb: "1E3A8A" } },
            right: { style: "thin", color: { rgb: "1E3A8A" } }
          }
        };
      }
    });
    
    // Style title rows - Professional and clean
    if (ws['A1']) {
      ws['A1'].s = {
        font: { bold: true, sz: 20, color: { rgb: "1E3A8A" }, name: "Arial" },
        fill: { fgColor: { rgb: "DBEAFE" } }, // Light blue-100
        alignment: { horizontal: "left", vertical: "center" },
        border: {
          bottom: { style: "medium", color: { rgb: "1E40AF" } }
        }
      };
    }
    if (ws['A2']) {
      ws['A2'].s = {
        font: { sz: 14, color: { rgb: "1E40AF" }, name: "Arial" },
        fill: { fgColor: { rgb: "EFF6FF" } }, // Blue-50
        alignment: { horizontal: "left", vertical: "center" }
      };
    }
    if (ws['A3']) {
      ws['A3'].s = {
        font: { sz: 11, color: { rgb: "475569" }, name: "Arial" },
        fill: { fgColor: { rgb: "F8FAFC" } }, // Slate-50
        alignment: { horizontal: "left", vertical: "center" }
      };
    }
    // Style the "Total:" label and value
    if (ws['E3']) {
      ws['E3'].s = {
        font: { bold: true, sz: 11, color: { rgb: "1E40AF" }, name: "Arial" },
        fill: { fgColor: { rgb: "F8FAFC" } },
        alignment: { horizontal: "right", vertical: "center" }
      };
    }
    if (ws['F3']) {
      ws['F3'].s = {
        font: { bold: true, sz: 12, color: { rgb: "DC2626" }, name: "Arial" },
        fill: { fgColor: { rgb: "FEF2F2" } }, // Red-50
        alignment: { horizontal: "center", vertical: "center" },
        border: {
          top: { style: "thin", color: { rgb: "DC2626" } },
          bottom: { style: "thin", color: { rgb: "DC2626" } },
          left: { style: "thin", color: { rgb: "DC2626" } },
          right: { style: "thin", color: { rgb: "DC2626" } }
        }
      };
    }
    
    // Style data rows - Professional alternating colors
    for (let i = 0; i < sortedEntries.length; i++) {
      const rowIndex = i + 6; // Start after header (row 5)
      const isEven = i % 2 === 0;
      const bgColor = isEven ? "FFFFFF" : "F1F5F9"; // White / Slate-100
      
      ['A', 'B', 'C', 'D', 'E', 'F'].forEach((col) => {
        const cellRef = `${col}${rowIndex}`;
        if (ws[cellRef]) {
          // Special styling for time column
          const isBold = col === 'C' || col === 'F'; // Bold for client name and time
          const cellBg = col === 'F' ? (isEven ? "DBEAFE" : "BFDBFE") : bgColor; // Blue highlight for time
          
          ws[cellRef].s = {
            fill: { fgColor: { rgb: cellBg } },
            font: { 
              color: { rgb: col === 'F' ? "1E40AF" : "1E293B" },
              sz: 11,
              bold: isBold,
              name: "Arial"
            },
            alignment: { 
              horizontal: col === 'A' || col === 'B' ? "center" : "left", 
              vertical: "center" 
            },
            border: {
              top: { style: "thin", color: { rgb: "E2E8F0" } },
              bottom: { style: "thin", color: { rgb: "E2E8F0" } },
              left: { style: "thin", color: { rgb: "E2E8F0" } },
              right: { style: "thin", color: { rgb: "E2E8F0" } }
            }
          };
        }
      });
    }
    
    // Create workbook
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Présence");
    
    // Export to file
    XLSX.writeFile(wb, `BODYMASTER_Presence_${selectedDate}.xlsx`);
  }, [entries, selectedDate]);

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
            <button className="rounded-md border border-green-300 bg-green-50 px-3 py-1.5 text-xs font-medium text-green-700 hover:bg-green-100" onClick={exportCSV}>📊 Exporter Excel</button>
          </div>
        </header>

        {error && (
          <div className="rounded-md border border-red-500/40 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}

        <section className="rounded-xl border border-yellow-300 bg-white p-5 shadow-sm">
          <div className="mb-3">
            <input className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800 placeholder:text-slate-400" placeholder="Rechercher par nom ou téléphone..." value={q} onChange={(e)=>setQ(e.target.value)} />
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
