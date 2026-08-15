import { MetadataRoute } from 'next';
import { getArticles, getCategories } from '@/lib/api-articles';
import { siteConfig } from '@/lib/site-config';

/*
 * Plan de site rendu à la demande, et non mis en cache.
 *
 * ── Pourquoi pas d'ISR ici ───────────────────────────────────────────────────
 * `export const revalidate = 60` a d'abord été essayé, et ne suffit pas :
 * vérifié en production, le plan de site restait servi avec `X-Vercel-Cache:
 * HIT` et un `Age` supérieur à la fenêtre de revalidation, sans jamais se
 * régénérer. Un article publié n'y apparaissait donc pas — c'est exactement le
 * défaut qui avait laissé 9 articles sur 12 hors du plan de site, invisibles de
 * Google pendant une semaine.
 *
 * Le coût du rendu dynamique est ici négligeable, et c'est ce qui rend
 * l'arbitrage facile : cette route n'est demandée que par des robots
 * d'indexation, quelques dizaines de fois par jour, contre deux requêtes
 * Supabase à chaque appel. Un plan de site faux coûte infiniment plus cher
 * qu'un plan de site recalculé.
 *
 * Le flux RSS, lui, garde son ISR : c'est un Route Handler, il fixe ses propres
 * en-têtes de cache et se régénère correctement (vérifié en production).
 */
export const dynamic = 'force-dynamic';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [{ articles }, categories] = await Promise.all([
    getArticles({ limit: 100 }),
    getCategories(),
  ]);

  const baseUrl = siteConfig.url;

  // Pages statiques
  const staticPages: MetadataRoute.Sitemap = [
    {
      url: baseUrl,
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 1.0,
    },
    {
      url: `${baseUrl}/blog`,
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 0.9,
    },
    {
      url: `${baseUrl}/a-propos`,
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 0.5,
    },
    {
      url: `${baseUrl}/contact`,
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 0.5,
    },
    {
      url: `${baseUrl}/mentions-legales`,
      lastModified: new Date(),
      changeFrequency: 'yearly',
      priority: 0.3,
    },
    {
      url: `${baseUrl}/politique-de-confidentialite`,
      lastModified: new Date(),
      changeFrequency: 'yearly',
      priority: 0.3,
    },
  ];

  // Pages d'articles
  const articlePages: MetadataRoute.Sitemap = articles.map((article) => ({
    url: `${baseUrl}/blog/${article.slug}`,
    lastModified: new Date(article.updated_at || article.published_at),
    changeFrequency: 'weekly',
    priority: 0.8,
  }));

  // Pages de catégories
  const categoryPages: MetadataRoute.Sitemap = categories.map((cat) => ({
    url: `${baseUrl}/categories/${cat.slug}`,
    lastModified: new Date(),
    changeFrequency: 'weekly',
    priority: 0.7,
  }));

  return [...staticPages, ...articlePages, ...categoryPages];
}
