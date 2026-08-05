import type { NextConfig } from "next";

/*
 * En-têtes de sécurité.
 *
 * Vercel ne pose que Strict-Transport-Security par défaut. Tout le reste est à
 * la charge de l'application — l'audit du 5 août 2026 a constaté sur la
 * production que le back-office était encadrable en iframe (clickjacking) et
 * qu'aucune protection de type MIME-sniffing n'était en place.
 *
 * À propos de la CSP : `script-src` conserve 'unsafe-inline'. Ce n'est pas un
 * oubli. Next.js injecte ses scripts d'hydratation en ligne ; les interdire
 * impose de générer un nonce par requête dans proxy.ts, ce qui rend TOUTES les
 * pages dynamiques et supprime la génération statique dont ce site tire sa
 * rapidité. Le compromis retenu conserve les directives qui protègent
 * réellement sans coût : frame-ancestors, object-src, base-uri et form-action
 * ne dépendent d'aucun nonce et bloquent l'essentiel des vecteurs.
 */

const adsense = process.env.NEXT_PUBLIC_ADSENSE_CLIENT_ID
  ? " https://pagead2.googlesyndication.com https://googleads.g.doubleclick.net https://tpc.googlesyndication.com"
  : "";

const analytics = process.env.NEXT_PUBLIC_GA_ID
  ? " https://www.googletagmanager.com https://www.google-analytics.com"
  : "";

const csp = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline' 'unsafe-eval'${adsense}${analytics}`,
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob: https:",
  "font-src 'self' data:",
  `connect-src 'self' https://*.supabase.co wss://*.supabase.co${analytics}`,
  `frame-src 'self'${adsense}`,
  // Interdit à tout site tiers d'encadrer nos pages : c'est la protection
  // anti-clickjacking du back-office, et elle supplante X-Frame-Options sur les
  // navigateurs modernes (X-Frame-Options reste posé pour les plus anciens).
  "frame-ancestors 'none'",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "upgrade-insecure-requests",
].join("; ");

const securityHeaders = [
  { key: "Content-Security-Policy", value: csp },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=(), interest-cohort=()",
  },
  {
    key: "Strict-Transport-Security",
    value: "max-age=63072000; includeSubDomains; preload",
  },
];

const nextConfig: NextConfig = {
  // Masque « X-Powered-By: Next.js », qui annonce gratuitement la pile technique
  // et sa version approximative à tout scanner automatisé.
  poweredByHeader: false,

  serverExternalPackages: ['@supabase/supabase-js', '@supabase/ssr'],

  async headers() {
    return [
      {
        source: "/:path*",
        headers: securityHeaders,
      },
    ];
  },

  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "**.supabase.co",
      },
      {
        protocol: "https",
        hostname: "images.unsplash.com",
      },
      {
        protocol: "https",
        hostname: "avatars.githubusercontent.com",
      },
    ],
  },
};

export default nextConfig;
