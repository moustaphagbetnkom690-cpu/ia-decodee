'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { requireAdmin } from '@/lib/auth';
import { slugify, siteLocalToISO, formatDateHeure } from '@/lib/utils';
import { SITE_PATHS } from '@/lib/site-links';
import { siteConfig } from '@/lib/site-config';

/**
 * Écritures du back-office.
 *
 * Chaque action commence par requireAdmin(). Ce n'est pas redondant avec le
 * proxy : une server action est un point d'entrée HTTP à part entière, que
 * n'importe qui peut appeler directement s'il en connaît l'identifiant. La
 * protection d'une page ne protège pas les actions qu'elle référence.
 *
 * Les policies RLS constituent la troisième et dernière ligne de défense :
 * même si ces contrôles applicatifs étaient contournés, la base refuserait
 * l'écriture à un jeton dépourvu du rôle admin.
 */

export interface ActionResult {
  ok: boolean;
  message?: string;
  articleId?: string;
}

const MAX_IMAGE_BYTES = 5 * 1024 * 1024; // 5 Mo
const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/avif', 'image/gif'];

/**
 * Vérifie qu'un fichier est bien une image, d'après ses premiers octets.
 *
 * `file.type` est une simple déclaration du navigateur : elle se falsifie en
 * une ligne. Un fichier HTML annoncé comme `image/png` finissait donc dans un
 * bucket public et était servi depuis le domaine Supabase — de quoi héberger
 * une page de hameçonnage sous une adresse d'apparence légitime.
 *
 * Les signatures (« magic bytes ») sont, elles, dans le contenu du fichier.
 */
async function looksLikeImage(file: File): Promise<boolean> {
  const header = new Uint8Array(await file.slice(0, 16).arrayBuffer());
  const startsWith = (...bytes: number[]) => bytes.every((b, i) => header[i] === b);
  const ascii = (offset: number, text: string) =>
    [...text].every((c, i) => header[offset + i] === c.charCodeAt(0));

  return (
    startsWith(0xff, 0xd8, 0xff) ||                          // JPEG
    startsWith(0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a) || // PNG
    startsWith(0x47, 0x49, 0x46, 0x38) ||                    // GIF87a / GIF89a
    (ascii(0, 'RIFF') && ascii(8, 'WEBP')) ||                // WebP
    ascii(4, 'ftyp')                                         // AVIF (conteneur ISO-BMFF)
  );
}

function fail(message: string): ActionResult {
  return { ok: false, message };
}

/** Rafraîchit toutes les surfaces impactées par une modification d'article. */
function revalidateArticleSurfaces(slug?: string) {
  revalidatePath('/');
  revalidatePath('/blog');
  revalidatePath('/admin');
  revalidatePath('/admin/articles');
  revalidatePath('/sitemap.xml');
  if (slug) revalidatePath(`/blog/${slug}`);
}

/**
 * Signale un article aux moteurs qui acceptent IndexNow (Bing, Yandex, Naver,
 * Seznam). Sans effet sur Google, qui n'a pas adopté le protocole — voir
 * `src/lib/indexnow.ts`.
 *
 * Volontairement silencieux et sans `await` bloquant l'issue de l'action : le
 * signalement est un bonus, son échec ne doit jamais empêcher un article d'être
 * enregistré. Un article programmé n'est pas signalé, sa page n'existant pas
 * encore publiquement.
 */
async function signalerAuxMoteurs(slug: string, publie: boolean, publishedAt: string) {
  if (!publie || new Date(publishedAt).getTime() > Date.now()) return;

  const { notifierIndexNow } = await import('@/lib/indexnow');
  const resultat = await notifierIndexNow([
    `${siteConfig.url}/blog/${slug}`,
    `${siteConfig.url}/blog`,
    siteConfig.url,
  ]);

  if (!resultat.ok) {
    console.warn('[indexnow] signalement refusé :', resultat.statut, resultat.message);
  }
}

