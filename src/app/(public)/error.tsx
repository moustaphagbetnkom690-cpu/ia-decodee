'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { AlertTriangle, RotateCcw, Home } from 'lucide-react';
import { SITE_PATHS } from '@/lib/site-links';

/**
 * Frontière d'erreur globale du site public.
 *
 * Sans ce fichier, la moindre exception non rattrapée dans un composant
 * affichait au visiteur l'écran d'erreur brut de Next.js — voire, en
 * production, une page blanche.
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // En production, c'est ici que l'on brancherait un service de suivi
    // d'erreurs (Sentry, etc.).
    console.error('[erreur applicative]', error);
  }, [error]);

  return (
    <div className="flex min-h-[70vh] items-center justify-center px-4 py-20">
      <div className="w-full max-w-md space-y-6 text-center">
        <span
          aria-hidden
          className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl border border-danger/30 bg-danger/10"
        >
          <AlertTriangle className="h-6 w-6 text-danger" />
        </span>

        <div>
          <h1 className="text-2xl font-bold text-ink">Une erreur est survenue</h1>
          <p className="mt-2 text-sm text-muted">
            Le contenu n’a pas pu être chargé. Réessayer suffit le plus souvent.
          </p>
          {/* Le digest permet de retrouver l'erreur exacte dans les journaux du
              serveur sans exposer la trace d'exécution au visiteur. */}
          {error.digest && (
            <p className="mt-3 font-mono text-[11px] text-faint">
              Référence : {error.digest}
            </p>
          )}
        </div>

        <div className="flex flex-wrap justify-center gap-3">
          <button type="button" onClick={reset} className="btn btn-primary">
            <RotateCcw className="h-4 w-4" />
            Réessayer
          </button>
          <Link href={SITE_PATHS.home} className="btn btn-ghost">
            <Home className="h-4 w-4" />
            Accueil
          </Link>
        </div>
      </div>
    </div>
  );
}
