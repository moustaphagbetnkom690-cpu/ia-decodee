import { siteConfig } from '@/lib/site-config';
import { jsonLd } from '@/lib/utils';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';

/**
 * Layout du SITE PUBLIC.
 *
 * En-tête de navigation, pied de page, lien d'évitement et balisage JSON-LD :
 * tout ce qui s'adresse au lecteur. Le back-office (`/admin`) ne traverse pas
 * ce layout et n'affiche donc plus le menu des catégories, la newsletter ni les
 * mentions légales — ces éléments n'ont aucun sens pour un rédacteur connecté.
 *
 * Le dossier `(public)` étant un groupe de routes, il n'apparaît pas dans les
 * URL : `/blog`, `/contact`, `/a-propos` restent identiques.
 */
export default function PublicLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const jsonLdOrg = {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: siteConfig.name,
    url: siteConfig.url,
    // /logo.png n'a jamais existé : Google recevait un logo en 404 dans les
    // données structurées. Remplacé par un SVG réellement présent dans public/.
    logo: `${siteConfig.url}/logo.svg`,
    description: siteConfig.description,
  };

  const jsonLdWebsite = {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: siteConfig.name,
    url: siteConfig.url,
    inLanguage: 'fr-FR',
    potentialAction: {
      '@type': 'SearchAction',
      target: `${siteConfig.url}/blog?q={search_term_string}`,
      'query-input': 'required name=search_term_string',
    },
  };

  return (
    <>
      {/* Lien d'évitement : premier élément focusable de la page, invisible
          tant qu'il n'a pas le focus. Nécessaire à la navigation au clavier. */}
      <a
        href="#contenu-principal"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[100] focus:rounded-lg focus:bg-accent focus:px-4 focus:py-2 focus:text-sm focus:font-semibold focus:text-ink"
      >
        Aller au contenu principal
      </a>

      <Header />
      <main id="contenu-principal" className="flex-1">
        {children}
      </main>
      <Footer />

      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: jsonLd(jsonLdOrg) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: jsonLd(jsonLdWebsite) }}
      />
    </>
  );
}
