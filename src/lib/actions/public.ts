'use server';

import { revalidatePath } from 'next/cache';
import { createClient, createPublicClient } from '@/lib/supabase/server';
import { getVisitorGeo } from '@/lib/geo';
import { isValidEmail } from '@/lib/utils';
import { limiter } from '@/lib/rate-limit';

/**
 * Actions déclenchées par les visiteurs (non authentifiés).
 *
 * Principe directeur : ne jamais faire confiance aux données du formulaire.
 * Le statut d'un commentaire, le pays d'un abonné et l'horodatage sont décidés
 * ici, côté serveur. La policy RLS `comments_insert_public_pending` impose de
 * son côté status = 'pending' : même une requête forgée à la main ne peut pas
 * publier un commentaire directement approuvé.
 */

export interface PublicActionResult {
  ok: boolean;
  message: string;
}

/* -------------------------------------------------------------------------- */
/* NEWSLETTER                                                                  */
/* -------------------------------------------------------------------------- */

export async function subscribeToNewsletter(
  _prev: PublicActionResult | null,
  formData: FormData
): Promise<PublicActionResult> {
  const email = ((formData.get('email') as string) ?? '').trim().toLowerCase();

  // Pot de miel : un champ caché que seuls les robots remplissent. On simule un
  // succès pour ne pas leur indiquer qu'ils ont été détectés.
  const honeypot = (formData.get('site_web') as string) ?? '';
  if (honeypot) {
    return { ok: true, message: 'Inscription confirmée.' };
  }

  if (!isValidEmail(email)) {
    return { ok: false, message: 'Cette adresse e-mail semble invalide.' };
  }

  // 3 inscriptions par heure et par adresse IP. Personne ne s'inscrit
  // légitimement quatre fois, et cela suffit à décourager le remplissage
  // automatisé de la table.
  const quota = await limiter('newsletter', 3, 3600);
  if (!quota.autorise) {
    return { ok: false, message: 'Trop de tentatives. Réessayez dans quelques minutes.' };
  }

  const supabase = await createClient();
  if (!supabase) {
    return { ok: false, message: 'Service indisponible pour le moment.' };
  }

  const geo = await getVisitorGeo();

  const { error } = await supabase.from('newsletter_subscribers').insert({
    email,
    country_code: geo.countryCode,
    source: 'footer',
  });

  if (error) {
    // 23505 = violation de contrainte unique : l'adresse est déjà inscrite.
    // On répond par un message positif plutôt que de confirmer à un tiers la
    // présence d'une adresse donnée dans la base.
    if (error.code === '23505') {
      return { ok: true, message: 'Vous êtes déjà inscrit à la newsletter.' };
    }
    console.error('[newsletter] :', error.message);
    return { ok: false, message: 'L’inscription a échoué. Réessayez plus tard.' };
  }

  return { ok: true, message: 'Inscription confirmée. À très vite !' };
}

/* -------------------------------------------------------------------------- */
/* COMMENTAIRES                                                                */
/* -------------------------------------------------------------------------- */

export async function submitComment(
  _prev: PublicActionResult | null,
  formData: FormData
): Promise<PublicActionResult> {
  const articleId = ((formData.get('article_id') as string) ?? '').trim();
  const authorName = ((formData.get('author_name') as string) ?? '').trim();
  const authorEmail = ((formData.get('author_email') as string) ?? '').trim().toLowerCase();
  const content = ((formData.get('content') as string) ?? '').trim();
  const honeypot = (formData.get('site_web') as string) ?? '';

  if (honeypot) {
    return { ok: true, message: 'Votre commentaire a bien été transmis.' };
  }

  if (!articleId) return { ok: false, message: 'Article introuvable.' };
  if (authorName.length < 2) return { ok: false, message: 'Indiquez un nom d’au moins 2 caractères.' };
  if (!isValidEmail(authorEmail)) return { ok: false, message: 'Cette adresse e-mail semble invalide.' };
  if (content.length < 2) return { ok: false, message: 'Votre commentaire est trop court.' };
  if (content.length > 5000) return { ok: false, message: 'Votre commentaire dépasse 5000 caractères.' };

  // 5 commentaires par quart d'heure. Un lecteur qui répond à plusieurs
  // paragraphes reste à l'aise ; un script qui boucle est arrêté net.
  const quota = await limiter('commentaire', 5, 900);
  if (!quota.autorise) {
    return {
      ok: false,
      message: `Trop de commentaires envoyés. Patientez ${quota.attendreSecondes} secondes.`,
    };
  }

  // L'article doit exister ET être publié.
  //
  // Sans ce contrôle, la policy RLS acceptait un commentaire sur n'importe quel
  // UUID d'article valide — y compris un BROUILLON. Un tiers pouvait ainsi
  // découvrir l'existence d'articles non publiés en sondant des identifiants, et
  // y déposer des commentaires qui apparaissaient à la publication. La lecture
  // passe par le client public : la policy `articles_select_published` masque
  // déjà les brouillons au rôle anonyme, la requête ne renvoie donc rien pour
  // eux, ce qui produit exactement le refus recherché.
  const lecteur = createPublicClient();
  if (lecteur) {
    const { data: article } = await lecteur
      .from('articles')
      .select('id')
      .eq('id', articleId)
      .eq('status', 'published')
      .maybeSingle();

    if (!article) return { ok: false, message: 'Article introuvable.' };
  }

  const supabase = await createClient();
  if (!supabase) {
    return { ok: false, message: 'Service indisponible pour le moment.' };
  }

  const { error } = await supabase.from('comments').insert({
    article_id: articleId,
    author_name: authorName,
    author_email: authorEmail,
    content,
    status: 'pending', // Décidé côté serveur, et vérifié par la policy RLS.
  });

  if (error) {
    // Contrairement à la version précédente, un échec d'insertion n'affiche plus
    // un faux message de succès : le visiteur sait que son commentaire est perdu
    // et peut le renvoyer.
    console.error('[commentaire] :', error.message);
    return { ok: false, message: 'L’envoi a échoué. Merci de réessayer.' };
  }

  revalidatePath('/admin/commentaires');

  return {
    ok: true,
    message: 'Merci ! Votre commentaire sera publié après validation par la rédaction.',
  };
}
