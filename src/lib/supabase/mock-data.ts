import { Article, Category, CommentPublic } from '../types';
import { CATEGORIES_LIST } from '../site-links';

export const MOCK_CATEGORIES: Category[] = CATEGORIES_LIST.map((cat, idx) => ({
  id: `cat-00${idx + 1}`,
  name: cat.name,
  slug: cat.slug,
  description: cat.description,
  color: cat.color,
  created_at: new Date().toISOString(),
}));

export const MOCK_ARTICLES: Article[] = [
  {
    id: 'a1111111-1111-1111-1111-111111111111',
    title: "C'est quoi un LLM ? Comprendre les modèles de langage simplement",
    slug: 'c-est-quoi-un-llm-comprendre-les-modeles-de-langage-simplement',
    excerpt: 'Découvrez les principes fondamentaux des Large Language Models (LLM) sans jargon mathématique : des fenêtres de contexte aux mécanismes d attention.',
    content: `Les **Large Language Models (LLM)** ou *Grands Modèles de Langage* ont révolutionné l interaction entre l humain et la machine. Mais que se passe-t-il réellement sous le capot lorsque vous envoyez une requête à un modèle ?

## La prédiction du prochain token : le cœur du moteur

À la base, un LLM ne "pense" pas au sens humain du terme. Il s agit d un puissant moteur d inférence statistique entraîné sur un corpus massif de textes. Son objectif principal est simple : **prédire le token le plus probable suivant une séquence donnée**.

Un *token* correspond environ à 4 caractères ou 0.75 mot en français. Par exemple, la phrase \`"Le chat dort sur le fauteuil"\` est découpée en plusieurs jetons numériques que le réseau de neurones traite en parallèle.

### L architecture Transformer et le mécanisme d attention

Inventée par les chercheurs de Google en 2017 avec le papier fondateur *"Attention Is All You Need"*, l architecture **Transformer** est le pilier central de tous les LLM modernes (GPT-4, Claude, Gemini, Llama).

Le concept clé est l **auto-attention (Self-Attention)** :
- Permet au modèle d attribuer une importance variable à chaque mot d un texte par rapport aux autres.
- Résout le problème des dépendances à longue distance dans une phrase.
- Permet une compréhension contextuelle fine (par exemple distinguer \`"vol"\` d un oiseau vs \`"vol"\` de voiture).

## Fenêtre de contexte et mémoire de travail

La fenêtre de contexte représente la quantité maximale de texte qu un modèle peut garder en mémoire vive lors d une conversation.

1. **8k à 32k tokens** : la norme standard pour les tâches quotidiennes et les chats d assistance.
2. **128k à 2M+ tokens** : les fenêtres géantes (comme Gemini 1.5 Pro) capables d ingérer des livres entiers, des bases de code complètes ou des heures d audio en une seule fois.

## Pourquoi les LLM hallucinent-ils ?

Comme les LLM fonctionnent par génération probabiliste, il arrive qu ils inventent des faits plausibles mais inexacts avec une assurance parfaite. C est ce qu on appelle une **hallucination**. Pour contrer ce phénomène, les chercheurs utilisent :
- **RAG (Retrieval-Augmented Generation)** : connecter le modèle à une base de connaissances externe vérifiée.
- **RLHF (Reinforcement Learning from Human Feedback)** : affiner les réponses grâce à des évaluations humaines.

## En résumé

Les LLM sont des outils d amplification intellectuelle d une puissance inédite. En comprenant leur fonctionnement probabiliste, vous apprenez à formuler de meilleurs prompts et à valider leurs résultats avec l esprit critique nécessaire.`,
    featured_image: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=1200&q=80',
    category_id: MOCK_CATEGORIES[0].id,
    author_id: 'user-admin',
    status: 'published',
    views: 0,
    published_at: new Date(Date.now() - 3 * 86400000).toISOString(),
    created_at: new Date(Date.now() - 3 * 86400000).toISOString(),
    updated_at: new Date(Date.now() - 3 * 86400000).toISOString(),
    category: MOCK_CATEGORIES[0],
    author: {
      id: 'user-admin',
      full_name: 'Équipe IA Décodée',
      avatar_url: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=300&q=80',
      role: 'admin',
    },
    reading_time_minutes: 4,
  },
  {
    id: 'a2222222-2222-2222-2222-222222222222',
    title: 'Comparatif Modèles IA 2026 : Lequel choisir selon vos besoins ?',
    slug: 'comparatif-modeles-ia-2026-lequel-choisir-selon-vos-besoins',
    excerpt: 'Un comparatif objectif et chiffré des leaders du marché : raisonnement, code, rédaction française, tarification et sécurité des données.',
    content: `Le paysage des modèles de fondation évolue à une vitesse fulgurante. Entre les géants américains et les pépites européennes, quel modèle utiliser au quotidien ? Voici notre benchmark indépendant.

## Les prétendants au titre

Voici les 4 familles de modèles analysées dans ce comparatif :
- **OpenAI (GPT-4o & o3-mini)** : La référence polyvalente avec un écosystème très mature.
- **Anthropic (Claude 3.5 Sonnet & Claude 3.7)** : Le champion incontesté du code, de l écriture naturelle et du respect des consignes stricts.
- **Google (Gemini 1.5 Pro & 2.0 Flash)** : L intégration multimodale native (texte, vision, audio, vidéo) et la plus grande fenêtre de contexte.
- **Mistral AI (Mistral Large & Pixtral)** : Le fleuron européen, souverain et hautement performant en langue française.

## Tableau comparatif des performances

| Critère | Claude 3.5 / 3.7 | GPT-4o / o3 | Gemini 1.5 / 2.0 | Mistral Large |
|---|---|---|---|---|
| **Rédaction FR** | 🟢 Excellente | 🟢 Très bonne | 🟡 Bonne | 🟢 Excellente |
| **Génération de Code** | 🟢 Incroyable | 🟢 Très solide | 🟡 Correcte | 🟢 Très solide |
| **Raisonnement Complexe** | 🟢 Exceptionnel | 🟢 Exceptionnel | 🟡 Bon | 🟢 Bon |
| **Multimodalité** | 🟡 Vision seule | 🟢 Texte, Audio, Vision | 🟢 Texte, Audio, Vidéo | 🟡 Vision |
| **Fenêtre Contexte** | 200 000 tokens | 128 000 tokens | **2 000 000 tokens** | 128 000 tokens |

## Recommandations d usage

### 1. Pour les développeurs et ingénieurs de code
**Vainqueur : Anthropic Claude.** La précision de la génération de code, la compréhension des dépendances d un projet complexe et l absence de verbosité inutile font de Claude l assistant idéal pour le dev.

### 2. Pour l analyse de données et la vidéo
**Vainqueur : Google Gemini.** La capacité à ingérer 1 heure de vidéo ou 50 PDF simultanément dans sa fenêtre de 2 millions de tokens est sans équivalent sur le marché.

### 3. Pour la confidentialité et l ancrage européen
**Vainqueur : Mistral AI.** Des modèles performants, hébergés en Europe, respectant les normes RGPD les plus strictes sans sacrifier les benchmarks.

## Conclusion

Il n existe plus un seul "meilleur" modèle universel, mais des spécialistes selon vos cas d usage. N hésitez pas à combiner plusieurs outils via leurs APIs respectives.`,
    featured_image: 'https://images.unsplash.com/photo-1518770660439-4636190af475?auto=format&fit=crop&w=1200&q=80',
    category_id: MOCK_CATEGORIES[1].id,
    author_id: 'user-admin',
    status: 'published',
    views: 0,
    published_at: new Date(Date.now() - 1 * 86400000).toISOString(),
    created_at: new Date(Date.now() - 1 * 86400000).toISOString(),
    updated_at: new Date(Date.now() - 1 * 86400000).toISOString(),
    category: MOCK_CATEGORIES[1],
    author: {
      id: 'user-admin',
      full_name: 'Équipe IA Décodée',
      avatar_url: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=300&q=80',
      role: 'admin',
    },
    reading_time_minutes: 5,
  },
  {
    id: 'a3333333-3333-3333-3333-333333333333',
    title: 'Bien rédiger un prompt : Le guide complet du débutant à l expert',
    slug: 'bien-rediger-un-prompt-le-guide-complet-du-debutant-a-l-expert',
    excerpt: 'Maîtrisez le Prompt Engineering avec notre méthode en 5 piliers : rôle, contexte, contraintes, format de sortie et quelques exemples (Few-Shot).',
    content: `Obtenir une réponse médiocre d un LLM est rarement la fautes du modèle : c est presque toujours un problème de structuration du prompt. Découvrons la méthode pas-à-pas pour transformer vos requêtes.

## La structure d un prompt parfait (Framework C-R-O-F-C)

Un prompt de qualité professionnelle intègre 5 éléments structurants :

1. **Rôle (Role)** : Définissez la posture de l IA.
   *Exemple : "Agis en tant qu expert en cybersécurité senior et auditeur ISO 27001."*
2. **Contexte (Context)** : Expliquez la situation et l objectif.
   *Exemple : "Notre PME souhaite lancer une application web bancaire en SaaS."*
3. **Objectif (Objective)** : La tâche exacte à accomplir.
   *Exemple : "Rédige une liste des 5 principales vulnérabilités OWASP à contrôler."*
4. **Format (Format)** : La forme de la réponse.
   *Exemple : "Présente sous forme de tableau avec les colonnes : Risque, Impact, Mesure corrective."*
5. **Contraintes (Constraints)** : Ce que l IA doit absolument éviter.
   *Exemple : "N utilise pas de jargon inutile. Reste très concret."*

## Technicité avancée : Le Few-Shot Prompting

Plutôt que de simplement décrire ce que vous voulez, donnez 1 à 3 exemples de paires Entrée/Sortie dans votre prompt.

\`\`\`markdown
Exemple 1 :
Entrée : "Erreur 404 sur la route /api/users"
Sortie : [API] Ressource non trouvée. Vérifier l URL et les paramètres.

Exemple 2 :
Entrée : "Erreur 500 sur la base de données"
Sortie : [DB] Erreur serveur interne. Vérifier la connexion Supabase.
\`\`\`

Cette technique augmente le taux de réussite des réponses de plus de 40% sur les tâches complexes.

## Les pièges à éviter absolument

- **Les consignes négatives** : Ne dites pas *"Ne fais pas X"*, privilégiez *"Fais uniquement Y"*. Les LLM gèrent très mal la négation directe.
- **Les promesses vagues** : *"Rédige un super article"* donnera un texte générique. Préférez des directives chiffrées (*"Rédige 400 mots structurés en 3 sous-titres H2"*).

Appliquez cette grille dès aujourd hui et observez la différence immédiate dans la précision de vos interactions avec l IA !`,
    featured_image: 'https://images.unsplash.com/photo-1620712943543-bcc4688e7485?auto=format&fit=crop&w=1200&q=80',
    category_id: MOCK_CATEGORIES[2].id,
    author_id: 'user-admin',
    status: 'published',
    views: 0,
    published_at: new Date(Date.now() - 5 * 3600000).toISOString(),
    created_at: new Date(Date.now() - 5 * 3600000).toISOString(),
    updated_at: new Date(Date.now() - 5 * 3600000).toISOString(),
    category: MOCK_CATEGORIES[2],
    author: {
      id: 'user-admin',
      full_name: 'Équipe IA Décodée',
      avatar_url: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=300&q=80',
      role: 'admin',
    },
    reading_time_minutes: 3,
  },
];

export const MOCK_COMMENTS: CommentPublic[] = [
  {
    id: 'c1',
    article_id: 'a1111111-1111-1111-1111-111111111111',
    author_name: 'Thomas Dubois',
    content: "Explication limpide sur l'auto-attention ! C'est la première fois que je comprends enfin la différence entre tokens et mots.",
    status: 'approved',
    created_at: new Date(Date.now() - 2 * 86400000).toISOString(),
  },
  {
    id: 'c2',
    article_id: 'a1111111-1111-1111-1111-111111111111',
    author_name: 'Léa Martin',
    content: "Super article. Est-ce que vous prévoyez un sujet spécifique sur le RAG et les bases vectorielles prochainement ?",
    status: 'approved',
    created_at: new Date(Date.now() - 1 * 86400000).toISOString(),
  },
  {
    id: 'c3',
    article_id: 'a2222222-2222-2222-2222-222222222222',
    author_name: 'Alexandre',
    content: "Je confirme pour Claude 3.5 / 3.7 sur le code, c'est devenu mon outil de dev principal quotidien. Beau travail de synthèse !",
    status: 'approved',
    created_at: new Date(Date.now() - 12 * 3600000).toISOString(),
  },
];
