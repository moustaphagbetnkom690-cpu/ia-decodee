const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://ia-decodee.fr";

/*
 * Garde-fou de mise en production.
 *
 * NEXT_PUBLIC_SITE_URL alimente les URL canoniques, les balises OpenGraph et le
 * sitemap. Si elle reste sur localhost lors d'un build de production, Google
 * indexe des adresses inaccessibles et le partage sur les réseaux sociaux est
 * cassé — une erreur silencieuse et coûteuse. On échoue donc bruyamment au
 * build plutôt que de la découvrir après la mise en ligne.
 */
if (
  process.env.NODE_ENV === "production" &&
  /localhost|127\.0\.0\.1/.test(siteUrl)
) {
  const message =
    "NEXT_PUBLIC_SITE_URL pointe encore sur localhost. Renseignez le domaine " +
    "public (ex. https://ia-decodee.fr) : sans cela, les URL canoniques, les " +
    "aperçus de partage et le sitemap pointeront vers une adresse inaccessible.";

  // Sur une plateforme de déploiement, l'erreur est bloquante : mieux vaut un
  // build en échec qu'un site indexé sur localhost. En build local, un
  // avertissement suffit — on teste souvent la production sur sa machine.
  if (process.env.VERCEL || process.env.CI) {
    throw new Error(message);
  }
  console.warn(`\n⚠️  ${message}\n`);
}

export const siteConfig = {
  name: "IA Décodée",
  shortName: "IAD",
  tagline: "Le média francophone qui décode l'Intelligence Artificielle",
  description: "Guides pratiques, comparatifs de modèles (GPT, Claude, Gemini, Mistral), actualités et analyses d'outils IA pour les professionnels et passionnés.",
  url: siteUrl,
  ogImage: "/images/og-image.jpg",
  adsenseClientId: process.env.NEXT_PUBLIC_ADSENSE_CLIENT_ID || "",
  gaId: process.env.NEXT_PUBLIC_GA_ID || "",
  author: {
    name: "Équipe IA Décodée",
    role: "Rédaction Tech & IA",
    bio: "Experts et passionnés décodant les révolutions de l'intelligence artificielle au quotidien.",
  },
  socialLinks: {
    twitter: "https://twitter.com/ia_decodee",
    github: "https://github.com",
    linkedin: "https://linkedin.com",
  },
};
