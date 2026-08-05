
import { Metadata } from 'next';
import { siteConfig } from '@/lib/site-config';

export const metadata: Metadata = {
  title: 'Mentions Légales — IA Décodée',
  description: 'Mentions légales et informations réglementaires du site IA Décodée.',
};

export default function LegalPage() {
  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12 space-y-8">
      <div className="space-y-2 border-b border-line pb-6">
        <h1 className="text-3xl font-extrabold text-ink">Mentions Légales</h1>
        <p className="text-xs font-mono text-faint">Dernière mise à jour : 2026</p>
      </div>

      <div className="prose-neural text-sm space-y-6">
        <section className="space-y-2">
          <h2 className="text-lg font-bold text-ink">1. Éditeur du site</h2>
          <p>
            Le site <strong>{siteConfig.name}</strong> ({siteConfig.url}) est un média d&apos;information numérique spécialisé dans l&apos;Intelligence Artificielle.
          </p>
          <p>
            <strong>Responsable de la publication :</strong> {siteConfig.author.name}<br />
            <strong>Contact :</strong> via notre formulaire de contact ou à l&apos;adresse de la rédaction.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-lg font-bold text-ink">2. Hébergement</h2>
          <p>
            Le site est hébergé par <strong>Vercel Inc.</strong><br />
            Adresse : 440 N Barranca Ave #4133, Covina, CA 91723, États-Unis.<br />
            Infrastructure de base de données : <strong>Supabase Inc.</strong>
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-lg font-bold text-ink">3. Propriété Intellectuelle</h2>
          <p>
            L&apos;ensemble des contenus (textes, visuels, identité graphique, structure) présents sur le site sont protégés par le droit d&apos;auteur. Toute reproduction totale ou partielle sans autorisation préalable écrite est strictement interdite.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-lg font-bold text-ink">4. Monétisation & Publicité</h2>
          <p>
            {siteConfig.name} participe au programme d&apos;affiliation et diffuse des annonces publicitaires via la régie Google AdSense. Ces annonces permettent de financer la gratuité et la production de nos analyses.
          </p>
        </section>
      </div>
    </div>
  );
}
