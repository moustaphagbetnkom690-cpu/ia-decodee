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

**Base** : 1 compte `admin`, **0 commentaire**, 0 abonné newsletter, 2 vues
réelles. Les 6 faux commentaires en `@example.com` (« Thomas Dubois », « Léa
Martin », « Alexandre ») ont été purgés le 5 août 2026 — ils étaient bien en
production, et en double.

**EN LIGNE sur https://www.ia-decodee.tech** (Vercel). L'apex redirige en 308
vers `www`. Le `.fr` avait dû être abandonné : l'AFNIC le réserve aux résidents
de l'UE/EEE.

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

**Les parutions se programment à la date ET à l'heure**, en heure de Paris —
`FUSEAU_SITE` dans `src/lib/utils.ts`. Il n'existe pas de statut « programmé » :
un article est programmé lorsqu'il est *publié* et que son `published_at` est à
venir. Le filtre est appliqué deux fois, dans `api-articles.ts` et dans la
policy RLS, et retirer l'une des deux couches rouvre une fuite (voir l'en-tête
de `supabase_patch_programmation.sql`).

Ne jamais convertir la saisie avec `new Date('2026-08-10T14:30')` : sans fuseau,
la chaîne est lue dans celui de la machine — UTC sur Vercel — et l'heure part
avec deux heures d'écart. Passer par `siteLocalToISO()`.

**La parution automatique repose sur la revalidation ISR à 60 s** des pages
publiques et du plan de site. À l'échéance, l'article paraît de lui-même dans la
minute. Retirer un `export const revalidate` d'une de ces pages fige la
programmation pour cette surface, en silence.

**Une page sous segment dynamique se revalide par son URL littérale.**
`revalidatePath('/blog', 'layout')` ne l'atteint pas : il n'y a aucun
`layout.tsx` sous `blog/`, le seul layout public étant celui du groupe
`(public)`. C'était la cause du bug « le commentaire approuvé n'apparaît pas sur
l'article » — les actions de modération lisent maintenant le slug avant de
revalider `/blog/<slug>`.

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

**Vérifié en production le 14 août 2026 — ces deux points sont RÉGLÉS**, ne pas
les rouvrir : `SUPABASE_SERVICE_ROLE_KEY` est bien présente sur Vercel (sans
elle, `page_views` serait vide ; elle contient 29 lignes horodatées), et
`NEXT_PUBLIC_SITE_URL` sert bien `https://www.ia-decodee.tech` (canoniques et
sitemap vérifiés en ligne).

Restent :

1. **Exécuter `supabase_patch_securite.sql`** dans Supabase > SQL Editor. Tant
   que ce n'est pas fait, n'importe qui peut injecter de fausses vues depuis un
   pays inventé avec la seule clé publique (vérifié en conditions réelles).
2. **Search Console : soumettre le sitemap, puis demander l'indexation des 12
   URLs une par une.** C'est l'action à plus fort effet du moment — voir
   l'audit de référencement ci-dessous.
3. **Fermer les inscriptions publiques** dans Supabase (Authentication > Sign In /
   Providers > Email).
4. **Mettre à jour le comparatif après le 31 août 2026** : le tarif
   d'introduction de Claude Sonnet 5 ($2/$10) passe à $3/$15 — c'est écrit dans
   l'article, il deviendra faux.

---

## Audit de référencement du 14 août 2026

**Le compteur de vues n'a jamais été cassé.** 29 vues réelles en base, empreintes
et pays renseignés. Ce qui semblait « bloqué » était **le nombre affiché** : les
pages d'articles étaient servies depuis le cache Vercel avec `Age: 602684`, soit
sept jours sans régénération. Corrigé par `export const revalidate = 60`. Ne pas
rechercher un bug de comptage : il n'y en a pas.

**Le vrai problème est l'absence de visiteurs.** Sur 29 vues, **zéro** venait
d'un moteur de recherche : 28 referrers internes, 1 localhost. Les vues « US »
portent des user-agents de robots (`Nexus 5 Build/MRA58N`). `site:ia-decodee.tech`
ne renvoie rien.

**Le sitemap ne déclarait que 3 articles sur 12** — figé au dernier build, faute
de `revalidate` ; `revalidatePath('/sitemap.xml')` ne le rafraîchit pas. Neuf
articles n'ont jamais été soumis à Google. Corrigé.

**Le nom de marque est occupé.** « IA Décodée » est la série éditoriale d'NVIDIA
(*AI Decoded*), une émission spéciale de Radio-Canada et un cours UNESCO. Le
trafic de marque — le premier trafic d'un site jeune — est donc inaccessible.
Ce n'est pas un bug : c'est une décision stratégique en attente.

**Cannibalisation** : contrairement à une première lecture trop rapide, les deux
articles AI Act ne se concurrencent PAS (l'un est informationnel, l'autre
transactionnel — ils forment une grappe). Le vrai doublon est entre
« Comparatif des modèles IA 2026 » et « Claude Opus 5, GPT-5.6, Gemini 3.6 : le
comparatif des tarifs réels », qui visent tous deux la comparaison tarifaire.
Arbitrage éditorial en attente — aucun article n'a été supprimé.

**Rythme de publication** : 12 articles en 8 jours sur un domaine de deux
semaines. Le profil ressemble à de la production de masse. Viser 1 à 2 articles
par semaine sert mieux le référencement.

---

## Décisions d'architecture issues de l'audit du 5 août 2026

**Aucun repli sur des données fictives.** `mock-data.ts` a été supprimé. Si
Supabase ne répond pas, les pages sont vides — jamais peuplées de faux contenu.
Un site vide se remarque et se corrige ; un site faussement plein, non.

**Aucun repli automatique sur `VERCEL_URL`** dans `site-config.ts`. C'est ce
repli « intelligent » qui avait détourné canoniques et sitemap vers
`*.vercel.app`. Le domaine public est une constante explicite.

**Le soft-404 n'est PAS un bug à corriger.** Une URL d'article inexistante
renvoie 200 et non 404 : c'est le comportement documenté de Next.js pour les
réponses *streamées* (le `loading.tsx` ouvre une frontière Suspense, les en-têtes
partent avant que `notFound()` ne soit résolu). Next injecte
`<meta name="robots" content="noindex">`, **l'indexation est donc bien
empêchée** — vérifié en production. La correction officielle imposerait une
requête en base dans `proxy.ts` à chaque visite : coût permanent, bénéfice nul.
Ne pas rouvrir ce sujet.

**La limitation de débit est volontairement en mémoire** (`src/lib/rate-limit.ts`),
donc par instance serverless. Suffisante contre le script isolé qui boucle,
inopérante contre une attaque distribuée. Passer à Upstash ou à un compteur
Postgres si le trafic hostile devient réel — la signature de `hit()` est faite
pour que ce remplacement ne touche aucun appelant.

---

## Protocole multi-assistants

Avant toute modification structurante, vérifier l'état réel des fichiers —
Gemini travaille sur le même dépôt et modifie `package.json`, `next.config.ts` et
les scripts. Des collisions ont déjà eu lieu (clé `reset` en double dans
`package.json`).

Consigner les changements structurants dans la section **Journal des
synchronisations** de `gemini.md`.
