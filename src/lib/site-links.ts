/**
 * Source de vérité unique pour tous les liens, slugs et catégories du site.
 * Empêche toute incohérence de liens 404 entre le header, l'accueil, les cartes d'articles et le footer.
 */

export interface NavItem {
  label: string;
  href: string;
  description?: string;
}

export const SITE_PATHS = {
  home: "/",
  blog: "/blog",
  article: (slug: string) => `/blog/${slug}`,
  category: (slug: string) => `/categories/${slug}`,
  about: "/a-propos",
  contact: "/contact",
  legal: "/mentions-legales",
  privacy: "/politique-de-confidentialite",
  admin: "/admin",
  adminLogin: "/admin/login",
  adminArticles: "/admin/articles",
  adminArticleNew: "/admin/articles/nouveau",
  adminArticleEdit: (id: string) => `/admin/articles/${id}`,
  adminCategories: "/admin/categories",
  adminComments: "/admin/commentaires",
  adminAudience: "/admin/audience",
  adminNewsletter: "/admin/newsletter",
};

export const CATEGORIES_LIST = [
  {
    name: "Modèles & Architectures",
    slug: "modeles",
    description: "LLM, modèles vocaux, vision et architectures de réseaux de neurones.",
    color: "#7C5CFF",
    href: SITE_PATHS.category("modeles"),
  },
  {
    name: "Comparatifs & Benchmarks",
    slug: "comparatifs",
    description: "Analyses comparatives de modèles et bancs d'essai indépendants.",
    color: "#C6F24E",
    href: SITE_PATHS.category("comparatifs"),
  },
  {
    name: "Guides & Prompts",
    slug: "guides-prompts",
    description: "Ingénierie de prompt, workflows optimisés et tutoriels pas-à-pas.",
    color: "#3B82F6",
    href: SITE_PATHS.category("guides-prompts"),
  },
  {
    name: "Actualités & Sorties",
    slug: "actualites",
    description: "Annonces majeures et décryptages de l'actualité de l'IA.",
    color: "#EC4899",
    href: SITE_PATHS.category("actualites"),
  },
  {
    name: "Outils & Écosystème",
    slug: "outils",
    description: "Sélection d'applications, extensions et logiciels intégrant l'IA.",
    color: "#10B981",
    href: SITE_PATHS.category("outils"),
  },
];

export const MAIN_NAV_ITEMS: NavItem[] = [
  { label: "Accueil", href: SITE_PATHS.home },
  { label: "Tous les articles", href: SITE_PATHS.blog },
  { label: "Comparatifs", href: SITE_PATHS.category("comparatifs") },
  { label: "Guides & Prompts", href: SITE_PATHS.category("guides-prompts") },
  { label: "À propos", href: SITE_PATHS.about },
  { label: "Contact", href: SITE_PATHS.contact },
];
