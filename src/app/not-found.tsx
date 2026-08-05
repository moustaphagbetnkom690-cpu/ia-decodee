import Link from 'next/link';
import { Compass, ArrowLeft } from 'lucide-react';
import { SITE_PATHS, CATEGORIES_LIST } from '@/lib/site-links';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';

/**
 * Page 404 des URL qui ne correspondent à aucune route.
 *
 * Next.js impose que ce fichier vive à la RACINE de `app/` pour intercepter les
 * adresses inconnues. Il est donc rendu par le layout racine, qui ne contient
 * plus ni en-tête ni pied de page depuis la séparation des chromes : on les
 * réintroduit ici explicitement, sans quoi un visiteur égaré se retrouverait sur
 * une page sans aucune navigation.
 */
export default function NotFound() {
  return (
    <>
      <Header />
      <main className="bg-neural flex min-h-[70vh] flex-1 items-center justify-center px-4 py-20">
      <div className="w-full max-w-lg space-y-6 text-center">
        <span className="eyebrow mx-auto">Erreur 404</span>

        <div>
          <p className="font-mono text-6xl font-bold text-gradient">404</p>
          <h1 className="mt-4 text-2xl font-bold text-ink">Cette page n’existe pas</h1>
          <p className="mt-2 text-sm text-muted">
            Le lien est peut-être obsolète, ou l’article a été retiré.
          </p>
        </div>

        <div className="flex flex-wrap justify-center gap-3">
          <Link href={SITE_PATHS.home} className="btn btn-primary">
            <ArrowLeft className="h-4 w-4" />
            Retour à l’accueil
          </Link>
          <Link href={SITE_PATHS.blog} className="btn btn-ghost">
            <Compass className="h-4 w-4" />
            Parcourir les articles
          </Link>
        </div>

        <div className="border-t border-line pt-6">
          <p className="mb-3 font-mono text-[11px] uppercase tracking-widest text-faint">
            Explorer par thème
          </p>
          <div className="flex flex-wrap justify-center gap-2">
            {CATEGORIES_LIST.map((category) => (
              <Link
                key={category.slug}
                href={category.href}
                className="rounded-full border border-line px-3 py-1.5 text-xs text-muted transition-colors hover:border-accent hover:text-ink"
              >
                {category.name}
              </Link>
            ))}
          </div>
        </div>
      </div>
      </main>
      <Footer />
    </>
  );
}
