
import { Metadata } from 'next';
import { siteConfig } from '@/lib/site-config';

export const metadata: Metadata = {
  title: 'Politique de Confidentialité — IA Décodée',
  description: 'Politique de traitement des données personnelles et d usage des cookies RGPD.',
};

export default function PrivacyPage() {
  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12 space-y-8">
      <div className="space-y-2 border-b border-line pb-6">
        <h1 className="text-3xl font-extrabold text-ink">Politique de Confidentialité</h1>
        <p className="text-xs font-mono text-faint">Conformité RGPD & Google AdSense</p>
      </div>

      <div className="prose-neural text-sm space-y-6">
        <section className="space-y-2">
          <h2 className="text-lg font-bold text-ink">1. Collecte des données personnelles</h2>
          <p>
            Sur <strong>{siteConfig.name}</strong>, les seules données collectées directement sont :
          </p>
          <ul className="list-disc pl-5">
            <li>Votre adresse e-mail lors de l&apos;inscription à la newsletter.</li>
            <li>Votre nom et e-mail lors de la soumission d&apos;un commentaire (l&apos;e-mail est conservé de manière strictement confidentielle et n&apos;est jamais affiché publiquement).</li>
          </ul>
        </section>

        <section className="space-y-2">
          <h2 className="text-lg font-bold text-ink">2. Mesure d&apos;audience</h2>
          <p>
            Nous mesurons la fréquentation du site <strong>sans déposer aucun cookie</strong> et
            sans recourir à un service tiers. À chaque page consultée, nous enregistrons la page
            visitée, le pays d&apos;origine de la connexion, la page de provenance et le type de
            navigateur.
          </p>
          <p>
            <strong>Votre adresse IP n&apos;est jamais conservée.</strong> Pour distinguer deux
            visiteurs d&apos;un même visiteur qui recharge une page, nous calculons une empreinte
            technique à partir de votre adresse IP, de votre navigateur et de la date du jour. Cette
            empreinte est chiffrée à sens unique : elle ne permet pas de remonter à votre adresse
            IP, ni de vous identifier. Elle <strong>change chaque jour</strong>, ce qui rend
            impossible tout suivi d&apos;une journée sur l&apos;autre, y compris de notre part. Elle
            est effacée au bout de vingt-quatre heures.
          </p>
          <p>
            Cette méthode est celle des outils de mesure respectueux de la vie privée. Elle nous
            permet de savoir combien de personnes lisent nos articles, sans jamais constituer de
            profil individuel.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-lg font-bold text-ink">3. Cookies et Google AdSense</h2>
          <p>
            Nous utilisons des tiers, notamment <strong>Google AdSense</strong>, pour diffuser des annonces lorsque vous visitez notre site Web. Ces sociétés peuvent utiliser des informations sur vos visites sur ce site et d&apos;autres sites Web afin de fournir des publicités sur des biens et services qui vous intéressent.
          </p>
          <p>
            Les cookies Google DoubleClick permettent à Google et à ses partenaires de diffuser des annonces auprès de nos utilisateurs en fonction de leur visite sur nos sites et/ou d&apos;autres sites sur Internet.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-lg font-bold text-ink">4. Vos Droits (RGPD)</h2>
          <p>
            Conformément au Règlement Général sur la Protection des Données (RGPD), vous disposez d&apos;un droit d&apos;accès, de rectification, d&apos;effacement et d&apos;opposition concernant vos données personnelles. Vous pouvez exercer ce droit à tout moment via notre formulaire de contact.
          </p>
        </section>
      </div>
    </div>
  );
}
