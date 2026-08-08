-- ============================================================================
-- SCHÉMA SUPABASE — IA DÉCODÉE (v2)
-- ----------------------------------------------------------------------------
-- Script idempotent : peut être ré-exécuté sur une base existante.
--
-- CHANGEMENTS MAJEURS PAR RAPPORT À LA v1 (corrections de sécurité) :
--   1. `profiles.role` est une vraie énumération contrôlée, par défaut 'reader'.
--      En v1, le trigger d'inscription accordait 'admin' à TOUT nouvel inscrit.
--   2. Les policies RLS s'appuient sur public.is_admin() et non plus sur
--      auth.role() = 'authenticated' (qui donnait les pleins droits à n'importe
--      quel compte inscrit).
--   3. Toutes les policies d'écriture ont un WITH CHECK explicite.
--   4. Les fonctions SECURITY DEFINER fixent search_path (anti-escalade).
--   5. Les commentaires arrivent en 'pending' et passent par la modération.
--   6. page_views enregistre le pays du visiteur (analytics géographique).
--   7. Nouvelle table newsletter_subscribers (le formulaire du footer est réel).
-- ============================================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================================
-- 1. TABLES
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.categories (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    slug VARCHAR(255) UNIQUE NOT NULL,
    description TEXT,
    color VARCHAR(50) DEFAULT '#7C5CFF',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    full_name VARCHAR(255),
    avatar_url TEXT,
    role VARCHAR(50) NOT NULL DEFAULT 'reader',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.articles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title VARCHAR(255) NOT NULL,
    slug VARCHAR(255) UNIQUE NOT NULL,
    excerpt TEXT NOT NULL,
    content TEXT NOT NULL,
    featured_image TEXT,
    category_id UUID REFERENCES public.categories(id) ON DELETE SET NULL,
    author_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    status VARCHAR(20) DEFAULT 'published' CHECK (status IN ('draft', 'published')),
    views INT DEFAULT 0,
    published_at TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.comments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    article_id UUID NOT NULL REFERENCES public.articles(id) ON DELETE CASCADE,
    author_name VARCHAR(255) NOT NULL,
    author_email VARCHAR(255) NOT NULL,
    content TEXT NOT NULL,
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'spam')),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.page_views (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    article_id UUID REFERENCES public.articles(id) ON DELETE CASCADE,
    path TEXT NOT NULL,
    country_code VARCHAR(2),
    country_name VARCHAR(100),
    city VARCHAR(120),
    referrer TEXT,
    user_agent TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.newsletter_subscribers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) UNIQUE NOT NULL,
    country_code VARCHAR(2),
    source VARCHAR(50) DEFAULT 'footer',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Migration douce depuis la v1 : ajoute les colonnes manquantes si les tables
-- existaient déjà avec l'ancienne définition.
ALTER TABLE public.page_views ADD COLUMN IF NOT EXISTS country_code VARCHAR(2);
ALTER TABLE public.page_views ADD COLUMN IF NOT EXISTS country_name VARCHAR(100);
ALTER TABLE public.page_views ADD COLUMN IF NOT EXISTS city VARCHAR(120);
ALTER TABLE public.page_views ADD COLUMN IF NOT EXISTS referrer TEXT;
ALTER TABLE public.profiles ALTER COLUMN role SET DEFAULT 'reader';
ALTER TABLE public.comments ALTER COLUMN status SET DEFAULT 'pending';

-- Contrainte de rôle, ajoutée séparément pour rester idempotente.
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'profiles_role_check') THEN
        ALTER TABLE public.profiles
            ADD CONSTRAINT profiles_role_check
            CHECK (role IN ('admin', 'editor', 'reader'));
    END IF;
END $$;

