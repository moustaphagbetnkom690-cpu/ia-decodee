import { ImageResponse } from 'next/og';
import { siteConfig } from '@/lib/site-config';

/**
 * Image de partage par défaut du site.
 *
 * Elle remplace `/images/og-image.jpg`, qui était déclaré partout dans les
 * métadonnées mais **n'a jamais existé** : l'audit du 5 août 2026 a constaté un
 * 404 en production, donc une vignette vide sur chaque partage LinkedIn, X,
 * WhatsApp ou Facebook. Le fichier `public/images/` n'existait même pas.
 *
 * Générer l'image par le code plutôt que de déposer un JPEG a trois avantages
 * concrets : rien à recréer quand la charte change, aucun binaire à versionner,
 * et une image toujours cohérente avec les couleurs déclarées dans globals.css.
 *
 * Next la produit une seule fois au build et la met en cache.
 *
 * ATTENTION en modifiant ce fichier : le moteur de rendu (Satori) ne comprend
 * qu'un sous-ensemble de CSS. Pas de grid, pas de position absolue exotique, et
 * tout conteneur ayant plusieurs enfants DOIT porter `display: flex` explicite —
 * sans quoi le build échoue avec une erreur peu parlante.
 */

export const alt = `${siteConfig.name} — ${siteConfig.tagline}`;
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

export default async function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          backgroundColor: '#0a0a0f',
          // Halo violet en haut à gauche : rappelle le dégradé de l'en-tête.
          backgroundImage:
            'radial-gradient(circle at 15% 15%, rgba(124,92,255,0.35) 0%, rgba(10,10,15,0) 55%)',
          padding: '72px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center' }}>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: '64px',
              height: '64px',
              borderRadius: '18px',
              backgroundColor: '#7c5cff',
              color: '#ffffff',
              fontSize: '30px',
              fontWeight: 700,
            }}
          >
            IA
          </div>
          <div
            style={{
              marginLeft: '24px',
              color: '#f5f5fa',
              fontSize: '38px',
              fontWeight: 700,
            }}
          >
            {siteConfig.name}
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <div
            style={{
              color: '#f5f5fa',
              fontSize: '62px',
              fontWeight: 700,
              lineHeight: 1.15,
              letterSpacing: '-0.02em',
            }}
          >
            {siteConfig.tagline}
          </div>
          <div
            style={{
              display: 'flex',
              marginTop: '32px',
              alignItems: 'center',
            }}
          >
            <div style={{ width: '72px', height: '6px', backgroundColor: '#c6f24e' }} />
            <div style={{ marginLeft: '20px', color: '#a0a0b8', fontSize: '26px' }}>
              ia-decodee.tech
            </div>
          </div>
        </div>
      </div>
    ),
    size
  );
}
