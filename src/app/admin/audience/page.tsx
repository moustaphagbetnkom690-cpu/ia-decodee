import Link from 'next/link';
import { Globe2, Eye, TrendingUp, MapPin } from 'lucide-react';
import { requireAdmin } from '@/lib/auth';
import { getViewsByCountry, getViewsByDay, getTopArticles } from '@/lib/api-admin';
import { countryFlag } from '@/lib/geo';
import { SITE_PATHS } from '@/lib/site-links';
import { formatNumber, cn } from '@/lib/utils';
import { StatCard } from '@/components/admin/StatCard';
import { LiveVisitors } from '@/components/admin/LiveVisitors';

const RANGES = [
  { days: 7, label: '7 jours' },
  { days: 30, label: '30 jours' },
  { days: 90, label: '90 jours' },
] as const;

interface AudiencePageProps {
  searchParams: Promise<{ periode?: string }>;
}

export default async function AdminAudiencePage({ searchParams }: AudiencePageProps) {
  await requireAdmin();

  const { periode } = await searchParams;
  const parsed = Number(periode);
  const days = RANGES.some((range) => range.days === parsed) ? parsed : 30;

  const [countries, byDay, topArticles] = await Promise.all([
    getViewsByCountry(days),
    getViewsByDay(Math.min(days, 30)),
    getTopArticles(10),
  ]);

  const totalViews = countries.reduce((sum, country) => sum + Number(country.total), 0);
  const maxCountry = Number(countries[0]?.total ?? 1);
  const maxDay = Math.max(1, ...byDay.map((day) => Number(day.total)));

  // Un pays « Inconnu » (code XX) apparaît quand la plateforme n'a pas réussi à
  // géolocaliser la requête — typiquement en développement local.
  const identifiedCountries = countries.filter((country) => country.country_code !== 'XX');

  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-4 border-b border-line pb-6 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <span className="eyebrow mb-2">Analytics</span>
          <h1 className="text-2xl font-bold text-ink">Audience</h1>
          <p className="mt-1 text-sm text-muted">
            Provenance géographique des visiteurs, mesurée côté serveur.
          </p>
        </div>

        <nav className="flex gap-2">
          {RANGES.map((range) => (
            <Link
              key={range.days}
              href={`${SITE_PATHS.adminAudience}?periode=${range.days}`}
              className={cn(
                'rounded-lg px-3.5 py-2 text-xs font-medium transition-colors',
                days === range.days
                  ? 'bg-accent text-ink'
                  : 'bg-surface text-muted hover:bg-elevated hover:text-ink'
              )}
            >
              {range.label}
            </Link>
          ))}
        </nav>
      </header>

      {/* TEMPS RÉEL — qui lit quoi, maintenant. Les blocs suivants agrègent sur
          plusieurs jours ; celui-ci répond à une autre question. */}
      <LiveVisitors variante="detaille" />

      <section className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard
          label={`Vues sur ${days} jours`}
          value={formatNumber(totalViews)}
          icon={Eye}
          tone="lime"
        />
        <StatCard
          label="Pays identifiés"
          value={identifiedCountries.length}
          icon={Globe2}
          tone="info"
        />
        <StatCard
          label="Pays principal"
          value={
            identifiedCountries[0]
              ? `${countryFlag(identifiedCountries[0].country_code)} ${identifiedCountries[0].country_name}`
              : '—'
          }
          icon={MapPin}
        />
      </section>

      {totalViews === 0 ? (
        <div className="surface-panel rounded-2xl p-12 text-center">
          <Globe2 className="mx-auto mb-3 h-8 w-8 text-faint" />
          <p className="text-sm text-muted">
            Aucune visite enregistrée sur cette période.
          </p>
          <p className="mx-auto mt-2 max-w-md text-xs text-faint">
            Le pays est fourni par les en-têtes de la plateforme d’hébergement. En
            développement local, les visites sont comptabilisées mais restent
            classées comme « Inconnu » — c’est normal.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          {/* RÉPARTITION PAR PAYS */}
          <section className="surface-panel rounded-2xl">
            <h2 className="flex items-center gap-2 border-b border-line p-5 text-sm font-bold text-ink">
              <Globe2 className="h-4 w-4 text-info" />
              Répartition par pays
            </h2>

            <ul className="max-h-[480px] divide-y divide-line overflow-y-auto">
              {countries.map((country) => {
                const total = Number(country.total);
                const share = totalViews > 0 ? (total / totalViews) * 100 : 0;

                return (
                  <li key={country.country_code} className="p-4">
                    <div className="mb-1.5 flex items-center justify-between gap-3 text-sm">
                      <span className="flex min-w-0 items-center gap-2 text-ink">
                        <span aria-hidden className="text-base">
                          {countryFlag(country.country_code)}
                        </span>
                        <span className="truncate">{country.country_name}</span>
                        <span className="shrink-0 font-mono text-[10px] text-faint">
                          {country.country_code}
                        </span>
                      </span>
                      <span className="shrink-0 font-mono text-xs tabular-nums text-muted">
                        {formatNumber(total)}
                        <span className="ml-1.5 text-faint">{share.toFixed(1)} %</span>
                      </span>
                    </div>
                    <div className="h-1.5 overflow-hidden rounded-full bg-elevated">
                      <div
                        className="h-full rounded-full bg-info"
                        style={{ width: `${(total / maxCountry) * 100}%` }}
                      />
                    </div>
                  </li>
                );
              })}
            </ul>
          </section>

          <div className="space-y-6">
            {/* COURBE JOURNALIÈRE */}
            <section className="surface-panel rounded-2xl">
              <h2 className="flex items-center gap-2 border-b border-line p-5 text-sm font-bold text-ink">
                <TrendingUp className="h-4 w-4 text-lime" />
                Vues par jour
              </h2>

              <div className="p-5">
                {/* Histogramme en CSS pur : pas de librairie de graphiques
                    embarquée pour un rendu aussi simple. */}
                <div className="flex h-40 items-end gap-1">
                  {byDay.map((day) => {
                    const total = Number(day.total);
                    const height = (total / maxDay) * 100;
                    const label = new Date(day.day).toLocaleDateString('fr-FR', {
                      day: 'numeric',
                      month: 'short',
                    });

                    return (
                      <div
                        key={day.day}
                        className="group relative flex-1"
                        title={`${label} — ${formatNumber(total)} vues`}
                      >
                        <div
                          className="w-full rounded-t bg-accent/50 transition-colors group-hover:bg-lime"
                          style={{ height: `${Math.max(height, 2)}%` }}
                        />
                      </div>
                    );
                  })}
                </div>

                <div className="mt-2 flex justify-between font-mono text-[10px] text-faint">
                  <span>
                    {byDay[0]
                      ? new Date(byDay[0].day).toLocaleDateString('fr-FR', {
                          day: 'numeric',
                          month: 'short',
                        })
                      : ''}
                  </span>
                  <span>Aujourd’hui</span>
                </div>
              </div>
            </section>

            {/* CLASSEMENT DES ARTICLES */}
            <section className="surface-panel rounded-2xl">
              <h2 className="flex items-center gap-2 border-b border-line p-5 text-sm font-bold text-ink">
                <Eye className="h-4 w-4 text-lime" />
                Articles les plus consultés
              </h2>

              <ol className="divide-y divide-line">
                {topArticles.map((article, index) => (
                  <li key={article.id} className="flex items-center gap-3 p-4">
                    <span className="w-5 shrink-0 font-mono text-xs text-faint">
                      {index + 1}
                    </span>
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
            </section>
          </div>
        </div>
      )}
    </div>
  );
}
