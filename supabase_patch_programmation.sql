-- ============================================================================
-- PROGRAMMATION DES PUBLICATIONS
-- À exécuter dans Supabase > SQL Editor. Idempotent : réexécutable sans risque.
-- ============================================================================
--
-- OBJECTIF
-- Permettre de fixer la date ET l'heure de parution d'un article, et garantir
-- qu'il reste invisible du public jusque-là.
--
-- CE QUI MANQUAIT
-- `published_at` existait déjà, mais n'était qu'un horodatage décoratif : il
-- était rempli avec NOW() à la création et plus jamais relu. La policy de
-- lecture ne regardait que `status`. Un article « publié » daté du mois
-- prochain était donc lisible immédiatement — la date affichée mentait.
--
-- LES DEUX COUCHES, ET POURQUOI LES DEUX
-- Le filtre est appliqué à la fois dans `src/lib/api-articles.ts` et dans la
-- policy ci-dessous. Ce n'est pas une redondance inutile :
--
--   - le code protège le site tant que ce patch n'a pas été exécuté ;
--   - la policy protège l'API PostgREST, interrogeable directement avec la
--     seule clé publique, sans passer par le serveur Next.
--
-- Retirer l'une des deux laisse un chemin ouvert vers un brouillon programmé.
--
-- LE FUSEAU
-- Rien à faire ici : `published_at` est un TIMESTAMPTZ, donc un instant absolu.
-- La saisie en heure de Paris et l'affichage en heure de Paris sont traités
-- côté application (`src/lib/utils.ts`, constante FUSEAU_SITE).
-- ============================================================================

-- ============================================================================
-- 1. LECTURE PUBLIQUE : PUBLIÉ *ET* ÉCHU
-- ============================================================================

DROP POLICY IF EXISTS "articles_select_published" ON public.articles;

CREATE POLICY "articles_select_published"
    ON public.articles FOR SELECT
    USING (
        (status = 'published' AND published_at <= NOW())
        OR public.is_admin()
    );

-- Rappel : is_admin() doit rester EXECUTE pour anon. Cette policy l'évalue à
-- chaque lecture publique, y compris anonyme ; lui révoquer ce droit vide le
-- blog en entier au lieu de le protéger.

-- ============================================================================
-- 2. INDEX
-- ============================================================================
--
-- L'index existant (status, published_at DESC) couvre déjà la nouvelle
-- condition : Postgres l'utilise pour l'égalité sur `status` puis la borne
-- supérieure sur `published_at`. Rien à ajouter, la ligne est rappelée ici pour
-- que la relecture du patch n'ait pas à le supposer.
CREATE INDEX IF NOT EXISTS idx_articles_status_published
    ON public.articles (status, published_at DESC);

-- ============================================================================
-- 3. VÉRIFICATION
-- ============================================================================
--
-- Avec la clé ANONYME (jamais la clé de service, qui contourne la RLS) :
--
--   INSERT INTO public.articles (title, slug, excerpt, content, status, published_at)
--   VALUES ('Test futur', 'test-futur', 'extrait de test',
--           repeat('x', 60), 'published', NOW() + INTERVAL '1 day');
--
--   SELECT count(*) FROM public.articles WHERE slug = 'test-futur';
--   -- doit renvoyer 0 pour un anonyme, 1 pour un administrateur.
--
--   DELETE FROM public.articles WHERE slug = 'test-futur';
-- ============================================================================
