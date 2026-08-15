import { getArticles } from '@/lib/api-articles';
import { siteConfig } from '@/lib/site-config';

/**
 * Flux RSS 2.0 du blog.
 *
 * ── Pourquoi un flux, en 2026 ────────────────────────────────────────────────
 * Le RSS n'apporte pas de position dans les résultats de recherche, et ce n'est
 * pas ce qu'on lui demande. Il sert la DÉCOUVERTE, qui est le vrai blocage d'un
 * site jeune : les agrégateurs francophones, les lettres d'information de veille
 * et les robots d'indexation de Bing et Yandex consomment des flux. C'est aussi
 * la seule façon pour un lecteur régulier de suivre le site sans compte ni
 * newsletter.
 *
 * ── Choix d'implémentation ───────────────────────────────────────────────────
 * On sert l'extrait, jamais le contenu intégral. Republier 20 000 caractères
 * dans le flux, c'est offrir l'article entier aux sites qui aspirent les flux
 * pour le republier — et se retrouver en duplicata de son propre texte.
 *
 * La revalidation suit celle du reste du site : un article programmé apparaît
 * dans le flux à son heure, et pas avant, `getArticles` appliquant déjà le
 * filtre de parution.
 */
export const revalidate = 60;

/** Neutralise les caractères réservés du XML. */
function echapper(texte: string): string {
  return texte
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

export async function GET(): Promise<Response> {
  const { articles } = await getArticles({ limit: 50 });

  const items = articles
    .map((article) => {
      const url = `${siteConfig.url}/blog/${article.slug}`;

      return `    <item>
      <title>${echapper(article.title)}</title>
      <link>${url}</link>
      <guid isPermaLink="true">${url}</guid>
      <pubDate>${new Date(article.published_at).toUTCString()}</pubDate>
      <description>${echapper(article.excerpt)}</description>${
        article.category ? `\n      <category>${echapper(article.category.name)}</category>` : ''
      }
    </item>`;
    })
    .join('\n');

  // `lastBuildDate` reprend la date du dernier article plutôt que l'heure
  // courante : régénéré toutes les 60 s, un flux daté de « maintenant »
  // paraîtrait modifié en permanence et pousserait les agrégateurs à le
  // retélécharger sans cesse pour un contenu identique.
  const dernierePublication = articles[0]?.published_at ?? new Date().toISOString();

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>${echapper(siteConfig.name)}</title>
    <link>${siteConfig.url}</link>
    <description>${echapper(siteConfig.description)}</description>
    <language>fr-FR</language>
    <lastBuildDate>${new Date(dernierePublication).toUTCString()}</lastBuildDate>
    <atom:link href="${siteConfig.url}/feed.xml" rel="self" type="application/rss+xml"/>
${items}
  </channel>
</rss>`;

  return new Response(xml, {
    headers: {
      'Content-Type': 'application/rss+xml; charset=utf-8',
      'Cache-Control': 'public, max-age=0, s-maxage=60, stale-while-revalidate=300',
    },
  });
}
