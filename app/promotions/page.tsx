"use client";

import { useEffect, useState } from "react";
import { useCurrency } from "@/app/lib/CurrencyProvider";
import RequireAuth from "@/app/lib/RequireAuth";
import { API_URL } from "@/app/lib/api";

type Promotion = {
  id: number;
  name: string;
  notes?: string | null;
  fixedPrice: number;
  subscriptionMonths?: number | null;
  startDate: string;
  endDate?: string | null;
  active: boolean;
  createdAt: string;
  updatedAt: string;
};

function Modal({ open, title, children, onClose }: { open: boolean; title: string; children: React.ReactNode; onClose: () => void }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative w-full max-w-2xl rounded-lg bg-white p-5 shadow-xl">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-base font-semibold text-gray-900">{title}</h3>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700">✕</button>
        </div>
        {children}
      </div>
    </div>
  );
}

export default function PromotionsPage() {
  const { format } = useCurrency();
  const [promotions, setPromotions] = useState<Promotion[]>([]);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Promotion | null>(null);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);

  const deletePromotion = async (promotionId: number) => {
    try {
      if (!confirm("Confirmer la suppression de cette promotion ?")) return;
      const res = await fetch(`${API_URL}/promotions-detail.php?id=${promotionId}`, { method: "DELETE" });
      if (res.ok) setPromotions((prev) => prev.filter((p) => p.id !== promotionId));
      else {
        const msg = await res.json().catch(()=>({ error: "Erreur inconnue" }));
        alert(msg?.error || "Échec de suppression de la promotion.");
      }
    } catch (e: unknown) {
      const error = e instanceof Error ? e.message : "Échec réseau lors de la suppression.";
      alert(error);
    }
  };

  useEffect(() => {
    void (async () => {
      try {
        const res = await fetch(`${API_URL}/promotions.php`);
        if (!res.ok) {
          setPromotions([]);
          return;
        }
        try {
          const data = await res.json();
          setPromotions(Array.isArray(data) ? data : []);
        } catch {
          setPromotions([]);
        }
      } catch {
        setPromotions([]);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  async function save(values: Partial<Promotion>) {
    try {
      if (editing) {
        const res = await fetch(`${API_URL}/promotions-detail.php?id=${editing.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(values),
        });
        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          throw new Error((err as { error?: string })?.error || `HTTP ${res.status}`);
        }
        const updated = await res.json();
        setPromotions((prev) => prev.map((p) => (p.id === updated.id ? updated : p)));
      } else {
        const res = await fetch(`${API_URL}/promotions.php`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(values),
        });
        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          throw new Error((err as { error?: string })?.error || `HTTP ${res.status}`);
        }
        const created = await res.json();
        setPromotions((prev) => [created, ...prev]);
      }
      setOpen(false);
      setEditing(null);
    } catch (e: unknown) {
      const errorMessage = e instanceof Error ? e.message : "Erreur lors de l'enregistrement de la promotion";
      alert(errorMessage);
    }
  }


  if (loading) {
    return (
      <RequireAuth>
        <main className="mx-auto max-w-6xl space-y-8 p-6">
          <div className="flex items-center justify-center min-h-[400px]">
            <div className="flex flex-col items-center space-y-4">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-yellow-600"></div>
              <div className="text-lg font-medium text-gray-700">Chargement des promotions...</div>
            </div>
          </div>
        </main>
      </RequireAuth>
    );
  }

  return (
    <RequireAuth>
    <main className="mx-auto max-w-6xl space-y-8 p-6">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-yellow-600">Promotions</h1>
          <p className="mt-1 text-sm text-amber-700">Gérez les promotions, périodes et détails.</p>
        </div>
        <button className="rounded-md border border-yellow-400 bg-black px-3 py-1.5 text-sm font-medium text-yellow-400 shadow hover:bg-neutral-900" onClick={() => { setEditing(null); setOpen(true); }}>Nouvelle promotion</button>
      </header>

      <section className="rounded-xl border border-yellow-300 bg-white p-5 shadow-sm">
        <div className="mb-3">
          <input
            className="w-full rounded-md border px-3 py-2 text-sm"
            placeholder="Rechercher une promotion..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>
        {(() => {
          const filtered = promotions.filter(p => (p.name || "").toLowerCase().includes(query.toLowerCase()));
          const actives = filtered.filter(p => p.active);
          const others = filtered.filter(p => !p.active);
          const List = ({ items, title }: { items: Promotion[]; title: string }) => (
            <div className="mb-6 last:mb-0">
              <h3 className="mb-2 text-sm font-semibold uppercase tracking-wide text-slate-600">{title}</h3>
              <ul className="divide-y divide-gray-100">
                {items.map((p) => (
                  <li key={p.id} className="flex flex-col gap-2 py-3 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <p className="font-medium text-gray-900">{p.name} <span className="text-xs text-gray-500">— {format(p.fixedPrice)}</span></p>
                      <p className="text-xs text-gray-500">{new Date(p.startDate).toLocaleDateString()} → {p.endDate ? new Date(p.endDate).toLocaleDateString() : "—"} · {p.active ? "Active" : "Inactive"}</p>
                      {p.subscriptionMonths ? (
                        <p className="text-xs text-gray-500">Période: {p.subscriptionMonths} mois</p>
                      ) : null}
                      {p.notes ? (<p className="text-xs text-gray-500">{p.notes}</p>) : null}
                    </div>
                    <div className="flex items-center gap-2">
                      <button className="rounded-md border px-2 py-1 text-xs hover:bg-gray-50" onClick={() => { setEditing(p); setOpen(true); }}>Modifier</button>
                      <button className="rounded-md border border-red-300 bg-red-50 px-2 py-1 text-xs text-red-700 hover:bg-red-100" onClick={() => deletePromotion(p.id)}>Supprimer</button>
                    </div>
                  </li>
                ))}
                {items.length === 0 && (
                  <li className="py-3 text-sm text-slate-500">Aucune promotion</li>
                )}
              </ul>
            </div>
          );
          return (
            <div>
              <List items={actives} title="Promotions actives" />
              <List items={others} title="Autres promotions" />
            </div>
          );
        })()}
      </section>

      <Modal open={open} title={editing ? "Modifier promotion" : "Ajouter promotion"} onClose={() => { setOpen(false); setEditing(null); }}>
        <PromotionForm initial={editing ?? undefined} onSubmit={save} onCancel={() => { setOpen(false); setEditing(null); }} />
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
      <button type="button" className="rounded-md border border-slate-300 bg-white px-3 py-1.5 text-sm hover:bg-slate-50" onClick={onCancel}>Annuler</button>
      <button type="submit" className="rounded-md border border-yellow-400 bg-black px-3 py-1.5 text-sm font-medium text-yellow-400 hover:bg-neutral-900">Enregistrer</button>
    </div>
  );
}

function PromotionForm({ initial, onSubmit, onCancel }: { initial?: Partial<Promotion>; onSubmit: (values: Partial<Promotion>) => void; onCancel: () => void }) {
  const [values, setValues] = useState<Partial<Promotion>>({
    name: initial?.name ?? "",
    notes: initial?.notes ?? "",
    fixedPrice: initial?.fixedPrice ?? 0,
    subscriptionMonths: (initial?.subscriptionMonths as number | undefined) ?? undefined,
    startDate: initial?.startDate ?? new Date().toISOString().slice(0, 10),
    endDate: initial?.endDate ?? "",
    active: initial?.active ?? true,
  });

  useEffect(() => {
    setValues({
      name: initial?.name ?? "",
      notes: initial?.notes ?? "",
      fixedPrice: initial?.fixedPrice ?? 0,
      subscriptionMonths: (initial?.subscriptionMonths as number | undefined) ?? undefined,
      startDate: initial?.startDate ?? new Date().toISOString().slice(0, 10),
      endDate: initial?.endDate ?? "",
      active: initial?.active ?? true,
    });
  }, [initial]);

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit({ ...values, fixedPrice: Number(values.fixedPrice) });
      }}
    >
      <Row>
        <Field label="Nom de la promotion">
          <input className="w-full rounded-md border px-3 py-2" value={values.name as string} onChange={(e) => setValues((v) => ({ ...v, name: e.target.value }))} required />
        </Field>
        <Field label="Prix fixe (DT)">
          <input className="w-full rounded-md border px-3 py-2" type="number" min={0} step="0.01" value={String(values.fixedPrice ?? 0)} onChange={(e) => setValues((v) => ({ ...v, fixedPrice: Number(e.target.value) }))} />
        </Field>
      </Row>
      <Row>
        <Field label="Nombre de mois (optionnel)">
          <input className="w-full rounded-md border px-3 py-2" type="number" min={1} step={1} value={values.subscriptionMonths === undefined || values.subscriptionMonths === null ? "" : String(values.subscriptionMonths)} onChange={(e) => setValues((v) => ({ ...v, subscriptionMonths: e.target.value ? Number(e.target.value) : undefined }))} placeholder="ex: 1, 3, 12" />
        </Field>
        <Field label="Active">
          <input type="checkbox" className="h-4 w-4" checked={!!values.active} onChange={(e) => setValues((v) => ({ ...v, active: e.target.checked }))} />
        </Field>
      </Row>
      <Row>
        <Field label="Date début">
          <input className="w-full rounded-md border px-3 py-2" type="date" value={(values.startDate as string).slice(0,10)} onChange={(e) => setValues((v) => ({ ...v, startDate: e.target.value }))} />
        </Field>
        <Field label="Date fin">
          <input className="w-full rounded-md border px-3 py-2" type="date" value={(values.endDate as string)?.slice(0,10) || ""} onChange={(e) => setValues((v) => ({ ...v, endDate: e.target.value }))} />
        </Field>
      </Row>
      <Row>
        <Field label="Notes">
          <input className="w-full rounded-md border px-3 py-2" value={(values.notes as string) || ""} onChange={(e) => setValues((v) => ({ ...v, notes: e.target.value }))} />
        </Field>
      </Row>
      <Actions onCancel={onCancel} />
    </form>
  );
}


