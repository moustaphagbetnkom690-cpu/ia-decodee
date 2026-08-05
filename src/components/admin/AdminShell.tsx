'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  FileText,
  FolderTree,
  MessageSquare,
  Globe2,
  Mails,
  LogOut,
  Menu,
  X,
  ExternalLink,
  Cpu,
} from 'lucide-react';
import { SITE_PATHS } from '@/lib/site-links';
import { signOut } from '@/lib/actions/admin';
import { cn } from '@/lib/utils';
import type { AdminSession } from '@/lib/auth';

const NAV = [
  { href: SITE_PATHS.admin, label: 'Tableau de bord', icon: LayoutDashboard, exact: true },
  { href: SITE_PATHS.adminArticles, label: 'Articles', icon: FileText },
  { href: SITE_PATHS.adminCategories, label: 'Catégories', icon: FolderTree },
  { href: SITE_PATHS.adminComments, label: 'Commentaires', icon: MessageSquare },
  { href: SITE_PATHS.adminAudience, label: 'Audience', icon: Globe2 },
  { href: SITE_PATHS.adminNewsletter, label: 'Newsletter', icon: Mails },
];

/**
 * Ossature du back-office : barre supérieure sobre + navigation latérale.
 *
 * Le panneau d'administration possède son propre chrome, entièrement distinct
 * du site public. Un rédacteur connecté n'a pas à voir le menu des catégories,
 * la barre de recherche des lecteurs, le formulaire d'inscription à la
 * newsletter ni les mentions légales : ce sont des éléments destinés aux
 * visiteurs, pas à l'outil de travail.
 *
 * Ce composant est client uniquement pour surligner l'entrée active
 * (usePathname) et piloter le tiroir mobile. Les données qu'il affiche restent
 * rendues côté serveur.
 */
export function AdminShell({
  session,
  children,
}: {
  session: AdminSession;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const [isDrawerOpen, setDrawerOpen] = useState(false);

  const isActive = (href: string, exact?: boolean) =>
    exact ? pathname === href : pathname === href || pathname.startsWith(`${href}/`);

  const initials = (session.profile.full_name ?? session.email)
    .split(' ')
    .map((part) => part[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();

  const navigation = (
    <nav aria-label="Navigation du back-office" className="space-y-1">
      {NAV.map(({ href, label, icon: Icon, exact }) => {
        const active = isActive(href, exact);
        return (
          <Link
            key={href}
            href={href}
            onClick={() => setDrawerOpen(false)}
            aria-current={active ? 'page' : undefined}
            className={cn(
              'flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors',
              active
                ? 'bg-accent/15 text-ink ring-1 ring-accent/40'
                : 'text-muted hover:bg-elevated hover:text-ink'
            )}
          >
            <Icon className={cn('h-4 w-4', active ? 'text-lime' : 'text-faint')} />
            {label}
          </Link>
        );
      })}
    </nav>
  );

  return (
    <div className="flex min-h-screen flex-col">
      {/* BARRE SUPÉRIEURE — propre au back-office */}
      <header className="sticky top-0 z-40 border-b border-line bg-void/90 backdrop-blur-xl">
        <div className="mx-auto flex h-14 w-full max-w-[1400px] items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setDrawerOpen(true)}
              aria-label="Ouvrir le menu d’administration"
              className="rounded-lg p-1.5 text-muted hover:bg-elevated hover:text-ink lg:hidden"
            >
              <Menu className="h-5 w-5" />
            </button>

            <Link href={SITE_PATHS.admin} className="flex items-center gap-2.5">
              <span
                aria-hidden
                className="flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br from-accent to-lime p-0.5"
              >
                <span className="flex h-full w-full items-center justify-center rounded-[6px] bg-base">
                  <Cpu className="h-3.5 w-3.5 text-lime" />
                </span>
              </span>
              <span className="text-sm font-bold text-ink">
                {' '}
                IA Décodée
                <span className="ml-2 font-mono text-[11px] font-normal uppercase tracking-widest text-faint">
                  Administration
                </span>
              </span>
            </Link>
          </div>

          <div className="flex items-center gap-2">
            <Link
              href={SITE_PATHS.home}
              target="_blank"
              rel="noopener noreferrer"
              className="hidden items-center gap-2 rounded-lg px-3 py-1.5 text-xs text-muted transition-colors hover:bg-elevated hover:text-ink sm:flex"
            >
              <ExternalLink className="h-3.5 w-3.5" />
              Voir le site
            </Link>

            <span
              aria-hidden
              className="flex h-8 w-8 items-center justify-center rounded-lg bg-accent/20 text-[11px] font-bold text-lime ring-1 ring-accent/40"
              title={session.email}
            >
              {initials}
            </span>
          </div>
        </div>
      </header>

      <div className="mx-auto flex w-full max-w-[1400px] flex-1 gap-8 px-4 py-8 sm:px-6 lg:px-8">
        {/* NAVIGATION LATÉRALE — écrans larges */}
        <aside className="hidden w-60 shrink-0 lg:block">
          <div className="sticky top-24 space-y-6">
            <div className="surface-panel rounded-2xl p-4">
              <p className="truncate text-sm font-semibold text-ink">
                {session.profile.full_name ?? 'Administrateur'}
              </p>
              <p className="truncate font-mono text-[11px] text-faint">{session.email}</p>
              <span className="eyebrow mt-3 w-full justify-center">
                {session.profile.role === 'admin' ? 'Administrateur' : 'Rédacteur'}
              </span>
            </div>

            {navigation}

            <div className="border-t border-line pt-4">
              <form action={signOut}>
                <button
                  type="submit"
                  className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-muted transition-colors hover:bg-danger/10 hover:text-danger"
                >
                  <LogOut className="h-4 w-4" />
                  Se déconnecter
                </button>
              </form>
            </div>
          </div>
        </aside>

        {/* TIROIR — mobile */}
        {isDrawerOpen && (
          <div className="fixed inset-0 z-50 lg:hidden">
            <button
              type="button"
              aria-label="Fermer le menu"
              onClick={() => setDrawerOpen(false)}
              className="absolute inset-0 bg-black/70 backdrop-blur-sm"
            />
            <div className="absolute left-0 top-0 h-full w-72 space-y-6 overflow-y-auto border-r border-line bg-surface p-5">
              <div className="flex items-center justify-between">
                <span className="font-mono text-xs uppercase tracking-widest text-lime">
                  Administration
                </span>
                <button
                  type="button"
                  onClick={() => setDrawerOpen(false)}
                  aria-label="Fermer le menu"
                  className="rounded-lg p-1 text-muted hover:text-ink"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              {navigation}

              <div className="space-y-2 border-t border-line pt-4">
                <Link
                  href={SITE_PATHS.home}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-muted hover:bg-elevated hover:text-ink"
                >
                  <ExternalLink className="h-4 w-4" />
                  Voir le site
                </Link>

                <form action={signOut}>
                  <button type="submit" className="btn btn-ghost w-full">
                    <LogOut className="h-4 w-4" />
                    Se déconnecter
                  </button>
                </form>
              </div>
            </div>
          </div>
        )}

        <main className="min-w-0 flex-1">{children}</main>
      </div>
    </div>
  );
}
