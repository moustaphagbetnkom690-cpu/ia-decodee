const DOMAINE_PUBLIC = "https://www.ia-decodee.tech";

/*
 * Résolution de l'URL publique du site.
 *
 * ── Le repli sur VERCEL_URL a été retiré, et c'est le cœur du correctif ──────
 *
 * La version précédente basculait sur `VERCEL_URL` / `VERCEL_PROJECT_...` quand
 * NEXT_PUBLIC_SITE_URL était absente. L'audit du 5 août 2026 a mesuré le
 * résultat sur la production en ligne : toutes les balises canoniques et tout le
 * sitemap annonçaient
 *
 *     https://ia-decodee-drvs-i6ni1h0x5-zenos3.vercel.app
 *
 * au lieu de www.ia-decodee.tech. Deux dégâts, tous deux invisibles à l'œil nu :
 *
 *   1. Google était invité à indexer le domaine Vercel, et à considérer le vrai
 *      domaine comme un duplicata. Un média qui achète un nom de domaine pour
 *      construire son autorité la cédait ainsi à *.vercel.app.
 *
 *   2. Cette adresse contient un identifiant de déploiement (« i6ni1h0x5 ») qui
 *      change à chaque push. Les canoniques désignaient donc une URL périssable,
 *      morte au déploiement suivant.
 *
 * Un repli automatique était précisément le piège : il donne une valeur
 * plausible, le site marche, et rien ne signale l'erreur. On préfère désormais
 * une constante explicite, et un échec de build si la configuration est fausse.
 */
function resolveSiteUrl(): string {
  const envUrl = process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "");

  if (envUrl) return envUrl;

  // Hors production, on développe sur localhost : c'est le défaut attendu.
  if (process.env.NODE_ENV !== "production") return "http://localhost:3000";

  return DOMAINE_PUBLIC;
}

const siteUrl = resolveSiteUrl();

/*
 * Garde-fou de mise en production — restauré.
 *
 * Il avait disparu lors d'une réécriture concurrente de ce fichier. Sans lui,
 * rien n'empêche un déploiement d'annoncer une adresse qui n'est pas la nôtre :
 * le site fonctionne, et le référencement part silencieusement ailleurs.
 */
const urlInvalide =
  /localhost|127\.0\.0\.1/.test(siteUrl) || /\.vercel\.app/.test(siteUrl);

if (process.env.NODE_ENV === "production" && urlInvalide) {
  const message =
    `NEXT_PUBLIC_SITE_URL vaut « ${siteUrl} », qui n'est pas le domaine public ` +
    `du site. Renseignez ${DOMAINE_PUBLIC} dans Vercel > Settings > ` +
    `Environment Variables (portée Production), puis redéployez. Sans cela, ` +
    `les URL canoniques, le sitemap et les aperçus de partage désignent une ` +
    `adresse qui ne vous appartient pas.`;

  // Sur la plateforme de déploiement, l'erreur est bloquante : mieux vaut un
  // build en échec qu'un site dont tout le référencement pointe ailleurs. En
  // build local, un avertissement suffit — on teste souvent la production sur
  // sa machine.
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
  // L'image de partage n'est plus un fichier : elle est générée par
  // src/app/opengraph-image.tsx et Next injecte lui-même les balises og:image.
  // L'ancien chemin /images/og-image.jpg n'a jamais existé (404 en production).

  // Code de vérification Google Search Console. Sans lui, le sitemap ne peut
  // pas être soumis et aucune donnée de référencement n'est visible.
  //
  // La valeur est écrite en clair, et ce n'est pas une négligence : ce jeton est
  // destiné à être publié dans le <head> de chaque page — c'est très exactement
  // ainsi que Google vérifie la propriété du domaine. Il ne donne aucun accès :
  // le connaître ne permet ni de lire vos données Search Console, ni de
  // revendiquer le site, puisqu'il faut par ailleurs le servir depuis ce domaine.
  // Le coder ici évite une variable d'environnement de plus, et surtout évite que
  // la vérification tombe le jour où quelqu'un nettoie les variables Vercel.
  //
  // La variable d'environnement reste prioritaire, pour pouvoir vérifier un
  // environnement de préproduction sans toucher au code.
  googleSiteVerification:
    process.env.NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION ||
    "bZnxuW7towuW1rqp4MjJuuCcNeWJIFrbGlo2CJUD0Lg",
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
