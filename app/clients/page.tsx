"use client";

import { useEffect, useRef, useState, useMemo } from "react";
import RequireAuth from "@/app/lib/RequireAuth";

type Client = {
  id: number;
  fullName: string;
  firstName?: string | null;
  lastName?: string | null;
  email?: string | null;
  phone?: string | null;
  notes?: string | null;
  dateOfBirth?: string | null;
  nationalId?: string | null;
  registrationDate?: string | null;
  createdAt: string;
  updatedAt: string;
};

type Payment = {
  id: number;
  clientId: number;
  amount: number;
  paymentDate: string;
  nextPaymentDate: string;
};

function Modal({ open, title, children, onClose }: { open: boolean; title: string; children: React.ReactNode; onClose: () => void }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative w-full max-w-2xl rounded-lg bg-white p-5 shadow-xl text-gray-900">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-base font-semibold text-gray-900">{title}</h3>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700">✕</button>
        </div>
        {children}
      </div>
    </div>
  );
}

export default function ClientsPage() {
  const [clients, setClients] = useState<Client[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [open, setOpen] = useState(false);
  const [openDetail, setOpenDetail] = useState<Client | null>(null);
  const [query, setQuery] = useState("");
  const [editing, setEditing] = useState<Client | null>(null);
  const [loading, setLoading] = useState(true);
  const _printRef = useRef<HTMLDivElement>(null);

  const deleteClient = async (clientId: number) => {
    try {
      if (!confirm("Confirmer la suppression de ce client ?")) return;
      const res = await fetch(`/api/clients/${clientId}`, { method: "DELETE" });
      if (res.ok) setClients((prev) => prev.filter((c) => c.id !== clientId));
      else {
        const msg = await res.json().catch(()=>({ error: "Erreur inconnue" }));
        alert(msg?.error || "Échec de suppression du client.");
      }
    } catch (e: unknown) {
      const error = e instanceof Error ? e.message : "Échec réseau lors de la suppression.";
      alert(error);
    }
  };

  useEffect(() => {
    void (async () => {
      try {
        const [cRes, pRes] = await Promise.all([
          fetch("/api/clients").catch(() => undefined),
          fetch("/api/payments").catch(() => undefined),
        ]);
        
        if (cRes?.ok) {
          const clientsData = await cRes.json();
          setClients(clientsData);
        } else {
          console.error('Failed to fetch clients:', cRes?.status, cRes?.statusText);
          setClients([]);
        }
        
        if (pRes?.ok) {
          const paymentsData = await pRes.json();
          setPayments(paymentsData);
        } else {
          console.error('Failed to fetch payments:', pRes?.status, pRes?.statusText);
          setPayments([]);
        }
      } catch (error) {
        console.error('Error fetching data:', error);
        setClients([]);
        setPayments([]);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  async function save(values: Partial<Client>) {
    try {
      if (editing) {
        const res = await fetch(`/api/clients/${editing.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(values),
        });
        if (!res.ok) {
          let msg = "";
          try { const j = await res.json(); msg = j?.error || ""; } catch { try { msg = await res.text(); } catch {} }
          throw new Error(msg || `HTTP ${res.status}`);
        }
        const updated = await res.json();
        setClients((prev) => prev.map((c) => (c.id === updated.id ? updated : c)));
      } else {
        const res = await fetch(`/api/clients`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(values),
        });
        if (!res.ok) {
          let msg = "";
          try { const j = await res.json(); msg = j?.error || ""; } catch { try { msg = await res.text(); } catch {} }
          throw new Error(msg || `HTTP ${res.status}`);
        }
        const created = await res.json();
        setClients((prev) => [created, ...prev]);
      }
      setOpen(false);
      setEditing(null);
    } catch (e: unknown) {
      const error = e instanceof Error ? e.message : "Erreur lors de l'enregistrement";
      alert(error);
    }
  }

  // Suppression de client désactivée pour sécurité et intégrité des données
  // async function remove(id: number) {}

  // Reçu supprimé: géré désormais sur la page Paiements

  if (loading) {
    return (
      <RequireAuth>
        <main className="mx-auto max-w-6xl space-y-8 p-6">
          <div className="flex items-center justify-center min-h-[400px]">
            <div className="flex flex-col items-center space-y-4">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-yellow-600"></div>
              <div className="text-lg font-medium text-gray-700">Chargement des clients...</div>
            </div>
          </div>
        </main>
      </RequireAuth>
    );
  }

  return (
    <RequireAuth>
    <main className="mx-auto max-w-6xl space-y-8 p-6">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-yellow-600">Clients</h1>
          <p className="mt-1 text-sm text-yellow-600">Liste des clients et gestion des inscriptions.</p>
        </div>
        <button className="rounded-md border border-yellow-400 bg-black px-3 py-1.5 text-sm font-medium text-yellow-400 shadow hover:bg-neutral-900" onClick={() => { setEditing(null); setOpen(true); }}>Nouveau client</button>
      </header>

      {/* Summary cards */}
      <section className="rounded-xl border border-yellow-300 bg-white p-5 shadow-sm">
        <h2 className="mb-4 text-base font-semibold text-slate-800">Synthèse clients</h2>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-4">
          <div className="rounded-lg border border-yellow-300 bg-white p-4">
            <div className="text-xs text-slate-600">Total clients</div>
            <div className="text-2xl font-extrabold text-black">{clients.length}</div>
          </div>
          <div className="rounded-lg border border-yellow-300 bg-white p-4">
            <div className="text-xs text-slate-600">Nouveaux (ce mois)</div>
            <div className="text-2xl font-extrabold text-black">
              {clients.filter(c => {
                const regDate = (c as any).registrationdate ? new Date((c as any).registrationdate) : new Date((c as any).createdat);
                const now = new Date();
                return regDate.getMonth() === now.getMonth() && regDate.getFullYear() === now.getFullYear();
              }).length}
            </div>
          </div>
          <div className="rounded-lg border border-yellow-300 bg-white p-4">
            <div className="text-xs text-slate-600">À jour</div>
            <div className="text-2xl font-extrabold text-black">
              {(() => {
                const latestByClient = new Map<number, Payment>();
                for (const p of payments) {
                  const cur = latestByClient.get(p.clientId);
                  if (!cur || new Date(p.paymentDate) > new Date(cur.paymentDate)) latestByClient.set(p.clientId, p);
                }
                const todayStr = new Date().toISOString().slice(0,10);
                return Array.from(latestByClient.values()).filter(p => {
                  if (!p.nextPaymentDate) return false;
                  const nextDate = new Date(p.nextPaymentDate);
                  return !isNaN(nextDate.getTime()) && nextDate.toISOString().slice(0,10) > todayStr;
                }).length;
              })()}
            </div>
          </div>
          <div className="rounded-lg border border-yellow-300 bg-white p-4">
            <div className="text-xs text-slate-600">Sans paiement</div>
            <div className="text-2xl font-extrabold text-black">
              {(() => {
                const clientIdsWithPayments = new Set(payments.map(p => p.clientId));
                return clients.filter(c => !clientIdsWithPayments.has(c.id)).length;
              })()}
            </div>
          </div>
        </div>
      </section>

      <section className="rounded-xl border border-yellow-300 bg-white p-5 shadow-sm">
        <div className="mb-3">
          <input
            className="w-full rounded-md border border-neutral-300 px-3 py-2 text-sm text-gray-900 placeholder:text-neutral-400"
            placeholder="Rechercher par nom, email ou N° Carte Nationale..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>
        {(() => {
          const filtered = clients.filter(c => 
            (((c as any).fullname || "").toLowerCase()).includes(query.toLowerCase()) || 
            (c.email || "").toLowerCase().includes(query.toLowerCase()) ||
            (((c as any).nationalid || "").toLowerCase()).includes(query.toLowerCase())
          );
          // compute latest payment per client
          const latestByClient = new Map<number, Payment>();
          for (const p of payments) {
            const cur = latestByClient.get(p.clientId);
            if (!cur || new Date(p.paymentDate) > new Date(cur.paymentDate)) latestByClient.set(p.clientId, p);
          }
          const todayStr = new Date().toISOString().slice(0,10);
          return (
            <ul className="divide-y divide-gray-100">
              {filtered.map((c) => {
                const last = latestByClient.get(c.id);
                let statusEl = <span className="text-xs text-gray-400">—</span>;
                if (last && last.nextPaymentDate) {
                  const nextDate = new Date(last.nextPaymentDate);
                  if (!isNaN(nextDate.getTime())) {
                    const next = nextDate.toISOString().slice(0,10);
                    if (next > todayStr) statusEl = <span className="text-xs font-medium text-green-600">À jour jusqu&apos;au {next}</span>;
                    else statusEl = <span className="text-xs font-medium text-red-600">À payer (échéance {next})</span>;
                  }
                }
                return (
                  <li key={c.id} className={`flex items-center justify-between py-3`}>
                    <div>
                      <p className="font-medium text-gray-900">#{c.id} — {(c as any).fullname}</p>
                      <p className="text-xs text-gray-500">{c.email || "—"} · {c.phone || "—"}</p>
                      <div className="mt-1">{statusEl}</div>
                    </div>
                    <div className="flex items-center gap-2">
                      <button className="rounded-md border px-2 py-1 text-xs hover:bg-gray-50" onClick={() => setOpenDetail(c)}>Détails</button>
                      <button className="rounded-md border px-2 py-1 text-xs hover:bg-gray-50" onClick={() => { setEditing(c); setOpen(true); }}>Modifier</button>
                      <button className="rounded-md border border-red-300 bg-red-50 px-2 py-1 text-xs text-red-700 hover:bg-red-100" onClick={() => deleteClient(c.id)}>Supprimer</button>
                    </div>
                  </li>
                );
              })}
              {filtered.length === 0 && (
                <li className="py-4 text-sm text-gray-500">Aucun client trouvé.</li>
              )}
            </ul>
          );
        })()}
      </section>

      <Modal open={open} title={editing ? "Modifier client" : "Ajouter client"} onClose={() => { setOpen(false); setEditing(null); }}>
        <ClientForm initial={editing ?? undefined} onSubmit={save} />
      </Modal>

      <Modal open={!!openDetail} title="Détails du client" onClose={() => setOpenDetail(null)}>
        {openDetail && (
          <div className="space-y-3 text-sm">
            <div className="rounded-md border p-3">
              <p><strong>Nom complet:</strong> {(openDetail as any).fullname}</p>
              <p><strong>Email:</strong> {openDetail.email || "—"}</p>
              <p><strong>Téléphone:</strong> {openDetail.phone || "—"}</p>
              <p><strong>Date naissance:</strong> {(openDetail as any).dateofbirth ? new Date((openDetail as any).dateofbirth).toLocaleDateString() : "—"}</p>
              <p><strong>N° National:</strong> {(openDetail as any).nationalid || "—"}</p>
              <p><strong>Inscription:</strong> {(openDetail as any).registrationdate ? new Date((openDetail as any).registrationdate).toLocaleDateString() : "—"}</p>
              <p><strong>Notes:</strong> {openDetail.notes || "—"}</p>
            </div>
            <p className="text-xs text-gray-500">L&apos;historique complet des modifications est enregistré côté serveur.</p>
          </div>
        )}
      </Modal>
    </main>
    </RequireAuth>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block text-sm">
      <span className="mb-1 block text-gray-700">{label}</span>
      {children}
    </label>
  );
}

function Row({ children }: { children: React.ReactNode }) {
  return <div className="mb-3 grid grid-cols-1 gap-3 sm:grid-cols-2">{children}</div>;
}

function Actions({ onCancel }: { onCancel: () => void }) {
  return (
    <div className="mt-4 flex justify-end gap-2">
      <button type="button" className="rounded-md border px-3 py-1.5 text-sm" onClick={onCancel}>Annuler</button>
      <button type="submit" className="rounded-md bg-blue-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-blue-700">Enregistrer</button>
    </div>
  );
}

function ClientForm({ initial, onSubmit }: { initial?: Partial<Client>; onSubmit: (values: Partial<Client>) => void }) {
  const sanitize = (s: string) => s.replace(/[<>]/g, "").trim();
  const [values, setValues] = useState<Partial<Client>>({
    fullName: initial?.fullName ?? "",
    firstName: initial?.firstName ?? "",
    lastName: initial?.lastName ?? "",
    email: initial?.email ?? "",
    phone: initial?.phone ?? "",
    dateOfBirth: initial?.dateOfBirth ?? "",
    nationalId: initial?.nationalId ?? "",
    registrationDate: initial?.registrationDate ?? new Date().toISOString().slice(0, 10),
    notes: initial?.notes ?? "",
  });

  useEffect(() => {
    setValues({
      fullName: initial?.fullName ?? "",
      firstName: initial?.firstName ?? "",
      lastName: initial?.lastName ?? "",
      email: initial?.email ?? "",
      phone: initial?.phone ?? "",
      dateOfBirth: initial?.dateOfBirth ?? "",
      nationalId: initial?.nationalId ?? "",
      registrationDate: initial?.registrationDate ?? new Date().toISOString().slice(0, 10),
      notes: initial?.notes ?? "",
    });
  }, [initial]);

  const maxDob = useMemo(() => {
    const d = new Date();
    d.setFullYear(d.getFullYear() - 13);
    const iso = d.toISOString().slice(0,10);
    return iso;
  }, []);

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        // Age >= 13 validation
        if (values.dateOfBirth) {
          try {
            const dob = new Date(values.dateOfBirth as string);
            const cutoff = new Date();
            cutoff.setFullYear(cutoff.getFullYear() - 13);
            if (dob > cutoff) {
              alert("L'âge minimum est 13 ans.");
              return;
            }
          } catch {}
        }
        onSubmit({
          ...values,
          fullName: sanitize((values.fullName as string)?.toUpperCase()),
          firstName: values.firstName ? sanitize(values.firstName) : "",
          lastName: values.lastName ? sanitize(values.lastName) : "",
          email: values.email ? values.email.trim() : "",
          phone: values.phone ? values.phone.replace(/[^0-9]/g, "").slice(0, 12) : "",
          notes: values.notes ? sanitize(values.notes) : "",
          nationalId: values.nationalId ? sanitize((values.nationalId as string).toUpperCase()) : "",
        });
      }}
    >
      <Row>
        <Field label="Nom complet">
          <input autoComplete="off" className="w-full rounded-md border border-neutral-300 px-3 py-2 text-gray-900 placeholder:text-neutral-400" value={(values.fullName as string) || ""} onChange={(e) => setValues((v) => ({ ...v, fullName: e.target.value.toUpperCase() }))} required pattern="^[A-ZÀ-ÖØ-Þ'\-\s]+$" title="Lettres en majuscules uniquement" maxLength={80} style={{ textTransform: 'uppercase' }} />
        </Field>
        <Field label="Email">
          <input autoComplete="off" className="w-full rounded-md border border-neutral-300 px-3 py-2 text-gray-900 placeholder:text-neutral-400" type="email" value={(values.email as string) || ""} onChange={(e) => setValues((v) => ({ ...v, email: e.target.value }))} maxLength={120} />
        </Field>
      </Row>
      <Row>
        <Field label="Téléphone">
          <input autoComplete="off" className="w-full rounded-md border border-neutral-300 px-3 py-2 text-gray-900 placeholder:text-neutral-400" value={(values.phone as string) || ""} onChange={(e) => setValues((v) => ({ ...v, phone: e.target.value.replace(/[^0-9]/g, '') }))} inputMode="numeric" pattern="^\d{0,12}$" maxLength={12} title="Chiffres uniquement, max 12" />
        </Field>
        <Field label="Date de naissance">
          <input autoComplete="off" className="w-full rounded-md border border-neutral-300 px-3 py-2 text-gray-900" type="date" value={(values.dateOfBirth as string)?.slice(0,10) || ""} onChange={(e) => setValues((v) => ({ ...v, dateOfBirth: e.target.value }))} max={maxDob} />
        </Field>
      </Row>
      <Row>
        <Field label="N° Carte Nationale">
          <input autoComplete="off" className="w-full rounded-md border border-neutral-300 px-3 py-2 text-gray-900 placeholder:text-neutral-400" value={(values.nationalId as string) || ""} onChange={(e) => setValues((v) => ({ ...v, nationalId: e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '') }))} pattern="^[A-Z0-9]+$" title="Lettres majuscules et chiffres uniquement" maxLength={30} style={{ textTransform: 'uppercase' }} />
        </Field>
        <Field label="Date d'inscription">
          <input autoComplete="off" className="w-full rounded-md border border-neutral-300 px-3 py-2 text-gray-900" type="date" value={(values.registrationDate as string)?.slice(0,10) || ""} onChange={(e) => setValues((v) => ({ ...v, registrationDate: e.target.value }))} />
        </Field>
      </Row>
      <Row>
        <Field label="Notes">
          <input autoComplete="off" className="w-full rounded-md border border-neutral-300 px-3 py-2 text-gray-900 placeholder:text-neutral-400" value={(values.notes as string) || ""} onChange={(e) => setValues((v) => ({ ...v, notes: e.target.value }))} maxLength={75} />
        </Field>
      </Row>
      <Actions onCancel={() => history.back()} />
    </form>
  );
}


