import Link from 'next/link';
import { Check, Ban, Trash2, MessageSquare, RotateCcw, Mail } from 'lucide-react';
import { requireAdmin } from '@/lib/auth';
import { getAdminComments } from '@/lib/api-admin';
import { moderateComment, deleteComment } from '@/lib/actions/admin';
import { SITE_PATHS } from '@/lib/site-links';
import { formatDateTime, cn } from '@/lib/utils';

const FILTERS = [
  { key: 'pending', label: 'En attente' },
  { key: 'approved', label: 'Approuvés' },
  { key: 'spam', label: 'Spam' },
  { key: 'all', label: 'Tous' },
] as const;

interface CommentsPageProps {
  searchParams: Promise<{ statut?: string }>;
}

export default async function AdminCommentsPage({ searchParams }: CommentsPageProps) {
  await requireAdmin();

  const { statut } = await searchParams;
  const activeFilter =
    statut === 'approved' || statut === 'spam' || statut === 'all' ? statut : 'pending';

  const comments = await getAdminComments(
    activeFilter === 'all' ? undefined : activeFilter
  );

  return (
    <div className="space-y-6">
      <header className="border-b border-line pb-6">
        <span className="eyebrow mb-2">Modération</span>
        <h1 className="text-2xl font-bold text-ink">Commentaires</h1>
        <p className="mt-1 text-sm text-muted">
          Les nouveaux commentaires arrivent en attente et ne sont visibles du public
          qu’une fois approuvés.
        </p>
      </header>

      {/* FILTRES */}
      <nav className="flex flex-wrap gap-2">
        {FILTERS.map((filter) => (
          <Link
            key={filter.key}
            href={`${SITE_PATHS.adminComments}?statut=${filter.key}`}
            className={cn(
              'rounded-lg px-3.5 py-2 text-xs font-medium transition-colors',
              activeFilter === filter.key
                ? 'bg-accent text-ink'
                : 'bg-surface text-muted hover:bg-elevated hover:text-ink'
            )}
          >
            {filter.label}
          </Link>
        ))}
      </nav>

      {comments.length === 0 ? (
        <div className="surface-panel rounded-2xl p-12 text-center">
          <MessageSquare className="mx-auto mb-3 h-8 w-8 text-faint" />
          <p className="text-sm text-muted">
            {activeFilter === 'pending'
              ? 'Aucun commentaire en attente. Tout est à jour.'
              : 'Aucun commentaire dans cette catégorie.'}
          </p>
        </div>
      ) : (
        <ul className="space-y-3">
          {comments.map((comment) => (
            <li key={comment.id} className="surface-panel space-y-3 rounded-2xl p-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-sm font-bold text-ink">{comment.author_name}</p>
                  {/* L'e-mail n'est visible que dans cette interface : la vue
                      publique comments_public ne l'expose jamais. */}
                  <p className="flex items-center gap-1.5 font-mono text-[11px] text-faint">
                    <Mail className="h-3 w-3" />
                    {comment.author_email}
                  </p>
                </div>

                <div className="flex items-center gap-3 text-[11px]">
                  <span
                    className={cn(
                      'rounded-full px-2 py-0.5 font-mono font-bold uppercase',
                      comment.status === 'approved' && 'bg-lime/15 text-lime',
                      comment.status === 'pending' && 'bg-warning/15 text-warning',
                      comment.status === 'spam' && 'bg-danger/15 text-danger'
                    )}
                  >
                    {comment.status === 'approved'
                      ? 'Approuvé'
                      : comment.status === 'pending'
                        ? 'En attente'
                        : 'Spam'}
                  </span>
                  <span className="font-mono text-faint">
                    {formatDateTime(comment.created_at)}
                  </span>
                </div>
              </div>

              <p className="whitespace-pre-wrap text-sm leading-relaxed text-ink-soft">
                {comment.content}
              </p>

              {comment.article && (
                <Link
                  href={SITE_PATHS.article(comment.article.slug)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block truncate font-mono text-[11px] text-accent-soft hover:text-lime"
                >
                  sur « {comment.article.title} »
                </Link>
              )}

              <div className="flex flex-wrap gap-2 border-t border-line pt-3">
                {comment.status !== 'approved' && (
                  <form action={moderateComment}>
                    <input type="hidden" name="id" value={comment.id} />
                    <input type="hidden" name="status" value="approved" />
                    <button type="submit" className="btn btn-ghost hover:!text-lime">
                      <Check className="h-3.5 w-3.5" />
                      Approuver
                    </button>
                  </form>
                )}

                {comment.status !== 'spam' && (
                  <form action={moderateComment}>
                    <input type="hidden" name="id" value={comment.id} />
                    <input type="hidden" name="status" value="spam" />
                    <button type="submit" className="btn btn-ghost hover:!text-warning">
                      <Ban className="h-3.5 w-3.5" />
                      Marquer comme spam
                    </button>
                  </form>
                )}

                {comment.status !== 'pending' && (
                  <form action={moderateComment}>
                    <input type="hidden" name="id" value={comment.id} />
                    <input type="hidden" name="status" value="pending" />
                    <button type="submit" className="btn btn-ghost">
                      <RotateCcw className="h-3.5 w-3.5" />
                      Remettre en attente
                    </button>
                  </form>
                )}

                <form action={deleteComment} className="ml-auto">
                  <input type="hidden" name="id" value={comment.id} />
                  <button type="submit" className="btn btn-danger">
                    <Trash2 className="h-3.5 w-3.5" />
                    Supprimer
                  </button>
                </form>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
