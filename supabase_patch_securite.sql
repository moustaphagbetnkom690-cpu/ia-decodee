-- ============================================================================
-- PATCH DE SÉCURITÉ — IA DÉCODÉE
-- Issu de l'audit du 5 août 2026, le site étant en ligne sur ia-decodee.tech.
-- ----------------------------------------------------------------------------
-- À exécuter dans Supabase > SQL Editor. Idempotent : réexécutable sans risque.
-- Ne touche à aucune donnée éditoriale (articles, catégories, profils).
-- ============================================================================

-- ============================================================================
-- 1. FERMETURE DE LA FALSIFICATION DES STATISTIQUES        ← le correctif clé
-- ============================================================================
--
-- CE QUI A ÉTÉ CONSTATÉ, ET VÉRIFIÉ EN CONDITIONS RÉELLES :
-- `record_page_view` était accordé au rôle `anon` et recevait le pays en
-- paramètre. Or la clé anonyme est, par construction, lisible par tout visiteur
-- dans le bundle JavaScript. N'importe qui pouvait donc appeler le RPC en boucle
-- avec le pays de son choix, sans jamais passer par l'application.
--
-- Trois insertions depuis un pays inventé ont été acceptées (HTTP 204) pendant
-- l'audit. Conséquences possibles : page « Audience » rendue inexploitable,
-- compteurs de vues gonflés, et croissance illimitée de la table page_views.
--
-- Le RPC ne doit être appelable que par le serveur Next.js, qui seul détient la
-- clé de service et lit le pays dans les en-têtes de Vercel.

REVOKE EXECUTE ON FUNCTION public.record_page_view(TEXT, UUID, VARCHAR, VARCHAR, VARCHAR, TEXT, TEXT)
    FROM anon, authenticated, PUBLIC;

-- Même raisonnement : ce RPC incrémente un compteur sans aucun contrôle.
REVOKE EXECUTE ON FUNCTION public.increment_view_count(UUID)
    FROM anon, authenticated, PUBLIC;

-- L'insertion directe dans page_views était elle aussi ouverte à tous
-- (`WITH CHECK (true)`), ce qui offrait un second chemin vers le même abus.
DROP POLICY IF EXISTS "page_views_insert_public" ON public.page_views;

-- Le rôle `service_role` contourne la RLS : l'application continue d'écrire
-- normalement, sans qu'aucune policy publique ne soit nécessaire.

-- ============================================================================
-- 2. is_admin() DOIT RESTER EXÉCUTABLE PAR anon  ← NE PAS « CORRIGER »
-- ============================================================================
--
-- Une version antérieure de ce patch révoquait EXECUTE sur `is_admin()` pour
-- `anon`, au motif qu'une fonction d'autorisation n'a rien à faire dans la
-- surface publique. C'ÉTAIT UNE ERREUR, et elle a cassé la production.
--
-- La policy de lecture des articles s'écrit :
--
--     USING (status = 'published' OR public.is_admin())
--
-- PostgreSQL exige que le rôle APPELANT possède le droit EXECUTE sur toute
-- fonction citée dans une policy — même en SECURITY DEFINER, et même lorsque le
-- OR pourrait court-circuiter. Sans ce droit, toute lecture d'article par un
-- visiteur anonyme échoue avec « permission denied for function is_admin » : le
-- blog s'affiche entièrement vide.
--
-- La panne est particulièrement trompeuse : les catégories continuent de
-- s'afficher, leur policy étant `USING (true)` sans appel de fonction. Le site
-- paraît sain, seuls les articles ont disparu.
--
-- Le droit est donc accordé explicitement, et il doit le rester. Cela n'ouvre
-- aucune faille : `is_admin()` ne renvoie que `true` ou `false`, et pour un
-- anonyme `auth.uid()` vaut NULL, donc la réponse est toujours `false`.

GRANT EXECUTE ON FUNCTION public.is_admin() TO anon, authenticated;

-- ============================================================================
-- 3. GARDE-FOU CONTRE LES COMMENTAIRES EN DOUBLE
-- ============================================================================
--
-- Les faux commentaires de démonstration ont été insérés DEUX FOIS en base :
-- le `ON CONFLICT DO NOTHING` du schéma ne dédoublonne rien tant qu'aucune
-- contrainte d'unicité ne dit ce qu'est un doublon. Le même trou permet à un
-- robot de soumettre cent fois le même texte.
--
-- L'index ci-dessous rend ce doublon impossible au niveau de la base, quelle que
-- soit la façon dont l'insertion arrive.

CREATE UNIQUE INDEX IF NOT EXISTS idx_comments_unicite
    ON public.comments (article_id, author_email, md5(content));

-- ============================================================================
-- 4. PLAFOND DE TAILLE SUR LES CHAMPS LIBRES DE page_views
-- ============================================================================
--
-- `referrer` et `user_agent` sont fournis par le client et étaient tronqués
-- côté application uniquement. Le RPC applique déjà LEFT(...), mais autant que
-- la contrainte vive aussi dans le schéma.

ALTER TABLE public.page_views
    DROP CONSTRAINT IF EXISTS page_views_longueurs_raisonnables;

ALTER TABLE public.page_views
    ADD CONSTRAINT page_views_longueurs_raisonnables CHECK (
        char_length(path)       <= 500
        AND (referrer   IS NULL OR char_length(referrer)   <= 500)
        AND (user_agent IS NULL OR char_length(user_agent) <= 500)
    );

-- ============================================================================
-- 5. VÉRIFICATION
-- ============================================================================
-- Après exécution, ces requêtes doivent confirmer la fermeture.
--
--   -- Doit renvoyer 0 ligne (plus aucun droit pour anon) :
--   SELECT grantee, privilege_type
--   FROM information_schema.routine_privileges
--   WHERE routine_name = 'record_page_view' AND grantee IN ('anon','authenticated');
--
--   -- Doit renvoyer 0 ligne :
--   SELECT policyname FROM pg_policies
--   WHERE tablename = 'page_views' AND cmd = 'INSERT';
--
-- Puis, depuis un terminal, la tentative d'injection doit désormais échouer :
--
--   curl -X POST "$SUPABASE_URL/rest/v1/rpc/record_page_view" \
--        -H "apikey: $CLE_ANON" -H "Authorization: Bearer $CLE_ANON" \
--        -H "Content-Type: application/json" \
--        -d '{"p_path":"/test","p_country_code":"ZZ"}'
--   -- attendu : 404 ou « permission denied », plus jamais 204.
-- ============================================================================
