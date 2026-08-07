-- ============================================================================
-- TEMPS RÉEL — VISITEURS EN LIGNE
-- À exécuter dans Supabase > SQL Editor. Idempotent : réexécutable sans risque.
-- ============================================================================
--
-- OBJECTIF
-- Afficher dans le back-office le nombre de visiteurs RÉELLEMENT présents sur le
-- site à l'instant, les pages qu'ils lisent et leur pays.
--
-- CE QUI MANQUAIT
-- `page_views` n'enregistrait aucun identifiant de visiteur — un choix assumé
-- jusqu'ici. Impossible dans ces conditions de distinguer trois lecteurs d'un
-- seul lecteur qui recharge trois fois : le compteur aurait affiché « 3 »
-- dans les deux cas.
--
-- LA MÉTHODE RETENUE, ET POURQUOI ELLE RESPECTE LA VIE PRIVÉE
-- On stocke une empreinte : SHA-256 de (adresse IP + navigateur + date du jour
-- + secret serveur). Trois propriétés en découlent :
--
--   1. Elle n'est pas réversible. L'adresse IP n'est jamais écrite en base, et
--      le secret serveur interdit de retrouver une IP par force brute — sans
--      lui, l'espace des IPv4 se parcourt en quelques minutes.
--
--   2. Elle change chaque nuit, puisque la date entre dans le calcul. Le même
--      visiteur revenant demain produit une empreinte différente : aucun suivi
--      d'un jour sur l'autre n'est possible, y compris par nous.
--
--   3. Elle ne sert qu'au dénombrement. On ne l'affiche jamais, on ne la relie à
--      aucune identité.
--
-- C'est l'approche des outils d'analytique respectueux de la vie privée
-- (Plausible, Fathom). Elle évite le bandeau de consentement, puisqu'aucun
-- cookie n'est déposé et qu'aucune donnée directement identifiante n'est
-- conservée.
-- ============================================================================

-- ============================================================================
-- 1. COLONNE D'EMPREINTE
-- ============================================================================

ALTER TABLE public.page_views
    ADD COLUMN IF NOT EXISTS visitor_hash VARCHAR(64);

-- Index partiel : les requêtes temps réel ne regardent que les dernières
-- minutes, et seules les lignes portant une empreinte les intéressent. Un index
-- partiel reste donc bien plus compact qu'un index complet.
CREATE INDEX IF NOT EXISTS idx_page_views_temps_reel
    ON public.page_views (created_at DESC, visitor_hash)
    WHERE visitor_hash IS NOT NULL;

-- ============================================================================
-- 2. MISE À JOUR DU RPC D'ENREGISTREMENT
-- ============================================================================
--
-- Le paramètre p_visitor_hash est ajouté EN DERNIÈRE POSITION et avec une valeur
-- par défaut : les appels existants continuent donc de fonctionner tels quels.

