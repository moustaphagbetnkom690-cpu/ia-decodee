
import Link from 'next/link';
import { NeuralHero } from '@/components/NeuralHero';
import { ArticleCard } from '@/components/ArticleCard';
import { Sidebar } from '@/components/Sidebar';
import { AdBanner } from '@/components/AdBanner';
import { getArticles, getCategories } from '@/lib/api-articles';
import { SITE_PATHS, CATEGORIES_LIST } from '@/lib/site-links';
import { Sparkles, ArrowRight, BookOpen, Layers, Zap } from 'lucide-react';

export const revalidate = 60; // Revalidation ISR toutes les 60s

export default async function HomePage() {
  const [{ articles, total }, categories] = await Promise.all([
    getArticles({ limit: 6 }),
    getCategories(),
  ]);

  const featuredArticle = articles[0];
  const secondaryArticles = articles.slice(1);

  return (
    <div className="space-y-16 pb-12">
      
      {/* 1. HERO NEURAL */}
      <NeuralHero />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* AD BANNER LEADERBOARD */}
        <AdBanner format="horizontal" label="Espace Partenaire — Technologies IA" />

        {/* 2. SECTION "PAR OÙ COMMENCER" (PILES DE CONTENU) */}
        <section className="my-16 space-y-8">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-line pb-4">
            <div>
              <span className="eyebrow mb-2">Guide de démarrage</span>
              <h2 className="text-2xl sm:text-3xl font-extrabold text-ink flex items-center gap-2">
                <BookOpen className="w-6 h-6 text-accent" />
                Par où commencer sur IA Décodée ?
              </h2>
            </div>
            <p className="text-xs text-muted max-w-md">
              Des guides structurés pour passer de la simple curiosité à l&apos;ingénierie de prompt avancée.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {CATEGORIES_LIST.slice(0, 3).map((cat, idx) => (
              <Link
                key={cat.slug}
                href={cat.href}
                className="surface-card p-6 rounded-2xl border border-line hover:border-accent space-y-4 group flex flex-col justify-between"
              >
                <div className="space-y-3">
                  <div className="w-10 h-10 rounded-xl bg-accent/15 border border-accent/30 flex items-center justify-center text-lime group-hover:scale-110 transition-transform">
                    <Layers className="w-5 h-5" />
                  </div>
                  <span className="text-[11px] font-mono text-faint uppercase tracking-wider block">
                    Module 0{idx + 1}
                  </span>
                  <h3 className="text-lg font-bold text-ink group-hover:text-lime transition-colors">
                    {cat.name}
                  </h3>
                  <p className="text-xs text-muted leading-relaxed">
                    {cat.description}
                  </p>
                </div>

                <div className="pt-4 border-t border-line flex items-center justify-between text-xs font-mono text-accent group-hover:text-lime">
                  <span>Découvrir les articles</span>
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </div>
              </Link>
            ))}
          </div>
        </section>

        {/* 3. GRILLE PRINCIPALE (ARTICLES + SIDEBAR) */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 my-16">
          
          <div className="lg:col-span-8 space-y-10">
            
            {/* ARTICLE À LA UNE */}
            {featuredArticle && (
              <section className="space-y-4">
                <div className="flex items-center justify-between">
                  <h2 className="text-xl font-bold text-ink flex items-center gap-2">
                    <Sparkles className="w-5 h-5 text-lime" />
                    À la Une
                  </h2>
                </div>
                <ArticleCard article={featuredArticle} featured />
              </section>
            )}

            {/* DERNIERS ARTICLES PUBLIÉS */}
            <section className="space-y-6">
              <div className="flex items-center justify-between border-b border-line pb-3">
                <h2 className="text-xl font-bold text-ink flex items-center gap-2">
                  <Zap className="w-5 h-5 text-accent" />
                  Derniers Articles & Analyses
                </h2>
                <Link
                  href={SITE_PATHS.blog}
                  className="text-xs font-mono text-lime hover:underline flex items-center gap-1"
                >
                  Voir tous ({total})
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                {secondaryArticles.map((article) => (
                  <ArticleCard key={article.id} article={article} />
                ))}
              </div>
            </section>

            {/* AD BANNER IN-ARTICLE */}
            <AdBanner format="auto" label="Publicité — Outils et Formations IA" />

          </div>

          {/* SIDEBAR WIDGETS */}
          <div className="lg:col-span-4">
            <Sidebar popularArticles={articles} categories={categories} />
          </div>

        </div>

        {/* 4. BLOC BANNIÈRE CTA DE FIN DE PAGE */}
        <section className="my-16 surface-panel rounded-3xl p-8 sm:p-12 border border-accent/40 text-center space-y-6 relative overflow-hidden bg-neural">
          <div className="max-w-2xl mx-auto space-y-4 relative z-10">
            <span className="eyebrow">Communauté IA Décodée</span>
            <h2 className="text-2xl sm:text-4xl font-extrabold text-ink">
              Ne manquez plus aucune rupture technologique dans l&apos;IA
            </h2>
            <p className="text-sm text-muted leading-relaxed">
              Rejoignez des milliers de passionnés, développeurs et décisionnaires qui décodent chaque semaine l&apos;actualité et les performances des modèles d&apos;IA.
            </p>
            <div className="pt-4 flex justify-center">
              <Link
                href={SITE_PATHS.blog}
                className="px-8 py-4 rounded-xl bg-accent hover:bg-accent-hover text-ink font-bold text-sm shadow-xl shadow-accent/30 transition-all hover:scale-105 flex items-center gap-2"
              >
                Parcourir le Blog
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </div>
        </section>

      </div>
    </div>
  );
}
