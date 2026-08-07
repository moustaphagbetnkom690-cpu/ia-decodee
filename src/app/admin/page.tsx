import Link from 'next/link';
import {
  FileText,
  Eye,
  MessageSquare,
  Mails,
  Plus,
  ArrowRight,
  Globe2,
  TrendingUp,
  AlertTriangle,
} from 'lucide-react';
import { requireAdmin } from '@/lib/auth';
import {
  getAdminStats,
  getTopArticles,
  getViewsByCountry,
  isSchemaUpToDate,
} from '@/lib/api-admin';
import { SITE_PATHS } from '@/lib/site-links';
import { StatCard } from '@/components/admin/StatCard';
import { LiveVisitors } from '@/components/admin/LiveVisitors';
import { countryFlag } from '@/lib/geo';
import { formatNumber } from '@/lib/utils';

export default async function AdminDashboardPage() {
  const session = await requireAdmin();

  const [stats, topArticles, countries, schemaReady] = await Promise.all([
    getAdminStats(),
    getTopArticles(5),
    getViewsByCountry(30),
    isSchemaUpToDate(),
  ]);

  const topCountries = countries.slice(0, 6);
  const maxCountryTotal = topCountries[0]?.total ?? 1;

  const firstName = (session.profile.full_name ?? '').split(' ')[0] || 'à vous';

  return (
    <div className="space-y-8">
      {/* EN-TÊTE */}
      <header className="flex flex-col gap-4 border-b border-line pb-6 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <span className="eyebrow mb-2">Tableau de bord</span>
          <h1 className="text-2xl font-bold text-ink sm:text-3xl">Bonjour {firstName}</h1>
          <p className="mt-1 text-sm text-muted">
            Vue d’ensemble de la publication et de l’audience d’IA Décodée.
          </p>
        </div>

        <Link href={SITE_PATHS.adminArticleNew} className="btn btn-primary shrink-0">
          <Plus className="h-4 w-4" />
          Nouvel article
        </Link>
      </header>

      {/* AVERTISSEMENT MIGRATION — la base est restée sur l'ancien schéma */}
      {!schemaReady && (
        <div className="space-y-2 rounded-2xl border border-danger/40 bg-danger/10 p-5">
          <p className="flex items-center gap-2 text-sm font-bold text-danger">
            <AlertTriangle className="h-4 w-4 shrink-0" />
            Migration de base de données requise
          </p>
          <p className="text-xs leading-relaxed text-ink-soft">
            La base tourne encore sur l’ancien schéma. Les statistiques d’audience,
            la newsletter et la modération des commentaires resteront inactives, et{' '}
            <strong className="text-danger">
              les règles de sécurité renforcées ne sont pas appliquées
            </strong>{' '}
            — tout compte inscrit conserve les droits d’administration.
          </p>
          <p className="text-xs text-muted">
            Ouvrez le SQL Editor de Supabase, collez l’intégralité du fichier{' '}
            <code className="rounded bg-base px-1.5 py-0.5 font-mono text-[11px] text-lime">
              supabase_schema.sql
            </code>{' '}
            et exécutez-le. Le script est idempotent et peut être relancé sans risque.
          </p>
        </div>
      )}

      {/* TEMPS RÉEL — placé avant les compteurs cumulés : c'est l'information
          qu'on vient chercher en arrivant sur le tableau de bord. */}
      <LiveVisitors variante="compact" />

      {/* STATISTIQUES */}
      <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Articles"
          value={stats.totalArticles}
          icon={FileText}
          hint={`${stats.publishedArticles} publiés · ${stats.draftArticles} brouillons`}
        />
        <StatCard
          label="Vues cumulées"
          value={formatNumber(stats.totalViews)}
          icon={Eye}
          tone="lime"
          hint={`${formatNumber(stats.viewsLast30Days)} sur 30 jours`}
        />
        <StatCard
          label="Commentaires"
          value={stats.totalComments}
          icon={MessageSquare}
          tone={stats.pendingComments > 0 ? 'warning' : 'default'}
          hint={
            stats.pendingComments > 0
              ? `${stats.pendingComments} en attente de modération`
              : 'Aucun en attente'
          }
        />
        <StatCard
          label="Abonnés newsletter"
          value={formatNumber(stats.subscribers)}
          icon={Mails}
          tone="info"
        />
      </section>

      {/* ALERTE MODÉRATION */}
      {stats.pendingComments > 0 && (
        <Link
          href={SITE_PATHS.adminComments}
          className="flex items-center justify-between gap-4 rounded-2xl border border-warning/30 bg-warning/10 p-4 transition-colors hover:bg-warning/15"
        >
          <span className="text-sm text-ink">
            <strong className="font-semibold text-warning">
              {stats.pendingComments} commentaire{stats.pendingComments > 1 ? 's' : ''}
            </strong>{' '}
            en attente de votre validation.
          </span>
          <ArrowRight className="h-4 w-4 shrink-0 text-warning" />
        </Link>
      )}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* ARTICLES LES PLUS LUS */}
        <section className="surface-panel rounded-2xl">
          <div className="flex items-center justify-between border-b border-line p-5">
            <h2 className="flex items-center gap-2 text-sm font-bold text-ink">
              <TrendingUp className="h-4 w-4 text-lime" />
              Articles les plus lus
            </h2>
            <Link
              href={SITE_PATHS.adminArticles}
              className="font-mono text-[11px] text-accent-soft hover:text-lime"
            >
              Tout voir
            </Link>
          </div>

          {topArticles.length === 0 ? (
            <p className="p-5 text-sm text-faint">Aucun article publié pour l’instant.</p>
          ) : (
            <ol className="divide-y divide-line">
              {topArticles.map((article, index) => (
                <li key={article.id} className="flex items-center gap-3 p-4">
                  <span className="w-5 shrink-0 font-mono text-xs text-faint">{index + 1}</span>
                  <Link
                    href={SITE_PATHS.adminArticleEdit(article.id)}
                    className="min-w-0 flex-1 truncate text-sm text-ink hover:text-accent-soft"
                  >
                    {article.title}
                  </Link>
                  <span className="shrink-0 font-mono text-xs tabular-nums text-lime">
                    {formatNumber(article.views)}
                  </span>
                </li>
              ))}
            </ol>
          )}
        </section>

        {/* AUDIENCE PAR PAYS */}
        <section className="surface-panel rounded-2xl">
          <div className="flex items-center justify-between border-b border-line p-5">
            <h2 className="flex items-center gap-2 text-sm font-bold text-ink">
              <Globe2 className="h-4 w-4 text-info" />
              Audience par pays
              <span className="font-mono text-[11px] font-normal text-faint">30 j</span>
            </h2>
            <Link
              href={SITE_PATHS.adminAudience}
              className="font-mono text-[11px] text-accent-soft hover:text-lime"
            >
              Détail
            </Link>
          </div>

          {topCountries.length === 0 ? (
            <p className="p-5 text-sm text-faint">
              Aucune visite enregistrée pour l’instant. Les données apparaîtront dès les
              premiers visiteurs.
            </p>
          ) : (
            <ul className="divide-y divide-line">
              {topCountries.map((country) => (
                <li key={country.country_code} className="p-4">
                  <div className="mb-1.5 flex items-center justify-between gap-3 text-sm">
                    <span className="flex min-w-0 items-center gap-2 text-ink">
                      <span aria-hidden>{countryFlag(country.country_code)}</span>
                      <span className="truncate">{country.country_name}</span>
                    </span>
                    <span className="shrink-0 font-mono text-xs tabular-nums text-muted">
                      {formatNumber(country.total)}
                    </span>
                  </div>
                  {/* Barre de proportion, relative au pays le plus représenté */}
                  <div className="h-1.5 overflow-hidden rounded-full bg-elevated">
                    <div
                      className="h-full rounded-full bg-info"
                      style={{ width: `${(country.total / maxCountryTotal) * 100}%` }}
                    />
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}
