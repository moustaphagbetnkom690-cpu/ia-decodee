import { redirect } from 'next/navigation';
import { createClient } from './supabase/server';
import { SITE_PATHS } from './site-links';
import type { Profile } from './types';

/**
 * Contrôle d'accès côté serveur.
 *
 * Point d'attention important : `proxy.ts` bloque déjà l'accès à /admin sans
 * session, mais il ne vérifie QUE la présence d'une session — pas le rôle.
 * La vérification du rôle a lieu ici, au plus près des données, parce que le
 * proxy s'exécute en périphérie et ne doit pas dépendre d'une requête en base.
 * Les deux couches sont complémentaires : le proxy filtre en amont, ces
 * fonctions font autorité.
 */

export interface AdminSession {
  userId: string;
  email: string;
  profile: Profile;
}

/**
 * Résultat détaillé de la vérification, utilisé par requireAdmin().
 * Il est essentiel de distinguer « pas connecté » de « connecté sans les
 * droits » : renvoyer les deux cas vers l'écran de connexion provoquait une
 * boucle de redirection infinie pour un compte authentifié non autorisé
 * (le proxy le renvoyait vers /admin, requireAdmin vers /admin/login, etc.).
 */
type SessionCheck =
  | { status: 'ok'; session: AdminSession }
  | { status: 'anonyme' }
  | { status: 'sans-privileges' };

async function checkSession(): Promise<SessionCheck> {
  const supabase = await createClient();
  if (!supabase) return { status: 'anonyme' };

  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) return { status: 'anonyme' };

  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single();

  if (!profile || (profile.role !== 'admin' && profile.role !== 'editor')) {
    return { status: 'sans-privileges' };
  }

  return {
    status: 'ok',
    session: { userId: user.id, email: user.email ?? '', profile: profile as Profile },
  };
}

/** Renvoie la session admin courante, ou null. Ne redirige jamais. */
export async function getAdminSession(): Promise<AdminSession | null> {
  const result = await checkSession();
  return result.status === 'ok' ? result.session : null;
}

/**
 * Exige une session administrateur.
 *
 * Deux issues distinctes selon le cas, et c'est tout l'interet :
 *   - visiteur non connecte  -> ecran de connexion classique ;
 *   - compte connecte SANS les droits -> ecran de connexion avec `erreur=acces`.
 *
 * Ce parametre est indispensable : `proxy.ts` renvoie normalement tout compte
 * connecte de /admin/login vers /admin. Sans ce marqueur, un compte « reader »
 * rebondissait indefiniment entre les deux pages (ERR_TOO_MANY_REDIRECTS), sans
 * meme pouvoir se deconnecter.
 */
export async function requireAdmin(): Promise<AdminSession> {
  const result = await checkSession();

  if (result.status === 'anonyme') {
    redirect(SITE_PATHS.adminLogin);
  }
  if (result.status === 'sans-privileges') {
    redirect(`${SITE_PATHS.adminLogin}?erreur=acces`);
  }

  return result.session;
}
