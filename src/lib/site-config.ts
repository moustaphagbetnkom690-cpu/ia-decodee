function resolveSiteUrl(): string {
  const envUrl = process.env.NEXT_PUBLIC_SITE_URL;
  if (envUrl && !/localhost|127\.0\.0\.1/.test(envUrl)) {
    return envUrl.replace(/\/$/, "");
  }
  // Vercel fournit automatiquement ces variables système
  const vercelUrl =
    process.env.NEXT_PUBLIC_VERCEL_URL ||
    process.env.VERCEL_PROJECT_PRODUCTION_URL ||
    process.env.VERCEL_URL;
  if (vercelUrl) {
    return `https://${vercelUrl.replace(/^https?:\/\//, "").replace(/\/$/, "")}`;
  }
  if (process.env.NODE_ENV === "production") {
    return "https://ia-decodee.fr";
  }
  return envUrl || "http://localhost:3000";
}

const siteUrl = resolveSiteUrl();

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
