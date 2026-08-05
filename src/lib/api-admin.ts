import { createClient } from './supabase/server';
import { requireAdmin } from './auth';
import type { Article, Category, Comment } from './types';

/**
 * Lectures réservées au back-office.
 *
 * Chaque fonction appelle requireAdmin() : même si le proxy filtre déjà les
 * requêtes vers /admin, ces fonctions restent utilisables depuis d'autres
 * contextes. On ne suppose jamais que l'appelant a déjà vérifié les droits.
 */

export interface AdminStats {
  totalArticles: number;
  publishedArticles: number;
  draftArticles: number;
  totalViews: number;
  pendingComments: number;
  totalComments: number;
  subscribers: number;
  viewsLast30Days: number;
}

export interface CountryStat {
  country_code: string;
  country_name: string;
  total: number;
}

export interface DayStat {
  day: string;
  total: number;
}

export interface NewsletterSubscriber {
  id: string;
  email: string;
  country_code: string | null;
  source: string | null;
  created_at: string;
}

/**
 * Détecte si le schéma v2 a bien été appliqué.
 *
 * Sans cette vérification, un back-office branché sur une base restée en v1
 * affiche des zéros partout sans la moindre explication : les compteurs
 * échouent silencieusement et l'audience reste vide. On sonde une table
 * introduite par la v2 ; son absence signifie que `supabase_schema.sql` n'a pas
 * encore été exécuté.
 */
export async function isSchemaUpToDate(): Promise<boolean> {
  const supabase = await createClient();
  if (!supabase) return true; // Mode démo : rien à signaler.

  const { error } = await supabase
    .from('newsletter_subscribers')
    .select('id', { count: 'exact', head: true });

  // 42P01 = undefined_table côté Postgres, PGRST205 = table absente du cache
  // de schéma PostgREST.
  if (error && (error.code === '42P01' || error.code === 'PGRST205')) {
    return false;
  }

  return true;
}

/** Compte les lignes d'une table sans en rapatrier le contenu. */
async function countRows(
  supabase: NonNullable<Awaited<ReturnType<typeof createClient>>>,
  table: string,
  filter?: { column: string; value: string }
): Promise<number> {
  let req = supabase.from(table).select('*', { count: 'exact', head: true });
  if (filter) req = req.eq(filter.column, filter.value);
  const { count, error } = await req;
  if (error) return 0;
  return count ?? 0;
}

export async function getAdminStats(): Promise<AdminStats> {
  await requireAdmin();

  const empty: AdminStats = {
    totalArticles: 0,
    publishedArticles: 0,
    draftArticles: 0,
    totalViews: 0,
    pendingComments: 0,
    totalComments: 0,
    subscribers: 0,
    viewsLast30Days: 0,
  };

  const supabase = await createClient();
  if (!supabase) return empty;

  const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();

  const [
    totalArticles,
    publishedArticles,
    draftArticles,
    pendingComments,
    totalComments,
    subscribers,
    viewsRes,
    recentViewsRes,
  ] = await Promise.all([
    countRows(supabase, 'articles'),
    countRows(supabase, 'articles', { column: 'status', value: 'published' }),
    countRows(supabase, 'articles', { column: 'status', value: 'draft' }),
    countRows(supabase, 'comments', { column: 'status', value: 'pending' }),
    countRows(supabase, 'comments'),
    countRows(supabase, 'newsletter_subscribers'),
    supabase.from('articles').select('views'),
    supabase
      .from('page_views')
      .select('*', { count: 'exact', head: true })
      .gte('created_at', since),
  ]);

  const totalViews = (viewsRes.data ?? []).reduce(
    (sum: number, row: { views: number | null }) => sum + (row.views ?? 0),
    0
  );

  return {
    totalArticles,
    publishedArticles,
    draftArticles,
    totalViews,
    pendingComments,
    totalComments,
    subscribers,
    viewsLast30Days: recentViewsRes.count ?? 0,
  };
}

