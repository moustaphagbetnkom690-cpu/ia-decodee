import { headers } from 'next/headers';

/**
 * Limitation de débit pour les actions publiques.
 *
 * ── Pourquoi ce fichier existe ───────────────────────────────────────────────
 * L'audit du 5 août 2026 a relevé qu'aucune action publique n'était limitée :
 * commentaires, inscriptions newsletter et enregistrement de vues n'étaient
 * protégés que par un pot de miel, qu'un script contourne en une ligne. Sur un
 * site en ligne, la modération peut être noyée sous des milliers d'entrées en
 * attente en quelques minutes.
 *
 * ── Ce que cette implémentation vaut, et ce qu'elle ne vaut pas ──────────────
 * Le compteur vit en mémoire, dans le processus. Sur Vercel, chaque instance
 * serverless possède la sienne : un attaquant réparti sur N instances obtient
 * donc N fois le quota, et un redémarrage remet les compteurs à zéro. Ce n'est
 * PAS une protection contre une attaque distribuée déterminée.
 *
 * C'est en revanche parfaitement suffisant contre ce qui arrive réellement à un
 * site de cette taille : le script unique qui boucle depuis une seule adresse.
 * Le coût est nul, il n'y a aucune dépendance à ajouter et aucune latence.
 *
 * Si le trafic hostile devient sérieux, la marche à suivre est de remplacer
 * `hit()` par un compteur partagé (Upstash Redis, ou une table Postgres avec un
 * INSERT ... ON CONFLICT). La signature ci-dessous est conçue pour que ce
 * remplacement ne touche à aucun appelant.
 */

interface Bucket {
  count: number;
  resetAt: number;
}

const buckets = new Map<string, Bucket>();

/*
 * Purge opportuniste : sans elle, la Map grossirait indéfiniment au fil des
 * adresses IP rencontrées, ce qui transformerait la protection en fuite de
 * mémoire. On ne balaie qu'une fois sur cinquante pour ne pas payer un parcours
 * complet à chaque requête.
 */
let callsSinceSweep = 0;

function sweep(now: number) {
  if (++callsSinceSweep < 50) return;
  callsSinceSweep = 0;
  for (const [key, bucket] of buckets) {
    if (bucket.resetAt <= now) buckets.delete(key);
  }
}

/** Identifie l'appelant. Renvoie 'inconnu' plutôt que d'échouer : mieux vaut
 *  regrouper les requêtes non identifiables dans un même seau que de les
 *  laisser toutes passer. */
export async function callerKey(scope: string): Promise<string> {
  const headerList = await headers();

  // x-forwarded-for peut contenir une chaîne « client, proxy1, proxy2 » : la
  // première entrée est l'adresse du client d'origine.
  const forwarded = headerList.get('x-forwarded-for')?.split(',')[0]?.trim();
  const ip = forwarded || headerList.get('x-real-ip') || 'inconnu';

  return `${scope}:${ip}`;
}

export interface RateLimitResult {
  autorise: boolean;
  /** Secondes avant la réouverture du quota. */
  attendreSecondes: number;
}

/**
 * Consomme un jeton. `limite` requêtes autorisées par `fenetreSecondes`.
 */
export function hit(key: string, limite: number, fenetreSecondes: number): RateLimitResult {
  const now = Date.now();
  sweep(now);

  const bucket = buckets.get(key);

  if (!bucket || bucket.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + fenetreSecondes * 1000 });
    return { autorise: true, attendreSecondes: 0 };
  }

  bucket.count += 1;

  if (bucket.count > limite) {
    return {
      autorise: false,
      attendreSecondes: Math.max(1, Math.ceil((bucket.resetAt - now) / 1000)),
    };
  }

  return { autorise: true, attendreSecondes: 0 };
}

/** Raccourci : identifie l'appelant et consomme un jeton en une seule étape. */
export async function limiter(
  scope: string,
  limite: number,
  fenetreSecondes: number
): Promise<RateLimitResult> {
  return hit(await callerKey(scope), limite, fenetreSecondes);
}