/**
 * Purge le cache de la page publique d'un article, à partir de son identifiant.
 *
 * `revalidatePath('/blog', 'layout')` ne suffisait PAS, et c'est la cause du
 * bug « j'approuve un commentaire, il n'apparaît pas sur l'article ».
 *
 * La forme 'layout' invalide bien le layout visé ET toutes les pages en
 * dessous — à condition qu'un `layout.tsx` existe à ce segment. Or il n'y en a
 * pas sous `blog/` : le seul layout du site public est celui du groupe
 * `(public)`, qui répond au chemin `/`. L'appel désignait donc un segment sans
 * fichier de layout, et les pages d'articles déjà générées restaient servies
 * telles quelles, commentaire approuvé ou non.
 *
 * La documentation est explicite : « Use a literal path when you want to
 * refresh a single page. » D'où la lecture du slug avant de revalider.
 */
async function revalidateArticlePage(
  supabase: NonNullable<Awaited<ReturnType<typeof createClient>>>,
  articleId: string | null | undefined
): Promise<void> {
  if (!articleId) return;

  const { data } = await supabase
    .from('articles')
    .select('slug')
    .eq('id', articleId)
    .maybeSingle();

  if (data?.slug) revalidatePath(`/blog/${data.slug}`);
}

/* -------------------------------------------------------------------------- */
/* ARTICLES                                                                    */
/* -------------------------------------------------------------------------- */

export async function saveArticle(
  _prev: ActionResult | null,
  formData: FormData
): Promise<ActionResult> {
  const session = await requireAdmin();

  const supabase = await createClient();
  if (!supabase) return fail('Supabase n’est pas configuré.');

  const id = (formData.get('id') as string) || null;
  const title = ((formData.get('title') as string) ?? '').trim();
  const excerpt = ((formData.get('excerpt') as string) ?? '').trim();
  const content = ((formData.get('content') as string) ?? '').trim();
  const rawSlug = ((formData.get('slug') as string) ?? '').trim();
  const categoryId = ((formData.get('category_id') as string) ?? '').trim() || null;
  const featuredImage = ((formData.get('featured_image') as string) ?? '').trim() || null;
  const status = (formData.get('status') as string) === 'draft' ? 'draft' : 'published';
  const rawPublishedAt = ((formData.get('published_at') as string) ?? '').trim();

  if (title.length < 3) return fail('Le titre doit contenir au moins 3 caractères.');
  if (excerpt.length < 10) return fail('L’extrait doit contenir au moins 10 caractères.');
  if (content.length < 50) return fail('Le contenu doit contenir au moins 50 caractères.');

  /* Le champ arrive au format d'un `<input type="datetime-local">`, c'est-à-dire
     sans fuseau : « 2026-08-10T14:30 ». Il est interprété en heure de Paris —
     et surtout PAS avec `new Date(...)`, qui l'interpréterait dans le fuseau de
     la machine, soit UTC sur Vercel : chaque enregistrement aurait décalé
     l'heure de publication de deux heures. */
  const publishedAt = rawPublishedAt ? siteLocalToISO(rawPublishedAt) : new Date().toISOString();
  if (!publishedAt) {
    return fail('Date de publication invalide.');
  }

  const slug = slugify(rawSlug || title);
  if (!slug) return fail('Impossible de générer un slug à partir de ce titre.');

  // Le slug étant UNIQUE en base, on vérifie en amont pour rendre un message
  // clair plutôt que de laisser remonter une erreur de contrainte Postgres.
  const { data: conflicting } = await supabase
    .from('articles')
    .select('id')
    .eq('slug', slug)
    .maybeSingle();

  if (conflicting && conflicting.id !== id) {
    return fail(`Le slug « ${slug} » est déjà utilisé par un autre article.`);
  }

  const payload = {
    title,
    slug,
    excerpt,
    content,
    featured_image: featuredImage,
    category_id: categoryId,
    status,
    published_at: publishedAt,
  };

  const programme = status === 'published' && new Date(publishedAt).getTime() > Date.now();
  const confirmation = (verbe: string) =>
    programme
      ? `Article ${verbe} et programmé pour le ${formatDateHeure(publishedAt)}.`
      : `Article ${verbe}.`;

  if (id) {
    /* Le slug précédent doit être revalidé lui aussi : s'il a changé, l'ancienne
       URL resterait servie depuis le cache avec l'ancien contenu. */
    const { data: avant } = await supabase
      .from('articles')
      .select('slug')
      .eq('id', id)
      .maybeSingle();

    const { error } = await supabase.from('articles').update(payload).eq('id', id);
    if (error) return fail(`Échec de la mise à jour : ${error.message}`);

    revalidateArticleSurfaces(slug);
    if (avant?.slug && avant.slug !== slug) revalidateArticleSurfaces(avant.slug);
    await signalerAuxMoteurs(slug, status === 'published', publishedAt);

    return { ok: true, message: confirmation('mis à jour'), articleId: id };
  }

  const { data, error } = await supabase
    .from('articles')
    .insert({ ...payload, author_id: session.userId })
    .select('id')
    .single();

  if (error) return fail(`Échec de la création : ${error.message}`);

  revalidateArticleSurfaces(slug);
  await signalerAuxMoteurs(slug, status === 'published', publishedAt);

  return { ok: true, message: confirmation('créé'), articleId: data.id };
}

