import { Metadata } from 'next';
import Link from 'next/link';
import Image from 'next/image';
import { notFound } from 'next/navigation';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { getArticleBySlug, getCommentsByArticle, getArticles } from '@/lib/api-articles';
import { CommentSection } from '@/components/CommentSection';
import { Sidebar } from '@/components/Sidebar';
import { AdBanner } from '@/components/AdBanner';
import { ViewTracker } from '@/components/ViewTracker';
import { SITE_PATHS } from '@/lib/site-links';
import { siteConfig } from '@/lib/site-config';
import { jsonLd } from '@/lib/utils';
import { Clock, Eye, Calendar, Share2, ChevronRight } from 'lucide-react';

interface ArticlePageProps {
  params: Promise<{
    slug: string;
  }>;
}

/**
 * Pré-génère les pages des articles publiés au moment du build.
 * Un article créé plus tard reste servi normalement : il est rendu à la
 * première demande, puis mis en cache.
 */
export async function generateStaticParams() {
  const { articles } = await getArticles({ limit: 200 });
  return articles.map((article) => ({ slug: article.slug }));
}

export async function generateMetadata({ params }: ArticlePageProps): Promise<Metadata> {
  const { slug } = await params;
  const article = await getArticleBySlug(slug);

  if (!article) {
    return {
      title: 'Article introuvable',
    };
  }

  const canonicalUrl = `${siteConfig.url}/blog/${article.slug}`;

  return {
    // Le titre ne contient QUE celui de l'article : le layout racine applique
    // déjà le gabarit « %s — IA Décodée ». Le suffixe était ajouté deux fois,
    // ce qui produisait « Mon article — IA Décodée — IA Décodée » dans l'onglet
    // du navigateur comme dans les résultats de recherche.
    title: article.title,
    description: article.excerpt,
    alternates: {
      canonical: canonicalUrl,
    },
    openGraph: {
      // OpenGraph n'est pas soumis au gabarit : le suffixe est explicite ici.
      title: `${article.title} — ${siteConfig.name}`,
      description: article.excerpt,
      type: 'article',
      publishedTime: article.published_at,
      authors: [siteConfig.name],
      images: article.featured_image ? [{ url: article.featured_image }] : [],
    },
    twitter: {
      card: 'summary_large_image',
      title: article.title,
      description: article.excerpt,
      images: article.featured_image ? [article.featured_image] : [],
    },
  };
}

