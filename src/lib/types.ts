export type ArticleStatus = 'draft' | 'published';

export interface Category {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  color: string;
  created_at?: string;
}

export interface Profile {
  id: string;
  full_name: string | null;
  avatar_url: string | null;
  role: string;
  created_at?: string;
}

export interface Article {
  id: string;
  title: string;
  slug: string;
  excerpt: string;
  content: string;
  featured_image: string | null;
  category_id: string | null;
  author_id: string | null;
  status: ArticleStatus;
  views: number;
  published_at: string;
  created_at: string;
  updated_at: string;
  category?: Category | null;
  author?: Profile | null;
  reading_time_minutes?: number;
}

/**
 * Commentaire tel qu'exposé au public par la vue `comments_public`.
 * La vue ne sélectionne ni `author_email` ni `status` : tout ce qu'elle renvoie
 * est, par construction, déjà approuvé. `status` reste optionnel uniquement pour
 * rester compatible avec les données de démonstration.
 */
export interface CommentPublic {
  id: string;
  article_id: string;
  author_name: string;
  content: string;
  status?: string;
  created_at: string;
}

export interface Comment {
  id: string;
  article_id: string;
  author_name: string;
  author_email: string;
  content: string;
  status: 'pending' | 'approved' | 'spam';
  created_at: string;
}
