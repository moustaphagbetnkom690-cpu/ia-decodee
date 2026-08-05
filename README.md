# 🧠 IA Décodée — Blog IA Francophone & Inférence

> **IA Décodée** est un média francophone moderne, performant et optimisé SEO dédié à l'Intelligence Artificielle (analyses de LLM, comparatifs de modèles, guides de prompt engineering, actualités et sélection d'outils).

---

## 🚀 Architecture Tech

- **Framework** : Next.js 15 (App Router) + React 19 + TypeScript.
- **Styles & Direction Artistique** : Tailwind CSS v4 avec thème personnalisé *Neural / Latent Space* (fond Indigo sombre `#0A0A0F`, Violet `#7C5CFF`, Lime `#C6F24E`, typographies Space Grotesk & JetBrains Mono).
- **Backend & Base de données** : Supabase (PostgreSQL + Auth + Storage).
- **Composants Rendu** : Rendu Markdown via `react-markdown` + `remark-gfm`, icônes `lucide-react`.
- **Monétisation** : Emplacements Google AdSense centralisés (`<AdBanner />`) + Liens d'affiliation.
- **SEO & Indexation** : JSON-LD (`Article`, `BreadcrumbList`, `WebSite`, `Organization`), Open Graph, Twitter Cards, Sitemap XML dynamique (`sitemap.ts`) et `robots.txt`.

---

## 🛠️ Installation & Démarrage Rapide

### 1. Prérequis
- Node.js >= 18
- NPM / PNPM / YARN

### 2. Installation des dépendances
```bash
npm install
```

### 3. Variables d'environnement (`.env.local`)
Copiez le fichier exemple `.env.local.example` vers `.env.local` :
```bash
cp .env.local.example .env.local
```

Renseignez vos identifiants Supabase et AdSense :
```env
NEXT_PUBLIC_SITE_URL=http://localhost:3000

# Supabase (Dashboard -> Settings -> API)
NEXT_PUBLIC_SUPABASE_URL=https://votre-projet.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=votre-cle-anon-publique
SUPABASE_SERVICE_ROLE_KEY=votre-cle-service-role

# Google AdSense
NEXT_PUBLIC_ADSENSE_CLIENT_ID=ca-pub-1234567890123456
```

> **Note :** Si les clés Supabase ne sont pas encore renseignées, le blog fonctionne immédiatement avec le jeu de données de démo embarqué dans `src/lib/supabase/mock-data.ts`.

### 4. Configuration de la Base de Données Supabase
1. Rendez-vous dans le [Dashboard Supabase](https://supabase.com).
2. Ouvrez l'éditeur SQL (**SQL Editor**).
3. Exécutez le script complet `supabase_schema.sql` situé à la racine du projet.
   - Il crée les tables (`categories`, `profiles`, `articles`, `comments`, `page_views`).
   - Il configure la **vue sécurisée `comments_public`** (qui protège les e-mails des auteurs).
   - Il crée la fonction RPC `increment_view_count(article_id)` en `SECURITY DEFINER`.
   - Il active RLS et crée le Bucket Storage public `images`.
   - Il injecte le jeu de données seed (4 catégories, 3 articles piliers rédigés).

### 5. Lancement en serveur de développement
```bash
npm run dev
```
Ouvrez [http://localhost:3000](http://localhost:3000) dans votre navigateur.

---

## 🛡️ Qualité & Validation Code

Pour vérifier la conformité du code et la compilation TypeScript/Next.js :

```bash
# Compilation de production Next.js
npm run build

# Vérification ESLint (0 erreur requis)
npm run lint
```

---

## 📂 Structure des Fichiers

```
├── supabase_schema.sql         # Schéma SQL Supabase complet (Tables, RLS, Views, RPC, Storage, Seed)
├── src/
│   ├── app/
│   │   ├── admin/             # Espace Back-Office d'administration & Login
│   │   ├── blog/              # Listing avec recherche ?q=, filtres et pagination ?page=
│   │   │   └── [slug]/        # Rendu détaillé de l'article (Markdown, Breadcrumb, JSON-LD)
│   │   ├── categories/        # Articles par catégorie
│   │   ├── a-propos/          # Manifeste & équipe
│   │   ├── contact/           # Formulaire de contact fonctionnel
│   │   ├── sitemap.ts         # Sitemap.xml dynamique
│   │   ├── robots.ts          # Exclusions robots.txt (/admin, /api)
│   │   └── globals.css        # Variables CSS v4 Thème Neural / Espace Latent
│   ├── components/
│   │   ├── AdBanner.tsx       # Composant AdSense réutilisable avec fallback
│   │   ├── ArticleCard.tsx    # Carte d'article réutilisable
│   │   ├── CommentSection.tsx # Section commentaires lisant comments_public
│   │   ├── Header.tsx         # Navigation principale avec dropdown et recherche
│   │   ├── Footer.tsx         # Pied de page avec newsletter fonctionnelle
│   │   ├── NeuralHero.tsx     # Canvas interactif de réseau de neurones
│   │   └── Sidebar.tsx        # Widgets (Recherche, Populaires, Pub, Catégories)
│   └── lib/
│       ├── site-links.ts      # Source de vérité unique des slugs & liens
│       ├── site-config.ts     # Metadata de la marque IA Décodée
│       ├── api-articles.ts    # Service de requêtes serveur & fallbacks
│       └── types.ts           # Types TypeScript stricts
```

---

## 🌐 Déploiement Vercel

1. Poussez le dépôt sur GitHub.
2. Importez le projet dans **Vercel**.
3. Ajoutez les variables d'environnement (`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `NEXT_PUBLIC_ADSENSE_CLIENT_ID`).
4. Le déploiement s'effectue automatiquement à chaque `git push origin main`.
