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

/** Formate une date en français : « 3 août 2026 ». */
export function formatDate(value: string | Date): string {
  const date = typeof value === 'string' ? new Date(value) : value;
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleDateString('fr-FR', {
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
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
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
