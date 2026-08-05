import { createServerClient } from '@supabase/ssr';
import { createClient as createSupabaseClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

/**
 * Client Supabase LIÉ À LA SESSION de l'utilisateur.
 *
 * À utiliser dès que l'identité compte : authentification, back-office, server
 * actions. Il lit les cookies, ce qui rend automatiquement dynamique toute route
 * qui l'appelle — c'est le comportement voulu ici, mais surtout pas sur les
 * pages publiques (voir createPublicClient ci-dessous).
 */
export async function createClient() {
  const cookieStore = await cookies();

  if (!supabaseUrl || !supabaseAnonKey) {
    return null;
  }

  return createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options)
          );
        } catch {
          // Un Server Component ne peut pas écrire de cookies : le
          // rafraîchissement de session est déjà assuré par proxy.ts.
        }
      },
    },
  });
}

/**
 * Client Supabase ANONYME, sans cookies.
 *
 * Destiné aux lectures publiques : accueil, blog, articles, catégories, sitemap.
 * Comme il ne touche pas aux cookies, Next.js peut à nouveau générer ces pages
 * statiquement et les mettre en cache — ce que le client précédent empêchait,
 * rendant tout le site dynamique et donc plus lent pour chaque visiteur.
 *
 * Aucune perte de sécurité : les policies RLS ne donnent au rôle `anon` accès
 * qu'aux articles publiés et aux commentaires approuvés. C'est exactement ce que
 * ces pages doivent afficher.
 *
 * `persistSession: false` est indispensable : sans lui, le client tenterait
 * d'écrire un état de session dans un environnement serveur partagé entre
 * plusieurs requêtes.
 */
export function createPublicClient() {
  if (!supabaseUrl || !supabaseAnonKey) {
    return null;
  }

  return createSupabaseClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}

/**
 * Client de SERVICE — contourne intégralement la RLS.
 *
 * ⚠️ À n'importer QUE depuis un fichier `'use server'` ou un Server Component.
 * La clé lue ici n'a pas de préfixe NEXT_PUBLIC_ : si ce module venait à être
 * inclus dans un bundle navigateur, la variable vaudrait `undefined` et la
 * fonction renverrait null plutôt que d'exposer quoi que ce soit. C'est un
 * garde-fou, pas une autorisation : ne l'appelez jamais côté client.
 *
 * Introduit lors de l'audit du 5 août 2026 pour un seul usage : l'enregistrement
 * des vues. Le RPC `record_page_view` était accordé au rôle `anon` ET recevait
 * le pays en paramètre. N'importe qui pouvait donc, avec la seule clé publique
 * lisible dans le navigateur, injecter un nombre illimité de vues depuis un pays
 * inventé — ce qui a été vérifié en conditions réelles (3 insertions, HTTP 204).
 * Le RPC est désormais révoqué pour `anon` et `authenticated` (voir
 * `supabase_patch_securite.sql`) : seul ce client peut l'appeler, et le pays
 * provient donc réellement des en-têtes de la plateforme, comme annoncé.
 */
export function createServiceClient() {
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceKey) {
    return null;
  }

  return createSupabaseClient(supabaseUrl, serviceKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}
