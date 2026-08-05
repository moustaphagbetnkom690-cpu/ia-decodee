# 🧠 IA Décodée — Directives Claude

> Média francophone sur l'IA. Projet développé en collaboration multi-assistants
> (Claude & Antigravity/Gemini).

## Sources de vérité

1. **Guide technique & architecture** : `@gemini.md`
2. **Règles Next.js 16 + panne récurrente** : `@AGENTS.md` ← *lire en entier*
3. **Schéma & RLS** : `supabase_schema.sql`

---

## État au 5 août 2026

**Le site fonctionne intégralement en local.** Audit de sécurité passé (26 tests
RLS exécutés contre la base réelle), parcours de publication validé de bout en
bout dans un navigateur.

**Contenu — 3 articles publiés**, tous sourcés à des publications primaires :

| Article | Lecture |
|---|---|
| C'est quoi un LLM ? | 36 min |
| Comparatif des modèles IA 2026 | 32 min |
| Bien rédiger un prompt | 14 min |

**Base** : 1 compte `admin`, 6 commentaires, 0 abonné newsletter, compteurs de
vues à zéro (les données de démonstration ont été purgées — tout est réel).

**Pas encore déployé.** `NEXT_PUBLIC_SITE_URL` vaut toujours `localhost:3000`.

---

## ⚡ Règles impératives

1. **Next.js 16** — `proxy.ts` remplace `middleware.ts`. Consulter
   `node_modules/next/dist/docs/` avant d'écrire du code.
2. **Séparation des chromes** — public dans `src/app/(public)/`, back-office dans
   `src/app/admin/`. Ne jamais remettre `Header`/`Footer` dans le layout racine.
3. **Sécurité à 3 couches** — `proxy.ts`, puis `requireAdmin()` dans **chaque page
   ET chaque server action**, puis RLS PostgreSQL.
4. **`npm run lint` à 0 erreur et `npm run build` valide** avant de rendre la main.
5. **Ne jamais supprimer `.next` pendant qu'un serveur de dev tourne** — voir
   `AGENTS.md`. C'est la panne n°1 du projet, et elle n'est jamais dans le code.

---

## Pièges opérationnels (non déductibles du code)

**Publier uniquement depuis le panel d'administration.** Les pages d'articles
sont pré-générées ; une écriture directe en base ne déclenche aucune
revalidation et reste invisible jusqu'au prochain déploiement. Les server
actions appellent `revalidatePath` — c'est ce qui rend la publication immédiate
(vérifié en production locale : liste, page, accueil et sitemap mis à jour sans
rebuild).

**Le compteur de vues compte les chargements de page**, pas les visiteurs
uniques. Un rechargement = +1. Aucune empreinte de session n'est posée.

**Le suivi par pays ne fonctionne que sur Vercel** — il lit `x-vercel-ip-country`.
En local et sur tout autre hébergeur, la colonne pays reste vide. C'est un choix
assumé de l'utilisateur (option retenue lors de l'audit).

**Le temps de lecture = `content.length / 1000`** (dans `api-articles.ts`). Pour
viser 30 min de lecture, viser 30 000 caractères.

**Un hébergement mutualisé classique ne peut pas exécuter ce projet** (SSR,
proxy, server actions). Il faut Vercel ou un hébergement Node.

---

## Standards éditoriaux

Ils font la valeur du site — les préserver.

- **Sources primaires uniquement.** Documentations officielles des éditeurs,
  arXiv, ACL, NeurIPS. Jamais un blog tiers ou un agrégateur de prix comme source
  d'un chiffre.
- **Ne jamais publier un chiffre non vérifié.** En cas de doute, décrire le
  mécanisme sans avancer de valeur précise, et le signaler dans une note de
  méthode.
- **Dater les articles qui contiennent des tarifs** et lister les sources en fin
  d'article, avec liens.
- **Pas de scores de benchmark** comme argument de décision (contamination,
  effets de harnais) — position éditoriale assumée et expliquée dans le
  comparatif.
- **Angle** : chercher le résultat contre-intuitif vérifiable plutôt que le
  consensus. Les trois articles en contiennent un chacun.
- **Ton** : vouvoiement, français soigné, opinions assumées, pas de listes à
  puces en rafale ni de conclusion en « En conclusion ».

---

## Ce qui reste à faire

1. **Choisir et acheter le domaine** (`ia-decodee.fr` est la valeur par défaut
   dans `site-config.ts`). Décision en attente côté utilisateur.
2. **Déployer sur Vercel.** Renseigner `NEXT_PUBLIC_SITE_URL` — un garde-fou dans
   `site-config.ts` **fait échouer le build** si elle reste sur localhost.
   Ajouter les 3 clés Supabase, et l'URL de déploiement dans les *Redirect URLs*
   de Supabase Auth.
3. **Fermer les inscriptions publiques** dans Supabase (Authentication > Sign In /
   Providers > Email).
4. **Mettre à jour le comparatif après le 31 août 2026** : le tarif
   d'introduction de Claude Sonnet 5 ($2/$10) passe à $3/$15 — c'est écrit dans
   l'article, il deviendra faux.
5. Éventuellement étoffer « Bien rédiger un prompt » (14 min contre 32 et 36).

---

## Protocole multi-assistants

Avant toute modification structurante, vérifier l'état réel des fichiers —
Gemini travaille sur le même dépôt et modifie `package.json`, `next.config.ts` et
les scripts. Des collisions ont déjà eu lieu (clé `reset` en double dans
`package.json`).

Consigner les changements structurants dans la section **Journal des
synchronisations** de `gemini.md`.
