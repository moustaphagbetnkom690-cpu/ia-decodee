
import Link from 'next/link';
import Image from 'next/image';
import { Article } from '@/lib/types';
import { SITE_PATHS } from '@/lib/site-links';
import { formatDateHeure } from '@/lib/utils';
import { Clock, Eye, Calendar, ArrowUpRight } from 'lucide-react';

export interface ArticleCardProps {
  article: Article;
  featured?: boolean;
}

export function ArticleCard({ article, featured = false }: ArticleCardProps) {
  const categorySlug = article.category?.slug || 'modeles';
  const categoryName = article.category?.name || 'Modèles';
  const categoryColor = article.category?.color || '#7C5CFF';

  /* Date ET heure, en heure de Paris. Le formatage passe par l'utilitaire
     partagé plutôt que par un toLocaleDateString local : rendu sur Vercel,
     celui-ci suivait le fuseau UTC de la fonction serverless et décalait
     l'affichage de deux heures en été. */
  const publishedDate = formatDateHeure(article.published_at);

  if (featured) {
    return (
      <article className="surface-card rounded-2xl overflow-hidden grid grid-cols-1 lg:grid-cols-12 gap-0 group">
        <div className="lg:col-span-7 relative min-h-[260px] sm:min-h-[340px] overflow-hidden">
          <Image
            src={article.featured_image || 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=1200&q=80'}
            alt={article.title}
            fill
            className="object-cover group-hover:scale-105 transition-transform duration-500"
            sizes="(max-width: 1024px) 100vw, 60vw"
            priority
          />
          <div className="absolute inset-0 bg-gradient-to-t from-surface via-transparent to-transparent opacity-80" />
        </div>

        <div className="lg:col-span-5 p-6 sm:p-8 flex flex-col justify-between space-y-4">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Link
                href={SITE_PATHS.category(categorySlug)}
                className="text-xs font-mono font-bold uppercase tracking-wider px-3 py-1 rounded-full border transition-colors"
                style={{
                  color: categoryColor,
                  borderColor: `${categoryColor}40`,
                  backgroundColor: `${categoryColor}15`,
                }}
              >
                {categoryName}
              </Link>
              <span className="text-[11px] font-mono text-faint flex items-center gap-1">
                <Calendar className="w-3 h-3" />
                {publishedDate}
              </span>
            </div>

            <h2 className="text-xl sm:text-2xl font-bold text-ink group-hover:text-lime transition-colors leading-snug">
              <Link href={SITE_PATHS.article(article.slug)} className="flex items-start justify-between gap-2">
                <span>{article.title}</span>
                <ArrowUpRight className="w-5 h-5 flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity text-lime" />
              </Link>
            </h2>

            <p className="text-sm text-muted line-clamp-3 leading-relaxed">
              {article.excerpt}
            </p>
          </div>

          <div className="flex items-center justify-between pt-4 border-t border-line text-xs text-faint font-mono">
            <span className="flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-accent" />
              {article.reading_time_minutes || 4} min de lecture
            </span>
            <span className="flex items-center gap-1.5">
              <Eye className="w-3.5 h-3.5 text-lime" />
              {(article.views ?? 0).toLocaleString('fr-FR')} vues
            </span>
          </div>
        </div>
      </article>
    );
  }

  return (
    <article className="surface-card rounded-2xl overflow-hidden flex flex-col justify-between group h-full">
      <div>
        <div className="relative aspect-[16/9] w-full overflow-hidden">
          <Image
            src={article.featured_image || 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=800&q=80'}
            alt={article.title}
            fill
            className="object-cover group-hover:scale-105 transition-transform duration-500"
            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
          />
          <div className="absolute top-3 left-3">
            <Link
              href={SITE_PATHS.category(categorySlug)}
              className="text-[11px] font-mono font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full border backdrop-blur-md"
              style={{
                color: categoryColor,
                borderColor: `${categoryColor}50`,
                backgroundColor: 'rgba(10, 10, 15, 0.85)',
              }}
            >
              {categoryName}
            </Link>
          </div>
        </div>

        <div className="p-5 space-y-3">
          <div className="flex items-center gap-2 text-[11px] font-mono text-faint">
            <Calendar className="w-3 h-3" />
            <span>{publishedDate}</span>
          </div>

          <h3 className="text-lg font-bold text-ink group-hover:text-lime transition-colors leading-snug line-clamp-2">
            <Link href={SITE_PATHS.article(article.slug)}>
              {article.title}
            </Link>
          </h3>

          <p className="text-xs text-muted line-clamp-3 leading-relaxed">
            {article.excerpt}
          </p>
        </div>
      </div>

      <div className="p-5 pt-0">
        <div className="flex items-center justify-between pt-3 border-t border-line text-xs text-faint font-mono">
          <span className="flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5 text-accent" />
            {article.reading_time_minutes || 4} min
          </span>
          <span className="flex items-center gap-1.5">
            <Eye className="w-3.5 h-3.5 text-lime" />
            {article.views ?? 0} vues
          </span>
        </div>
      </div>
    </article>
  );
}
