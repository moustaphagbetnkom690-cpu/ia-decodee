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

/** Convertit un code ISO 3166-1 alpha-2 en drapeau emoji (FR → 🇫🇷). */
export function countryFlag(code: string | null | undefined): string {
  if (!code || code.length !== 2 || !/^[A-Za-z]{2}$/.test(code)) return '🏳️';
  const base = 0x1f1e6; // Indicateur régional « A »
  return String.fromCodePoint(
    ...code
      .toUpperCase()
      .split('')
      .map((char) => base + char.charCodeAt(0) - 65)
  );
}

/**
 * Nom du pays en français à partir de son code ISO.
 * Intl.DisplayNames couvre l'intégralité des pays, ce qui évite d'entretenir à
 * la main une table de correspondance forcément incomplète.
 */
export function countryName(code: string | null | undefined): string {
  if (!code) return 'Inconnu';
  try {
    const display = new Intl.DisplayNames(['fr'], { type: 'region' });
    return display.of(code.toUpperCase()) ?? code.toUpperCase();
  } catch {
    return code.toUpperCase();
  }
}

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
