import { requireAdmin } from '@/lib/auth';
import { getAdminCategories } from '@/lib/api-admin';
import { CategoryManager } from '@/components/admin/CategoryManager';

export default async function AdminCategoriesPage() {
  await requireAdmin();
  const categories = await getAdminCategories();

  return <CategoryManager categories={categories} />;
}
