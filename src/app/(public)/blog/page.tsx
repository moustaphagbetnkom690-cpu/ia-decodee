
import Link from 'next/link';
import { getArticles, getCategories } from '@/lib/api-articles';
import { ArticleCard } from '@/components/ArticleCard';
import { Sidebar } from '@/components/Sidebar';
import { AdBanner } from '@/components/AdBanner';
import { SITE_PATHS, CATEGORIES_LIST } from '@/lib/site-links';
import { Search, ChevronLeft, ChevronRight, X } from 'lucide-react';

export const metadata = {
  title: 'Tous les articles & Guides IA — IA Décodée',
  description: 'Explorez nos articles, comparatifs et tutoriels sur l’Intelligence Artificielle et les LLM.',
};

interface BlogPageProps {
  searchParams: Promise<{
    q?: string;
    category?: string;
    page?: string;
  }>;
}

export default async function BlogPage({ searchParams }: BlogPageProps) {
  const resolvedParams = await searchParams;
  const query = resolvedParams.q || '';
  const categorySlug = resolvedParams.category || '';
  const page = parseInt(resolvedParams.page || '1', 10);

  const [{ articles, total, totalPages }, categories] = await Promise.all([
    getArticles({
      query,
      categorySlug,
      page,
      limit: 6,
    }),
    getCategories(),
  ]);

  const activeCategory = CATEGORIES_LIST.find((c) => c.slug === categorySlug);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 space-y-10">
      
      {/* FIL D'ARIANE */}
      <nav className="text-xs font-mono text-faint flex items-center gap-2">
        <Link href={SITE_PATHS.home} className="hover:text-ink transition-colors">
          Accueil
        </Link>
        <span>/</span>
        <span className="text-lime">Blog</span>
        {activeCategory && (
          <>
            <span>/</span>
            <span className="text-accent">{activeCategory.name}</span>
          </>
        )}
      </nav>

      {/* EN-TÊTE DE PAGE */}
      <div className="space-y-4 border-b border-line pb-8">
        <h1 className="text-3xl sm:text-5xl font-extrabold text-ink">
          {activeCategory ? activeCategory.name : 'Tous les Articles & Analyses IA'}
        </h1>
        <p className="text-sm sm:text-base text-muted max-w-3xl">
          {activeCategory
            ? activeCategory.description
            : 'Retrouvez l’ensemble de nos guides pratiques, décryptages de modèles et dossiers sur l’Intelligence Artificielle.'}
        </p>

        {/* FILTRES ACTIFS ET RECHERCHE */}
        {(query || categorySlug) && (
          <div className="flex flex-wrap items-center gap-2 pt-2">
            <span className="text-xs font-mono text-faint">Filtres actifs :</span>
            {query && (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-accent/15 border border-accent/40 text-xs text-accent font-mono">
                Recherche: &quot;{query}&quot;
                <Link href={`${SITE_PATHS.blog}${categorySlug ? `?category=${categorySlug}` : ''}`}>
                  <X className="w-3 h-3 hover:text-ink" />
                </Link>
              </span>
            )}
            {categorySlug && (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-lime/15 border border-lime/40 text-xs text-lime font-mono">
                Catégorie: {activeCategory?.name || categorySlug}
                <Link href={`${SITE_PATHS.blog}${query ? `?q=${encodeURIComponent(query)}` : ''}`}>
                  <X className="w-3 h-3 hover:text-ink" />
                </Link>
              </span>
            )}
            <Link
              href={SITE_PATHS.blog}
              className="text-xs text-muted hover:text-ink underline ml-2"
            >
              Réinitialiser
            </Link>
          </div>
        )}
      </div>

      {/* BARRE DE SELECTION PAR CATEGORIE */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
        <Link
          href={SITE_PATHS.blog}
          className={`px-4 py-2 rounded-xl text-xs font-mono font-semibold whitespace-nowrap transition-colors border ${
            !categorySlug
              ? 'bg-accent text-ink border-accent'
              : 'bg-surface text-muted border-line hover:border-accent'
          }`}
        >
          Tous ({total})
        </Link>
        {CATEGORIES_LIST.map((cat) => (
          <Link
            key={cat.slug}
            href={`${SITE_PATHS.blog}?category=${cat.slug}${query ? `&q=${encodeURIComponent(query)}` : ''}`}
            className={`px-4 py-2 rounded-xl text-xs font-mono font-semibold whitespace-nowrap transition-colors border flex items-center gap-2 ${
              categorySlug === cat.slug
                ? 'bg-elevated text-lime border-lime'
                : 'bg-surface text-muted border-line hover:border-accent'
            }`}
          >
            <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: cat.color }} />
            {cat.name}
          </Link>
        ))}
      </div>

      {/* RÉSULTATS + SIDEBAR */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
        
        <div className="lg:col-span-8 space-y-10">
          
          {articles.length === 0 ? (
            <div className="surface-panel p-12 rounded-2xl border border-line text-center space-y-4">
              <Search className="w-10 h-10 text-faint mx-auto" />
              <h3 className="text-lg font-bold text-ink">Aucun article trouvé</h3>
              <p className="text-xs text-muted">
                Aucun résultat ne correspond à votre recherche. Essayez d&apos;autres mots-clés.
              </p>
              <Link
                href={SITE_PATHS.blog}
                className="inline-block px-4 py-2 rounded-xl bg-accent text-ink text-xs font-bold"
              >
                Voir tous les articles
              </Link>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              {articles.map((article) => (
                <ArticleCard key={article.id} article={article} />
              ))}
            </div>
          )}

          {/* PAGINATION RÉELLE (?page=) */}
          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-2 pt-6 border-t border-line">
              {page > 1 && (
                <Link
                  href={`${SITE_PATHS.blog}?page=${page - 1}${query ? `&q=${encodeURIComponent(query)}` : ''}${categorySlug ? `&category=${categorySlug}` : ''}`}
                  className="p-2.5 rounded-xl surface-panel border border-line hover:border-accent text-ink text-xs flex items-center gap-1 font-mono"
                >
                  <ChevronLeft className="w-4 h-4" />
                  Précédent
                </Link>
              )}

              <span className="text-xs font-mono text-muted px-4">
                Page {page} sur {totalPages}
              </span>

              {page < totalPages && (
                <Link
                  href={`${SITE_PATHS.blog}?page=${page + 1}${query ? `&q=${encodeURIComponent(query)}` : ''}${categorySlug ? `&category=${categorySlug}` : ''}`}
                  className="p-2.5 rounded-xl surface-panel border border-line hover:border-accent text-ink text-xs flex items-center gap-1 font-mono"
                >
                  Suivant
                  <ChevronRight className="w-4 h-4" />
                </Link>
              )}
            </div>
          )}

          <AdBanner format="auto" label="Sponsorisé — Solutions IA" />

        </div>

        <div className="lg:col-span-4">
          <Sidebar popularArticles={articles} categories={categories} />
        </div>

      </div>

    </div>
  );
}
