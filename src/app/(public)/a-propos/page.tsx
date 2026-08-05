
import { Metadata } from 'next';
import Link from 'next/link';
import { siteConfig } from '@/lib/site-config';
import { SITE_PATHS } from '@/lib/site-links';
import { Cpu, ShieldCheck, Zap, Heart, ArrowRight } from 'lucide-react';

export const metadata: Metadata = {
  title: 'À Propos — IA Décodée',
  description: 'Découvrez notre ligne éditoriale, notre équipe et notre mission pour vulgariser l’IA.',
};

export default function AboutPage() {
  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12 space-y-12">
      
      {/* HEADER */}
      <div className="space-y-3 text-center">
        <span className="eyebrow">Manifeste & Équipe</span>
        <h1 className="text-3xl sm:text-5xl font-extrabold text-ink">
          À propos d&apos;<span className="text-gradient">{siteConfig.name}</span>
        </h1>
        <p className="text-sm sm:text-base text-muted max-w-2xl mx-auto leading-relaxed">
          Le média indépendant d&apos;information et de formation pratique qui décode les révolutions de l&apos;Intelligence Artificielle sans sensationnalisme.
        </p>
      </div>

      {/* MISSION */}
      <div className="surface-panel p-8 rounded-3xl border border-line space-y-6">
        <h2 className="text-xl sm:text-2xl font-bold text-ink flex items-center gap-2">
          <Cpu className="w-6 h-6 text-accent" />
          Notre Mission Éditoriale
        </h2>
        <p className="text-sm text-muted leading-relaxed">
          Fondé avec la conviction que l&apos;IA doit être comprise par le plus grand nombre, <strong className="text-ink">IA Décodée</strong> propose des décryptages rigoureux, des benchmarks objectifs de modèles (LLM, vision, audio) et des guides d&apos;ingénierie de prompt directement applicables au quotidien professionnel.
        </p>
        <p className="text-sm text-muted leading-relaxed">
          Notre cible principale couvre la France, la Belgique, la Suisse et l&apos;Afrique francophone. Nous nous adressons aussi bien aux professionnels du Web et développeurs qu&apos;aux passionnés désireux de s&apos;approprier ces nouveaux outils sans se faire piéger par le bruit médiatique.
        </p>
      </div>

      {/* ENGAGEMENTS */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="surface-card p-6 rounded-2xl border border-line space-y-3">
          <div className="w-10 h-10 rounded-xl bg-accent/15 border border-accent/30 flex items-center justify-center text-accent">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <h3 className="text-base font-bold text-ink">Rigueur & Transparence</h3>
          <p className="text-xs text-muted leading-relaxed">
            Chaque test de modèle est chiffré, daté et reproductible. Nous indiquons clairement nos méthodologies de benchmark.
          </p>
        </div>

        <div className="surface-card p-6 rounded-2xl border border-line space-y-3">
          <div className="w-10 h-10 rounded-xl bg-lime/15 border border-lime/30 flex items-center justify-center text-lime">
            <Zap className="w-5 h-5" />
          </div>
          <h3 className="text-base font-bold text-ink">100% Pratique</h3>
          <p className="text-xs text-muted leading-relaxed">
            Pas de spéculations théoriques sans fin : nous fournissons des extraits de code, des templates de prompt et des cas d&apos;usage métier.
          </p>
        </div>

        <div className="surface-card p-6 rounded-2xl border border-line space-y-3">
          <div className="w-10 h-10 rounded-xl bg-info/15 border border-info/30 flex items-center justify-center text-info">
            <Heart className="w-5 h-5" />
          </div>
          <h3 className="text-base font-bold text-ink">Indépendance Éditoriale</h3>
          <p className="text-xs text-muted leading-relaxed">
            Financé de manière transparente via l&apos;affichage publicitaire (Google AdSense) et des partenariats d&apos;affiliation explicites.
          </p>
        </div>
      </div>

      {/* TRANSMISSION DE CONTACT */}
      <div className="surface-panel p-8 rounded-3xl border border-accent/30 text-center space-y-4 bg-neural">
        <h2 className="text-xl font-bold text-ink">Une question ou une proposition de partenariat ?</h2>
        <p className="text-xs text-muted max-w-xl mx-auto">
          N&apos;hésitez pas à nous écrire pour toute suggestion d&apos;article, retour sur nos benchmarks ou demande de collaboration.
        </p>
        <Link
          href={SITE_PATHS.contact}
          className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-accent hover:bg-accent-hover text-ink text-xs font-bold transition-all"
        >
          Accéder au Formulaire de Contact
          <ArrowRight className="w-4 h-4" />
        </Link>
      </div>

    </div>
  );
}