/** Tous les articles, brouillons compris, pour le tableau de gestion. */
export async function getAdminArticles(): Promise<Article[]> {
  await requireAdmin();

  const supabase = await createClient();
  if (!supabase) return [];

  const { data, error } = await supabase
    .from('articles')
    .select('*, category:categories(*), author:profiles(*)')
    .order('updated_at', { ascending: false });

  if (error) {
    console.error('[admin/articles] :', error.message);
    return [];
  }

  return (data ?? []) as Article[];
}

export async function getAdminArticleById(id: string): Promise<Article | null> {
  await requireAdmin();

  const supabase = await createClient();
  if (!supabase) return null;

  const { data, error } = await supabase
    .from('articles')
    .select('*, category:categories(*)')
    .eq('id', id)
    .maybeSingle();

  if (error) {
    console.error('[admin/article] :', error.message);
    return null;
  }

  return (data as Article) ?? null;
}

export async function getAdminCategories(): Promise<Category[]> {
  await requireAdmin();

  const supabase = await createClient();
  if (!supabase) return [];

  const { data, error } = await supabase.from('categories').select('*').order('name');
  if (error) {
    console.error('[admin/categories] :', error.message);
    return [];
  }

  return (data ?? []) as Category[];
}

/**
 * Commentaires bruts, e-mails inclus, pour la modération.
 * L'accès est doublement verrouillé : requireAdmin() côté application, et la
 * policy `comments_select_admin` côté base — un jeton non-admin ne remonterait
 * aucune ligne, même si cette fonction était appelée par erreur.
 */
export async function getAdminComments(
  status?: 'pending' | 'approved' | 'spam'
): Promise<(Comment & { article?: { title: string; slug: string } | null })[]> {
  await requireAdmin();

  const supabase = await createClient();
  if (!supabase) return [];

  let req = supabase
    .from('comments')
    .select('*, article:articles(title, slug)')
    .order('created_at', { ascending: false });

  if (status) req = req.eq('status', status);

  const { data, error } = await req;
  if (error) {
    console.error('[admin/comments] :', error.message);
    return [];
  }

  return (data ?? []) as (Comment & { article?: { title: string; slug: string } | null })[];
}

export async function getNewsletterSubscribers(): Promise<NewsletterSubscriber[]> {
  await requireAdmin();

  const supabase = await createClient();
  if (!supabase) return [];

  const { data, error } = await supabase
    .from('newsletter_subscribers')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(500);

  if (error) {
    console.error('[admin/newsletter] :', error.message);
    return [];
  }

  return (data ?? []) as NewsletterSubscriber[];
}

/** Répartition géographique de l'audience (RPC agrégée côté base). */
export async function getViewsByCountry(days = 30): Promise<CountryStat[]> {
  await requireAdmin();

  const supabase = await createClient();
  if (!supabase) return [];

  const { data, error } = await supabase.rpc('analytics_views_by_country', {
    p_days: days,
  });

  if (error) {
    console.error('[analytics/pays] :', error.message);
    return [];
  }

  return (data ?? []) as CountryStat[];
}

/** Courbe des vues par jour. */
export async function getViewsByDay(days = 14): Promise<DayStat[]> {
  await requireAdmin();

  const supabase = await createClient();
  if (!supabase) return [];

  const { data, error } = await supabase.rpc('analytics_views_by_day', {
    p_days: days,
  });

  if (error) {
    console.error('[analytics/jours] :', error.message);
    return [];
  }

  return (data ?? []) as DayStat[];
}

/** Articles les plus consultés, pour le classement du tableau de bord. */
export async function getTopArticles(limit = 8): Promise<Article[]> {
  await requireAdmin();

  const supabase = await createClient();
  if (!supabase) return [];

  const { data, error } = await supabase
    .from('articles')
    .select('*, category:categories(*)')
    .eq('status', 'published')
    .order('views', { ascending: false })
    .limit(limit);

  if (error) {
    console.error('[admin/top-articles] :', error.message);
    return [];
  }

  return (data ?? []) as Article[];
}
