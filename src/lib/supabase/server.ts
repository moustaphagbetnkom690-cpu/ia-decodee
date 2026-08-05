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
