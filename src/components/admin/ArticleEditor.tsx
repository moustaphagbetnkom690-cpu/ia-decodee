'use client';

import {
  useActionState,
  useEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
} from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import {
  Save,
  Eye,
  PenLine,
  Upload,
  Trash2,
  Link2,
  AlertCircle,
  CheckCircle2,
  Loader2,
  ImageIcon,
  CalendarClock,
  Clock3,
} from 'lucide-react';
import { saveArticle, deleteArticle, uploadImage, type ActionResult } from '@/lib/actions/admin';
import { slugify, cn, isoToSiteLocal, formatDateHeure, siteLocalToISO } from '@/lib/utils';
import { SITE_PATHS } from '@/lib/site-links';
import type { Article, Category } from '@/lib/types';

/**
 * Horloge, exposée à React comme la source externe qu'elle est.
 *
 * L'heure courante ne peut pas être lue pendant le rendu : elle donnerait une
 * valeur au rendu serveur et une autre à l'hydratation. `useSyncExternalStore`
 * règle les deux problèmes d'un coup — l'instantané serveur vaut `null`, et
 * l'abonnement fait disparaître de lui-même l'encart « programmé » lorsque
 * l'heure de parution finit par arriver, sans toucher au formulaire.
 */
const PAS_HORLOGE = 30_000;

function souscrireHorloge(onChange: () => void): () => void {
  const id = setInterval(onChange, PAS_HORLOGE);
  return () => clearInterval(id);
}

/* Arrondi au pas : l'instantané doit être identique d'un appel à l'autre tant
   que rien n'a changé, sans quoi React boucle indéfiniment. */
function instantaneHorloge(): number {
  return Math.floor(Date.now() / PAS_HORLOGE) * PAS_HORLOGE;
}

function instantaneServeur(): null {
  return null;
}

interface ArticleEditorProps {
  article?: Article | null;
  categories: Category[];
  /** Instant ISO proposé par défaut à la création. Calculé côté serveur. */
  defaultPublishedAt?: string;
}

