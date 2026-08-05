import { requireAdmin } from '@/lib/auth';
import { getAdminCategories } from '@/lib/api-admin';
import { ArticleEditor } from '@/components/admin/ArticleEditor';

export default async function NewArticlePage() {
  await requireAdmin();
  const categories = await getAdminCategories();

  return <ArticleEditor categories={categories} />;
}
