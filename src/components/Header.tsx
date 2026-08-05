'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { Search, Menu, X, Cpu, ChevronDown } from 'lucide-react';
import { MAIN_NAV_ITEMS, CATEGORIES_LIST, SITE_PATHS } from '@/lib/site-links';
import { siteConfig } from '@/lib/site-config';
import { cn } from '@/lib/utils';

/**
 * En-tête du site public.
 *
 * Le bouton « Espace Admin » qui trônait ici en violet vif a été retiré : la
 * navigation d'un média n'a pas à mettre en avant son back-office. L'accès se
 * fait désormais par une icône discrète dans le pied de page.
 */
export function Header() {
  const [isMobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isCategoriesOpen, setCategoriesOpen] = useState(false);
  const [isSearchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const router = useRouter();
  const pathname = usePathname();

  const handleSearchSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const query = searchQuery.trim();
    if (!query) return;

    router.push(`${SITE_PATHS.blog}?q=${encodeURIComponent(query)}`);
    setSearchOpen(false);
    setMobileMenuOpen(false);
    setSearchQuery('');
  };

  const isActive = (href: string) =>
    href === SITE_PATHS.home ? pathname === href : pathname.startsWith(href);

  return (
    <header className="surface-panel sticky top-0 z-50 w-full border-b border-line">
      <div className="mx-auto flex h-20 max-w-7xl items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
        {/* LOGO */}
        <Link href={SITE_PATHS.home} className="group flex shrink-0 items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-accent to-lime p-0.5 transition-transform duration-200 group-hover:scale-105">
            <div className="flex h-full w-full items-center justify-center rounded-[10px] bg-base">
              <Cpu className="h-5 w-5 text-lime transition-transform duration-200 group-hover:rotate-12" />
            </div>
          </div>
          <div className="flex flex-col">
            <span className="flex items-center gap-1.5 text-xl font-bold tracking-tight text-ink">
              {siteConfig.name}
              <span aria-hidden className="h-2 w-2 animate-pulse rounded-full bg-lime" />
            </span>
            <span className="font-mono text-[10px] uppercase tracking-widest text-muted">
              Média IA &amp; inférence
            </span>
          </div>
        </Link>

        {/* NAVIGATION — écrans larges */}
        <nav aria-label="Navigation principale" className="hidden items-center gap-1 md:flex">
          {MAIN_NAV_ITEMS.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              aria-current={isActive(item.href) ? 'page' : undefined}
              className={cn(
                'rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                isActive(item.href)
                  ? 'bg-elevated text-ink'
                  : 'text-muted hover:bg-elevated hover:text-ink'
              )}
            >
              {item.label}
            </Link>
          ))}

          {/* MENU DÉROULANT CATÉGORIES */}
          <div
            className="relative"
            onMouseEnter={() => setCategoriesOpen(true)}
            onMouseLeave={() => setCategoriesOpen(false)}
          >
            <button
              type="button"
              aria-expanded={isCategoriesOpen}
              aria-haspopup="true"
              onClick={() => setCategoriesOpen((open) => !open)}
              className="flex items-center gap-1 rounded-lg px-3 py-2 text-sm font-medium text-muted transition-colors hover:bg-elevated hover:text-ink"
            >
              Catégories
              <ChevronDown
                className={cn(
                  'h-4 w-4 transition-transform duration-200',
                  isCategoriesOpen && 'rotate-180 text-lime'
                )}
              />
            </button>

            {isCategoriesOpen && (
              <div className="absolute left-0 top-full z-50 w-72 pt-2">
                <div className="surface-panel space-y-1 rounded-xl p-2 shadow-2xl">
                  {CATEGORIES_LIST.map((category) => (
                    <Link
                      key={category.slug}
                      href={category.href}
                      onClick={() => setCategoriesOpen(false)}
                      className="group flex flex-col rounded-lg p-2.5 transition-colors hover:bg-elevated"
                    >
                      <span className="flex items-center justify-between text-xs font-semibold text-ink group-hover:text-lime">
                        {category.name}
                        <span
                          aria-hidden
                          className="h-1.5 w-1.5 rounded-full"
                          style={{ backgroundColor: category.color }}
                        />
                      </span>
                      <span className="mt-0.5 line-clamp-1 text-[11px] text-muted">
                        {category.description}
                      </span>
                    </Link>
                  ))}
                </div>
              </div>
            )}
          </div>
        </nav>

        {/* RECHERCHE */}
        <div className="flex items-center gap-2">
          {isSearchOpen ? (
            <form onSubmit={handleSearchSubmit} className="flex items-center" role="search">
              <label htmlFor="site-search" className="sr-only">
                Rechercher un article
              </label>
              <input
                id="site-search"
                type="search"
                placeholder="Rechercher…"
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                autoFocus
                className="field w-40 py-1.5 text-xs sm:w-64"
              />
              <button
                type="button"
                onClick={() => setSearchOpen(false)}
                aria-label="Fermer la recherche"
                className="ml-1 p-2 text-muted hover:text-ink"
              >
                <X className="h-4 w-4" />
              </button>
            </form>
          ) : (
            <button
              type="button"
              onClick={() => setSearchOpen(true)}
              aria-label="Ouvrir la recherche"
              className="flex items-center gap-2 rounded-lg p-2 text-muted transition-colors hover:bg-elevated hover:text-ink"
            >
              <Search className="h-4 w-4" />
              <span className="hidden font-mono text-xs text-faint lg:inline">Rechercher</span>
            </button>
          )}

          {/* MENU MOBILE */}
          <button
            type="button"
            onClick={() => setMobileMenuOpen((open) => !open)}
            aria-expanded={isMobileMenuOpen}
            aria-label={isMobileMenuOpen ? 'Fermer le menu' : 'Ouvrir le menu'}
            className="rounded-lg p-2 text-muted hover:text-ink md:hidden"
          >
            {isMobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </button>
        </div>
      </div>

      {/* NAVIGATION — mobile */}
      {isMobileMenuOpen && (
        <nav
          aria-label="Navigation mobile"
          className="space-y-3 border-t border-line bg-base/95 px-4 pb-6 pt-4 backdrop-blur-xl md:hidden"
        >
          <div className="space-y-1">
            {MAIN_NAV_ITEMS.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setMobileMenuOpen(false)}
                className="block rounded-lg px-3 py-2 text-base font-medium text-ink hover:bg-elevated"
              >
                {item.label}
              </Link>
            ))}
          </div>

          <div className="border-t border-line pt-3">
            <p className="mb-2 px-3 font-mono text-xs uppercase tracking-wider text-lime">
              Catégories
            </p>
            <div className="space-y-1">
              {CATEGORIES_LIST.map((category) => (
                <Link
                  key={category.slug}
                  href={category.href}
                  onClick={() => setMobileMenuOpen(false)}
                  className="flex items-center justify-between rounded-lg px-3 py-1.5 text-sm text-muted hover:bg-elevated hover:text-ink"
                >
                  {category.name}
                  <span
                    aria-hidden
                    className="h-2 w-2 rounded-full"
                    style={{ backgroundColor: category.color }}
                  />
                </Link>
              ))}
            </div>
          </div>
        </nav>
      )}
    </header>
  );
}
