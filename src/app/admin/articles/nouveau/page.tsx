import { requireAdmin } from '@/lib/auth';
import { getAdminCategories } from '@/lib/api-admin';
import { ArticleEditor } from '@/components/admin/ArticleEditor';

export default async function NewArticlePage() {
  await requireAdmin();
  const categories = await getAdminCategories();

  /* L'instant par défaut est figé ici, côté serveur, et transmis en propriété.
     Le calculer dans le composant client produirait deux valeurs différentes —
     celle du rendu serveur et celle de l'hydratation — et React signalerait une
     divergence à chaque ouverture de la page. */
  return <ArticleEditor categories={categories} defaultPublishedAt={new Date().toISOString()} />;
}
