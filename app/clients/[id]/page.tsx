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
          history: {
            orderBy: { createdAt: 'desc' },
            take: 10
          },
          payments: {
            orderBy: { paymentDate: 'desc' },
            take: 5
          },
          presences: {
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
              {client.fullName}
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
              <p className="text-gray-900">{client.fullName}</p>
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
                {client.dateOfBirth 
                  ? new Date(client.dateOfBirth).toLocaleDateString('fr-FR')
                  : "—"
                }
              </p>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700">N° Carte Nationale</label>
              <p className="text-gray-900">{client.nationalId || "—"}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700">Date d'inscription</label>
              <p className="text-gray-900">
                {client.registrationDate 
                  ? new Date(client.registrationDate).toLocaleDateString('fr-FR')
                  : new Date(client.createdAt).toLocaleDateString('fr-FR')
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
                {client.subscriptionPeriod || "—"}
              </p>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700">Promotion</label>
              <p className="text-gray-900">
                {client.hasPromotion ? "Oui" : "Non"}
                {client.promotionPeriod && ` (${client.promotionPeriod})`}
              </p>
            </div>
          </div>
        </section>

        {/* Recent Payments */}
        {client.payments && client.payments.length > 0 && (
          <section className="rounded-xl border border-yellow-300 bg-white p-6 shadow-sm">
            <h2 className="mb-4 text-lg font-semibold text-slate-800">Paiements récents</h2>
            <div className="space-y-3">
              {client.payments.map((payment: any) => (
                <div key={payment.id} className="rounded-lg border p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium text-gray-900">
                        {payment.amount?.toLocaleString('fr-FR')} TND
                      </p>
                      <p className="text-sm text-gray-600">
                        Période: {payment.subscriptionPeriod}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm text-gray-600">
                        {new Date(payment.paymentDate).toLocaleDateString('fr-FR')}
                      </p>
                      <p className="text-sm text-gray-600">
                        Prochaine échéance: {new Date(payment.nextPaymentDate).toLocaleDateString('fr-FR')}
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
        {client.presences && client.presences.length > 0 && (
          <section className="rounded-xl border border-yellow-300 bg-white p-6 shadow-sm">
            <h2 className="mb-4 text-lg font-semibold text-slate-800">Présences récentes</h2>
            <div className="space-y-2">
              {client.presences.map((presence: any) => (
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
        {client.history && client.history.length > 0 && (
          <section className="rounded-xl border border-yellow-300 bg-white p-6 shadow-sm">
            <h2 className="mb-4 text-lg font-semibold text-slate-800">Historique des modifications</h2>
            <div className="space-y-3">
              {client.history.map((entry: any) => (
                <div key={entry.id} className="rounded-lg border p-4">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="font-medium text-gray-900">{entry.action}</p>
                      <p className="text-sm text-gray-600">
                        {new Date(entry.createdAt).toLocaleDateString('fr-FR')} à{' '}
                        {new Date(entry.createdAt).toLocaleTimeString('fr-FR')}
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
                {new Date(client.createdAt).toLocaleDateString('fr-FR')} à{' '}
                {new Date(client.createdAt).toLocaleTimeString('fr-FR')}
              </p>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700">Dernière modification</label>
              <p className="text-gray-900">
                {new Date(client.updatedAt).toLocaleDateString('fr-FR')} à{' '}
                {new Date(client.updatedAt).toLocaleTimeString('fr-FR')}
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
    title: `Client #${client.id} - ${client.fullName}`,
    description: `Détails du client ${client.fullName} - ID: ${client.id}`,
  };
}