CREATE OR REPLACE FUNCTION public.record_page_view(
    p_path TEXT,
    p_article_id UUID DEFAULT NULL,
    p_country_code VARCHAR(2) DEFAULT NULL,
    p_country_name VARCHAR(100) DEFAULT NULL,
    p_city VARCHAR(120) DEFAULT NULL,
    p_referrer TEXT DEFAULT NULL,
    p_user_agent TEXT DEFAULT NULL,
    p_visitor_hash VARCHAR(64) DEFAULT NULL
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
    INSERT INTO public.page_views (
        article_id, path, country_code, country_name, city,
        referrer, user_agent, visitor_hash
    )
    VALUES (
        p_article_id,
        LEFT(p_path, 500),
        p_country_code,
        p_country_name,
        p_city,
        LEFT(p_referrer, 500),
        LEFT(p_user_agent, 500),
        p_visitor_hash
    );

    IF p_article_id IS NOT NULL THEN
        UPDATE public.articles
        SET views = COALESCE(views, 0) + 1
        WHERE id = p_article_id;
    END IF;
END;
$$;

-- Le droit reste réservé au serveur Next.js : c'est le correctif du 5 août 2026,
-- sans lequel n'importe qui pouvait injecter des vues depuis un pays inventé.
REVOKE EXECUTE ON FUNCTION public.record_page_view(TEXT, UUID, VARCHAR, VARCHAR, VARCHAR, TEXT, TEXT, VARCHAR)
    FROM anon, authenticated, PUBLIC;

-- ============================================================================
-- 3. AGRÉGAT TEMPS RÉEL — RÉSERVÉ AUX ADMINISTRATEURS
-- ============================================================================
--
-- Renvoie un objet JSON unique plutôt que plusieurs jeux de lignes : le
-- back-office interroge cette fonction toutes les quinze secondes, autant lui
-- épargner trois allers-retours réseau à chaque rafraîchissement.
--
-- Le total ne peut pas se déduire de la somme par page : un même visiteur peut
-- avoir ouvert deux pages dans la fenêtre. Il est donc calculé à part, sur
-- l'ensemble des empreintes distinctes.

CREATE OR REPLACE FUNCTION public.analytics_temps_reel(p_minutes INT DEFAULT 5)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_depuis TIMESTAMPTZ;
    v_total  BIGINT;
    v_vues   BIGINT;
    v_pages  JSONB;
    v_pays   JSONB;
    v_derniere TIMESTAMPTZ;
BEGIN
    IF NOT public.is_admin() THEN
        RAISE EXCEPTION 'Accès refusé : privilèges administrateur requis';
    END IF;

    -- Bornes de sécurité : la fenêtre est fournie par l'appelant, on évite
    -- qu'une valeur farfelue ne déclenche un balayage complet de la table.
    v_depuis := NOW() - (LEAST(GREATEST(p_minutes, 1), 60) || ' minutes')::INTERVAL;

    SELECT COUNT(DISTINCT COALESCE(visitor_hash, id::TEXT)), COUNT(*), MAX(created_at)
      INTO v_total, v_vues, v_derniere
      FROM public.page_views
     WHERE created_at >= v_depuis;

    -- Pages actuellement lues, la plus fréquentée en tête.
    SELECT COALESCE(JSONB_AGG(p ORDER BY (p->>'visiteurs')::BIGINT DESC), '[]'::JSONB)
      INTO v_pages
      FROM (
        SELECT JSONB_BUILD_OBJECT(
                 'path',      pv.path,
                 'visiteurs', COUNT(DISTINCT COALESCE(pv.visitor_hash, pv.id::TEXT)),
                 'vues',      COUNT(*),
                 'pays',      COALESCE(
                                (SELECT JSONB_AGG(DISTINCT x.country_code)
                                   FROM public.page_views x
                                  WHERE x.path = pv.path
                                    AND x.created_at >= v_depuis
                                    AND x.country_code IS NOT NULL),
                                '[]'::JSONB
                              )
               ) AS p
          FROM public.page_views pv
         WHERE pv.created_at >= v_depuis
         GROUP BY pv.path
         LIMIT 20
      ) s;

    -- Répartition par pays sur la même fenêtre.
    SELECT COALESCE(JSONB_AGG(c ORDER BY (c->>'visiteurs')::BIGINT DESC), '[]'::JSONB)
      INTO v_pays
      FROM (
        SELECT JSONB_BUILD_OBJECT(
                 'code',      COALESCE(country_code, 'XX'),
                 'nom',       COALESCE(country_name, 'Inconnu'),
                 'visiteurs', COUNT(DISTINCT COALESCE(visitor_hash, id::TEXT))
               ) AS c
          FROM public.page_views
         WHERE created_at >= v_depuis
         GROUP BY COALESCE(country_code, 'XX'), COALESCE(country_name, 'Inconnu')
         LIMIT 20
      ) t;

    RETURN JSONB_BUILD_OBJECT(
        'visiteurs',       COALESCE(v_total, 0),
        'vues',            COALESCE(v_vues, 0),
        'fenetre_minutes', LEAST(GREATEST(p_minutes, 1), 60),
        'derniere_visite', v_derniere,
        'pages',           v_pages,
        'pays',            v_pays
    );
END;
$$;

REVOKE EXECUTE ON FUNCTION public.analytics_temps_reel(INT) FROM PUBLIC, anon;
GRANT  EXECUTE ON FUNCTION public.analytics_temps_reel(INT) TO authenticated;

-- ============================================================================
-- 4. PURGE AUTOMATIQUE DES EMPREINTES ANCIENNES
-- ============================================================================
--
-- Les empreintes ne servent qu'au temps réel. Passé quelques heures, elles
-- n'apportent plus rien et n'ont aucune raison d'être conservées — les
-- statistiques de long terme (pays, jours, articles) n'en dépendent pas.
--
-- À appeler périodiquement. Deux façons de faire, au choix :
--   - Supabase > Database > Cron, une fois par jour ;
--   - ou simplement l'oublier : les empreintes ne sont pas identifiantes, la
--     purge relève de l'hygiène, pas de l'obligation.

CREATE OR REPLACE FUNCTION public.purger_empreintes_anciennes(p_heures INT DEFAULT 24)
RETURNS INT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_nb INT;
BEGIN
    UPDATE public.page_views
       SET visitor_hash = NULL
     WHERE visitor_hash IS NOT NULL
       AND created_at < NOW() - (GREATEST(p_heures, 1) || ' hours')::INTERVAL;

    GET DIAGNOSTICS v_nb = ROW_COUNT;
    RETURN v_nb;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.purger_empreintes_anciennes(INT) FROM PUBLIC, anon, authenticated;

-- ============================================================================
-- 5. VÉRIFICATION
-- ============================================================================
--   SELECT public.analytics_temps_reel(5);
--   -- doit renvoyer un JSON, et échouer avec « Accès refusé » pour un anonyme.
--
--   SELECT column_name FROM information_schema.columns
--    WHERE table_name = 'page_views' AND column_name = 'visitor_hash';
--   -- doit renvoyer 1 ligne.
-- ============================================================================
