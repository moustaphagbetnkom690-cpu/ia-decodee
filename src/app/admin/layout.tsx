import type { Metadata } from 'next';
import { getAdminSession } from '@/lib/auth';
import { AdminShell } from '@/components/admin/AdminShell';

export const metadata: Metadata = {
  title: 'Administration',
  // Ceinture et bretelles avec le robots.txt : l'espace d'administration ne doit
  // jamais être indexé, ni suivi, ni mis en cache par un moteur de recherche.
  robots: { index: false, follow: false, nocache: true },
};

/**
 * L'espace d'administration est rendu dynamiquement à chaque requête : son
 * contenu dépend de la session en cours et ne doit jamais être mis en cache.
 */
export const dynamic = 'force-dynamic';

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getAdminSession();

  if (!session) {
    return <div className="min-h-[80vh]">{children}</div>;
  }

  return <AdminShell session={session}>{children}</AdminShell>;
}
