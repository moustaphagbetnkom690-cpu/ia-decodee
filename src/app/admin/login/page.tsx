import { Cpu, ShieldCheck, LogOut } from 'lucide-react';
import { siteConfig } from '@/lib/site-config';
import { LoginForm } from '@/components/admin/LoginForm';
import { signOut } from '@/lib/actions/admin';

interface LoginPageProps {
  searchParams: Promise<{ suivant?: string; erreur?: string }>;
}

export default async function AdminLoginPage({ searchParams }: LoginPageProps) {
  const { suivant, erreur } = await searchParams;

  return (
    <div className="flex min-h-[80vh] items-center justify-center px-4 py-12">
      <div className="bg-neural w-full max-w-md space-y-7 rounded-3xl border border-line p-8 sm:p-10">
        <div className="space-y-3 text-center">
          <div className="mx-auto h-12 w-12 rounded-2xl bg-gradient-to-br from-accent to-lime p-0.5">
            <div className="flex h-full w-full items-center justify-center rounded-[14px] bg-base">
              <Cpu className="h-6 w-6 text-lime" />
            </div>
          </div>
          <h1 className="text-xl font-bold text-ink">Administration {siteConfig.name}</h1>
          <p className="text-xs text-muted">
            Espace réservé à la rédaction. Les identifiants sont vérifiés côté serveur.
          </p>
        </div>

        {erreur === 'configuration' && (
          <p className="rounded-xl border border-danger/30 bg-danger/10 p-3 text-center font-mono text-xs text-danger">
            Connexion à la base indisponible : vérifiez la configuration Supabase.
          </p>
        )}

        {/* Compte authentifié mais sans les privilèges requis. On lui propose
            explicitement de se déconnecter : sans cette issue, il resterait
            bloqué sur cet écran avec une session inutilisable. */}
        {erreur === 'acces' ? (
          <div className="space-y-4">
            <p className="rounded-xl border border-warning/30 bg-warning/10 p-4 text-center text-xs leading-relaxed text-warning">
              Votre compte est bien connecté, mais il ne dispose pas des droits
              d’accès à l’administration. Contactez un administrateur pour qu’il
              vous attribue le rôle nécessaire.
            </p>
            <form action={signOut}>
              <button type="submit" className="btn btn-ghost w-full">
                <LogOut className="h-4 w-4" />
                Se déconnecter et changer de compte
              </button>
            </form>
          </div>
        ) : (
          <LoginForm redirectTo={suivant} />
        )}

        <p className="flex items-center justify-center gap-1.5 border-t border-line pt-5 font-mono text-[11px] text-faint">
          <ShieldCheck className="h-3.5 w-3.5 text-lime" />
          Accès protégé
        </p>
      </div>
    </div>
  );
}
