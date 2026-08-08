import Link from 'next/link';
import { Plus, Eye, Pencil, CheckCircle2, Clock, FileText, CalendarClock } from 'lucide-react';
import { requireAdmin } from '@/lib/auth';
import { getAdminArticles } from '@/lib/api-admin';
import { toggleArticleStatus } from '@/lib/actions/admin';
import { SITE_PATHS } from '@/lib/site-links';
import { formatDateTime, formatNumber, estDansLeFutur } from '@/lib/utils';

export default async function AdminArticlesPage() {
  await requireAdmin();
  const articles = await getAdminArticles();

  const programmes = articles.filter(
    (article) => article.status === 'published' && estDansLeFutur(article.published_at)
  ).length;

  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-4 border-b border-line pb-6 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <span className="eyebrow mb-2">Catalogue</span>
          <h1 className="text-2xl font-bold text-ink">Articles</h1>
          <p className="mt-1 text-sm text-muted">
            {articles.length} article{articles.length > 1 ? 's' : ''} au total
            {programmes > 0 && (
              <>
                {' — dont '}
                <span className="text-warning">
                  {programmes} programmé{programmes > 1 ? 's' : ''}
                </span>
              </>
            )}
            .
          </p>
        </div>

        <Link href={SITE_PATHS.adminArticleNew} className="btn btn-primary shrink-0">
          <Plus className="h-4 w-4" />
          Nouvel article
        </Link>
      </header>

      {articles.length === 0 ? (
        <div className="surface-panel rounded-2xl p-12 text-center">
          <FileText className="mx-auto mb-3 h-8 w-8 text-faint" />
          <p className="text-sm text-muted">Aucun article pour le moment.</p>
          <Link href={SITE_PATHS.adminArticleNew} className="btn btn-primary mt-5">
            <Plus className="h-4 w-4" />
            Rédiger le premier article
          </Link>
        </div>
      ) : (
        <div className="surface-panel overflow-hidden rounded-2xl">
          {/* Le tableau défile horizontalement dans son propre conteneur plutôt
              que de faire déborder la page entière sur petit écran. */}
          <div className="overflow-x-auto">
            <table className="w-full min-w-[900px] border-collapse text-left text-xs">
              <thead>
                <tr className="border-b border-line bg-surface font-mono text-muted">
                  <th scope="col" className="p-4">Titre</th>
                  <th scope="col" className="p-4">Catégorie</th>
                  <th scope="col" className="p-4">Statut</th>
                  <th scope="col" className="p-4 text-right">Vues</th>
                  <th scope="col" className="p-4">Publication</th>
                  <th scope="col" className="p-4">Modifié</th>
                  <th scope="col" className="p-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {articles.map((article) => {
                  /* « Programmé » n'est pas un statut stocké : c'est un article
                     publié dont l'heure de parution n'est pas encore venue. */
                  const programme =
                    article.status === 'published' && estDansLeFutur(article.published_at);

                  return (
                  <tr key={article.id} className="transition-colors hover:bg-elevated/50">
                    <td className="max-w-xs p-4">
                      <Link
                        href={SITE_PATHS.adminArticleEdit(article.id)}
                        className="line-clamp-1 font-semibold text-ink hover:text-accent-soft"
                      >
                        {article.title}
                      </Link>
                      <span className="font-mono text-[10px] text-faint">
                        /blog/{article.slug}
                      </span>
                    </td>

                    <td className="p-4">
                      {article.category ? (
                        <span
                          className="rounded-full border px-2.5 py-0.5 font-mono text-[10px] font-bold uppercase"
                          style={{
                            color: article.category.color,
                            borderColor: `${article.category.color}40`,
                            backgroundColor: `${article.category.color}15`,
                          }}
                        >
                          {article.category.name}
                        </span>
                      ) : (
                        <span className="font-mono text-[10px] text-faint">Sans catégorie</span>
                      )}
                    </td>

                    <td className="p-4">
                      {/* Bascule publication/brouillon en un clic, sans ouvrir
                          l'éditeur. C'est un formulaire (donc un POST), pas un
                          lien : une action qui modifie l'état ne doit jamais
                          être déclenchable par un GET. */}
                      <form action={toggleArticleStatus}>
                        <input type="hidden" name="id" value={article.id} />
                        <input type="hidden" name="status" value={article.status} />
                        <button
                          type="submit"
                          title="Cliquer pour changer le statut"
                          className={
                            programme
                              ? 'flex items-center gap-1 font-mono text-warning hover:underline'
                              : article.status === 'published'
                                ? 'flex items-center gap-1 font-mono text-lime hover:underline'
                                : 'flex items-center gap-1 font-mono text-muted hover:underline'
                          }
                        >
                          {programme ? (
                            <>
                              <CalendarClock className="h-3.5 w-3.5" /> Programmé
                            </>
                          ) : article.status === 'published' ? (
                            <>
                              <CheckCircle2 className="h-3.5 w-3.5" /> Publié
                            </>
                          ) : (
                            <>
                              <Clock className="h-3.5 w-3.5" /> Brouillon
                            </>
                          )}
                        </button>
                      </form>
                    </td>

                    <td className="p-4 text-right font-mono tabular-nums text-muted">
                      {formatNumber(article.views)}
                    </td>

                    <td
                      className={
                        programme
                          ? 'whitespace-nowrap p-4 font-mono text-[11px] text-warning'
                          : 'whitespace-nowrap p-4 font-mono text-[11px] text-muted'
                      }
                    >
                      {formatDateTime(article.published_at)}
                    </td>

                    <td className="whitespace-nowrap p-4 font-mono text-[11px] text-faint">
                      {formatDateTime(article.updated_at)}
                    </td>

                    <td className="p-4">
                      <div className="flex items-center justify-end gap-2">
                        <Link
                          href={SITE_PATHS.article(article.slug)}
                          target="_blank"
                          rel="noopener noreferrer"
                          title="Voir l’article"
                          className="rounded-lg bg-surface p-1.5 text-muted hover:bg-elevated hover:text-ink"
                        >
                          <Eye className="h-3.5 w-3.5" />
                        </Link>
                        <Link
                          href={SITE_PATHS.adminArticleEdit(article.id)}
                          title="Éditer"
                          className="rounded-lg bg-accent/20 p-1.5 text-accent-soft transition-colors hover:bg-accent hover:text-ink"
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </Link>
                      </div>
                    </td>
                  </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
