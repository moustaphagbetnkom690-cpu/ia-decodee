import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

/** Fusionne des classes Tailwind en résolvant les conflits (clsx + tailwind-merge). */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Transforme un titre en slug d'URL.
 * La normalisation NFD sépare les accents de leur lettre de base, ce qui permet
 * de les retirer proprement : « Modèles & Prompts » → « modeles-prompts ».
 */
export function slugify(input: string): string {
  return input
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 200);
}

/**
 * Fuseau de référence du site.
 *
 * Toutes les dates de publication sont saisies, stockées et affichées en heure
 * de Paris. Sans ce choix explicite, `toLocaleString` suivrait le fuseau de la
 * machine : un article programmé pour 14 h 30 s'afficherait « 12:30 » une fois
 * rendu sur Vercel, dont les fonctions tournent en UTC. La base, elle, conserve
 * bien un instant absolu (TIMESTAMPTZ) — seule la présentation est localisée.
 */
const FUSEAU_SITE = 'Europe/Paris';

/**
 * Décalage, en millisecondes, entre l'heure de Paris et UTC à un instant donné.
 * Calculé via Intl plutôt que codé en dur : il vaut +1 h en hiver, +2 h en été.
 */
function decalageSite(instant: Date): number {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: FUSEAU_SITE,
    hour12: false,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  }).formatToParts(instant);

  const champ = (type: string) => Number(parts.find((p) => p.type === type)?.value ?? 0);

  const commeUTC = Date.UTC(
    champ('year'),
    champ('month') - 1,
    champ('day'),
    // Intl rend « 24 » pour minuit avec hour12:false ; Date.UTC l'accepte, mais
    // le modulo évite de basculer d'un jour dans les comparaisons.
    champ('hour') % 24,
    champ('minute'),
    champ('second')
  );

  return commeUTC - instant.getTime();
}

/** Formate une date en français : « 3 août 2026 ». */
export function formatDate(value: string | Date): string {
  const date = typeof value === 'string' ? new Date(value) : value;
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleDateString('fr-FR', {
    timeZone: FUSEAU_SITE,
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

/** Formate une date courte avec l'heure : « 3 août, 14:05 ». */
export function formatDateTime(value: string | Date): string {
  const date = typeof value === 'string' ? new Date(value) : value;
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleDateString('fr-FR', {
    timeZone: FUSEAU_SITE,
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
}

/**
 * « 2026-08-10T14:30 » (heure de Paris) → instant ISO en UTC.
 * C'est la conversion attendue par la valeur d'un `<input type="datetime-local">`.
 * Renvoie null si la chaîne n'a pas la forme attendue.
 */
export function siteLocalToISO(local: string): string | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})/.exec(local.trim());
  if (!m) return null;

  const [, annee, mois, jour, heure, minute] = m;
  const naif = Date.UTC(+annee, +mois - 1, +jour, +heure, +minute);

  // Deux passes : le décalage dépend de l'instant, qu'on ne connaît qu'après
  // l'avoir appliqué. La première approximation suffit à déterminer le bon
  // régime horaire, sauf exactement pendant l'heure escamotée du changement
  // d'heure — où toute réponse est également défendable.
  const approx = naif - decalageSite(new Date(naif));
  const exact = naif - decalageSite(new Date(approx));

  const date = new Date(exact);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

/**
 * Instant ISO → « 2026-08-10T14:30 » en heure de Paris, prêt à alimenter un
 * `<input type="datetime-local">`.
 */
export function isoToSiteLocal(value: string | Date | null | undefined): string {
  if (!value) return '';
  const date = typeof value === 'string' ? new Date(value) : value;
  if (Number.isNaN(date.getTime())) return '';
  return new Date(date.getTime() + decalageSite(date)).toISOString().slice(0, 16);
}

/** Formate une date avec l'heure de Paris : « 10 août 2026 à 14:30 ». */
export function formatDateHeure(value: string | Date): string {
  const date = typeof value === 'string' ? new Date(value) : value;
  if (Number.isNaN(date.getTime())) return '—';

  const jour = date.toLocaleDateString('fr-FR', {
    timeZone: FUSEAU_SITE,
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
  const heure = date.toLocaleTimeString('fr-FR', {
    timeZone: FUSEAU_SITE,
    hour: '2-digit',
    minute: '2-digit',
  });

  return `${jour} à ${heure}`;
}

/** Vrai si l'instant est encore à venir — donc si la publication est programmée. */
export function estDansLeFutur(value: string | Date | null | undefined): boolean {
  if (!value) return false;
  const date = typeof value === 'string' ? new Date(value) : value;
  return !Number.isNaN(date.getTime()) && date.getTime() > Date.now();
}

/** Sépare les milliers à la française : 12 480. */
export function formatNumber(value: number): string {
  return value.toLocaleString('fr-FR');
}

/** Validation d'adresse e-mail, suffisante pour un formulaire public. */
export function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email.trim());
}

/**
 * Sérialise un objet destiné à une balise `<script type="application/ld+json">`.
 *
 * `JSON.stringify` seul ne suffit PAS dans ce contexte, et c'est un piège
 * classique : il échappe les guillemets, mais laisse passer `<` et `>` tels
 * quels. Un titre d'article contenant `</script><script>…` referme donc la
 * balise et exécute ce qui suit. Le contenu vient ici du back-office, l'attaque
 * suppose donc un compte rédacteur — mais une faille exploitable par un éditeur
 * reste une faille, et le correctif tient en une ligne.
 *
 * On neutralise `<`, `>` et `&` par leur échappement Unicode : la valeur JSON
 * décodée reste rigoureusement identique pour les moteurs de recherche, et plus
 * aucune séquence ne peut être interprétée comme du balisage HTML.
 */
export function jsonLd(value: unknown): string {
  return JSON.stringify(value)
    .replace(/</g, '\\u003c')
    .replace(/>/g, '\\u003e')
    .replace(/&/g, '\\u0026');
}
