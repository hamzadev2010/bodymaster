"use client";

import { useEffect, useState } from "react";
import RequireAuth from "@/app/lib/RequireAuth";
import { useI18n } from "@/app/i18n/I18nProvider";

type Coach = {
  id: number;
  fullName: string;
  specialty?: string | null;
  email?: string | null;
  phone?: string | null;
  notes?: string | null;
  dateOfBirth?: string | null;
  nationalId?: string | null;
  registrationDate?: string | null; // Date de recrutement
  endOfServiceDate?: string | null; // UI only (not persisted in schema)
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

export default function CoachesPage() {
  const { t } = useI18n();
  const [coaches, setCoaches] = useState<Coach[]>([]);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Coach | null>(null);
  const [query, setQuery] = useState("");
  const [attCoach, setAttCoach] = useState<Coach | null>(null);

  useEffect(() => {
    void (async () => {
      const res = await fetch("/api/coaches");
      setCoaches(await res.json());
    })();
  }, []);

  async function save(values: Partial<Coach>) {
    try {
      if (editing) {
        const res = await fetch(`/api/coaches/${editing.id}`, {
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
        setCoaches((prev) => prev.map((c) => (c.id === updated.id ? updated : c)));
      } else {
        const res = await fetch(`/api/coaches`, {
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
        setCoaches((prev) => [created, ...prev]);
      }
      setOpen(false);
      setEditing(null);
    } catch (e: any) {
      alert(e?.message || "Erreur lors de l'enregistrement");
    }
  }

  async function remove(id: number) {
    if (!confirm("Confirmer la suppression de ce coach ?")) return;
    await fetch(`/api/coaches/${id}`, { method: "DELETE" });
    setCoaches((prev) => prev.filter((c) => c.id !== id));
  }

  return (
    <RequireAuth>
    <main className="mx-auto max-w-6xl space-y-8 p-6">
      <header className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-yellow-600">{t("coaches.title", "Coaches")}</h1>
          <p className="mt-1 text-sm text-amber-700">{t("coaches.subtitle", "List of coaches and specialties.")}</p>
        </div>
        <button className="rounded-md border border-yellow-400 bg-black px-3 py-1.5 text-sm font-medium text-yellow-400 shadow hover:bg-neutral-900" onClick={() => { setEditing(null); setOpen(true); }}>{t("coaches.newCoach", "New coach")}</button>
      </header>

      <section className="rounded-xl border border-yellow-300 bg-white p-5 shadow-sm">
        <div className="mb-3">
          <input
            className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
            placeholder={t("coaches.searchPlaceholder", "Search a coach...")}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>
        <ul className="divide-y divide-gray-100">
          {coaches.filter(c => (c.fullName?.toLowerCase() || "").includes(query.toLowerCase()) || (c.email || "").toLowerCase().includes(query.toLowerCase())).map((c) => (
            <li key={c.id} className="flex items-center justify-between py-3">
              <div>
                <p className="font-medium text-gray-900">{c.fullName}</p>
                <p className="text-xs text-gray-500">{c.specialty || "—"} · {c.email || "—"}</p>
              </div>
              <div className="flex items-center gap-2">
                <button className="rounded-md border border-slate-300 px-2 py-1 text-xs hover:bg-slate-50" onClick={() => setAttCoach(c)}>{t("coaches.attestation", "Attestation")}</button>
                <button className="rounded-md border border-slate-300 px-2 py-1 text-xs hover:bg-slate-50" onClick={() => { setEditing(c); setOpen(true); }}>{t("common.edit", "Edit")}</button>
              </div>
            </li>
          ))}
        </ul>
      </section>

      <Modal open={open} title={editing ? t("coaches.modal.editTitle", "Edit coach") : t("coaches.modal.addTitle", "Add coach")} onClose={() => { setOpen(false); setEditing(null); }}>
        <CoachForm initial={editing ?? undefined} onSubmit={save} />
      </Modal>

      <AttestationModal coach={attCoach} onClose={() => setAttCoach(null)} />
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

function CoachForm({ initial, onSubmit }: { initial?: Partial<Coach>; onSubmit: (values: Partial<Coach>) => void }) {
  const sanitize = (s: string) => s.replace(/[<>]/g, "").trim();
  const [values, setValues] = useState<Partial<Coach>>({
    fullName: initial?.fullName ?? "",
    specialty: initial?.specialty ?? "",
    email: initial?.email ?? "",
    phone: initial?.phone ?? "",
    notes: initial?.notes ?? "",
    dateOfBirth: initial?.dateOfBirth ?? "",
    nationalId: initial?.nationalId ?? "",
    registrationDate: initial?.registrationDate ?? new Date().toISOString().slice(0,10),
    endOfServiceDate: initial?.endOfServiceDate ?? "",
  });

  useEffect(() => {
    setValues({
      fullName: initial?.fullName ?? "",
      specialty: initial?.specialty ?? "",
      email: initial?.email ?? "",
      phone: initial?.phone ?? "",
      notes: initial?.notes ?? "",
      dateOfBirth: initial?.dateOfBirth ?? "",
      nationalId: initial?.nationalId ?? "",
      registrationDate: initial?.registrationDate ?? new Date().toISOString().slice(0,10),
      endOfServiceDate: initial?.endOfServiceDate ?? "",
    });
  }, [initial]);

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit({
          ...values,
          fullName: sanitize(values.fullName as string),
          notes: values.notes ? sanitize(values.notes as string) : "",
        });
      }}
    >
      <Row>
        <Field label="Nom complet">
          <input autoComplete="off" maxLength={80} className="w-full rounded-md border px-3 py-2" value={values.fullName as string} onChange={(e) => setValues((v) => ({ ...v, fullName: e.target.value }))} required pattern="^[A-Za-zÀ-ÖØ-öø-ÿ'\-\s]+$" title="Lettres uniquement" />
        </Field>
        <Field label="Spécialité">
          <input autoComplete="off" maxLength={80} className="w-full rounded-md border px-3 py-2" value={(values.specialty as string) || ""} onChange={(e) => setValues((v) => ({ ...v, specialty: e.target.value }))} />
        </Field>
      </Row>
      <Row>
        <Field label="Email">
          <input autoComplete="off" maxLength={120} className="w-full rounded-md border px-3 py-2" type="email" value={(values.email as string) || ""} onChange={(e) => setValues((v) => ({ ...v, email: e.target.value }))} />
        </Field>
        <Field label="Téléphone">
          <input autoComplete="off" className="w-full rounded-md border px-3 py-2" value={(values.phone as string) || ""} onChange={(e) => setValues((v) => ({ ...v, phone: e.target.value }))} inputMode="numeric" pattern="^\d{0,12}$" maxLength={12} title="Chiffres uniquement, max 12" />
        </Field>
      </Row>
      <Row>
        <Field label="Date de naissance">
          <input className="w-full rounded-md border px-3 py-2" type="date" value={(values.dateOfBirth as string)?.slice(0,10) || ""} onChange={(e) => setValues((v) => ({ ...v, dateOfBirth: e.target.value }))} />
        </Field>
        <Field label="N° Carte Nationale">
          <input className="w-full rounded-md border px-3 py-2" value={(values.nationalId as string) || ""} onChange={(e) => setValues((v) => ({ ...v, nationalId: e.target.value }))} pattern="^[A-Za-z0-9]+$" title="Lettres et chiffres uniquement" />
        </Field>
      </Row>
      <Row>
        <Field label="Date de recrutement">
          <input className="w-full rounded-md border px-3 py-2" type="date" value={(values.registrationDate as string)?.slice(0,10) || ""} onChange={(e) => setValues((v) => ({ ...v, registrationDate: e.target.value }))} />
        </Field>
        <Field label="Date de fin de service (optionnel)">
          <input className="w-full rounded-md border px-3 py-2" type="date" value={(values.endOfServiceDate as string)?.slice(0,10) || ""} onChange={(e) => setValues((v) => ({ ...v, endOfServiceDate: e.target.value }))} />
        </Field>
      </Row>
      <Row>
        <Field label="Notes">
          <input autoComplete="off" maxLength={120} className="w-full rounded-md border px-3 py-2" value={values.notes as string} onChange={(e) => setValues((v) => ({ ...v, notes: e.target.value }))} />
        </Field>
      </Row>
      <Actions onCancel={() => history.back()} />
    </form>
  );
}

function AttestationModal({ coach, onClose }: { coach: Coach | null; onClose: () => void }) {
  if (!coach) return null;
  const { t } = useI18n();
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative w-full max-w-5xl rounded-2xl bg-white p-10 shadow-2xl">
        <style>{`
          @media print {
            @page { size: A2 portrait; margin: 15mm; }
            .no-print { display: none !important; }
            .attestation-root { font-size: 16px !important; line-height: 1.7 !important; color: #000 !important; }
            .attestation-title { font-size: 28px !important; font-weight: 800 !important; text-align: center !important; margin-bottom: 16px !important; }
            .attestation-date { text-align: right !important; margin-top: 12px !important; font-size: 14px !important; }
            .attestation-sign { margin-top: 48px !important; }
          }
        `}</style>
        <div className="attestation-root text-[16px] leading-7">
          <div className="attestation-title text-2xl font-bold text-center mb-4">{t("attestation.title", "ATTESTATION DE TRAVAIL")}</div>
          <div className="attestation-date text-right">{t("attestation.date", "Date")} : <strong>{new Date().toLocaleDateString('fr-FR')}</strong></div>

          <div className="mt-10 space-y-6 text-gray-900">
            <p>{t("attestation.body.line1", "Nous soussignés, certifions que")} <strong>{coach.fullName}</strong> {t("attestation.body.line1b", "a occupé le poste de")} <strong>{t("attestation.role", "Coach sportif")}</strong> {t("attestation.body.line1c", "au sein de notre établissement.")}</p>
            <p>{t("attestation.body.line2a", "La relation de travail a débuté le")} <strong>{coach.registrationDate ? new Date(coach.registrationDate).toLocaleDateString('fr-FR') : '—'}</strong>{coach.endOfServiceDate ? (<span> {t("attestation.body.line2b", "et a pris fin le")} <strong>{new Date(coach.endOfServiceDate).toLocaleDateString('fr-FR')}</strong>.</span>) : (<span>.</span>)}</p>
            {coach.specialty ? (<p>{t("attestation.specialty", "Spécialité")} : <strong>{coach.specialty}</strong></p>) : null}
            {coach.nationalId ? (<p>{t("attestation.nationalId", "N° Carte Nationale")} : <strong>{coach.nationalId}</strong></p>) : null}
            <p>{t("attestation.body.line3", "La présente attestation est délivrée à l'intéressé(e) pour servir et valoir ce que de droit.")}</p>
          </div>

          <div className="attestation-sign mt-16 grid grid-cols-2 gap-10">
            <div>
              <div className="h-20 border-b border-gray-700" />
              <div className="mt-2 text-base text-gray-700">{t("attestation.sign.coach", "Signature du coach")}</div>
            </div>
            <div className="text-right">
              <div className="h-20 border-b border-gray-700" />
              <div className="mt-2 text-base text-gray-700">{t("attestation.sign.manager", "Visa et signature du gérant")}</div>
            </div>
          </div>
        </div>

        <div className="mt-8 flex items-center justify-end gap-3 no-print">
          <button className="rounded-md border px-5 py-2 text-base" onClick={() => window.print()}>{t("common.printA2", "Imprimer (A2)")}</button>
          <button className="rounded-md border px-5 py-2 text-base" onClick={onClose}>{t("common.close", "Fermer")}</button>
        </div>
      </div>
    </div>
  );
}


