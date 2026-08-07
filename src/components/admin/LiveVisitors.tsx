'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { Users, Eye, WifiOff, TriangleAlert } from 'lucide-react';
import { fetchRealtimeActivity } from '@/lib/actions/realtime';
import type { RealtimeActivity } from '@/lib/api-admin';
import { countryFlag } from '@/lib/country';
import { cn } from '@/lib/utils';

/**
 * Visiteurs présents sur le site à l'instant.
 *
 * ── Pourquoi une interrogation périodique et non un abonnement temps réel ────
 * Supabase sait diffuser les changements par WebSocket, mais cela supposerait
 * d'ouvrir `page_views` en lecture au client — précisément ce que la policy
 * `page_views_select_admin` interdit, et à raison : la table contient les
 * référents et les navigateurs de tous les visiteurs. Une interrogation toutes
 * les quinze secondes passe par une server action protégée par requireAdmin(),
 * ne coûte qu'une requête agrégée, et donne une fraîcheur amplement suffisante
 * pour un usage humain.
 *
 * ── Ce que compte réellement l'indicateur ────────────────────────────────────
 * Des visiteurs DISTINCTS, pas des chargements : deux rechargements du même
 * lecteur comptent pour un. Voir `empreinteVisiteur()` dans
 * `actions/analytics.ts` pour la construction de l'identifiant.
 */

const INTERVALLE_MS = 15_000;

interface LiveVisitorsProps {
  /** `compact` pour le bandeau du tableau de bord, `detaille` pour la page Audience. */
  variante?: 'compact' | 'detaille';
  fenetreMinutes?: number;
}

/**
 * Fraîcheur de la dernière visite, en granularité volontairement grossière.
 *
 * Un affichage à la seconde près exigerait un minuteur de rafraîchissement
 * dédié, donc un setState périodique dans un effet — ce que React déconseille
 * (rendus en cascade). Ces paliers restent exacts entre deux interrogations
 * réseau, espacées de quinze secondes.
 */
function ilYA(iso: string | null): string {
  if (!iso) return 'aucune activité';
  const secondes = Math.max(0, Math.floor((Date.now() - new Date(iso).getTime()) / 1000));
  if (secondes < 60) return "à l'instant";
  const minutes = Math.floor(secondes / 60);
  if (minutes < 60) return `il y a ${minutes} min`;
  const heures = Math.floor(minutes / 60);
  if (heures < 24) return `il y a ${heures} h`;
  return `il y a ${Math.floor(heures / 24)} j`;
}