export async function deleteArticle(formData: FormData): Promise<void> {
  await requireAdmin();

  const id = formData.get('id') as string;
  if (!id) return;

  const supabase = await createClient();
  if (!supabase) return;

  const { data: article } = await supabase
    .from('articles')
    .select('slug')
    .eq('id', id)
    .maybeSingle();

  await supabase.from('articles').delete().eq('id', id);
  revalidateArticleSurfaces(article?.slug);
  redirect(SITE_PATHS.adminArticles);
}

/** Bascule publication / brouillon depuis la liste, sans ouvrir l'éditeur. */
export async function toggleArticleStatus(formData: FormData): Promise<void> {
  await requireAdmin();

  const id = formData.get('id') as string;
  const current = formData.get('status') as string;
  if (!id) return;

  const supabase = await createClient();
  if (!supabase) return;

  const { data: article } = await supabase
    .from('articles')
    .select('slug')
    .eq('id', id)
    .maybeSingle();

  const next = current === 'published' ? 'draft' : 'published';
  await supabase.from('articles').update({ status: next }).eq('id', id);

  // La page de l'article doit être revalidée nommément : elle passe de « 200 »
  // à « introuvable » (ou l'inverse), et le cache ne s'en aperçoit pas seul.
  revalidateArticleSurfaces(article?.slug);
}

/* -------------------------------------------------------------------------- */
/* IMAGES                                                                      */
/* -------------------------------------------------------------------------- */

export async function uploadImage(
  _prev: ActionResult & { url?: string } | null,
  formData: FormData
): Promise<ActionResult & { url?: string }> {
  await requireAdmin();

  const file = formData.get('file') as File | null;
  if (!file || file.size === 0) return fail('Aucun fichier sélectionné.');

  // Le type et la taille sont revalidés ici : les attributs `accept` et les
  // contrôles JavaScript du formulaire ne sont que du confort d'usage, ils
  // n'empêchent pas un envoi direct vers l'action.
  if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
    return fail('Format non supporté. Utilisez JPEG, PNG, WebP, AVIF ou GIF.');
  }
  if (file.size > MAX_IMAGE_BYTES) {
    return fail('Image trop lourde (5 Mo maximum).');
  }
  if (!(await looksLikeImage(file))) {
    return fail('Ce fichier n’est pas une image valide.');
  }

  const supabase = await createClient();
  if (!supabase) return fail('Supabase n’est pas configuré.');

  const extension = file.name.split('.').pop()?.toLowerCase() ?? 'jpg';
  const safeExtension = /^[a-z0-9]{2,5}$/.test(extension) ? extension : 'jpg';
  const path = `articles/${Date.now()}-${crypto.randomUUID()}.${safeExtension}`;

  const { error } = await supabase.storage.from('images').upload(path, file, {
    contentType: file.type,
    upsert: false,
  });

  if (error) return fail(`Échec de l’envoi : ${error.message}`);

  const {
    data: { publicUrl },
  } = supabase.storage.from('images').getPublicUrl(path);

  return { ok: true, message: 'Image envoyée.', url: publicUrl };
}

/* -------------------------------------------------------------------------- */
/* CATÉGORIES                                                                  */
/* -------------------------------------------------------------------------- */

