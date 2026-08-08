# 🧠 IA Décodée — Suivi de projet & guide technique

> Fichier de contexte et d'état du projet **IA Décodée**.

---

## 1. Vue d'ensemble

- **Nom** : IA Décodée (`ia_decodee`)
- **Type** : média / blog francophone sur l'intelligence artificielle
- **Stack** :
  - **Framework** : **Next.js 16** (App Router, React 19, TypeScript)
  - **Styling** : Tailwind CSS v4, thème *Neural* piloté par tokens (`@theme` dans `globals.css`)
  - **Backend** : Supabase (PostgreSQL, Auth, Storage)
  - **SEO & monétisation** : JSON-LD, AdSense, sitemap dynamique

> ⚠️ **Next.js 16, pas 15.** La convention `middleware.ts` est dépréciée et
> remplacée par **`proxy.ts`** (`src/proxy.ts`). Consulter
> `node_modules/next/dist/docs/` avant d'écrire du code : les API diffèrent des
> versions antérieures.

---

## 2. Configuration Supabase

### A. Variables d'environnement

Voir `.env.local.example`. Les clés `NEXT_PUBLIC_SUPABASE_URL` et
`NEXT_PUBLIC_SUPABASE_ANON_KEY` sont requises ; sans elles, le site tourne sur
les données de démonstration et **l'espace d'administration est verrouillé**.

### B. Initialiser la base

1. Ouvrir le **SQL Editor** du dashboard Supabase.
2. Coller l'intégralité de `supabase_schema.sql` et exécuter.
3. Le script est **idempotent** : il peut être relancé sans risque.

Il crée les tables (`categories`, `profiles`, `articles`, `comments`,
`page_views`, `newsletter_subscribers`), la vue `comments_public`, les fonctions
RPC (vues, analytics), les triggers et l'ensemble des policies RLS.

### C. ⚠️ Créer le compte administrateur

Le **premier compte inscrit devient automatiquement administrateur**. Tous les
suivants sont de simples lecteurs sans aucun droit d'écriture.

1. Créer l'utilisateur dans **Authentication > Users > Add user**.
2. Vérifier son rôle :
   ```sql
   SELECT u.email, p.role FROM public.profiles p
   JOIN auth.users u ON u.id = p.id;
   ```
3. Promouvoir un compte existant si nécessaire :
   ```sql
   UPDATE public.profiles SET role = 'admin'
   WHERE id = (SELECT id FROM auth.users WHERE email = 'votre@email.fr');
   ```
4. **Fermer les inscriptions publiques** : Authentication > Sign In / Providers >
   Email > désactiver « Allow new users to sign up ».

> Si la base vient de la v1 du schéma, **tous** les comptes existants ont le rôle
> `admin`. Exécuter `UPDATE public.profiles SET role = 'reader';` avant de
> promouvoir le bon compte (voir §8 du fichier SQL).

---

## 3. Architecture

### `src/proxy.ts`
Rafraîchit la session Supabase à chaque requête, bloque `/admin` sans session, et
propage le pays du visiteur. **La protection du back-office repose sur ce
fichier** — le `disallow` du robots.txt n'est pas une sécurité.

