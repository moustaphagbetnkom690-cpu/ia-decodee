import Link from 'next/link';
import { ArrowUpRight, Clock } from 'lucide-react';
import { SITE_PATHS } from '@/lib/site-links';
import { formatDate } from '@/lib/utils';
import type { Article } from '@/lib/types';

export interface RelatedArticlesProps {
  articles: Article[];
}

/**
 * Bloc « À lire ensuite », placé à la fin du corps de l'article.
 *
 * ── Ce qu'il apporte, et pourquoi c'est du référencement ─────────────────────
 * Chaque carte est un lien interne dont l'ancre est le TITRE de l'article visé,
 * et non un « lire la suite » générique. C'est la différence qui compte : un
 * moteur de recherche lit l'ancre pour comprendre de quoi parle la page
 * pointée. Quatre liens décrits par article, croisés sur douze articles,
 * construisent la grappe thématique qui manquait entièrement au site.
 *
 * Le bloc est rendu côté serveur, dans le HTML initial : un maillage injecté
 * par JavaScript après le chargement n'a pas la même valeur, le crawler ne
 * garantissant pas d'exécuter le script.
 */
export function RelatedArticles({ articles }: RelatedArticlesProps) {
  if (articles.length === 0) return null;

  return (
    <section
      aria-labelledby="a-lire-ensuite"
      className="my-12 space-y-6 border-t border-line pt-8"
    >
      <div className="flex items-end justify-between gap-4">
        <div>
          <span className="eyebrow mb-2">Poursuivre</span>
          <h2 id="a-lire-ensuite" className="text-xl font-bold text-ink">
            À lire ensuite
          </h2>
        </div>
        <Link
          href={SITE_PATHS.blog}
          className="shrink-0 font-mono text-[11px] text-accent-soft hover:text-lime"
        >
          Tous les articles →
        </Link>
      </div>

      <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {articles.map((article) => {
          const couleur = article.category?.color ?? '#7C5CFF';

          return (
            <li key={article.id} className="surface-panel group rounded-xl p-4">
              {article.category && (
                <Link
                  href={SITE_PATHS.category(article.category.slug)}
                  className="mb-2 inline-block rounded-full border px-2.5 py-0.5 font-mono text-[10px] font-bold uppercase tracking-wider"
                  style={{
                    color: couleur,
                    borderColor: `${couleur}40`,
                    backgroundColor: `${couleur}15`,
                  }}
                >
                  {article.category.name}
                </Link>
              )}

              <h3 className="text-sm font-bold leading-snug text-ink transition-colors group-hover:text-lime">
                <Link
                  href={SITE_PATHS.article(article.slug)}
                  className="flex items-start justify-between gap-2"
                >
                  <span>{article.title}</span>
                  <ArrowUpRight className="h-4 w-4 shrink-0 text-lime opacity-0 transition-opacity group-hover:opacity-100" />
                </Link>
              </h3>

              <p className="mt-2 line-clamp-2 text-xs leading-relaxed text-muted">
                {article.excerpt}
              </p>

              <p className="mt-3 flex items-center gap-3 font-mono text-[10px] text-faint">
                <span className="flex items-center gap-1">
                  <Clock className="h-3 w-3 text-accent" />
                  {article.reading_time_minutes || 4} min
                </span>
                <time dateTime={article.published_at}>{formatDate(article.published_at)}</time>
              </p>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
