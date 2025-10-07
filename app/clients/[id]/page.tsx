import { notFound } from "next/navigation";
import RequireAuth from "@/app/lib/RequireAuth";

// Force this page to be server-side rendered at runtime
export const dynamic = 'force-dynamic';

interface PageProps {
  params: Promise<{ id: string }>;
}

// Simple server-side data fetching function
async function getClientData(id: string) {
  try {
    // Validate the ID first
    const clientId = Number(id);
    if (isNaN(clientId) || !Number.isInteger(clientId) || clientId <= 0) {
      return null;
    }

    // Use the existing Prisma client from lib
    const { default: prisma } = await import('@/app/lib/prisma');

    try {
      const client = await prisma.client.findUnique({
        where: { id: clientId },
        include: {
          ClientHistory: {
            orderBy: { createdat: 'desc' },
            take: 10
          },
          Payment: {
            orderBy: { paymentdate: 'desc' },
            take: 5
          },
          Presence: {
            orderBy: { time: 'desc' },
            take: 10
          }
        }
      });

      return client;
    } catch (dbError) {
      console.error('Database error:', dbError);
      return null;
    }
  } catch (error) {
    console.error('Error fetching client data:', error);
    return null;
  }
}

// Main page component
export default async function ClientDetailPage({ params }: PageProps) {
  const { id } = await params;
  const client = await getClientData(id);

  if (!client) {
    notFound();
  }

  return (
    <RequireAuth>
      <main className="mx-auto max-w-4xl space-y-6 p-6">
        {/* Header */}
        <header className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-extrabold tracking-tight text-yellow-600">
              Client #{client.id}
            </h1>
            <p className="mt-1 text-sm text-yellow-600">
              {client.fullname}
            </p>
          </div>
          <div className="flex gap-2">
            <button 
              onClick={() => window.history.back()}
              className="rounded-md border border-yellow-400 bg-black px-3 py-1.5 text-sm font-medium text-yellow-400 shadow hover:bg-neutral-900"
            >
              Retour
            </button>
          </div>
        </header>

        {/* Client Information */}
        <section className="rounded-xl border border-yellow-300 bg-white p-6 shadow-sm">
          <h2 className="mb-4 text-lg font-semibold text-slate-800">Informations personnelles</h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="text-sm font-medium text-gray-700">Nom complet</label>
              <p className="text-gray-900">{client.fullname}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700">Email</label>
              <p className="text-gray-900">{client.email || "—"}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700">Téléphone</label>
              <p className="text-gray-900">{client.phone || "—"}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700">Date de naissance</label>
              <p className="text-gray-900">
                {client.dateofbirth 
                  ? new Date(client.dateofbirth).toLocaleDateString('fr-FR')
                  : "—"
                }
              </p>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700">N° Carte Nationale</label>
              <p className="text-gray-900">{((client as any).nationalId ?? client.nationalid) || "—"}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700">Date d'inscription</label>
              <p className="text-gray-900">
                {client.registrationdate 
                  ? new Date(client.registrationdate).toLocaleDateString('fr-FR')
                  : client.createdat ? new Date(client.createdat).toLocaleDateString('fr-FR') : '—'
                }
              </p>
            </div>
            {client.notes && (
              <div className="col-span-full">
                <label className="text-sm font-medium text-gray-700">Notes</label>
                <p className="text-gray-900">{client.notes}</p>
              </div>
            )}
          </div>
        </section>

        {/* Subscription Information */}
        <section className="rounded-xl border border-yellow-300 bg-white p-6 shadow-sm">
          <h2 className="mb-4 text-lg font-semibold text-slate-800">Abonnement</h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="text-sm font-medium text-gray-700">Période d'abonnement</label>
              <p className="text-gray-900">
                {client.subscriptionperiod || "—"}
              </p>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700">Promotion</label>
              <p className="text-gray-900">
                {client.haspromotion ? "Oui" : "Non"}
                {client.promotionperiod && ` (${client.promotionperiod})`}
              </p>
            </div>
          </div>
        </section>

        {/* Recent Payments */}
        {client.Payment && client.Payment.length > 0 && (
          <section className="rounded-xl border border-yellow-300 bg-white p-6 shadow-sm">
            <h2 className="mb-4 text-lg font-semibold text-slate-800">Paiements récents</h2>
            <div className="space-y-3">
              {client.Payment.map((payment: any) => (
                <div key={payment.id} className="rounded-lg border p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium text-gray-900">
                        {payment.amount?.toLocaleString('fr-FR')} TND
                      </p>
                      <p className="text-sm text-gray-600">
                        Période: {payment.subscriptionperiod}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm text-gray-600">
                        {new Date(payment.paymentdate).toLocaleDateString('fr-FR')}
                      </p>
                      <p className="text-sm text-gray-600">
                        Prochaine échéance: {new Date(payment.nextpaymentdate).toLocaleDateString('fr-FR')}
                      </p>
                    </div>
                  </div>
                  {payment.notes && (
                    <p className="mt-2 text-sm text-gray-600">{payment.notes}</p>
                  )}
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Recent Presences */}
        {client.Presence && client.Presence.length > 0 && (
          <section className="rounded-xl border border-yellow-300 bg-white p-6 shadow-sm">
            <h2 className="mb-4 text-lg font-semibold text-slate-800">Présences récentes</h2>
            <div className="space-y-2">
              {client.Presence.map((presence: any) => (
                <div key={presence.id} className="flex items-center justify-between rounded-lg border p-3">
                  <p className="font-medium text-gray-900">
                    {new Date(presence.time).toLocaleDateString('fr-FR')}
                  </p>
                  <p className="text-sm text-gray-600">
                    {new Date(presence.time).toLocaleTimeString('fr-FR')}
                  </p>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* History */}
        {client.ClientHistory && client.ClientHistory.length > 0 && (
          <section className="rounded-xl border border-yellow-300 bg-white p-6 shadow-sm">
            <h2 className="mb-4 text-lg font-semibold text-slate-800">Historique des modifications</h2>
            <div className="space-y-3">
              {client.ClientHistory.map((entry: any) => (
                <div key={entry.id} className="rounded-lg border p-4">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="font-medium text-gray-900">{entry.action}</p>
                      <p className="text-sm text-gray-600">
                        {new Date(entry.createdat).toLocaleDateString('fr-FR')} à{' '}
                        {new Date(entry.createdat).toLocaleTimeString('fr-FR')}
                      </p>
                    </div>
                  </div>
                  {entry.changes && (
                    <div className="mt-2 text-sm text-gray-600">
                      <pre className="whitespace-pre-wrap text-xs bg-gray-50 p-2 rounded">
                        {JSON.stringify(JSON.parse(entry.changes), null, 2)}
                      </pre>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Metadata */}
        <section className="rounded-xl border border-yellow-300 bg-white p-6 shadow-sm">
          <h2 className="mb-4 text-lg font-semibold text-slate-800">Métadonnées</h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="text-sm font-medium text-gray-700">Créé le</label>
              <p className="text-gray-900">
                {client.createdat ? new Date(client.createdat).toLocaleDateString('fr-FR') : '—'} à{' '}
                {client.createdat ? new Date(client.createdat).toLocaleTimeString('fr-FR') : '—'}
              </p>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700">Dernière modification</label>
              <p className="text-gray-900">
                {client.updatedat ? new Date(client.updatedat).toLocaleDateString('fr-FR') : '—'} à{' '}
                {client.updatedat ? new Date(client.updatedat).toLocaleTimeString('fr-FR') : '—'}
              </p>
            </div>
          </div>
        </section>
      </main>
    </RequireAuth>
  );
}

// Generate metadata for SEO
export async function generateMetadata({ params }: PageProps) {
  const { id } = await params;
  const client = await getClientData(id);

  if (!client) {
    return {
      title: 'Client non trouvé',
      description: 'Le client demandé n\'a pas été trouvé.',
    };
  }

  return {
    title: `Client #${client.id} - ${client.fullname}`,
    description: `Détails du client ${client.fullname} - ID: ${client.id}`,
  };
}