export function ArticleEditor({ article, categories, defaultPublishedAt }: ArticleEditorProps) {
  const router = useRouter();
  const isEditing = Boolean(article);

  const [title, setTitle] = useState(article?.title ?? '');

  /* Le slug est une valeur DÉRIVÉE du titre tant que l'utilisateur ne l'a pas
     saisi lui-même. On le calcule pendant le rendu plutôt que de le
     synchroniser dans un useEffect : un effet provoquerait un second rendu à
     chaque frappe, et React signale à juste titre ce motif comme une cascade
     de rendus évitable. `null` signifie « suit le titre », toute autre valeur
     signifie « choisi manuellement ». */
  const [slugOverride, setSlugOverride] = useState<string | null>(article?.slug ?? null);
  const slug = slugOverride ?? slugify(title);
  const [excerpt, setExcerpt] = useState(article?.excerpt ?? '');
  const [content, setContent] = useState(article?.content ?? '');
  const [categoryId, setCategoryId] = useState(article?.category_id ?? categories[0]?.id ?? '');
  const [status, setStatus] = useState(article?.status ?? 'draft');
  const [featuredImage, setFeaturedImage] = useState(article?.featured_image ?? '');

  /* Date et heure de publication, au format d'un `<input type="datetime-local">`
     et exprimées en heure de Paris — le fuseau de référence du site, imposé
     pour que la valeur saisie soit celle affichée en ligne, où que se trouve le
     rédacteur. Un nouvel article est proposé « maintenant ». */
  const [publishedAt, setPublishedAt] = useState(() =>
    isoToSiteLocal(article?.published_at ?? defaultPublishedAt)
  );

  /* Instant de référence, `null` tant que la page n'est pas hydratée. */
  const maintenant = useSyncExternalStore(
    souscrireHorloge,
    instantaneHorloge,
    instantaneServeur
  );

  /* « Programmé » se déduit de la saisie, pas d'un statut supplémentaire en
     base : un article publié dont l'heure est à venir est, par définition, un
     article programmé. Le calcul repasse par siteLocalToISO pour interpréter la
     saisie dans le fuseau du site plutôt que dans celui du navigateur. */
  const publishedAtISO = publishedAt ? siteLocalToISO(publishedAt) : null;
  const parutionProgrammee =
    publishedAtISO &&
    maintenant !== null &&
    status === 'published' &&
    new Date(publishedAtISO).getTime() > maintenant
      ? formatDateHeure(publishedAtISO)
      : null;

  const [showPreview, setShowPreview] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [state, formAction, isPending] = useActionState<ActionResult | null, FormData>(
    saveArticle,
    null
  );

  /* Après création, on bascule vers l'URL d'édition pour que les
     enregistrements suivants mettent à jour l'article au lieu d'en créer un
     nouveau à chaque clic. */
  useEffect(() => {
    if (state?.ok && !isEditing && state.articleId) {
      router.replace(SITE_PATHS.adminArticleEdit(state.articleId));
    }
  }, [state, isEditing, router]);

  const wordCount = useMemo(
    () => content.trim().split(/\s+/).filter(Boolean).length,
    [content]
  );
  const readingMinutes = Math.max(1, Math.round(wordCount / 200));

  const handleUpload = async (file: File) => {
    setUploadError('');
    setUploading(true);
    try {
      const data = new FormData();
      data.append('file', file);
      const result = await uploadImage(null, data);
      if (result.ok && result.url) {
        setFeaturedImage(result.url);
      } else {
        setUploadError(result.message ?? 'Envoi impossible.');
      }
    } catch {
      setUploadError('Envoi impossible.');
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-4 border-b border-line pb-6 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <span className="eyebrow mb-2">{isEditing ? 'Édition' : 'Rédaction'}</span>
          <h1 className="text-2xl font-bold text-ink">
            {isEditing ? 'Modifier l’article' : 'Nouvel article'}
          </h1>
          <p className="mt-1 font-mono text-xs text-faint">
            {wordCount} mots · ~{readingMinutes} min de lecture
          </p>
        </div>

        {isEditing && article && (
          <form action={deleteArticle}>
            <input type="hidden" name="id" value={article.id} />
            <button
              type="submit"
              className="btn btn-danger"
              /* Une suppression est irréversible : on demande confirmation
                 explicite avant d'envoyer la requête. */
              onClick={(event) => {
                if (!confirm(`Supprimer définitivement « ${article.title} » ?`)) {
                  event.preventDefault();
                }
              }}
            >
              <Trash2 className="h-4 w-4" />
              Supprimer
            </button>
          </form>
        )}
      </header>

      {state?.message && (
        <p
          role="status"
          className={cn(
            'flex items-center gap-2 rounded-xl border p-3 text-xs',
            state.ok
              ? 'border-lime/30 bg-lime/10 text-lime'
              : 'border-danger/30 bg-danger/10 text-danger'
          )}
        >
          {state.ok ? (
            <CheckCircle2 className="h-4 w-4 shrink-0" />
          ) : (
            <AlertCircle className="h-4 w-4 shrink-0" />
          )}
          {state.message}
        </p>
      )}

      <form action={formAction} className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* COLONNE PRINCIPALE */}
        <div className="space-y-5 lg:col-span-2">
          {article && <input type="hidden" name="id" value={article.id} />}

          <div className="surface-panel space-y-4 rounded-2xl p-5">
            <div>
              <label htmlFor="title" className="field-label">
                Titre de l’article
              </label>
              <input
                id="title"
                name="title"
                required
                minLength={3}
                value={title}
                onChange={(event) => setTitle(event.target.value)}
                placeholder="Comprendre les modèles de diffusion en 10 minutes"
                className="field text-base font-semibold"
              />
            </div>

            <div>
              <label htmlFor="slug" className="field-label">
                Slug de l’URL
              </label>
              <div className="relative">
                <input
                  id="slug"
                  name="slug"
                  value={slug}
                  onChange={(event) => setSlugOverride(event.target.value)}
                  placeholder="genere-automatiquement-depuis-le-titre"
                  className="field pl-9 font-mono text-xs"
                />
                <Link2 className="pointer-events-none absolute left-3 top-3 h-4 w-4 text-faint" />
              </div>
              <p className="mt-1.5 font-mono text-[11px] text-faint">
                /blog/{slug || '…'}
                {isEditing && (
                  <span className="ml-2 text-warning">
                    Modifier le slug change l’URL publique de l’article.
                  </span>
                )}
              </p>
            </div>

            <div>
              <label htmlFor="excerpt" className="field-label">
                Extrait — résumé affiché dans les listes et les résultats Google
              </label>
              <textarea
                id="excerpt"
                name="excerpt"
                required
                minLength={10}
                rows={2}
                value={excerpt}
                onChange={(event) => setExcerpt(event.target.value)}
                className="field resize-y"
              />
              <p className="mt-1.5 font-mono text-[11px] text-faint">
                {excerpt.length} caractères
                {excerpt.length > 160 && (
                  <span className="ml-2 text-warning">
                    Au-delà de 160, Google tronquera le texte.
                  </span>
                )}
              </p>
            </div>
          </div>

          {/* ÉDITEUR / APERÇU */}
          <div className="surface-panel rounded-2xl">
            <div className="flex items-center justify-between border-b border-line p-4">
              <span className="field-label mb-0">Contenu Markdown</span>
              <div className="flex gap-1 rounded-lg bg-base p-1">
                <button
                  type="button"
                  onClick={() => setShowPreview(false)}
                  className={cn(
                    'flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-colors',
                    !showPreview ? 'bg-accent text-ink' : 'text-muted hover:text-ink'
                  )}
                >
                  <PenLine className="h-3.5 w-3.5" />
                  Écrire
                </button>
                <button
                  type="button"
                  onClick={() => setShowPreview(true)}
                  className={cn(
                    'flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-colors',
                    showPreview ? 'bg-accent text-ink' : 'text-muted hover:text-ink'
                  )}
                >
                  <Eye className="h-3.5 w-3.5" />
                  Aperçu
                </button>
              </div>
            </div>

            {/* Le textarea reste monté même en mode aperçu (simplement masqué) :
                s'il était démonté, sa valeur ne serait pas envoyée avec le
                formulaire lors d'un enregistrement depuis l'aperçu. */}
            <div className={showPreview ? 'hidden' : 'block'}>
              <textarea
                id="content"
                name="content"
                required
                minLength={50}
                rows={22}
                value={content}
                onChange={(event) => setContent(event.target.value)}
                placeholder={'## Un titre de section\n\nVotre texte, en **Markdown**.\n\n- Un point\n- Un autre'}
                className="field resize-y rounded-t-none border-0 font-mono text-xs leading-relaxed"
              />
            </div>

            {showPreview && (
              <div className="prose-neural max-h-[600px] overflow-y-auto p-6">
                {content ? (
                  <ReactMarkdown remarkPlugins={[remarkGfm]}>{content}</ReactMarkdown>
                ) : (
                  <p className="text-sm text-faint">Rien à prévisualiser pour l’instant.</p>
                )}
              </div>
            )}
          </div>
        </div>

        {/* COLONNE LATÉRALE
            `lg:sticky lg:top-20` : le panneau d'enregistrement suit le
            défilement et reste sous la barre supérieure (h-14 + marge). Sans
            cela, sur un article long, le bouton « Enregistrer » disparaissait
            en haut de page et pouvait se retrouver masqué par l'en-tête
            collant, qui interceptait alors le clic. */}
        <aside className="space-y-5 lg:sticky lg:top-20 lg:self-start">
          <div className="surface-panel space-y-4 rounded-2xl p-5">
            <button type="submit" disabled={isPending} className="btn btn-primary w-full py-3">
              {isPending ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Enregistrement…
                </>
              ) : (
                <>
                  <Save className="h-4 w-4" />
                  {isEditing ? 'Enregistrer' : 'Créer l’article'}
                </>
              )}
            </button>

            <div>
              <label htmlFor="status" className="field-label">
                Statut
              </label>
              <select
                id="status"
                name="status"
                value={status}
                onChange={(event) => setStatus(event.target.value as 'draft' | 'published')}
                className="field"
              >
                <option value="draft">Brouillon — invisible du public</option>
                <option value="published">Publié — visible en ligne</option>
              </select>
            </div>

            <div>
              <label htmlFor="published_at" className="field-label">
                Date et heure de publication
              </label>
              <div className="relative">
                <input
                  id="published_at"
                  name="published_at"
                  type="datetime-local"
                  required
                  value={publishedAt}
                  onChange={(event) => setPublishedAt(event.target.value)}
                  className="field pl-9 font-mono text-xs"
                />
                <CalendarClock className="pointer-events-none absolute left-3 top-3 h-4 w-4 text-faint" />
              </div>

              {parutionProgrammee ? (
                <p className="mt-1.5 flex items-start gap-1.5 rounded-lg border border-warning/30 bg-warning/10 p-2 text-[11px] leading-relaxed text-warning">
                  <Clock3 className="mt-px h-3.5 w-3.5 shrink-0" />
                  <span>
                    Publication programmée. L’article reste invisible du public — et
                    absent du plan de site — jusqu’au{' '}
                    <strong className="font-semibold">{parutionProgrammee}</strong>, puis
                    paraît de lui-même dans la minute qui suit.
                  </span>
                </p>
              ) : (
                <p className="mt-1.5 font-mono text-[11px] text-faint">
                  Heure de Paris. Une date future programme la parution.
                </p>
              )}
            </div>

            <div>
              <label htmlFor="category_id" className="field-label">
                Catégorie
              </label>
              <select
                id="category_id"
                name="category_id"
                value={categoryId}
                onChange={(event) => setCategoryId(event.target.value)}
                className="field"
              >
                <option value="">Aucune catégorie</option>
                {categories.map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* IMAGE À LA UNE */}
          <div className="surface-panel space-y-3 rounded-2xl p-5">
            <span className="field-label mb-0">Image à la une</span>

            <input type="hidden" name="featured_image" value={featuredImage} />

            {featuredImage ? (
              <div className="relative aspect-video overflow-hidden rounded-xl border border-line">
                <Image
                  src={featuredImage}
                  alt="Aperçu de l’image à la une"
                  fill
                  className="object-cover"
                  sizes="320px"
                  unoptimized
                />
                <button
                  type="button"
                  onClick={() => setFeaturedImage('')}
                  aria-label="Retirer l’image"
                  className="absolute right-2 top-2 rounded-lg bg-black/70 p-1.5 text-ink hover:bg-danger"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            ) : (
              <div className="flex aspect-video items-center justify-center rounded-xl border border-dashed border-line bg-base">
                <ImageIcon className="h-6 w-6 text-faint" />
              </div>
            )}

            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp,image/avif,image/gif"
              className="hidden"
              onChange={(event) => {
                const file = event.target.files?.[0];
                if (file) void handleUpload(file);
              }}
            />

            <button
              type="button"
              disabled={uploading}
              onClick={() => fileInputRef.current?.click()}
              className="btn btn-ghost w-full"
            >
              {uploading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Envoi en cours…
                </>
              ) : (
                <>
                  <Upload className="h-4 w-4" />
                  Envoyer une image
                </>
              )}
            </button>

            {uploadError && (
              <p role="alert" className="text-xs text-danger">
                {uploadError}
              </p>
            )}

            <div>
              <label htmlFor="image-url" className="field-label">
                …ou coller une URL
              </label>
              <input
                id="image-url"
                type="url"
                value={featuredImage}
                onChange={(event) => setFeaturedImage(event.target.value)}
                placeholder="https://…"
                className="field font-mono text-[11px]"
              />
            </div>
          </div>
        </aside>
      </form>
    </div>
  );
}
