import { ImageResponse } from 'next/og';
import { getArticleBySlug } from '@/lib/api-articles';
import { siteConfig } from '@/lib/site-config';

/**
 * Image de partage propre à chaque article.
 *
 * Un lecteur qui partage un article voit désormais son TITRE dans la vignette,
 * au lieu de la même image générique pour tout le site — ce qui change beaucoup
 * le taux de clic sur LinkedIn et X, les deux réseaux où circule ce type de
 * contenu.
 *
 * L'image est générée au build pour les articles pré-rendus, puis à la demande
 * et mise en cache pour ceux publiés plus tard.
 *
 * Voir `src/app/opengraph-image.tsx` pour les contraintes de rendu de Satori.
 */

export const alt = 'Article — IA Décodée';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

/**
 * Tronque proprement sur un mot entier.
 * Un titre coupé au milieu d'un mot fait négligé sur une vignette de partage,
 * et les titres de ce site sont longs par choix éditorial.
 */
function tronquer(texte: string, max: number): string {
  if (texte.length <= max) return texte;
  const coupe = texte.slice(0, max);
  const dernierEspace = coupe.lastIndexOf(' ');
  return `${coupe.slice(0, dernierEspace > 0 ? dernierEspace : max)}…`;
}

export default async function Image({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const article = await getArticleBySlug(slug);

  // Un slug inconnu ou un brouillon ne doit pas faire échouer la génération :
  // on retombe sur le nom du site plutôt que de propager une erreur qui
  // casserait le rendu de la page entière.
  const titre = article ? tronquer(article.title, 105) : siteConfig.name;
  const categorie = article?.category?.name ?? 'IA Décodée';
  const lecture = article?.reading_time_minutes;

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
          backgroundImage:
            'radial-gradient(circle at 85% 10%, rgba(124,92,255,0.32) 0%, rgba(10,10,15,0) 55%)',
          padding: '68px',
        }}
      >
        {/* Bandeau supérieur : catégorie */}
        <div style={{ display: 'flex', alignItems: 'center' }}>
          <div
            style={{
              display: 'flex',
              paddingLeft: '20px',
              paddingRight: '20px',
              paddingTop: '10px',
              paddingBottom: '10px',
              borderRadius: '999px',
              border: '2px solid #7c5cff',
              color: '#a58fff',
              fontSize: '24px',
              fontWeight: 600,
            }}
          >
            {categorie}
          </div>
        </div>

        {/* Titre de l'article */}
        <div
          style={{
            display: 'flex',
            color: '#f5f5fa',
            fontSize: titre.length > 70 ? '54px' : '64px',
            fontWeight: 700,
            lineHeight: 1.18,
            letterSpacing: '-0.02em',
          }}
        >
          {titre}
        </div>

        {/* Pied : marque + temps de lecture */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center' }}>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: '52px',
                height: '52px',
                borderRadius: '14px',
                backgroundColor: '#7c5cff',
                color: '#ffffff',
                fontSize: '24px',
                fontWeight: 700,
              }}
            >
              IA
            </div>
            <div
              style={{
                marginLeft: '18px',
                color: '#f5f5fa',
                fontSize: '30px',
                fontWeight: 700,
              }}
            >
              {siteConfig.name}
            </div>
          </div>

          {lecture ? (
            <div style={{ display: 'flex', color: '#c6f24e', fontSize: '26px', fontWeight: 600 }}>
              {lecture} min de lecture
            </div>
          ) : (
            <div style={{ display: 'flex', color: '#a0a0b8', fontSize: '26px' }}>
              ia-decodee.tech
            </div>
          )}
        </div>
      </div>
    ),
    size
  );
}