export async function saveCategory(
  _prev: ActionResult | null,
  formData: FormData
): Promise<ActionResult> {
  await requireAdmin();

  const supabase = await createClient();
  if (!supabase) return fail('Supabase n’est pas configuré.');

  const id = (formData.get('id') as string) || null;
  const name = ((formData.get('name') as string) ?? '').trim();
  const description = ((formData.get('description') as string) ?? '').trim() || null;
  const color = ((formData.get('color') as string) ?? '#7C5CFF').trim();
  const rawSlug = ((formData.get('slug') as string) ?? '').trim();

  if (name.length < 2) return fail('Le nom doit contenir au moins 2 caractères.');
  if (!/^#[0-9A-Fa-f]{6}$/.test(color)) return fail('Couleur invalide (format attendu : #7C5CFF).');

  const slug = slugify(rawSlug || name);
  if (!slug) return fail('Impossible de générer un slug pour cette catégorie.');

  const payload = { name, slug, description, color };

  const { error } = id
    ? await supabase.from('categories').update(payload).eq('id', id)
    : await supabase.from('categories').insert(payload);

  if (error) return fail(`Échec de l’enregistrement : ${error.message}`);

  revalidatePath('/admin/categories');
  revalidatePath('/');
  revalidatePath(`/categories/${slug}`);

  return { ok: true, message: id ? 'Catégorie mise à jour.' : 'Catégorie créée.' };
}

export async function deleteCategory(formData: FormData): Promise<void> {
  await requireAdmin();

  const id = formData.get('id') as string;
  if (!id) return;

  const supabase = await createClient();
  if (!supabase) return;

  // Les articles liés ne sont pas supprimés : la contrainte ON DELETE SET NULL
  // se contente de les détacher de la catégorie.
  await supabase.from('categories').delete().eq('id', id);

  revalidatePath('/admin/categories');
  revalidatePath('/');
}

/* -------------------------------------------------------------------------- */
/* MODÉRATION DES COMMENTAIRES                                                 */
/* -------------------------------------------------------------------------- */

export async function moderateComment(formData: FormData): Promise<void> {
  await requireAdmin();

  const id = formData.get('id') as string;
  const status = formData.get('status') as string;

  if (!id || !['pending', 'approved', 'spam'].includes(status)) return;

  const supabase = await createClient();
  if (!supabase) return;

  // L'article est relu AVANT la mise à jour : c'est lui dont la page devra être
  // régénérée, que le commentaire y apparaisse ou en disparaisse.
  const { data: comment } = await supabase
    .from('comments')
    .select('article_id')
    .eq('id', id)
    .maybeSingle();

  await supabase.from('comments').update({ status }).eq('id', id);

  revalidatePath('/admin/commentaires');
  revalidatePath('/admin');
  await revalidateArticlePage(supabase, comment?.article_id);
}

export async function deleteComment(formData: FormData): Promise<void> {
  await requireAdmin();

  const id = formData.get('id') as string;
  if (!id) return;

  const supabase = await createClient();
  if (!supabase) return;

  // Même raison que dans moderateComment : après DELETE, l'article associé
  // n'est plus lisible depuis le commentaire.
  const { data: comment } = await supabase
    .from('comments')
    .select('article_id')
    .eq('id', id)
    .maybeSingle();

  await supabase.from('comments').delete().eq('id', id);

  revalidatePath('/admin/commentaires');
  revalidatePath('/admin');
  await revalidateArticlePage(supabase, comment?.article_id);
}

/* -------------------------------------------------------------------------- */
/* NEWSLETTER                                                                  */
/* -------------------------------------------------------------------------- */

export async function deleteSubscriber(formData: FormData): Promise<void> {
  await requireAdmin();

  const id = formData.get('id') as string;
  if (!id) return;

  const supabase = await createClient();
  if (!supabase) return;

  await supabase.from('newsletter_subscribers').delete().eq('id', id);
  revalidatePath('/admin/newsletter');
}

/* -------------------------------------------------------------------------- */
/* SESSION                                                                     */
/* -------------------------------------------------------------------------- */

export async function signOut(): Promise<void> {
  const supabase = await createClient();
  if (supabase) {
    await supabase.auth.signOut();
  }
  redirect(SITE_PATHS.home);
}
