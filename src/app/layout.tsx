import type { Metadata, Viewport } from 'next';
import { Inter, Space_Grotesk, JetBrains_Mono } from 'next/font/google';
import Script from 'next/script';
import './globals.css';
import { siteConfig, RSS_ALTERNATE_TYPES } from '@/lib/site-config';

/* Polices auto-hébergées via next/font. Elles étaient auparavant chargées par un
   <link> vers Google Fonts placé dans le <head>, ce qui bloquait le rendu et
   provoquait un saut de mise en page au chargement. Les fichiers sont désormais
   servis depuis notre propre domaine, avec `display: swap`, et exposés en
   variables CSS que le bloc @theme de globals.css consomme. */
const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
});

const spaceGrotesk = Space_Grotesk({
  subsets: ['latin'],
  weight: ['600', '700'],
  variable: '--font-display',
  display: 'swap',
});

const jetBrainsMono = JetBrains_Mono({
  subsets: ['latin'],
  weight: ['400', '600'],
  variable: '--font-mono-code',
  display: 'swap',
});

export const metadata: Metadata = {
  metadataBase: new URL(siteConfig.url),
  title: {
    default: `${siteConfig.name} — Le média de l'Intelligence Artificielle`,
    template: `%s — ${siteConfig.name}`,
  },
  description: siteConfig.description,
  keywords: [
    'Intelligence Artificielle',
    'IA',
    'LLM',
    'Prompt Engineering',
    'Comparatif IA',
    'Outils IA',
    'Actualité IA France',
  ],
  authors: [{ name: siteConfig.author.name }],
  creator: siteConfig.name,
  publisher: siteConfig.name,
  // Déclaration du flux RSS. C'est ce `<link rel="alternate">` que cherchent les
  // agrégateurs et les extensions de lecture : sans lui, le flux existe à son
  // adresse mais personne ne le trouve.
  alternates: { types: RSS_ALTERNATE_TYPES },
  // NOTE : plus aucun `alternates.canonical` ici. Le déclarer dans le layout
  // racine appliquait l'URL d'accueil comme canonical à TOUTES les pages, ce qui
  // revenait à dire à Google que chaque article était un doublon de la page
  // d'accueil. Chaque page définit désormais son propre canonical.
  openGraph: {
    type: 'website',
    locale: 'fr_FR',
    url: siteConfig.url,
    title: `${siteConfig.name} — Le média de l'Intelligence Artificielle`,
    description: siteConfig.description,
    siteName: siteConfig.name,
  },
  twitter: {
    card: 'summary_large_image',
    title: siteConfig.name,
    description: siteConfig.description,
  },
  // Vérification de propriété Google Search Console.
  //
  // Next n'émet la balise que si la valeur est non vide, d'où le spread
  // conditionnel : une balise `google-site-verification` vide serait ignorée par
  // Google, mais elle salirait le <head> de toutes les pages pour rien.
  ...(siteConfig.googleSiteVerification
    ? { verification: { google: siteConfig.googleSiteVerification } }
    : {}),

  // NOTE : pas de `robots: { index: true }` ici.
  //
  // Le déclarer dans le layout racine l'appliquait à TOUTES les pages, y compris
  // aux 404. Une URL inexistante émettait alors deux directives contradictoires :
  // le « index, follow » du layout et le « noindex » que Next.js injecte
  // lui-même sur les réponses 404 streamées. Google retient la plus restrictive,
  // donc le résultat restait correct — mais il ne faut pas construire son
  // référencement sur un arbitrage implicite.
  //
  // L'absence de directive vaut « indexable » : c'est déjà le comportement
  // voulu, et le `noindex` des pages introuvables reste ainsi sans ambiguïté.
};

export const viewport: Viewport = {
  themeColor: '#0a0a0f',
  colorScheme: 'dark',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  /*
   * Layout RACINE — volontairement minimal.
   *
   * Il ne contient que <html>, <body> et les polices, c'est-a-dire ce qui est
   * commun a TOUTES les sections du site. L'en-tete, le pied de page et le
   * balisage JSON-LD ont ete deplaces dans `(public)/layout.tsx` : ils
   * n'avaient rien a faire dans le back-office, ou ils affichaient a
   * l'administrateur le menu des categories, le formulaire d'inscription a la
   * newsletter et les mentions legales.
   *
   * `(public)` est un groupe de routes : les parentheses excluent le dossier de
   * l'URL. Les adresses publiques restent donc inchangees (/blog, /contact...),
   * seul le chrome qui les entoure differe.
   */
  return (
    <html
      lang="fr"
      className={`${inter.variable} ${spaceGrotesk.variable} ${jetBrainsMono.variable}`}
      suppressHydrationWarning
    >
      {/* suppressHydrationWarning : certaines extensions de navigateur
          (Bitdefender, Grammarly, LastPass...) injectent des attributs dans le
          DOM avant que React n'hydrate la page. React signale alors une
          divergence serveur/client qui ne vient pas du code. L'attribut ne
          masque que les differences d'attributs sur CET element. */}
      <body
        className="min-h-screen bg-base text-ink flex flex-col antialiased"
        suppressHydrationWarning
      >
        {children}

        {siteConfig.adsenseClientId && (
          <Script
            async
            src={`https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${siteConfig.adsenseClientId}`}
            crossOrigin="anonymous"
            strategy="afterInteractive"
          />
        )}
      </body>
    </html>
  );
}