export function LiveVisitors({
  variante = 'compact',
  fenetreMinutes = 5,
}: LiveVisitorsProps) {
  const [activite, setActivite] = useState<RealtimeActivity | null>(null);
  const [horsLigne, setHorsLigne] = useState(false);
  const enCours = useRef(false);

  const rafraichir = useCallback(async () => {
    // Garde de réentrance : sur une connexion lente, l'intervalle peut déclencher
    // un nouvel appel avant que le précédent soit revenu. Sans ce verrou, les
    // requêtes s'empilent et l'affichage se met à osciller entre deux réponses
    // arrivées dans le désordre.
    if (enCours.current) return;
    enCours.current = true;

    try {
      const data = await fetchRealtimeActivity(fenetreMinutes);
      setActivite(data);
      setHorsLigne(false);
    } catch {
      // Coupure réseau ou session expirée : on garde les dernières valeurs
      // connues à l'écran et on le signale, plutôt que d'afficher zéro — un zéro
      // serait indiscernable d'un site réellement sans visiteur.
      setHorsLigne(true);
    } finally {
      enCours.current = false;
    }
  }, [fenetreMinutes]);

  useEffect(() => {
    // Le premier chargement est différé d'un tour de boucle. Appeler rafraichir()
    // directement dans le corps de l'effet déclenche un setState synchrone, donc
    // des rendus en cascade — c'est ce que signale react-hooks/set-state-in-effect,
    // et la règle a raison. Le délai est imperceptible.
    const initial = setTimeout(rafraichir, 0);
    const reseau = setInterval(rafraichir, INTERVALLE_MS);

    // L'onglet en arrière-plan n'a aucune raison d'interroger le serveur ; on
    // rafraîchit en revanche dès qu'il redevient visible, pour éviter que
    // l'administrateur ne retrouve une valeur figée en revenant dessus.
    const surVisibilite = () => {
      if (document.visibilityState === 'visible') rafraichir();
    };
    document.addEventListener('visibilitychange', surVisibilite);

    return () => {
      clearTimeout(initial);
      clearInterval(reseau);
      document.removeEventListener('visibilitychange', surVisibilite);
    };
  }, [rafraichir]);

  if (activite?.indisponible) {
    return (
      <div className="flex items-start gap-3 rounded-xl border border-warning/30 bg-warning/10 p-4">
        <TriangleAlert className="mt-0.5 h-4 w-4 shrink-0 text-warning" />
        <div className="text-sm">
          <p className="font-medium text-ink">Temps réel non activé</p>
          <p className="mt-1 text-muted">
            Exécutez <code className="font-mono text-xs">supabase_patch_temps_reel.sql</code> dans
            Supabase &gt; SQL Editor pour activer le suivi des visiteurs en ligne.
          </p>
        </div>
      </div>
    );
  }

  const visiteurs = activite?.visiteurs ?? 0;
  const actif = visiteurs > 0;

  /* ---------------------------------------------------------------- compact */
  if (variante === 'compact') {
    return (
      <div className="flex flex-wrap items-center gap-x-5 gap-y-2 rounded-xl border border-line bg-surface px-4 py-3">
        <span className="flex items-center gap-2.5">
          <Pastille actif={actif} />
          <span className="text-sm">
            <strong className="text-lg font-bold text-ink tabular-nums">{visiteurs}</strong>{' '}
            <span className="text-muted">
              {visiteurs > 1 ? 'visiteurs en ligne' : 'visiteur en ligne'}
            </span>
          </span>
        </span>

        <span className="text-xs text-faint">
          {activite?.vues ?? 0} vue{(activite?.vues ?? 0) > 1 ? 's' : ''} ·{' '}
          {activite?.fenetreMinutes ?? fenetreMinutes} dernières minutes
        </span>

        {activite?.pays?.length ? (
          <span className="flex items-center gap-1 text-sm" aria-label="Pays des visiteurs">
            {activite.pays.slice(0, 5).map((p) => (
              <span key={p.code} title={`${p.nom} — ${p.visiteurs}`}>
                {countryFlag(p.code)}
              </span>
            ))}
          </span>
        ) : null}

        <span className="ml-auto text-xs text-faint">
          {horsLigne ? (
            <span className="flex items-center gap-1.5 text-warning">
              <WifiOff className="h-3.5 w-3.5" />
              hors ligne
            </span>
          ) : (
            ilYA(activite?.derniereVisite ?? null)
          )}
        </span>
      </div>
    );
  }

  /* -------------------------------------------------------------- détaillé */
  return (
    <section className="rounded-xl border border-line bg-surface">
      <header className="flex flex-wrap items-center justify-between gap-3 border-b border-line px-5 py-4">
        <div className="flex items-center gap-3">
          <Pastille actif={actif} />
          <div>
            <h2 className="text-sm font-semibold text-ink">En direct</h2>
            <p className="text-xs text-muted">
              {activite?.fenetreMinutes ?? fenetreMinutes} dernières minutes
            </p>
          </div>
        </div>

        <div className="flex items-center gap-5">
          <span className="flex items-center gap-2">
            <Users className="h-4 w-4 text-accent" />
            <span className="text-xl font-bold text-ink tabular-nums">{visiteurs}</span>
            <span className="text-xs text-muted">visiteur{visiteurs > 1 ? 's' : ''}</span>
          </span>
          <span className="flex items-center gap-2">
            <Eye className="h-4 w-4 text-lime" />
            <span className="text-xl font-bold text-ink tabular-nums">{activite?.vues ?? 0}</span>
            <span className="text-xs text-muted">vue{(activite?.vues ?? 0) > 1 ? 's' : ''}</span>
          </span>
        </div>
      </header>

      {!actif ? (
        <p className="px-5 py-8 text-center text-sm text-muted">
          Personne sur le site en ce moment.
          <span className="mt-1 block text-xs text-faint">
            Cet encart se met à jour tout seul, toutes les 15 secondes.
          </span>
        </p>
      ) : (
        <div className="divide-y divide-line">
          {activite?.pages?.map((page) => (
            <div key={page.path} className="flex items-center gap-4 px-5 py-3">
              <span className="min-w-0 flex-1">
                <span className="block truncate font-mono text-xs text-ink-soft" title={page.path}>
                  {page.path}
                </span>
              </span>

              <span className="flex shrink-0 items-center gap-1 text-sm">
                {page.pays?.slice(0, 4).map((code) => (
                  <span key={code} title={code}>
                    {countryFlag(code)}
                  </span>
                ))}
              </span>

              <span className="w-24 shrink-0 text-right text-xs text-muted tabular-nums">
                <strong className="text-ink">{page.visiteurs}</strong> lecteur
                {page.visiteurs > 1 ? 's' : ''}
              </span>
            </div>
          ))}
        </div>
      )}

      <footer className="flex items-center justify-between border-t border-line px-5 py-2.5 text-xs text-faint">
        <span>
          Visiteurs uniques, sans cookie — un rechargement ne compte pas double.
        </span>
        <span>
          {horsLigne ? (
            <span className="flex items-center gap-1.5 text-warning">
              <WifiOff className="h-3.5 w-3.5" />
              hors ligne
            </span>
          ) : (
            ilYA(activite?.derniereVisite ?? null)
          )}
        </span>
      </footer>
    </section>
  );
}

/** Pastille de présence : elle ne pulse que lorsqu'il y a réellement du monde. */
function Pastille({ actif }: { actif: boolean }) {
  return (
    <span className="relative flex h-2.5 w-2.5 shrink-0" aria-hidden>
      {actif && (
        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-success opacity-75" />
      )}
      <span
        className={cn(
          'relative inline-flex h-2.5 w-2.5 rounded-full',
          actif ? 'bg-success' : 'bg-faint'
        )}
      />
    </span>
  );
}
