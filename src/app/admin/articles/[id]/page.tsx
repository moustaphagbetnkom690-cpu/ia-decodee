import { notFound } from 'next/navigation';
import { requireAdmin } from '@/lib/auth';
import { getAdminArticleById, getAdminCategories } from '@/lib/api-admin';
import { ArticleEditor } from '@/components/admin/ArticleEditor';

interface EditArticlePageProps {
  params: Promise<{ id: string }>;
}

export default async function EditArticlePage({ params }: EditArticlePageProps) {
  await requireAdmin();

  const { id } = await params;

  const [article, categories] = await Promise.all([
    getAdminArticleById(id),
    getAdminCategories(),
  ]);

  if (!article) notFound();

  return <ArticleEditor article={article} categories={categories} />;
}