### `src/lib/`
- `auth.ts` — `getAdminSession()` / `requireAdmin()`. Vérifie le **rôle** en base
  (le proxy ne vérifie que la présence d'une session).
- `geo.ts` — pays du visiteur depuis les en-têtes Vercel/Cloudflare.
- `api-articles.ts` — lectures publiques (client anonyme, sans cookies).
- `api-admin.ts` — lectures du back-office, toutes protégées par `requireAdmin()`.
- `actions/admin.ts` — écritures du back-office.
- `actions/public.ts` — newsletter et commentaires (visiteurs).
- `supabase/server.ts` — deux clients distincts :
  - `createClient()` : lié à la session (cookies) → rend la route dynamique.
  - `createPublicClient()` : anonyme, sans cookies → **permet la génération
    statique des pages publiques**. Ne pas l'utiliser pour des données privées.

### Séparation des chromes — groupes de routes

```
src/app/
├── layout.tsx          ← RACINE : <html>, <body>, polices. Rien d'autre.
├── not-found.tsx       ← 404 des URL inconnues (importe Header/Footer lui-même)
├── (public)/
│   ├── layout.tsx      ← Header + Footer + JSON-LD  → site public
│   ├── page.tsx, blog/, categories/, a-propos/, contact/…
│   ├── error.tsx, loading.tsx
└── admin/
    ├── layout.tsx      ← AdminShell : barre supérieure + navigation latérale
    ├── error.tsx, not-found.tsx   ← frontières propres au back-office
    └── page.tsx, articles/, categories/, commentaires/, audience/, newsletter/
```

Les parenthèses de `(public)` **excluent le dossier de l'URL** : `/blog` reste
`/blog`. Seul le chrome diffère.

> ⚠️ Ne pas remettre `Header` / `Footer` dans le layout racine. Le back-office
> afficherait de nouveau le menu des catégories, la recherche des lecteurs, le
> formulaire newsletter et les mentions légales — ce qui n'a aucun sens pour un
> rédacteur connecté. Toute page publique nouvelle va dans `(public)/`.

### `src/app/admin/`
Tableau de bord, articles (liste + éditeur Markdown avec aperçu), catégories,
modération des commentaires, audience géographique, abonnés newsletter.

---

## 4. Modèle de sécurité — trois couches

1. **`proxy.ts`** — refuse l'accès à `/admin` sans session.
2. **`requireAdmin()`** — vérifie le rôle `admin`/`editor`, dans chaque page
   **et chaque server action** (une server action est un point d'entrée HTTP à
   part entière : protéger la page ne suffit pas).
3. **RLS PostgreSQL** — dernière ligne de défense. Même une requête forgée avec
   la clé anonyme ne peut ni écrire un article, ni lire un e-mail de
   commentateur, ni publier un commentaire non modéré.

Règles invariantes :
- `author_email` n'est **jamais** exposé publiquement (vue `comments_public`).
- Les commentaires entrent en `pending` ; la policy RLS l'impose.
- Le pays d'un visiteur est lu côté serveur, jamais envoyé par le navigateur.

---

## 5. Checklist avant mise en ligne

- [ ] **`NEXT_PUBLIC_SITE_URL` = domaine public** (ex. `https://ia-decodee.fr`).
      Tant qu'elle vaut `localhost`, les URL canoniques, le sitemap et les
      aperçus de partage pointent vers une adresse inaccessible. Le build
      avertit en local et **échoue** sur Vercel/CI.
- [ ] **Inscriptions publiques fermées** : Authentication > Sign In / Providers >
      Email > décocher « Allow new users to sign up ».
- [ ] Vérifier qu'il n'existe qu'un seul compte `admin` :
      `SELECT u.email, p.role FROM profiles p JOIN auth.users u ON u.id = p.id;`
- [ ] `SUPABASE_SERVICE_ROLE_KEY` présente uniquement côté serveur — jamais
      préfixée `NEXT_PUBLIC_`, jamais commitée (`.env*` est dans `.gitignore`).

## 6. Commandes

```bash
npm run dev     # développement
npm run build   # build de production
npm run lint    # ESLint
```

---

## 7. Journal des synchronisations & suivi multi-IA

Ce journal permet à **Claude** et **Antigravity / Gemini** de suivre l'état exact du projet sans perte de contexte :


- **2026-08-05 (session Claude)** :
  - **Contenu** : rédaction et publication des 3 articles complets (LLM 36 min,
    Comparatif 32 min, Prompt 14 min), sourcés à des publications primaires
    (arXiv, ACL, NeurIPS, documentations officielles des éditeurs).
  - **Compteurs de vues réels** : purge des vues fictives (1420/2890/980) dans la
    base, le seed `supabase_schema.sql` et `mock-data.ts`. Les compteurs partent
    de zéro et ne mesurent que du trafic réel.
  - **Correctifs** : titre SEO dupliqué (« — IA Décodée » deux fois) sur les pages
    d'articles ; boucle de redirection infinie pour un compte authentifié
    non-admin (`ERR_TOO_MANY_REDIRECTS`) corrigée dans `auth.ts` + `proxy.ts` ;
    panneau d'enregistrement de l'éditeur passé en `sticky` (il passait sous la
    barre supérieure) ; garde-fou `NEXT_PUBLIC_SITE_URL` dans `site-config.ts`.
  - **Outillage** : `npm run reset` (`scripts/reset-dev.mjs`) pour la panne
    récurrente des 500 après suppression de `.next`, règle inscrite dans
    `AGENTS.md`. Clé `reset` en double supprimée de `package.json`.
  - **`CLAUDE.md` réécrit** en fiche de reprise : état du contenu, pièges
    opérationnels, standards éditoriaux, reste à faire.

- **2026-08-04 / 2026-08-05** :
  - **Résolution du crash 500 sur les articles de blog** : Ajout de `serverExternalPackages: ['@supabase/supabase-js', '@supabase/ssr']` dans `next.config.ts` pour éviter le découpage défectueux des vendor chunks lors de `generateStaticParams`.
  - **Robustesse métriques de vues** : Ajout des fallbacks `(views ?? 0)` dans `Sidebar.tsx`, `ArticleCard.tsx` et `src/app/(public)/blog/[slug]/page.tsx`.
  - **Synchronisation Claude/Gemini** : Configuration de `CLAUDE.md` pointant vers `@gemini.md` et `@AGENTS.md` pour unifier le contexte partagé.
  - **Validation globale** : Toutes les routes testées en 200 OK, `npm run lint` à 0 erreur.


---

## Journal des synchronisations — 5 août 2026 (Claude)

**Audit de sécurité complet du site en production, et correctifs.**

Fichiers modifiés — à connaître avant toute intervention concurrente :

| Fichier | Changement |
|---|---|
| `next.config.ts` | Ajout de `headers()` (CSP, X-Frame-Options, nosniff, Referrer-Policy, Permissions-Policy, HSTS) et de `poweredByHeader: false` |
| `src/lib/site-config.ts` | **Repli sur `VERCEL_URL` retiré** + garde-fou de build restauré |
| `src/lib/rate-limit.ts` | **Nouveau** — limitation de débit en mémoire |
| `src/lib/supabase/server.ts` | Ajout de `createServiceClient()` |
| `src/lib/supabase/mock-data.ts` | **Supprimé** |
| `src/lib/api-articles.ts` | Tous les replis sur les mocks retirés |
| `src/lib/actions/analytics.ts` | Passe par le client de service + quota |
| `src/lib/actions/public.ts` | Quotas + vérification que l'article est publié |
| `src/lib/actions/admin.ts` | Validation des images par octets de signature |
| `src/lib/utils.ts` | Ajout de `jsonLd()` (échappement `<`, `>`, `&`) |
| `src/app/layout.tsx` | Retrait de `robots: { index: true }` |
| `supabase_schema.sql` | §9 vidé de ses fausses données, catégories conservées |
| `supabase_patch_securite.sql` | **Nouveau** — à exécuter dans Supabase |
| `package.json` | `next` 16.2.12 → **16.3.0** (3 CVE `high` closes) |

⚠️ **Collision constatée** : `site-config.ts` avait été réécrit entre ma lecture
et mon édition, introduisant un repli sur `VERCEL_URL` qui envoyait toutes les
balises canoniques et tout le sitemap vers `*.vercel.app` au lieu du domaine
acheté. Le garde-fou anti-`localhost` avait par ailleurs disparu au passage. Les
deux points sont corrigés — merci de ne pas réintroduire de repli automatique sur
une URL fournie par la plateforme.

Vérifications finales : `npm run lint` → 0 erreur, `npx tsc --noEmit` → 0 erreur,
`npm run build` → 19 pages générées, `npm audit` → 0 vulnérabilité.

## Journal des synchronisations — 7 août 2026 (Claude)

**Référencement finalisé + compteur de visiteurs en temps réel.**

| Fichier | Changement |
|---|---|
| `src/app/opengraph-image.tsx` | **Nouveau** — image de partage du site, générée par code |
| `src/app/(public)/blog/[slug]/opengraph-image.tsx` | **Nouveau** — image par article |
| `public/logo.svg` | **Nouveau** — remplace `/logo.png` qui renvoyait 404 |
| `src/lib/country.ts` | **Nouveau** — `countryFlag`/`countryName` extraits de `geo.ts` |
| `src/lib/rate-limit.ts` | limitation de débit (5 août) |
| `src/components/admin/LiveVisitors.tsx` | **Nouveau** — visiteurs en ligne |
| `src/lib/actions/realtime.ts` | **Nouveau** — pont server action |
| `src/lib/api-admin.ts` | `getRealtimeActivity()` |
| `src/lib/actions/analytics.ts` | empreinte de visiteur (SHA-256 quotidien) |
| `src/app/admin/page.tsx` | bandeau temps réel compact |
| `src/app/admin/audience/page.tsx` | panneau temps réel détaillé |
| `.../politique-de-confidentialite/page.tsx` | section « Mesure d'audience » |
| `supabase_patch_temps_reel.sql` | **Nouveau — à exécuter dans Supabase** |

⚠️ **Deux pièges rencontrés, à ne pas réintroduire :**

1. **`geo.ts` ne doit pas être importé depuis un composant client.** Il dépend de
   `next/headers`, réservé au serveur. Le build échoue avec *« You're importing a
   module that depends on next/headers »*. Les fonctions purement calculatoires
   vivent désormais dans `country.ts` ; `geo.ts` les réexporte.

2. **Ne pas appeler une fonction qui fait `setState` directement dans le corps
   d'un `useEffect`** — `react-hooks/set-state-in-effect` le refuse en erreur
   (rendus en cascade). Différer d'un `setTimeout(fn, 0)`.

---

## Journal des synchronisations — 8 août 2026 (Claude)

**Programmation des parutions (date + heure) et correction de la publication des
commentaires approuvés.**

| Fichier | Changement |
|---|---|
| `src/lib/utils.ts` | `FUSEAU_SITE`, `siteLocalToISO`, `isoToSiteLocal`, `formatDateHeure`, `estDansLeFutur` ; `formatDate`/`formatDateTime` forcés en heure de Paris |
| `src/lib/api-articles.ts` | Filtre `published_at <= now` sur les listes publiques et dans `getArticleBySlug` |
| `src/lib/actions/admin.ts` | `published_at` enregistré depuis le formulaire ; `revalidateArticlePage()` ; revalidation de l'ancien slug après renommage |
| `src/components/admin/ArticleEditor.tsx` | Champ `datetime-local` + encart « publication programmée » |
| `src/app/admin/articles/page.tsx` | Colonne « Publication », statut « Programmé », décompte dans l'en-tête |
| `src/app/admin/articles/nouveau/page.tsx` | Passe `defaultPublishedAt` calculé côté serveur |
| `src/components/ArticleCard.tsx`, `blog/[slug]/page.tsx` | Affichent la date **et l'heure** |
| `blog/[slug]`, `categories/[slug]`, `sitemap.ts` | `export const revalidate = 60` |
| `supabase_patch_programmation.sql` | **Nouveau — à exécuter dans Supabase** |
| `supabase_schema.sql` | Policy `articles_select_published` alignée |

⚠️ **Trois pièges rencontrés, à ne pas réintroduire :**

1. **`revalidatePath('/blog', 'layout')` n'atteint pas `/blog/<slug>`.** La forme
   `'layout'` invalide les pages sous un layout — encore faut-il qu'un
   `layout.tsx` existe à ce segment. Il n'y en a pas sous `blog/`. C'était la
   cause du bug « le commentaire approuvé n'apparaît pas sur l'article » :
   utiliser l'URL littérale.

2. **Ne jamais interpréter la valeur d'un `datetime-local` avec `new Date()`.**
   La chaîne n'a pas de fuseau ; elle serait lue dans celui du serveur (UTC sur
   Vercel), décalant chaque heure de publication. Passer par `siteLocalToISO()`.

3. **`Date.now()` est interdit pendant le rendu** — `react-hooks/purity` le
   refuse en erreur, et cela produirait une divergence d'hydratation. Le
   correctif retenu ici n'est PAS le `setState` dans un effet (refusé lui aussi,
   cf. journal du 7 août) mais `useSyncExternalStore`, avec un instantané
   serveur à `null` et un instantané client arrondi pour rester stable.
