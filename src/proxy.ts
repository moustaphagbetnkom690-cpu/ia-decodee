import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

/**
 * Proxy (ex-« middleware »).
 *
 * En Next.js 16, la convention `middleware.ts` est dépréciée au profit de
 * `proxy.ts` : c'est ce fichier qui s'exécute avant le rendu des routes.
 *
 * Il remplit trois rôles :
 *
 *   1. Rafraîchir la session Supabase. Les jetons d'accès expirent au bout d'une
 *      heure ; sans ce rafraîchissement à chaque requête, un administrateur se
 *      retrouvait déconnecté en pleine rédaction d'article, sans explication.
 *
 *   2. Protéger /admin. C'était le trou de sécurité principal du projet :
 *      aucun contrôle serveur n'existait, n'importe quel visiteur pouvait
 *      ouvrir le back-office en tapant l'URL. Le `disallow` du robots.txt ne
 *      protège rien — il se contente de demander poliment aux robots de passer
 *      leur chemin.
 *
 *   3. Propager le pays du visiteur, fourni par les en-têtes de la plateforme,
 *      pour que les Server Components puissent le lire de façon uniforme.
 *
 * Le contrôle du RÔLE (admin/editor) n'a pas lieu ici mais dans `lib/auth.ts` :
 * le proxy tourne en périphérie et ne doit pas déclencher de requête en base à
 * chaque navigation. Il vérifie l'existence d'une session, `requireAdmin()`
 * vérifie les privilèges.
 */

const ADMIN_PREFIX = '/admin';
const LOGIN_PATH = '/admin/login';

export async function proxy(request: NextRequest) {
  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  });

  const { pathname } = request.nextUrl;

  // --- Propagation du pays -------------------------------------------------
  const country =
    request.headers.get('x-vercel-ip-country') ??
    request.headers.get('cf-ipcountry');

  if (country) {
    response.headers.set('x-visitor-country', country);
  }

  // --- Session Supabase ----------------------------------------------------
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  // Supabase non configuré : on verrouille quand même /admin.
  if (!supabaseUrl || !supabaseAnonKey) {
    if (pathname.startsWith(ADMIN_PREFIX) && pathname !== LOGIN_PATH) {
      const url = request.nextUrl.clone();
      url.pathname = LOGIN_PATH;
      url.searchParams.set('erreur', 'configuration');
      return NextResponse.redirect(url);
    }
    return response;
  }

  const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({
          request: {
            headers: request.headers,
          },
        });
        if (country) {
          response.headers.set('x-visitor-country', country);
        }
        cookiesToSet.forEach(({ name, value, options }) => {
          response.cookies.set(name, value, options);
        });
      },
    },
  });

  // Cet appel rafraîchit le jeton et réécrit les cookies via setAll ci-dessus.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // --- Garde d'accès -------------------------------------------------------
  if (pathname.startsWith(ADMIN_PREFIX) && pathname !== LOGIN_PATH && !user) {
    const url = request.nextUrl.clone();
    url.pathname = LOGIN_PATH;
    // Mémorise la destination pour y renvoyer l'admin après connexion.
    url.searchParams.set('suivant', pathname);
    return NextResponse.redirect(url);
  }

  // Un administrateur déjà connecté n'a rien à faire sur l'écran de connexion.
  //
  // EXCEPTION `erreur=acces` : c'est requireAdmin() qui vient de renvoyer ici un
  // compte connecté mais dépourvu des droits. Sans cette exception, le proxy le
  // renverrait vers /admin, requireAdmin le renverrait ici, et ainsi de suite —
  // une boucle de redirection infinie qui bloquait complètement l'utilisateur,
  // sans même lui laisser la possibilité de se déconnecter.
  const accesRefuse = request.nextUrl.searchParams.get('erreur') === 'acces';

  if (pathname === LOGIN_PATH && user && !accesRefuse) {
    const url = request.nextUrl.clone();
    url.pathname = ADMIN_PREFIX;
    url.search = '';
    return NextResponse.redirect(url);
  }

  return response;
}

export const config = {
  matcher: [
    /*
     * Exécuté sur toutes les routes sauf les fichiers statiques et les images.
     * Sans cette exclusion, le proxy déclencherait un appel réseau Supabase pour
     * chaque fichier CSS, JS ou police servi — un gâchis considérable.
     */
    '/((?!_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml|.*\\.(?:svg|png|jpg|jpeg|gif|webp|avif|ico|woff2?)$).*)',
  ],
};
