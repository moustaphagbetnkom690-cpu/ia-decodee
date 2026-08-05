
import { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getArticles, getCategories, getCategoryBySlug } from '@/lib/api-articles';
import { ArticleCard } from '@/components/ArticleCard';
import { Sidebar } from '@/components/Sidebar';
import { AdBanner } from '@/components/AdBanner';
import { SITE_PATHS } from '@/lib/site-links';
import { siteConfig } from '@/lib/site-config';
import { Tag, ChevronRight } from 'lucide-react';

interface CategoryPageProps {
  params: Promise<{
    slug: string;
  }>;
}

/** Pré-génère une page par catégorie au moment du build. */
export async function generateStaticParams() {
  const categories = await getCategories();
  return categories.map((category) => ({ slug: category.slug }));
}

export async function generateMetadata({ params }: CategoryPageProps): Promise<Metadata> {
  const { slug } = await params;
  const category = await getCategoryBySlug(slug);

  if (!category) {
    return { title: 'Catégorie introuvable' };
  }

  return {
    title: `${category.name} — Articles & Guides IA`,
    description: category.description || `Retrouvez les meilleurs articles et guides dans la catégorie ${category.name}.`,
    alternates: {
      canonical: `${siteConfig.url}/categories/${category.slug}`,
    },
  };
}

export default async function CategoryPage({ params }: CategoryPageProps) {
  const { slug } = await params;
  const category = await getCategoryBySlug(slug);

  if (!category) {
    notFound();
  }

  const [{ articles, total }, categories] = await Promise.all([
    getArticles({ categorySlug: slug, limit: 12 }),
    getCategories(),
  ]);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 space-y-10">
      
      {/* BREADCRUMB */}
      <nav className="text-xs font-mono text-faint flex items-center gap-2">
        <Link href={SITE_PATHS.home} className="hover:text-ink transition-colors">
          Accueil
        </Link>
        <ChevronRight className="w-3 h-3" />
        <Link href={SITE_PATHS.blog} className="hover:text-ink transition-colors">
          Catégories
        </Link>
        <ChevronRight className="w-3 h-3" />
        <span className="text-lime">{category.name}</span>
      </nav>

      {/* HEADER DE LA CATEGORIE */}
      <div className="surface-panel p-8 rounded-3xl border border-line space-y-4 bg-neural">
        <div className="flex items-center gap-3">
          <span
            className="w-3 h-3 rounded-full shadow-lg"
            style={{ backgroundColor: category.color }}
          />
          <span className="eyebrow" style={{ color: category.color, borderColor: `${category.color}40` }}>
            Catégorie Spécialisée
          </span>
        </div>

        <h1 className="text-3xl sm:text-5xl font-extrabold text-ink">
          {category.name}
        </h1>

        <p className="text-sm sm:text-base text-muted max-w-2xl leading-relaxed">
          {category.description}
        </p>

        <div className="pt-2 text-xs font-mono text-faint">
          {total} article{total > 1 ? 's' : ''} disponible{total > 1 ? 's' : ''}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
        
        <div className="lg:col-span-8 space-y-8">
          
          {articles.length === 0 ? (
            <div className="surface-panel p-12 rounded-2xl border border-line text-center space-y-4">
              <Tag className="w-10 h-10 text-faint mx-auto" />
              <h3 className="text-lg font-bold text-ink">Aucun article dans cette catégorie pour le moment</h3>
              <Link href={SITE_PATHS.blog} className="inline-block px-4 py-2 rounded-xl bg-accent text-ink text-xs font-bold">
                Parcourir les autres catégories
              </Link>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              {articles.map((article) => (
                <ArticleCard key={article.id} article={article} />
              ))}
            </div>
          )}

          <AdBanner format="auto" label="Sponsorisé" />

        </div>

        <div className="lg:col-span-4">
          <Sidebar popularArticles={articles} categories={categories} />
        </div>

      </div>

    </div>
  );
}
