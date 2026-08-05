'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Lock, Mail, ArrowRight } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { SITE_PATHS } from '@/lib/site-links';

/**
 * Formulaire de connexion à l'espace d'administration.
 *
 * Correctif de sécurité majeur : la version précédente redirigeait vers /admin
 * SANS aucune vérification lorsque le client Supabase était absent (« mode démo
 * local »). N'importe qui pouvait donc entrer dans le back-office simplement en
 * l'absence de variables d'environnement. Il n'existe plus aucun chemin de
 * connexion qui ne passe pas par Supabase.
 *
 * Après signInWithPassword, on utilise router.refresh() : les cookies de session
 * viennent d'être posés côté navigateur, et ce rafraîchissement force les Server
 * Components à être re-rendus avec la session désormais visible côté serveur.
 */
export function LoginForm({ redirectTo }: { redirectTo?: string }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleLogin = async (event: React.FormEvent) => {
    event.preventDefault();
    setErrorMsg('');
    setLoading(true);

    try {
      const supabase = createClient();

      if (!supabase) {
        setErrorMsg(
          'Authentification indisponible : la configuration Supabase est manquante.'
        );
        return;
      }

      const { error } = await supabase.auth.signInWithPassword({ email, password });

      if (error) {
        // Message volontairement générique : préciser si c'est l'adresse ou le
        // mot de passe qui est faux permettrait d'énumérer les comptes existants.
        setErrorMsg('Identifiants incorrects.');
        return;
      }

      // On n'accepte qu'un chemin interne : sans ce contrôle, un lien du type
      // /admin/login?suivant=https://site-malveillant.fr transformerait la page
      // en tremplin de redirection (open redirect).
      const destination =
        redirectTo && redirectTo.startsWith('/') && !redirectTo.startsWith('//')
          ? redirectTo
          : SITE_PATHS.admin;

      router.replace(destination);
      router.refresh();
    } catch {
      setErrorMsg('Une erreur est survenue pendant la connexion.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleLogin} className="space-y-4">
      {errorMsg && (
        <p
          role="alert"
          className="rounded-xl border border-danger/30 bg-danger/10 p-3 text-center font-mono text-xs text-danger"
        >
          {errorMsg}
        </p>
      )}

      <div>
        <label htmlFor="email" className="field-label">
          Adresse e-mail
        </label>
        <div className="relative">
          <input
            id="email"
            name="email"
            type="email"
            required
            autoComplete="username"
            placeholder="admin@ia-decodee.tech"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            className="field pl-10"
          />
          <Mail className="pointer-events-none absolute left-3 top-3 h-4 w-4 text-faint" />
        </div>
      </div>

      <div>
        <label htmlFor="password" className="field-label">
          Mot de passe
        </label>
        <div className="relative">
          <input
            id="password"
            name="password"
            type="password"
            required
            autoComplete="current-password"
            placeholder="••••••••••••"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            className="field pl-10"
          />
          <Lock className="pointer-events-none absolute left-3 top-3 h-4 w-4 text-faint" />
        </div>
      </div>

      <button type="submit" disabled={loading} className="btn btn-primary w-full py-3">
        {loading ? 'Connexion en cours…' : 'Se connecter'}
        {!loading && <ArrowRight className="h-4 w-4" />}
      </button>
    </form>
  );
}
