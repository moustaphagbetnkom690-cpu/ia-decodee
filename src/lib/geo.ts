import { headers } from 'next/headers';

/**
 * Géolocalisation des visiteurs.
 *
 * Le pays est lu dans les en-têtes injectés par la plateforme d'hébergement
 * (Vercel en production, Cloudflare si un proxy est placé devant). Ces en-têtes
 * sont ajoutés par l'infrastructure elle-même : ils ne peuvent pas être falsifiés
 * par le navigateur, contrairement à une valeur qui serait envoyée depuis le
 * client. Aucune adresse IP n'est stockée, seulement le pays et la ville —
 * ce qui garde le dispositif simple au regard du RGPD.
 */

export interface VisitorGeo {
  countryCode: string | null;
  countryName: string | null;
  city: string | null;
}

// countryFlag() et countryName() vivent désormais dans `country.ts` : elles sont
// purement calculatoires, et les garder ici entraînait `next/headers` dans le
// paquet navigateur dès qu'un composant client importait le drapeau d'un pays.
// La réexportation évite de toucher aux appelants serveur existants.
// L'import sert à getVisitorGeo() ci-dessous ; la réexportation sert aux
// appelants historiques. Un simple `export ... from` ne mettrait pas le nom
// dans la portée locale de ce fichier.
import { countryName } from './country';
export { countryFlag, countryName } from './country';

/** Décode les en-têtes de ville, encodés en ASCII par Vercel (« Le%20Mans »). */
function decodeHeader(value: string | null): string | null {
  if (!value) return null;
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

/**
 * Lit la position du visiteur courant depuis les en-têtes de la requête.
 * À n'appeler que dans un contexte serveur (Server Component, Server Action).
 */
export async function getVisitorGeo(): Promise<VisitorGeo> {
  const headerList = await headers();

  const code =
    headerList.get('x-vercel-ip-country') ??
    headerList.get('cf-ipcountry') ??
    // Renseigné par notre proxy.ts, utile en développement local.
    headerList.get('x-visitor-country');

  const city =
    decodeHeader(headerList.get('x-vercel-ip-city')) ??
    decodeHeader(headerList.get('cf-ipcity'));

  // Vercel renvoie « XX » quand la géolocalisation échoue.
  const normalized = code && code !== 'XX' ? code.toUpperCase() : null;

  return {
    countryCode: normalized,
    countryName: normalized ? countryName(normalized) : null,
    city: city || null,
  };
}
