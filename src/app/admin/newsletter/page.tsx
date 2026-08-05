import { Mails, Trash2, Download } from 'lucide-react';
import { requireAdmin } from '@/lib/auth';
import { getNewsletterSubscribers } from '@/lib/api-admin';
import { deleteSubscriber } from '@/lib/actions/admin';
import { countryFlag, countryName } from '@/lib/geo';
import { formatDateTime, formatNumber } from '@/lib/utils';

export default async function AdminNewsletterPage() {
  await requireAdmin();
  const subscribers = await getNewsletterSubscribers();

  // Export CSV généré côté serveur puis servi via une data URL : cela évite
  // d'ajouter une route d'API dédiée pour une fonctionnalité aussi ponctuelle.
  const csv = [
    'email,pays,source,inscrit_le',
    ...subscribers.map((sub) =>
      [
        sub.email,
        sub.country_code ?? '',
        sub.source ?? '',
        new Date(sub.created_at).toISOString(),
      ].join(',')
    ),
  ].join('\n');

  const csvHref = `data:text/csv;charset=utf-8,${encodeURIComponent(csv)}`;

  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-4 border-b border-line pb-6 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <span className="eyebrow mb-2">Audience directe</span>
          <h1 className="text-2xl font-bold text-ink">Newsletter</h1>
          <p className="mt-1 text-sm text-muted">
            {formatNumber(subscribers.length)} abonné{subscribers.length > 1 ? 's' : ''}
            {subscribers.length >= 500 && ' (500 plus récents affichés)'}.
          </p>
        </div>

        {subscribers.length > 0 && (
          <a
            href={csvHref}
            download="abonnes-ia-decodee.csv"
            className="btn btn-ghost shrink-0"
          >
            <Download className="h-4 w-4" />
            Exporter en CSV
          </a>
        )}
      </header>

      {subscribers.length === 0 ? (
        <div className="surface-panel rounded-2xl p-12 text-center">
          <Mails className="mx-auto mb-3 h-8 w-8 text-faint" />
          <p className="text-sm text-muted">Aucun abonné pour l’instant.</p>
          <p className="mx-auto mt-2 max-w-md text-xs text-faint">
            Le formulaire du pied de page enregistre désormais réellement les
            inscriptions en base.
          </p>
        </div>
      ) : (
        <div className="surface-panel overflow-hidden rounded-2xl">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[560px] border-collapse text-left text-xs">
              <thead>
                <tr className="border-b border-line bg-surface font-mono text-muted">
                  <th scope="col" className="p-4">Adresse e-mail</th>
                  <th scope="col" className="p-4">Pays</th>
                  <th scope="col" className="p-4">Inscrit le</th>
                  <th scope="col" className="p-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {subscribers.map((sub) => (
                  <tr key={sub.id} className="transition-colors hover:bg-elevated/50">
                    <td className="p-4 font-medium text-ink">{sub.email}</td>
                    <td className="p-4 text-muted">
                      {sub.country_code ? (
                        <span className="flex items-center gap-2">
                          <span aria-hidden>{countryFlag(sub.country_code)}</span>
                          {countryName(sub.country_code)}
                        </span>
                      ) : (
                        <span className="text-faint">—</span>
                      )}
                    </td>
                    <td className="p-4 font-mono text-[11px] text-faint">
                      {formatDateTime(sub.created_at)}
                    </td>
                    <td className="p-4">
                      <form action={deleteSubscriber} className="flex justify-end">
                        <input type="hidden" name="id" value={sub.id} />
                        <button
                          type="submit"
                          aria-label={`Désinscrire ${sub.email}`}
                          className="rounded-lg bg-danger/15 p-2 text-danger transition-colors hover:bg-danger hover:text-ink"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </form>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
