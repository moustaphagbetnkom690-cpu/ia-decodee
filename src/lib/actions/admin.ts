'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { requireAdmin } from '@/lib/auth';
import { slugify } from '@/lib/utils';
import { SITE_PATHS } from '@/lib/site-links';

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

  if (title.length < 3) return fail('Le titre doit contenir au moins 3 caractères.');
  if (excerpt.length < 10) return fail('L’extrait doit contenir au moins 10 caractères.');
  if (content.length < 50) return fail('Le contenu doit contenir au moins 50 caractères.');

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
  };

  if (id) {
    const { error } = await supabase.from('articles').update(payload).eq('id', id);
    if (error) return fail(`Échec de la mise à jour : ${error.message}`);

    revalidateArticleSurfaces(slug);
    return { ok: true, message: 'Article mis à jour.', articleId: id };
  }

  const { data, error } = await supabase
    .from('articles')
    .insert({
      ...payload,
      author_id: session.userId,
      published_at: new Date().toISOString(),
    })
    .select('id')
    .single();

  if (error) return fail(`Échec de la création : ${error.message}`);

  revalidateArticleSurfaces(slug);
  return { ok: true, message: 'Article créé.', articleId: data.id };
}

export async function deleteArticle(formData: FormData): Promise<void> {
  await requireAdmin();

  const id = formData.get('id') as string;
  if (!id) return;

  const supabase = await createClient();
  if (!supabase) return;

  await supabase.from('articles').delete().eq('id', id);
  revalidateArticleSurfaces();
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

  const next = current === 'published' ? 'draft' : 'published';
  await supabase.from('articles').update({ status: next }).eq('id', id);

  revalidateArticleSurfaces();
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

  await supabase.from('comments').update({ status }).eq('id', id);

  revalidatePath('/admin/commentaires');
  revalidatePath('/admin');
  // Le commentaire apparaît ou disparaît de l'article public selon la décision.
  revalidatePath('/blog', 'layout');
}

export async function deleteComment(formData: FormData): Promise<void> {
  await requireAdmin();

  const id = formData.get('id') as string;
  if (!id) return;

  const supabase = await createClient();
  if (!supabase) return;

  await supabase.from('comments').delete().eq('id', id);

  revalidatePath('/admin/commentaires');
  revalidatePath('/blog', 'layout');
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