export default async function ArticlePage({ params }: ArticlePageProps) {
  const { slug } = await params;

  // CONVENTION #2 NON NÉGOCIABLE: Si le slug n'existe pas -> notFound()
  const article = await getArticleBySlug(slug);

  if (!article) {
    notFound();
  }

  const [comments, { articles: popularArticles }] = await Promise.all([
    getCommentsByArticle(article.id),
    getArticles({ limit: 4 }),
  ]);

  const categoryName = article.category?.name || 'Modèles';
  const categorySlug = article.category?.slug || 'modeles';
  const categoryColor = article.category?.color || '#7C5CFF';

  const publishedDate = new Date(article.published_at).toLocaleDateString('fr-FR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

  const jsonLdBreadcrumb = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      {
        '@type': 'ListItem',
        position: 1,
        name: 'Accueil',
        item: siteConfig.url,
      },
      {
        '@type': 'ListItem',
        position: 2,
        name: 'Blog',
        item: `${siteConfig.url}/blog`,
      },
      {
        '@type': 'ListItem',
        position: 3,
        name: article.title,
        item: `${siteConfig.url}/blog/${article.slug}`,
      },
    ],
  };

  const jsonLdArticle = {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: article.title,
    description: article.excerpt,
    image: article.featured_image || `${siteConfig.url}/images/og-image.jpg`,
    datePublished: article.published_at,
    dateModified: article.updated_at || article.published_at,
    author: {
      '@type': 'Organization',
      name: siteConfig.name,
      url: siteConfig.url,
    },
    publisher: {
      '@type': 'Organization',
      name: siteConfig.name,
      url: siteConfig.url,
    },
    mainEntityOfPage: {
      '@type': 'WebPage',
      '@id': `${siteConfig.url}/blog/${article.slug}`,
    },
  };

  return (
    <article className="pb-16">
      {/* Enregistre la visite (vue + pays) une fois la page réellement affichée
          dans un navigateur. Ne rend rien. */}
      <ViewTracker path={`/blog/${article.slug}`} articleId={article.id} />

      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: jsonLd(jsonLdBreadcrumb) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: jsonLd(jsonLdArticle) }}
      />

      {/* BANNIÈRE D'EN-TÊTE ARTICLE */}
      <div className="bg-neural border-b border-line py-12 lg:py-16">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
          
          {/* BREADCRUMB */}
          <nav className="text-xs font-mono text-faint flex flex-wrap items-center gap-2">
            <Link href={SITE_PATHS.home} className="hover:text-ink transition-colors">
              Accueil
            </Link>
            <ChevronRight className="w-3 h-3 text-faint" />
            <Link href={SITE_PATHS.blog} className="hover:text-ink transition-colors">
              Blog
            </Link>
            <ChevronRight className="w-3 h-3 text-faint" />
            <Link
              href={SITE_PATHS.category(categorySlug)}
              className="hover:text-ink transition-colors"
              style={{ color: categoryColor }}
            >
              {categoryName}
            </Link>
          </nav>

          {/* TITRE ET METADATA */}
          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-ink leading-tight">
            {article.title}
          </h1>

          <p className="text-base sm:text-lg text-muted leading-relaxed">
            {article.excerpt}
          </p>

          <div className="flex flex-wrap items-center justify-between gap-4 pt-4 border-t border-line/80 text-xs font-mono text-muted">
            <div className="flex items-center gap-4">
              <span className="flex items-center gap-1.5">
                <Calendar className="w-4 h-4 text-accent" />
                {publishedDate}
              </span>
              <span className="flex items-center gap-1.5">
                <Clock className="w-4 h-4 text-lime" />
                {article.reading_time_minutes || 4} min de lecture
              </span>
              <span className="flex items-center gap-1.5">
                <Eye className="w-4 h-4 text-info" />
                {article.views ?? 0} vues
              </span>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-[10px] text-faint uppercase tracking-wider">Partager :</span>
              <a
                href={`https://twitter.com/intent/tweet?text=${encodeURIComponent(article.title)}&url=${encodeURIComponent(`${siteConfig.url}/blog/${article.slug}`)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="p-1.5 rounded-lg bg-surface hover:bg-elevated text-ink border border-line flex items-center gap-1 text-[11px]"
                aria-label="Partager sur X"
              >
                <Share2 className="w-3.5 h-3.5 text-lime" />
                X / Twitter
              </a>
              <a
                href={`https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(`${siteConfig.url}/blog/${article.slug}`)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="p-1.5 rounded-lg bg-surface hover:bg-elevated text-ink border border-line flex items-center gap-1 text-[11px]"
                aria-label="Partager sur LinkedIn"
              >
                <Share2 className="w-3.5 h-3.5 text-accent" />
                LinkedIn
              </a>
            </div>
          </div>

        </div>
      </div>

      {/* CORPS DE L'ARTICLE + SIDEBAR */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">
          
          <div className="lg:col-span-8 space-y-8">
            
            {/* IMAGE EN AVANT */}
            {article.featured_image && (
              <div className="relative aspect-[16/9] w-full rounded-2xl overflow-hidden border border-line shadow-2xl">
                <Image
                  src={article.featured_image}
                  alt={article.title}
                  fill
                  className="object-cover"
                  sizes="(max-width: 1024px) 100vw, 70vw"
                  priority
                />
              </div>
            )}

            {/* EMBED PUB HAUT D'ARTICLE */}
            <AdBanner format="horizontal" label="Publicité" />

            {/* CONTENU MARKDOWN RENDU */}
            <div className="prose-neural">
              <ReactMarkdown remarkPlugins={[remarkGfm]}>
                {article.content}
              </ReactMarkdown>
            </div>

            {/* EMBED PUB BAS D'ARTICLE */}
            <AdBanner format="auto" label="Recommandation — Outils IA" />

            {/* COMMENTAIRES */}
            <CommentSection articleId={article.id} initialComments={comments} />

          </div>

          {/* SIDEBAR */}
          <div className="lg:col-span-4">
            <Sidebar popularArticles={popularArticles} />
          </div>

        </div>
      </div>
    </article>
  );
}
