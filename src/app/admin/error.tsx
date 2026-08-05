'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { AlertTriangle, RotateCcw, LayoutDashboard } from 'lucide-react';
import { SITE_PATHS } from '@/lib/site-links';

/**
 * Frontière d'erreur du back-office.
 *
 * Sans ce fichier, une exception dans une page d'administration remonterait
 * jusqu'à la frontière racine et afficherait à l'administrateur une page
 * d'erreur destinée aux lecteurs du site.
 */
export default function AdminError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('[erreur back-office]', error);
  }, [error]);

  return (
    <div className="flex min-h-[60vh] items-center justify-center px-4">
      <div className="w-full max-w-md space-y-6 text-center">
        <span
          aria-hidden
          className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl border border-danger/30 bg-danger/10"
        >
          <AlertTriangle className="h-6 w-6 text-danger" />
        </span>

        <div>
          <h1 className="text-xl font-bold text-ink">Erreur dans l’administration</h1>
          <p className="mt-2 text-sm text-muted">
            Cette section n’a pas pu être chargée. Si le problème persiste, vérifiez
            que le schéma Supabase est bien à jour.
          </p>
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
          <Link href={SITE_PATHS.admin} className="btn btn-ghost">
            <LayoutDashboard className="h-4 w-4" />
            Tableau de bord
          </Link>
        </div>
      </div>
    </div>
  );
}
