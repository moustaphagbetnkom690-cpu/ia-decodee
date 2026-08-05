'use client';

import React, { useState } from 'react';
import { Send, CheckCircle2 } from 'lucide-react';
import { siteConfig } from '@/lib/site-config';

export default function ContactPage() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [subject, setSubject] = useState('General');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !email.trim() || !message.trim()) return;

    setLoading(true);

    setTimeout(() => {
      setLoading(false);
      setSubmitted(true);
      setName('');
      setEmail('');
      setMessage('');
    }, 700);
  };

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-12 space-y-10">
      <div className="space-y-3 text-center">
        <span className="eyebrow">Assistance & Partenariats</span>
        <h1 className="text-3xl sm:text-5xl font-extrabold text-ink">
          Contactez <span className="text-gradient">{siteConfig.name}</span>
        </h1>
        <p className="text-sm text-muted max-w-xl mx-auto leading-relaxed">
          Une question sur un modèle ? Une proposition d&apos;article ou de partenariat ? Remplissez ce formulaire et notre équipe vous répondra sous 24 à 48 heures.
        </p>
      </div>

      <div className="surface-panel p-8 sm:p-10 rounded-3xl border border-line">
        {submitted ? (
          <div className="py-12 text-center space-y-4">
            <div className="w-16 h-16 rounded-full bg-lime/10 border border-lime/30 text-lime mx-auto flex items-center justify-center">
              <CheckCircle2 className="w-8 h-8" />
            </div>
            <h2 className="text-xl font-bold text-ink">Message envoyé avec succès !</h2>
            <p className="text-xs text-muted max-w-md mx-auto">
              Merci pour votre prise de contact. Notre équipe éditoriale a bien reçu votre demande.
            </p>
            <button
              type="button"
              onClick={() => setSubmitted(false)}
              className="mt-4 px-6 py-2.5 rounded-xl bg-accent text-ink text-xs font-bold"
            >
              Envoyer un autre message
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <div>
                <label className="block text-xs font-mono text-muted mb-2">
                  Votre Nom / Prénom *
                </label>
                <input
                  type="text"
                  required
                  placeholder="ex: Jean Dupont"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full bg-base border border-line focus:border-accent rounded-xl px-4 py-3 text-xs text-ink placeholder-faint focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-mono text-muted mb-2">
                  Adresse E-mail *
                </label>
                <input
                  type="email"
                  required
                  placeholder="jean.dupont@domaine.fr"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-base border border-line focus:border-accent rounded-xl px-4 py-3 text-xs text-ink placeholder-faint focus:outline-none"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-mono text-muted mb-2">
                Objet du message *
              </label>
              <select
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                className="w-full bg-base border border-line focus:border-accent rounded-xl px-4 py-3 text-xs text-ink focus:outline-none"
              >
                <option value="General">Question générale / Remarque sur un article</option>
                <option value="Partnership">Demande de partenariat / Affiliation</option>
                <option value="Editorial">Suggestion de sujet / Nouveau modèle IA</option>
                <option value="Press">Presse & Médias</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-mono text-muted mb-2">
                Votre Message *
              </label>
              <textarea
                required
                rows={5}
                placeholder="Exposez votre demande de manière précise..."
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                className="w-full bg-base border border-line focus:border-accent rounded-xl p-4 text-xs text-ink placeholder-faint focus:outline-none resize-y"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full sm:w-auto px-8 py-3.5 rounded-xl bg-accent hover:bg-accent-hover text-ink font-bold text-xs shadow-xl shadow-accent/20 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {loading ? 'Traitement en cours...' : 'Envoyer mon message'}
              <Send className="w-4 h-4" />
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
