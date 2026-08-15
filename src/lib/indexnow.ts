import { siteConfig } from './site-config';

/**
 * Notification IndexNow — signalement immédiat d'une URL aux moteurs.
 *
 * ── Ce que ça couvre, et ce que ça ne couvre pas ─────────────────────────────
 * IndexNow est soutenu par Bing, Yandex, Naver, Seznam et Yep, qui se partagent
 * les soumissions : signaler à l'un revient à signaler à tous.
 *
 * **Google n'en fait pas partie.** Il a testé le protocole puis ne l'a pas
 * adopté, et son Indexing API reste réservée aux balisages `JobPosting` et
 * `BroadcastEvent` — inutilisable pour un article. Pour Google, il n'existe que
 * deux chemins : le plan de site, et le bouton « Demander l'indexation » de la
 * Search Console, qui n'a aucun équivalent programmatique.
 *
 * Ne pas confondre les deux, donc : ce fichier accélère l'indexation sur une
 * partie des moteurs, il ne remplace pas la démarche Search Console.
 *
 * ── Pourquoi la clé est en clair ─────────────────────────────────────────────
 * Le protocole exige qu'elle soit publiée à `https://<domaine>/<clé>.txt` : le
 * moteur la lit à cette adresse pour vérifier que le signaleur contrôle bien le
 * domaine. Elle est donc publique par construction, exactement comme le jeton
 * de vérification Search Console. La cacher dans une variable d'environnement
 * donnerait une fausse impression de secret, et ferait tomber la vérification le
 * jour où quelqu'un nettoie les variables Vercel.
 */
export const INDEXNOW_KEY = 'c834a8128e2a1f2828a2ab04f3caaed6';

const POINT_DE_SOUMISSION = 'https://api.indexnow.org/indexnow';

export interface ResultatIndexNow {
  ok: boolean;
  statut?: number;
  message?: string;
}

/**
 * Signale un lot d'URL. Jusqu'à 10 000 par appel selon la spécification.
 *
 * N'échoue jamais bruyamment : une indisponibilité du service ne doit pas faire
 * échouer la publication d'un article, qui est l'opération réellement
 * importante.
 */
export async function notifierIndexNow(urls: string[]): Promise<ResultatIndexNow> {
  const liste = urls.filter(Boolean);
  if (liste.length === 0) return { ok: true, message: 'Aucune URL à signaler.' };

  // Le protocole refuse un lot portant sur un autre domaine que celui de la clé.
  const hote = new URL(siteConfig.url).host;

  try {
    const reponse = await fetch(POINT_DE_SOUMISSION, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json; charset=utf-8' },
      body: JSON.stringify({
        host: hote,
        key: INDEXNOW_KEY,
        keyLocation: `${siteConfig.url}/${INDEXNOW_KEY}.txt`,
        urlList: liste,
      }),
      // Sans cela, Next mettrait la réponse en cache et les signalements
      // suivants n'atteindraient jamais le service.
      cache: 'no-store',
    });

    // 200 et 202 valent acceptation ; 422 signale des URL hors domaine.
    return {
      ok: reponse.ok,
      statut: reponse.status,
      message: reponse.ok ? `${liste.length} URL signalées.` : await reponse.text(),
    };
  } catch (err) {
    return { ok: false, message: err instanceof Error ? err.message : 'Échec réseau.' };
  }
}
