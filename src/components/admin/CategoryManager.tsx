'use client';

import { useActionState, useState } from 'react';
import { Plus, Pencil, Trash2, X, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';
import { saveCategory, deleteCategory, type ActionResult } from '@/lib/actions/admin';
import { cn } from '@/lib/utils';
import type { Category } from '@/lib/types';

/**
 * Gestion des catégories : liste + panneau d'édition latéral.
 * Le formulaire sert indifféremment à la création et à la modification ;
 * la présence d'un champ caché `id` détermine le comportement côté serveur.
 */
export function CategoryManager({ categories }: { categories: Category[] }) {
  const [editing, setEditing] = useState<Category | null>(null);
  const [isCreating, setIsCreating] = useState(false);

  const [state, formAction, isPending] = useActionState<ActionResult | null, FormData>(
    saveCategory,
    null
  );

  const isFormOpen = isCreating || editing !== null;

  const openCreate = () => {
    setEditing(null);
    setIsCreating(true);
  };

  const openEdit = (category: Category) => {
    setIsCreating(false);
    setEditing(category);
  };

  const closeForm = () => {
    setIsCreating(false);
    setEditing(null);
  };

  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-4 border-b border-line pb-6 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <span className="eyebrow mb-2">Taxonomie</span>
          <h1 className="text-2xl font-bold text-ink">Catégories</h1>
          <p className="mt-1 text-sm text-muted">
            Elles structurent la navigation du site et le fil d’Ariane des articles.
          </p>
        </div>

        <button type="button" onClick={openCreate} className="btn btn-primary shrink-0">
          <Plus className="h-4 w-4" />
          Nouvelle catégorie
        </button>
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

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* LISTE */}
        <ul className={cn('space-y-3', isFormOpen ? 'lg:col-span-2' : 'lg:col-span-3')}>
          {categories.length === 0 ? (
            <li className="surface-panel rounded-2xl p-10 text-center text-sm text-muted">
              Aucune catégorie. Créez-en une pour commencer à classer vos articles.
            </li>
          ) : (
            categories.map((category) => (
              <li
                key={category.id}
                className="surface-panel flex items-center gap-4 rounded-2xl p-4"
              >
                <span
                  aria-hidden
                  className="h-9 w-1.5 shrink-0 rounded-full"
                  style={{ backgroundColor: category.color }}
                />

                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-ink">{category.name}</p>
                  <p className="truncate font-mono text-[11px] text-faint">
                    /categories/{category.slug}
                  </p>
                  {category.description && (
                    <p className="mt-1 line-clamp-1 text-xs text-muted">
                      {category.description}
                    </p>
                  )}
                </div>

                <div className="flex shrink-0 gap-2">
                  <button
                    type="button"
                    onClick={() => openEdit(category)}
                    aria-label={`Éditer ${category.name}`}
                    className="rounded-lg bg-accent/20 p-2 text-accent-soft transition-colors hover:bg-accent hover:text-ink"
                  >
                    <Pencil className="h-3.5 w-3.5" />
                  </button>

                  <form action={deleteCategory}>
                    <input type="hidden" name="id" value={category.id} />
                    <button
                      type="submit"
                      aria-label={`Supprimer ${category.name}`}
                      className="rounded-lg bg-danger/15 p-2 text-danger transition-colors hover:bg-danger hover:text-ink"
                      onClick={(event) => {
                        if (
                          !confirm(
                            `Supprimer « ${category.name} » ? Les articles associés seront simplement détachés, pas supprimés.`
                          )
                        ) {
                          event.preventDefault();
                        }
                      }}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </form>
                </div>
              </li>
            ))
          )}
        </ul>

        {/* FORMULAIRE */}
        {isFormOpen && (
          <aside className="surface-panel h-fit space-y-4 rounded-2xl p-5 lg:sticky lg:top-24">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-bold text-ink">
                {editing ? 'Modifier la catégorie' : 'Nouvelle catégorie'}
              </h2>
              <button
                type="button"
                onClick={closeForm}
                aria-label="Fermer"
                className="rounded-lg p-1 text-muted hover:text-ink"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* La clé force React à remonter le formulaire au changement de
                catégorie éditée, afin que les valeurs par défaut soient bien
                réappliquées au lieu de conserver la saisie précédente. */}
            <form
              key={editing?.id ?? 'nouvelle'}
              action={formAction}
              className="space-y-4"
            >
              {editing && <input type="hidden" name="id" value={editing.id} />}

              <div>
                <label htmlFor="name" className="field-label">
                  Nom
                </label>
                <input
                  id="name"
                  name="name"
                  required
                  minLength={2}
                  defaultValue={editing?.name ?? ''}
                  placeholder="Modèles & Architectures"
                  className="field"
                />
              </div>

              <div>
                <label htmlFor="slug" className="field-label">
                  Slug (optionnel)
                </label>
                <input
                  id="slug"
                  name="slug"
                  defaultValue={editing?.slug ?? ''}
                  placeholder="genere-depuis-le-nom"
                  className="field font-mono text-xs"
                />
              </div>

              <div>
                <label htmlFor="description" className="field-label">
                  Description
                </label>
                <textarea
                  id="description"
                  name="description"
                  rows={3}
                  defaultValue={editing?.description ?? ''}
                  className="field resize-y"
                />
              </div>

              <div>
                <label htmlFor="color" className="field-label">
                  Couleur d’accent
                </label>
                <input
                  id="color"
                  name="color"
                  type="color"
                  defaultValue={editing?.color ?? '#7C5CFF'}
                  className="h-10 w-full cursor-pointer rounded-lg border border-line bg-base p-1"
                />
              </div>

              <div className="flex gap-2 border-t border-line pt-4">
                <button type="button" onClick={closeForm} className="btn btn-ghost flex-1">
                  Annuler
                </button>
                <button type="submit" disabled={isPending} className="btn btn-primary flex-1">
                  {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Enregistrer'}
                </button>
              </div>
            </form>
          </aside>
        )}
      </div>
    </div>
  );
}