-- Index alignés sur les requêtes réellement exécutées par l'application.
CREATE INDEX IF NOT EXISTS idx_articles_status_published ON public.articles (status, published_at DESC);
CREATE INDEX IF NOT EXISTS idx_articles_category        ON public.articles (category_id);
CREATE INDEX IF NOT EXISTS idx_comments_article_status  ON public.comments (article_id, status);
CREATE INDEX IF NOT EXISTS idx_comments_status          ON public.comments (status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_page_views_created       ON public.page_views (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_page_views_country       ON public.page_views (country_code);
CREATE INDEX IF NOT EXISTS idx_page_views_article       ON public.page_views (article_id);

-- ============================================================================
-- 2. FONCTION D'AUTORISATION
-- ============================================================================

-- Socle de toutes les policies.
-- SECURITY DEFINER est indispensable ici : la fonction doit lire `profiles`
-- sans être elle-même filtrée par la RLS de `profiles` (sinon récursion infinie).
-- `SET search_path` est tout aussi indispensable : sans lui, un schéma placé en
-- tête du search_path de l'appelant pourrait détourner les références internes.
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
    SELECT EXISTS (
        SELECT 1
        FROM public.profiles
        WHERE id = auth.uid()
          AND role IN ('admin', 'editor')
    );
$$;

REVOKE EXECUTE ON FUNCTION public.is_admin() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_admin() TO authenticated;

-- ============================================================================
-- 3. VUE PUBLIQUE DES COMMENTAIRES
-- ============================================================================

-- Vue volontairement laissée en `security_invoker = off` (comportement par
-- défaut) : elle s'exécute avec les droits de son propriétaire et contourne donc
-- la RLS de `comments`. C'est précisément ce qui permet au public de lire les
-- commentaires approuvés SANS le moindre accès direct à la table — et donc sans
-- aucun chemin possible vers la colonne author_email.
DROP VIEW IF EXISTS public.comments_public;
CREATE VIEW public.comments_public AS
SELECT
    id,
    article_id,
    author_name,
    content,
    created_at
FROM public.comments
WHERE status = 'approved';

GRANT SELECT ON public.comments_public TO anon, authenticated;

-- ============================================================================
-- 4. FONCTIONS RPC
-- ============================================================================

-- Incrémente le compteur de vues sans accorder d'UPDATE sur `articles` au public.
-- Le paramètre est préfixé p_ pour lever toute ambiguïté avec les colonnes.
DROP FUNCTION IF EXISTS public.increment_view_count(UUID);
CREATE FUNCTION public.increment_view_count(p_article_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
    UPDATE public.articles
    SET views = COALESCE(views, 0) + 1
    WHERE id = p_article_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.increment_view_count(UUID) TO anon, authenticated;

-- Enregistre une vue de page avec son origine géographique.
-- Le pays provient TOUJOURS du serveur Next.js (headers Vercel), jamais d'une
-- valeur fournie par le navigateur.
CREATE OR REPLACE FUNCTION public.record_page_view(
    p_path TEXT,
    p_article_id UUID DEFAULT NULL,
    p_country_code VARCHAR(2) DEFAULT NULL,
    p_country_name VARCHAR(100) DEFAULT NULL,
    p_city VARCHAR(120) DEFAULT NULL,
    p_referrer TEXT DEFAULT NULL,
    p_user_agent TEXT DEFAULT NULL
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
    INSERT INTO public.page_views (
        article_id, path, country_code, country_name, city, referrer, user_agent
    )
    VALUES (
        p_article_id,
        LEFT(p_path, 500),
        p_country_code,
        p_country_name,
        p_city,
        LEFT(p_referrer, 500),
        LEFT(p_user_agent, 500)
    );

    IF p_article_id IS NOT NULL THEN
        UPDATE public.articles
        SET views = COALESCE(views, 0) + 1
        WHERE id = p_article_id;
    END IF;
END;
$$;

GRANT EXECUTE ON FUNCTION public.record_page_view(TEXT, UUID, VARCHAR, VARCHAR, VARCHAR, TEXT, TEXT)
    TO anon, authenticated;

-- Agrégat : répartition des visiteurs par pays. Réservé aux admins.
CREATE OR REPLACE FUNCTION public.analytics_views_by_country(p_days INT DEFAULT 30)
RETURNS TABLE (country_code TEXT, country_name TEXT, total BIGINT)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
    IF NOT public.is_admin() THEN
        RAISE EXCEPTION 'Accès refusé : privilèges administrateur requis';
    END IF;

    RETURN QUERY
    SELECT
        COALESCE(pv.country_code, 'XX')::TEXT,
        COALESCE(pv.country_name, 'Inconnu')::TEXT,
        COUNT(*)::BIGINT
    FROM public.page_views pv
    WHERE pv.created_at >= NOW() - (p_days || ' days')::INTERVAL
    GROUP BY 1, 2
    ORDER BY 3 DESC;
END;
$$;

GRANT EXECUTE ON FUNCTION public.analytics_views_by_country(INT) TO authenticated;

-- Agrégat : vues par jour (courbe de tendance). Réservé aux admins.
-- generate_series garantit que les jours sans trafic apparaissent bien à zéro.
CREATE OR REPLACE FUNCTION public.analytics_views_by_day(p_days INT DEFAULT 14)
RETURNS TABLE (day DATE, total BIGINT)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
    IF NOT public.is_admin() THEN
        RAISE EXCEPTION 'Accès refusé : privilèges administrateur requis';
    END IF;

    RETURN QUERY
    SELECT
        d.day::DATE,
        COUNT(pv.id)::BIGINT
    FROM generate_series(
        CURRENT_DATE - (p_days - 1),
        CURRENT_DATE,
        '1 day'::INTERVAL
    ) AS d(day)
    LEFT JOIN public.page_views pv ON pv.created_at::DATE = d.day::DATE
    GROUP BY d.day
    ORDER BY d.day;
END;
$$;

GRANT EXECUTE ON FUNCTION public.analytics_views_by_day(INT) TO authenticated;

-- ============================================================================
-- 5. TRIGGERS
-- ============================================================================

-- Création automatique du profil à l'inscription.
--
-- SÉCURITÉ : le rôle par défaut est 'reader', PAS 'admin'. Seul le tout premier
-- compte créé sur une base vierge devient administrateur (bootstrap) ; tous les
-- suivants sont de simples lecteurs. La promotion se fait manuellement (§8).
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_is_first_user BOOLEAN;
BEGIN
    SELECT NOT EXISTS (SELECT 1 FROM public.profiles) INTO v_is_first_user;

    INSERT INTO public.profiles (id, full_name, avatar_url, role)
    VALUES (
        NEW.id,
        COALESCE(NEW.raw_user_meta_data->>'full_name', 'Rédacteur IA Décodée'),
        NEW.raw_user_meta_data->>'avatar_url',
        CASE WHEN v_is_first_user THEN 'admin' ELSE 'reader' END
    )
    ON CONFLICT (id) DO NOTHING;

    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Maintien automatique de updated_at.
CREATE OR REPLACE FUNCTION public.touch_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public, pg_temp
AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_article_updated ON public.articles;
CREATE TRIGGER on_article_updated
    BEFORE UPDATE ON public.articles
    FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- ============================================================================
-- 6. ROW LEVEL SECURITY
-- ============================================================================

ALTER TABLE public.categories             ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles               ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.articles               ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.comments               ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.page_views             ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.newsletter_subscribers ENABLE ROW LEVEL SECURITY;

-- Suppression des policies v1 (trop permissives) avant recréation.
DROP POLICY IF EXISTS "Categories sont lisibles par tous" ON public.categories;
DROP POLICY IF EXISTS "Modifications des catégories par utilisateurs authentifiés" ON public.categories;
DROP POLICY IF EXISTS "Profils lisibles par tous" ON public.profiles;
DROP POLICY IF EXISTS "Gestion des profils par authentifiés" ON public.profiles;
DROP POLICY IF EXISTS "Articles publiés lisibles par tous" ON public.articles;
DROP POLICY IF EXISTS "Gestion des articles par utilisateurs authentifiés" ON public.articles;
DROP POLICY IF EXISTS "Commentaires bruts lisibles uniquement par admins" ON public.comments;
DROP POLICY IF EXISTS "Insertion publique de commentaires" ON public.comments;
DROP POLICY IF EXISTS "Gestion des commentaires par authentifiés" ON public.comments;
DROP POLICY IF EXISTS "Insertion publique des vues" ON public.page_views;
DROP POLICY IF EXISTS "Vues de pages consultables par authentifiés" ON public.page_views;

-- Suppression des policies v2 pour rendre le script réexécutable.
DROP POLICY IF EXISTS "categories_select_public"        ON public.categories;
DROP POLICY IF EXISTS "categories_write_admin"          ON public.categories;
DROP POLICY IF EXISTS "profiles_select_public"          ON public.profiles;
DROP POLICY IF EXISTS "profiles_update_self"            ON public.profiles;
DROP POLICY IF EXISTS "profiles_write_admin"            ON public.profiles;
DROP POLICY IF EXISTS "articles_select_published"       ON public.articles;
DROP POLICY IF EXISTS "articles_write_admin"            ON public.articles;
DROP POLICY IF EXISTS "comments_select_admin"           ON public.comments;
DROP POLICY IF EXISTS "comments_insert_public_pending"  ON public.comments;
DROP POLICY IF EXISTS "comments_update_admin"           ON public.comments;
DROP POLICY IF EXISTS "comments_delete_admin"           ON public.comments;
DROP POLICY IF EXISTS "page_views_insert_public"        ON public.page_views;
DROP POLICY IF EXISTS "page_views_select_admin"         ON public.page_views;
DROP POLICY IF EXISTS "newsletter_insert_public"        ON public.newsletter_subscribers;
DROP POLICY IF EXISTS "newsletter_select_admin"         ON public.newsletter_subscribers;
DROP POLICY IF EXISTS "newsletter_delete_admin"         ON public.newsletter_subscribers;

-- --- Catégories -------------------------------------------------------------
CREATE POLICY "categories_select_public"
    ON public.categories FOR SELECT
    USING (true);

CREATE POLICY "categories_write_admin"
    ON public.categories FOR ALL
    USING (public.is_admin())
    WITH CHECK (public.is_admin());

-- --- Profils ----------------------------------------------------------------
CREATE POLICY "profiles_select_public"
    ON public.profiles FOR SELECT
    USING (true);

-- Un utilisateur peut éditer son propre profil, mais le WITH CHECK l'empêche de
-- s'auto-promouvoir : la valeur de `role` doit rester celle déjà enregistrée.
CREATE POLICY "profiles_update_self"
    ON public.profiles FOR UPDATE
    USING (auth.uid() = id)
    WITH CHECK (
        auth.uid() = id
        AND role = (SELECT p.role FROM public.profiles p WHERE p.id = auth.uid())
    );

CREATE POLICY "profiles_write_admin"
    ON public.profiles FOR ALL
    USING (public.is_admin())
    WITH CHECK (public.is_admin());

-- --- Articles ---------------------------------------------------------------
-- Les brouillons ne sont lisibles que des admins : un visiteur anonyme ne peut
-- pas consulter un article non publié, même en tapant son slug directement.
-- La condition sur published_at porte la programmation des parutions : un
-- article publié mais daté du futur reste invisible jusqu'à son heure. Voir
-- `supabase_patch_programmation.sql` pour le détail.
CREATE POLICY "articles_select_published"
    ON public.articles FOR SELECT
    USING (
        (status = 'published' AND published_at <= NOW())
        OR public.is_admin()
    );

CREATE POLICY "articles_write_admin"
    ON public.articles FOR ALL
    USING (public.is_admin())
    WITH CHECK (public.is_admin());

-- --- Commentaires -----------------------------------------------------------
-- La table brute (avec les e-mails) n'est lisible que des admins.
-- Le public passe exclusivement par la vue comments_public.
CREATE POLICY "comments_select_admin"
    ON public.comments FOR SELECT
    USING (public.is_admin());

-- Le WITH CHECK impose status = 'pending' : un visiteur ne peut PAS publier un
-- commentaire directement approuvé en trafiquant la requête côté client.
CREATE POLICY "comments_insert_public_pending"
    ON public.comments FOR INSERT
    WITH CHECK (
        status = 'pending'
        AND char_length(content)     BETWEEN 2 AND 5000
        AND char_length(author_name) BETWEEN 2 AND 255
        AND char_length(author_email) BETWEEN 5 AND 255
    );

CREATE POLICY "comments_update_admin"
    ON public.comments FOR UPDATE
    USING (public.is_admin())
    WITH CHECK (public.is_admin());

CREATE POLICY "comments_delete_admin"
    ON public.comments FOR DELETE
    USING (public.is_admin());

-- --- Vues de pages ----------------------------------------------------------
CREATE POLICY "page_views_insert_public"
    ON public.page_views FOR INSERT
    WITH CHECK (true);

CREATE POLICY "page_views_select_admin"
    ON public.page_views FOR SELECT
    USING (public.is_admin());

-- --- Newsletter -------------------------------------------------------------
-- Inscription publique autorisée, mais lecture réservée aux admins : la liste
-- des abonnés ne peut pas être aspirée depuis le navigateur.
CREATE POLICY "newsletter_insert_public"
    ON public.newsletter_subscribers FOR INSERT
    WITH CHECK (char_length(email) BETWEEN 5 AND 255);

CREATE POLICY "newsletter_select_admin"
    ON public.newsletter_subscribers FOR SELECT
    USING (public.is_admin());

CREATE POLICY "newsletter_delete_admin"
    ON public.newsletter_subscribers FOR DELETE
    USING (public.is_admin());

-- ============================================================================
-- 7. STORAGE
-- ============================================================================

INSERT INTO storage.buckets (id, name, public)
VALUES ('images', 'images', true)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "Images du bucket lisibles par tous" ON storage.objects;
DROP POLICY IF EXISTS "Upload d'images par utilisateurs authentifiés" ON storage.objects;
DROP POLICY IF EXISTS "images_select_public" ON storage.objects;
DROP POLICY IF EXISTS "images_insert_admin" ON storage.objects;
DROP POLICY IF EXISTS "images_update_admin" ON storage.objects;
DROP POLICY IF EXISTS "images_delete_admin" ON storage.objects;

CREATE POLICY "images_select_public"
    ON storage.objects FOR SELECT
    USING (bucket_id = 'images');

-- L'upload est réservé aux admins (en v1, tout compte inscrit pouvait uploader).
CREATE POLICY "images_insert_admin"
    ON storage.objects FOR INSERT
    WITH CHECK (bucket_id = 'images' AND public.is_admin());

CREATE POLICY "images_update_admin"
    ON storage.objects FOR UPDATE
    USING (bucket_id = 'images' AND public.is_admin())
    WITH CHECK (bucket_id = 'images' AND public.is_admin());

CREATE POLICY "images_delete_admin"
    ON storage.objects FOR DELETE
    USING (bucket_id = 'images' AND public.is_admin());

-- ============================================================================
-- 8. BOOTSTRAP ADMINISTRATEUR  ← À LIRE
-- ============================================================================
--
-- Le premier compte inscrit devient automatiquement administrateur.
--
-- Si votre base vient de la v1, TOUS vos comptes existants sont 'admin'.
-- Exécutez ces deux requêtes pour rétablir une situation saine :
--
--   UPDATE public.profiles SET role = 'reader';
--
--   UPDATE public.profiles SET role = 'admin'
--   WHERE id = (SELECT id FROM auth.users WHERE email = 'votre@email.fr');
--
-- Pensez aussi à fermer les inscriptions publiques dans le dashboard Supabase :
--   Authentication > Sign In / Providers > Email > "Allow new users to sign up"
-- ============================================================================

-- ============================================================================
-- 9. DONNÉES DE DÉMONSTRATION — SUPPRIMÉES LE 5 AOÛT 2026
-- ============================================================================
--
-- Cette section insérait 3 articles et 3 commentaires fictifs.
--
-- Elle a été retirée à la mise en ligne du site, pour deux raisons constatées
-- pendant l'audit :
--
--   1. Les 3 commentaires (« Thomas Dubois », « Léa Martin », « Alexandre », en
--      @example.com) étaient bel et bien EN PRODUCTION, et en double : le script
--      ayant été exécuté deux fois, le `ON CONFLICT DO NOTHING` n'a rien
--      dédoublonné faute de contrainte d'unicité. Six faux commentaires
--      s'affichaient donc sous les articles d'un média qui revendique des
--      sources primaires. Ils ont été purgés, et `supabase_patch_securite.sql`
--      ajoute l'index d'unicité qui manquait.
--
--   2. Les 3 articles de démonstration écrasaient le risque inverse : rejouer ce
--      script sur la base de production aurait pu réintroduire des versions
--      courtes et périmées des vrais articles.
--
-- Les CATÉGORIES sont conservées ci-dessous : ce ne sont pas des données de
-- démonstration mais la taxonomie réelle du site, dont dépendent les routes
-- /categories/*. Leur ON CONFLICT DO UPDATE les maintient à jour sans rien
-- détruire.
--
-- Le contenu éditorial, lui, se crée exclusivement depuis le panel
-- d'administration, qui déclenche `revalidatePath` — une écriture SQL directe
-- resterait invisible jusqu'au prochain déploiement.
-- ============================================================================

INSERT INTO public.categories (id, name, slug, description, color) VALUES
('c1111111-1111-1111-1111-111111111111', 'Modèles & Architectures', 'modeles',        'Analyses approfondies des LLM, modèles vocaux, multimodaux et architectures émergentes.', '#7C5CFF'),
('c2222222-2222-2222-2222-222222222222', 'Comparatifs & Benchmarks', 'comparatifs',   'Face-à-face rigoureux entre les plus grands modèles et outils d''IA.',                    '#C6F24E'),
('c3333333-3333-3333-3333-333333333333', 'Guides & Prompts',         'guides-prompts', 'Tutoriels pratiques, techniques d''ingénierie de prompt et cas d''usage concrets.',       '#3B82F6'),
('c4444444-4444-4444-4444-444444444444', 'Actualités & Sorties',     'actualites',     'L''essentiel des annonces majeures de l''industrie de l''IA décodé sans hype.',           '#EC4899'),
('c5555555-5555-5555-5555-555555555555', 'Outils & Écosystème',      'outils',         'Sélection d''applications, extensions et workflows pour décupler votre productivité.',    '#10B981')
ON CONFLICT (id) DO UPDATE
SET name        = EXCLUDED.name,
    slug        = EXCLUDED.slug,
    description = EXCLUDED.description,
    color       = EXCLUDED.color;
