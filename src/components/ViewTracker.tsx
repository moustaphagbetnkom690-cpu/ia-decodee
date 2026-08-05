'use client';

import { useEffect, useRef } from 'react';
import { recordPageView } from '@/lib/actions/analytics';

interface ViewTrackerProps {
  path: string;
  articleId?: string | null;
}

/**
 * Déclenche l'enregistrement d'une vue, une seule fois par montage.
 *
 * Le garde `hasTracked` est indispensable : en mode développement, le Strict
 * Mode de React monte chaque composant deux fois, ce qui compterait chaque
 * visite en double sans lui.
 *
 * Le composant ne rend rien et n'affecte pas la mise en page.
 */
export function ViewTracker({ path, articleId }: ViewTrackerProps) {
  const hasTracked = useRef(false);

  useEffect(() => {
    if (hasTracked.current) return;
    hasTracked.current = true;

    // Les erreurs sont déjà absorbées côté serveur ; ce catch couvre les échecs
    // réseau du transport de la server action elle-même.
    void recordPageView(path, articleId).catch(() => {});
  }, [path, articleId]);

  return null;
}
