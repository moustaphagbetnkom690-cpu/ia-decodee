'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Article, Category } from '@/lib/types';
import { SITE_PATHS } from '@/lib/site-links';
import { AdBanner } from './AdBanner';
import { Search, Flame, Tag } from 'lucide-react';

export interface SidebarProps {
  popularArticles?: Article[];
  categories?: Category[];
}

export function Sidebar({ popularArticles = [], categories = [] }: SidebarProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const router = useRouter();

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      router.push(`${SITE_PATHS.blog}?q=${encodeURIComponent(searchQuery.trim())}`);
    }
  };

  return (
    <aside className="space-y-8">
      
      {/* WIDGET 1 : RECHERCHE */}
      <div className="surface-panel p-5 rounded-2xl border border-line">
        <h3 className="text-xs font-mono uppercase tracking-widest text-lime mb-3 flex items-center gap-2">
          <Search className="w-3.5 h-3.5" />
          Rechercher un sujet
        </h3>
        <form onSubmit={handleSearchSubmit} className="relative">
          <input
            type="text"
            placeholder="ex: LLM, Prompts, Claude..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-base border border-line focus:border-accent rounded-xl px-4 py-2.5 text-xs text-ink placeholder-faint focus:outline-none"
          />
          <button
            type="submit"
            className="absolute right-2 top-2 p-1 text-accent hover:text-lime"
            aria-label="Lancer la recherche"
          >
            <Search className="w-4 h-4" />
          </button>
        </form>
      </div>

      {/* WIDGET 2 : ARTICLES POPULAIRES */}
      {popularArticles.length > 0 && (
        <div className="surface-panel p-5 rounded-2xl border border-line">
          <h3 className="text-xs font-mono uppercase tracking-widest text-accent mb-4 flex items-center gap-2">
            <Flame className="w-4 h-4 text-accent" />
            Articles les plus lus
          </h3>
          <div className="space-y-3">
            {popularArticles.slice(0, 4).map((art, idx) => (
              <Link
                key={art.id}
                href={SITE_PATHS.article(art.slug)}
                className="group flex items-start gap-3 p-2 rounded-lg hover:bg-elevated transition-colors"
              >
                <span className="font-mono text-base font-extrabold text-accent/60 group-hover:text-lime">
                  0{idx + 1}
                </span>
                <div className="flex-1 space-y-1">
                  <h4 className="text-xs font-semibold text-ink group-hover:text-lime transition-colors line-clamp-2 leading-snug">
                    {art.title}
                  </h4>
                  <span className="text-[10px] font-mono text-faint block">
                    {(art.views ?? 0).toLocaleString('fr-FR')} lectures
                  </span>
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* WIDGET 3 : PUB ADSENSE STICKY */}
      <div className="sticky top-24">
        <AdBanner format="rectangle" label="Sponsorisé" slotId="9876543210" />

        {/* WIDGET 4 : CATÉGORIES */}
        {categories.length > 0 && (
          <div className="surface-panel p-5 rounded-2xl border border-line mt-6">
            <h3 className="text-xs font-mono uppercase tracking-widest text-ink mb-3 flex items-center gap-2">
              <Tag className="w-3.5 h-3.5 text-lime" />
              Catégories IA
            </h3>
            <div className="flex flex-wrap gap-2">
              {categories.map((cat) => (
                <Link
                  key={cat.slug}
                  href={SITE_PATHS.category(cat.slug)}
                  className="text-xs font-mono px-3 py-1.5 rounded-lg border border-line bg-base hover:border-accent text-muted hover:text-ink transition-colors flex items-center gap-1.5"
                >
                  <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: cat.color }} />
                  {cat.name}
                </Link>
              ))}
            </div>
          </div>
        )}
      </div>

    </aside>
  );
}
