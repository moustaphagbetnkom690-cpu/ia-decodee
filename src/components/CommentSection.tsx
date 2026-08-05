'use client';

import { useActionState } from 'react';
import { useFormStatus } from 'react-dom';
import { MessageSquare, Send, CheckCircle2, AlertCircle, User } from 'lucide-react';
import { submitComment, type PublicActionResult } from '@/lib/actions/public';
import { formatDate } from '@/lib/utils';
import type { CommentPublic } from '@/lib/types';

export interface CommentSectionProps {
  articleId: string;
  initialComments: CommentPublic[];
}

function SubmitButton() {
  const { pending } = useFormStatus();

  return (
    <button type="submit" disabled={pending} className="btn btn-primary">
      {pending ? 'Envoi…' : 'Publier le commentaire'}
      {!pending && <Send className="h-3.5 w-3.5" />}
    </button>
  );
}

/**
 * Fil de commentaires d'un article.
 *
 * Deux corrections par rapport à la version précédente :
 *
 *  1. Le commentaire n'est plus inséré depuis le navigateur avec
 *     `status: 'approved'`. Il passe par une server action qui impose
 *     'pending' — et la policy RLS le vérifie de son côté. N'importe qui
 *     pouvait auparavant publier directement sur le site.
 *
 *  2. Un échec d'insertion n'affiche plus un message de succès. L'ancien bloc
 *     `finally { setSubmitted(true) }` s'exécutait même après une erreur : le
 *     visiteur croyait son commentaire publié alors qu'il était perdu.
 */
export function CommentSection({ articleId, initialComments }: CommentSectionProps) {
  const [state, formAction] = useActionState<PublicActionResult | null, FormData>(
    submitComment,
    null
  );

  return (
    <section className="my-12 space-y-8 border-t border-line pt-8">
      <h2 className="flex items-center gap-2 text-xl font-bold text-ink">
        <MessageSquare className="h-5 w-5 text-accent" />
        Commentaires ({initialComments.length})
      </h2>

      {/* FORMULAIRE */}
      <div className="surface-panel space-y-4 rounded-2xl p-6">
        <h3 className="text-sm font-semibold text-ink">Laisser un commentaire</h3>

        {state?.ok ? (
          <p
            role="status"
            className="flex items-center gap-3 rounded-xl border border-lime/30 bg-lime/10 p-4 text-xs text-lime"
          >
            <CheckCircle2 className="h-4 w-4 shrink-0" />
            {state.message}
          </p>
        ) : (
          <form action={formAction} className="space-y-4">
            <input type="hidden" name="article_id" value={articleId} />

            {/* Pot de miel anti-robots */}
            <input
              type="text"
              name="site_web"
              tabIndex={-1}
              autoComplete="off"
              aria-hidden="true"
              className="hidden"
            />

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label htmlFor="author_name" className="field-label">
                  Votre nom ou pseudo
                </label>
                <input
                  id="author_name"
                  name="author_name"
                  required
                  minLength={2}
                  placeholder="ex. Thomas D."
                  className="field"
                />
              </div>

              <div>
                <label htmlFor="author_email" className="field-label">
                  Votre e-mail — jamais publié
                </label>
                <input
                  id="author_email"
                  name="author_email"
                  type="email"
                  required
                  placeholder="votre.email@domaine.fr"
                  className="field"
                />
              </div>
            </div>

            <div>
              <label htmlFor="comment_content" className="field-label">
                Votre commentaire
              </label>
              <textarea
                id="comment_content"
                name="content"
                required
                minLength={2}
                maxLength={5000}
                rows={4}
                placeholder="Partagez votre avis, vos questions ou vos retours d’expérience…"
                className="field resize-y"
              />
            </div>

            {state && !state.ok && (
              <p role="alert" className="flex items-center gap-1.5 text-xs text-danger">
                <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                {state.message}
              </p>
            )}

            <div className="flex flex-wrap items-center gap-3">
              <SubmitButton />
              <span className="text-[11px] text-faint">
                Les commentaires sont relus avant publication.
              </span>
            </div>
          </form>
        )}
      </div>

      {/* LISTE */}
      <div className="space-y-4">
        {initialComments.length === 0 ? (
          <p className="font-mono text-xs italic text-muted">
            Soyez le premier à commenter cet article.
          </p>
        ) : (
          initialComments.map((comment) => (
            <article
              key={comment.id}
              className="surface-panel space-y-2 rounded-xl p-4 sm:p-5"
            >
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <span
                    aria-hidden
                    className="flex h-7 w-7 items-center justify-center rounded-full border border-accent/40 bg-accent/20 text-lime"
                  >
                    <User className="h-3.5 w-3.5" />
                  </span>
                  <span className="text-xs font-bold text-ink">{comment.author_name}</span>
                </div>
                <time
                  dateTime={comment.created_at}
                  className="font-mono text-[10px] text-faint"
                >
                  {formatDate(comment.created_at)}
                </time>
              </div>
              <p className="whitespace-pre-wrap pl-9 text-xs leading-relaxed text-ink-soft">
                {comment.content}
              </p>
            </article>
          ))
        )}
      </div>
    </section>
  );
}
