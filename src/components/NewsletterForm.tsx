'use client';

import { useActionState } from 'react';
import { useFormStatus } from 'react-dom';
import { Send, CheckCircle2, AlertCircle } from 'lucide-react';
import { subscribeToNewsletter, type PublicActionResult } from '@/lib/actions/public';

/**
 * Formulaire d'inscription à la newsletter.
 *
 * Il enregistre réellement l'adresse en base : la version précédente se
 * contentait d'un setTimeout de 600 ms suivi d'un message « inscription
 * confirmée », sans jamais rien collecter.
 */

function SubmitButton() {
  // useFormStatus doit être appelé depuis un composant enfant du <form> :
  // c'est ce qui lui permet de connaître l'état d'envoi du formulaire parent.
  const { pending } = useFormStatus();

  return (
    <button type="submit" disabled={pending} className="btn btn-primary shrink-0">
      {pending ? 'Inscription…' : 'S’abonner'}
      {!pending && <Send className="h-3.5 w-3.5" />}
    </button>
  );
}

export function NewsletterForm() {
  const [state, formAction] = useActionState<PublicActionResult | null, FormData>(
    subscribeToNewsletter,
    null
  );

  return (
    <div className="surface-panel rounded-2xl p-6">
      <h2 className="mb-2 flex items-center gap-2 text-lg font-bold text-ink">
        <span aria-hidden className="h-2 w-2 rounded-full bg-lime" />
        Restez à la pointe de l’IA
      </h2>
      <p className="mb-4 text-xs text-muted">
        Chaque semaine, notre condensé sans hype : comparatifs, nouveaux modèles et
        prompts testés.
      </p>

      {state?.ok ? (
        <p
          role="status"
          className="flex items-center gap-3 rounded-xl border border-lime/30 bg-lime/10 p-4 text-xs font-semibold text-lime"
        >
          <CheckCircle2 className="h-5 w-5 shrink-0" />
          {state.message}
        </p>
      ) : (
        <form action={formAction} className="space-y-2">
          <div className="flex flex-col gap-2 sm:flex-row">
            <label htmlFor="newsletter-email" className="sr-only">
              Votre adresse e-mail
            </label>
            <input
              id="newsletter-email"
              name="email"
              type="email"
              required
              autoComplete="email"
              placeholder="votre.email@domaine.fr"
              className="field flex-1"
            />

            {/* Pot de miel : invisible pour un humain, rempli par les robots.
                aria-hidden et tabIndex le retirent du parcours d'accessibilité. */}
            <input
              type="text"
              name="site_web"
              tabIndex={-1}
              autoComplete="off"
              aria-hidden="true"
              className="hidden"
            />

            <SubmitButton />
          </div>

          {state && !state.ok && (
            <p role="alert" className="flex items-center gap-1.5 text-xs text-danger">
              <AlertCircle className="h-3.5 w-3.5 shrink-0" />
              {state.message}
            </p>
          )}

          <p className="text-[11px] text-faint">
            Pas de spam. Désinscription en un clic.
          </p>
        </form>
      )}
    </div>
  );
}
