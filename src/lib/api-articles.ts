import { createPublicClient } from './supabase/server';
import { Article, Category, CommentPublic } from './types';

/**
 * Couche de lecture publique.
 *
 * AUCUNE DONNÉE DE REPLI. Supabase fait autorité, y compris lorsqu'il répond
 * vide, et l'absence de configuration ne produit jamais de contenu inventé.
 *
 * Cette règle a été durcie lors de l'audit du 5 août 2026, le site étant
 * désormais en ligne. Le module `supabase/mock-data.ts` fournissait auparavant
 * trois articles de démonstration dès que les variables d'environnement
 * manquaient : une variable oubliée sur Vercel aurait suffi à publier, sans la
 * moindre erreur visible, un contenu obsolète (« Claude 3.5 », « GPT-4o ») et
 * un chiffre non sourcé — soit exactement ce que la ligne éditoriale interdit.
 * Un site vide se remarque et se corrige ; un site faussement plein, non.
 */

/** Estimation du temps de lecture : environ 1000 caractères par minute. */
function readingTime(content: string | null | undefined): number {
  return Math.max(2, Math.ceil((content?.length ?? 0) / 1000));
}

/** Neutralise les caractères ayant une signification dans un filtre PostgREST. */
function escapeFilterValue(value: string): string {
  return value.replace(/[%,()\\]/g, ' ').trim();
}

export async function getCategories(): Promise<Category[]> {
  try {
    const supabase = createPublicClient();
    if (!supabase) return [];

    const { data, error } = await supabase.from('categories').select('*').order('name');

    if (error) {
      console.error('[categories] échec de la requête :', error.message);
      return [];
    }

    return (data ?? []) as Category[];
  } catch (err) {
    console.error('[categories] exception :', err);
    return [];
  }
}

export async function getCategoryBySlug(slug: string): Promise<Category | null> {
  const categories = await getCategories();
  return categories.find((c) => c.slug === slug) ?? null;
}

export interface GetArticlesOptions {
  query?: string;
  categorySlug?: string;
  page?: number;
  limit?: number;
  status?: 'published' | 'draft' | 'all';
}

export interface GetArticlesResult {
  articles: Article[];
  total: number;
  page: number;
  totalPages: number;
}

export async function getArticles(
  options: GetArticlesOptions = {}
): Promise<GetArticlesResult> {
  const page = options.page && options.page > 0 ? options.page : 1;
  const limit = options.limit && options.limit > 0 ? options.limit : 6;
  const queryStr = options.query?.trim().toLowerCase();
  const categorySlug = options.categorySlug?.trim();
  const statusFilter = options.status ?? 'published';

  try {
    const supabase = createPublicClient();
    if (!supabase) {
      return { articles: [], total: 0, page, totalPages: 1 };
    }

    let req = supabase
      .from('articles')
      .select('*, category:categories(*), author:profiles(*)', { count: 'exact' });

    if (statusFilter !== 'all') {
      req = req.eq('status', statusFilter);
    }

    if (categorySlug) {
      const { data: cat } = await supabase
        .from('categories')
        .select('id')
        .eq('slug', categorySlug)
        .maybeSingle();

      // Catégorie inexistante : le résultat correct est « aucun article », et
      // surtout pas la liste complète non filtrée.
      if (!cat) {
        return { articles: [], total: 0, page, totalPages: 1 };
      }
      req = req.eq('category_id', cat.id);
    }

    if (queryStr) {
      const safe = escapeFilterValue(queryStr);
      if (safe) {
        req = req.or(`title.ilike.%${safe}%,excerpt.ilike.%${safe}%`);
      }
    }

    const from = (page - 1) * limit;
    const { data, count, error } = await req
      .order('published_at', { ascending: false })
      .range(from, from + limit - 1);

    if (error) {
      console.error('[articles] échec de la requête :', error.message);
      return { articles: [], total: 0, page, totalPages: 1 };
    }

    const articles = (data ?? []).map((item) => ({
      ...item,
      reading_time_minutes: readingTime(item.content),
    })) as Article[];

    const total = count ?? articles.length;

    return {
      articles,
      total,
      page,
      totalPages: Math.max(1, Math.ceil(total / limit)),
    };
  } catch (err) {
    console.error('[articles] exception :', err);
    return { articles: [], total: 0, page, totalPages: 1 };
  }
}

/**
 * Recherche stricte d'un article par slug.
 * Slug inexistant → null → notFound(). Aucune correspondance approximative et
 * aucun repli sur les données de démonstration quand Supabase est actif.
 */
export async function getArticleBySlug(slug: string): Promise<Article | null> {
  if (!slug) return null;

  try {
    const supabase = createPublicClient();
    if (!supabase) return null;

    // maybeSingle() plutôt que single() : « aucune ligne » est un cas nominal
    // (404), pas une erreur à consigner.
    const { data, error } = await supabase
      .from('articles')
      .select('*, category:categories(*), author:profiles(*)')
      .eq('slug', slug)
      .maybeSingle();

    if (error) {
      console.error('[article] échec de la requête :', error.message);
      return null;
    }

    if (!data) return null;

    return {
      ...data,
      reading_time_minutes: readingTime(data.content),
    } as Article;
  } catch (err) {
    console.error('[article] exception :', err);
    return null;
  }
}

/**
 * Commentaires publics d'un article.
 * Lit exclusivement la vue `comments_public`, qui n'expose jamais author_email
 * et ne retourne que les commentaires validés par la modération.
 */
export async function getCommentsByArticle(articleId: string): Promise<CommentPublic[]> {
  try {
    const supabase = createPublicClient();
    if (!supabase) return [];

    const { data, error } = await supabase
      .from('comments_public')
      .select('*')
      .eq('article_id', articleId)
      .order('created_at', { ascending: true });

    if (error) {
      console.error('[commentaires] échec de la requête :', error.message);
      return [];
    }

    return (data ?? []) as CommentPublic[];
  } catch (err) {
    console.error('[commentaires] exception :', err);
    return [];
  }
}
