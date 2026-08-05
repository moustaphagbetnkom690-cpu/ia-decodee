<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# NE JAMAIS supprimer `.next` pendant que `npm run dev` tourne

Le serveur `next dev` garde ses artefacts compilés dans `.next/dev/`. S'ils
disparaissent en cours d'exécution, il **ne les reconstruit pas** : il sert des
`Internal Server Error` sur toutes les routes, indéfiniment, alors que le code
applicatif est parfaitement sain. Le symptôme trompe — on cherche un bug qui
n'existe pas.

Deux commandes provoquent cela quand un serveur de développement tourne en
parallèle (l'utilisateur en a très souvent un ouvert sur le port 3000) :

- `rm -rf .next`
- `npm run build` — Next 16 n'autorise qu'un serveur de dev par projet, et un
  build concurrent perturbe son arborescence

**Avant tout build de vérification ou tout nettoyage du cache : arrêter les
serveurs d'abord.** La commande dédiée le fait dans le bon ordre :

```bash
npm run reset    # arrête les serveurs Next du projet, PUIS supprime .next
```

Et si un serveur est lancé pour une vérification, **le terminer avant de rendre
la main** — ne pas laisser de `next start` orphelin derrière soi.

C'est la panne la plus fréquente de ce projet, et elle est systématiquement
d'origine externe au code.
