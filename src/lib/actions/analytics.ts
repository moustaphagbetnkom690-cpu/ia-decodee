'use server';

import { headers } from 'next/headers';
import { createClient } from '@/lib/supabase/server';
import { getVisitorGeo } from '@/lib/geo';

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
 */
export async function recordPageView(path: string, articleId?: string | null) {
  try {
    const supabase = await createClient();
    if (!supabase) return;

    const geo = await getVisitorGeo();
    const headerList = await headers();

    const referrer = headerList.get('referer');
    const userAgent = headerList.get('user-agent');

    await supabase.rpc('record_page_view', {
      p_path: path.slice(0, 500),
      p_article_id: articleId ?? null,
      p_country_code: geo.countryCode,
      p_country_name: geo.countryName,
      p_city: geo.city,
      p_referrer: referrer,
      p_user_agent: userAgent,
    });
  } catch {
    // L'analytics ne doit jamais casser l'affichage d'une page : en cas d'échec
    // (base indisponible, RPC absente), on abandonne silencieusement.
  }
}
