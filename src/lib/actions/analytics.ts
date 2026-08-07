'use server';

import { createHash } from 'node:crypto';
import { headers } from 'next/headers';
import { createServiceClient } from '@/lib/supabase/server';
import { getVisitorGeo } from '@/lib/geo';
import { limiter } from '@/lib/rate-limit';

/**
 * Empreinte de visiteur, pour le compteur « en ligne » du back-office.
 *
 * Sans identifiant, impossible de distinguer trois lecteurs d'un seul lecteur
 * qui recharge trois fois. On calcule donc une empreinte — mais construite pour
 * ne rien révéler :
 *
 *   - l'adresse IP n'est JAMAIS écrite en base, seul son haché l'est ;
 *   - la date du jour entre dans le calcul, donc l'empreinte change chaque nuit :
 *     le même visiteur revenant demain est indénombrable comme « revenant », y
 *     compris par nous ;
 *   - un secret serveur interdit de retrouver une IP par force brute. Sans lui,
 *     l'espace des adresses IPv4 se parcourt en quelques minutes sur une machine
 *     ordinaire, et le haché n'aurait aucune valeur protectrice.
 *
 * C'est la méthode des outils d'analytique respectueux de la vie privée
 * (Plausible, Fathom) : elle donne un décompte juste sans cookie, donc sans
 * bandeau de consentement, et sans conserver de donnée directement identifiante.
 */
function empreinteVisiteur(ip: string, userAgent: string): string {
  // ANALYTICS_SALT si elle existe, sinon la clé de service — qui ne quitte
  // jamais le serveur et fait donc un secret acceptable par défaut. Le sel n'a
  // pas besoin d'être stable dans le temps : sa rotation renforce l'anonymat.
  const secret =
    process.env.ANALYTICS_SALT || process.env.SUPABASE_SERVICE_ROLE_KEY || 'ia-decodee';

  const jour = new Date().toISOString().slice(0, 10); // AAAA-MM-JJ

  return createHash('sha256').update(`${jour}|${ip}|${userAgent}|${secret}`).digest('hex');
}

/** Adresse du client, telle que la transmet la plateforme d'hébergement. */
function adresseClient(headerList: Headers): string | null {
  // x-forwarded-for peut valoir « client, proxy1, proxy2 » : la première entrée
  // est l'adresse d'origine.
  const forwarded = headerList.get('x-forwarded-for')?.split(',')[0]?.trim();
  return forwarded || headerList.get('x-real-ip') || null;
}

/**
 * Enregistre une vue de page avec son origine géographique.
 *
 * Cette action est appelée depuis un composant client (<ViewTracker />) plutôt
 * que directement dans le Server Component de la page. C'est volontaire : une
 * page pré-rendue ou revalidée par le cache exécuterait son corps sans qu'aucun
 * visiteur ne soit réellement présent, ce qui gonflerait artificiellement les
 * compteurs. Passer par le client garantit qu'une vue correspond bien à un
 * navigateur qui a chargé la page.
 *
 * Le pays n'est jamais transmis par le client : il est relu ici, côté serveur,
 * depuis les en-têtes de la plateforme. Un visiteur ne peut donc pas se déclarer
 * dans un autre pays que le sien.
 *
 * CORRECTIF DU 5 AOÛT 2026 — la phrase ci-dessus était fausse en pratique.
 * Le RPC `record_page_view` étant accordé au rôle `anon`, n'importe qui pouvait
 * l'appeler DIRECTEMENT avec la clé publique, en court-circuitant cette action
 * et en fournissant le pays de son choix. Vérifié : trois vues depuis un pays
 * inventé ont été acceptées (HTTP 204). Deux changements ferment la brèche :
 *   1. le RPC n'est plus exécutable que par le rôle `service_role` ;
 *   2. cette action passe donc par createServiceClient(), côté serveur.
 * Ce n'est qu'à partir de maintenant que le pays est réellement infalsifiable.
 */
export async function recordPageView(path: string, articleId?: string | null) {
  try {
    // Une page vue reste une écriture en base déclenchée par un visiteur : sans
    // plafond, un simple rechargement en boucle gonfle les compteurs et fait
    // grossir page_views sans limite. 30 vues/minute laissent une navigation
    // normale parfaitement fluide.
    const { autorise } = await limiter('vue', 30, 60);
    if (!autorise) return;

    const supabase = createServiceClient();
    if (!supabase) return;

    const geo = await getVisitorGeo();
    const headerList = await headers();

    const referrer = headerList.get('referer');
    const userAgent = headerList.get('user-agent');

    // Pas d'adresse IP disponible (développement local, en-tête absent) : on
    // enregistre la vue sans empreinte plutôt que d'en fabriquer une bancale qui
    // regrouperait tous les visiteurs sous un même identifiant.
    const ip = adresseClient(headerList);
    const visitorHash = ip ? empreinteVisiteur(ip, userAgent ?? '') : null;

    await supabase.rpc('record_page_view', {
      p_path: path.slice(0, 500),
      p_article_id: articleId ?? null,
      p_country_code: geo.countryCode,
      p_country_name: geo.countryName,
      p_city: geo.city,
      p_referrer: referrer,
      p_user_agent: userAgent,
      p_visitor_hash: visitorHash,
    });
  } catch {
    // L'analytics ne doit jamais casser l'affichage d'une page : en cas d'échec
    // (base indisponible, RPC absente), on abandonne silencieusement.
  }
}
