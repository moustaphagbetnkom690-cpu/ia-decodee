'use server';

import { getRealtimeActivity, type RealtimeActivity } from '@/lib/api-admin';

/**
 * Point d'entrée du back-office pour l'activité temps réel.
 *
 * `api-admin.ts` n'est pas un module `'use server'` : ses fonctions ne peuvent
 * pas être appelées depuis un composant client. Cette action sert de pont.
 *
 * La protection n'est pas affaiblie pour autant : `getRealtimeActivity()`
 * commence par `requireAdmin()`, et la RPC sous-jacente refuse elle-même tout
 * appelant dépourvu du rôle admin. Une server action est un point d'entrée HTTP
 * à part entière — le contrôle doit vivre dedans, jamais dans la page qui
 * l'appelle.
 */
export async function fetchRealtimeActivity(minutes = 5): Promise<RealtimeActivity> {
  return getRealtimeActivity(minutes);
}
