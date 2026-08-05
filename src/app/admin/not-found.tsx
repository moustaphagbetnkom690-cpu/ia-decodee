import Link from 'next/link';
import { FileQuestion, LayoutDashboard, FileText } from 'lucide-react';
import { SITE_PATHS } from '@/lib/site-links';

/**
 * 404 interne au back-office — déclenché par exemple lorsque l'éditeur est
 * ouvert sur l'identifiant d'un article supprimé entre-temps.
 * Sans ce fichier, l'administrateur verrait la page 404 du site public, avec sa
 * navigation par catégories et son pied de page éditorial.
 */
export default function AdminNotFound() {
  return (
    <div className="flex min-h-[60vh] items-center justify-center px-4">
      <div className="w-full max-w-md space-y-6 text-center">
        <span
          aria-hidden
          className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl border border-line bg-surface"
        >
          <FileQuestion className="h-6 w-6 text-faint" />
        </span>

        <div>
          <h1 className="text-xl font-bold text-ink">Contenu introuvable</h1>
          <p className="mt-2 text-sm text-muted">
            L’élément demandé n’existe plus, ou son identifiant est incorrect.
          </p>
        </div>

        <div className="flex flex-wrap justify-center gap-3">
          <Link href={SITE_PATHS.adminArticles} className="btn btn-primary">
            <FileText className="h-4 w-4" />
            Liste des articles
          </Link>
          <Link href={SITE_PATHS.admin} className="btn btn-ghost">
            <LayoutDashboard className="h-4 w-4" />
            Tableau de bord
          </Link>
        </div>
      </div>
    </div>
  );
}
