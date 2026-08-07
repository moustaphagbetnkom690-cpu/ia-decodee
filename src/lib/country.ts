/**
 * Utilitaires pays — SANS AUCUNE DÉPENDANCE SERVEUR.
 *
 * Ces fonctions vivaient dans `geo.ts`, aux côtés de `getVisitorGeo()` qui
 * importe `next/headers`. Or `next/headers` n'existe que côté serveur : le seul
 * fait d'importer `countryFlag` depuis un composant client entraînait tout le
 * module dans le paquet navigateur et faisait échouer le build.
 *
 *     You're importing a module that depends on "next/headers".
 *
 * D'où ce fichier : du calcul pur, importable des deux côtés sans risque.
 * `geo.ts` les réexporte, les appelants serveur existants n'ont rien à changer.
 */

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
