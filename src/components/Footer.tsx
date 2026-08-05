import Link from 'next/link';
import { Cpu, Lock } from 'lucide-react';
import { siteConfig } from '@/lib/site-config';
import { CATEGORIES_LIST, SITE_PATHS } from '@/lib/site-links';
import { NewsletterForm } from '@/components/NewsletterForm';

/**
 * Pied de page.
 *
 * Deux changements notables :
 *
 *  1. L'accès à l'administration n'est plus un lien de navigation mis en avant.
 *     Il se réduit à une icône discrète dans la ligne de copyright, sans libellé
 *     visible. Ce n'est évidemment pas une mesure de sécurité — la protection
 *     réelle vient de proxy.ts et des policies RLS — mais cela évite d'exposer
 *     le back-office dans l'interface de tous les visiteurs.
 *
 *  2. Le composant est redevenu un Server Component. Seul le formulaire de
 *     newsletter a besoin d'interactivité : il est isolé dans son propre
 *     composant client, si bien que le reste du pied de page n'est plus envoyé
 *     au navigateur sous forme de JavaScript.
 */
export function Footer() {
  return (
    <footer className="mt-20 border-t border-line bg-void pb-10 pt-16 text-muted">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* IDENTITÉ + NEWSLETTER */}
        <div className="grid grid-cols-1 gap-10 border-b border-line pb-12 lg:grid-cols-12">
          <div className="space-y-4 lg:col-span-6">
            <Link href={SITE_PATHS.home} className="flex items-center gap-3">
              <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-accent to-lime p-0.5">
                <div className="flex h-full w-full items-center justify-center rounded-[10px] bg-base">
                  <Cpu className="h-4 w-4 text-lime" />
                </div>
              </div>
              <span className="text-xl font-bold tracking-tight text-ink">
                {siteConfig.name}
              </span>
            </Link>

            <p className="max-w-md text-sm leading-relaxed">{siteConfig.description}</p>

            <span className="eyebrow">France · Belgique · Suisse · Afrique francophone</span>
          </div>

          <div className="lg:col-span-6">
            <NewsletterForm />
          </div>
        </div>

        {/* LIENS */}
        <div className="grid grid-cols-2 gap-8 border-b border-line py-12 md:grid-cols-4">
          <div>
            <h2 className="mb-4 font-mono text-xs uppercase tracking-widest text-lime">
              Catégories
            </h2>
            <ul className="space-y-2.5 text-xs">
              {CATEGORIES_LIST.map((category) => (
                <li key={category.slug}>
                  <Link href={category.href} className="transition-colors hover:text-ink">
                    {category.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h2 className="mb-4 font-mono text-xs uppercase tracking-widest text-accent-soft">
              Piliers éditoriaux
            </h2>
            <ul className="space-y-2.5 text-xs">
              <li>
                <Link
                  href={SITE_PATHS.category('comparatifs')}
                  className="transition-colors hover:text-ink"
                >
                  Comparatifs de modèles
                </Link>
              </li>
              <li>
                <Link
                  href={SITE_PATHS.category('guides-prompts')}
                  className="transition-colors hover:text-ink"
                >
                  Guide du prompt engineering
                </Link>
              </li>
              <li>
                <Link
                  href={SITE_PATHS.category('modeles')}
                  className="transition-colors hover:text-ink"
                >
                  Comprendre les LLM
                </Link>
              </li>
              <li>
                <Link
                  href={SITE_PATHS.category('outils')}
                  className="transition-colors hover:text-ink"
                >
                  Meilleurs outils IA
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <h2 className="mb-4 font-mono text-xs uppercase tracking-widest text-ink">
              Navigation
            </h2>
            <ul className="space-y-2.5 text-xs">
              <li>
                <Link href={SITE_PATHS.home} className="transition-colors hover:text-ink">
                  Accueil
                </Link>
              </li>
              <li>
                <Link href={SITE_PATHS.blog} className="transition-colors hover:text-ink">
                  Tous les articles
                </Link>
              </li>
              <li>
                <Link href={SITE_PATHS.about} className="transition-colors hover:text-ink">
                  À propos
                </Link>
              </li>
              <li>
                <Link href={SITE_PATHS.contact} className="transition-colors hover:text-ink">
                  Contact
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <h2 className="mb-4 font-mono text-xs uppercase tracking-widest text-ink">Légal</h2>
            <ul className="space-y-2.5 text-xs">
              <li>
                <Link href={SITE_PATHS.legal} className="transition-colors hover:text-ink">
                  Mentions légales
                </Link>
              </li>
              <li>
                <Link href={SITE_PATHS.privacy} className="transition-colors hover:text-ink">
                  Politique de confidentialité
                </Link>
              </li>
            </ul>
          </div>
        </div>

        {/* COPYRIGHT + ACCÈS RÉDACTION DISCRET */}
        <div className="flex flex-col items-center justify-between gap-4 pt-8 text-xs text-faint md:flex-row">
          <p>
            © {new Date().getFullYear()} {siteConfig.name}. Média francophone indépendant.
          </p>

          <div className="flex items-center gap-4">
            <p className="font-mono text-[11px]">Next.js · Tailwind · Supabase</p>

            {/* Point d'entrée du back-office : volontairement effacé, sans
                libellé visible, révélé au survol et au focus clavier. */}
            <Link
              href={SITE_PATHS.adminLogin}
              aria-label="Espace rédaction"
              title="Espace rédaction"
              rel="nofollow"
              className="rounded-md p-1.5 text-faint/30 transition-colors hover:text-accent-soft focus-visible:text-accent-soft"
            >
              <Lock className="h-3.5 w-3.5" />
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
