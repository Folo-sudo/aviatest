'use client';

import Link from 'next/link';
import { ArrowLeft, ScrollText } from 'lucide-react';
import AuthGate from '@/components/AuthGate';
import { Button } from '@/components/ui/button';

const styles = {
  background: '#fbfaf9',
  text: '#37322f',
  textMuted: '#605a57',
  border: '#e0dedb',
  cardBg: '#ffffff',
  shadow: '0 8px 24px rgba(55, 50, 47, 0.08)',
};

const sections: Array<{ title: string; body: string; href?: string; linkLabel?: string }> = [
  {
    title: 'Accueil',
    body: 'Point de depart. Tu choisis un concours (PSY0, PSY1 Cadets Air France, ENAC EPL), une competence, ou tu parcours tous les tests en bas de page.',
    href: '/',
    linkLabel: 'Retour a l accueil',
  },
  {
    title: 'Exercices',
    body: 'Chaque test s ouvre dans son propre ecran. Tu peux souvent regler le nombre de questions, le temps, et activer le mode examen (pas de correction entre les questions). Ta progression est enregistree sur ton compte.',
    href: '/exercices',
    linkLabel: 'Voir les exercices',
  },
  {
    title: 'Concours',
    body: 'PSY0 et PSY1 forment le parcours Cadets Air France. ENAC EPL est un autre concours. Chaque page liste les exercices rattaches a la selection.',
    href: '/concours',
    linkLabel: 'Voir les concours',
  },
  {
    title: 'Stadium',
    body: 'Competition en direct : meme epreuve, meme chrono, classement. Tu peux aussi lancer des duels avec tes amis (invitation, partie synchrone, historique).',
    href: '/stadium',
    linkLabel: 'Ouvrir le Stadium',
  },
  {
    title: 'Compte & progression',
    body: 'Ton pseudo sert partout (progression, Stadium, amis). Dans le profil : historique, confidentialite (public / amis / prive), demandes d amis et duels.',
    href: '/compte',
    linkLabel: 'Mon compte',
  },
  {
    title: 'Agora',
    body: 'Les idees publiees par la communaute. Tu peux donner jusqu a 3 accords aux missives les plus utiles. Les NOTAM sont des questions ouvertes : reponses et votes (pouces).',
    href: '/agora',
    linkLabel: 'Ouvrir l Agora',
  },
  {
    title: 'Aeropostale',
    body: 'Pour ecrire : signaler un bug, envoyer une idee (missive), ou poser un NOTAM. Tu peux ensuite publier une missive dans l Agora pour recueillir des accords.',
    href: '/boite',
    linkLabel: 'Ouvrir l Aeropostale',
  },
  {
    title: 'Fiches',
    body: 'Entrainement libre, sans limite de temps : calcul, angles, etc. Utile pour ancrer les reflexes avant un test chronometre.',
    href: '/fiches',
    linkLabel: 'Voir les fiches',
  },
  {
    title: 'Telephone',
    body: 'Version adaptee au mobile pour certains exercices (calcul mental, fiches…). Sur telephone, prefere cet acces quand il est propose.',
    href: '/telephone',
    linkLabel: 'Mode telephone',
  },
  {
    title: 'Compte Google',
    body: 'Tu peux te connecter avec Google ou avec un email. A la premiere connexion Google, tu choisis un pseudo unique.',
  },
];

function NoticeContent() {
  return (
    <main className="min-h-screen" style={{ backgroundColor: styles.background }}>
      <header
        className="sticky top-0 z-40 border-b"
        style={{ backgroundColor: styles.background, borderColor: styles.border }}
      >
        <div className="container mx-auto flex items-center gap-3 px-4 py-4">
          <Link href="/">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="mr-1 h-4 w-4" /> Accueil
            </Button>
          </Link>
          <ScrollText className="h-5 w-5" style={{ color: styles.textMuted }} />
          <h1 className="text-lg font-bold" style={{ color: styles.text }}>
            Notice
          </h1>
        </div>
      </header>

      <div className="container mx-auto max-w-2xl space-y-5 px-4 py-8">
        <p className="text-sm leading-relaxed" style={{ color: styles.textMuted }}>
          Comment utiliser AviaTest.
        </p>

        {sections.map((section) => (
          <article
            key={section.title}
            className="rounded-[22px] p-5"
            style={{
              backgroundColor: styles.cardBg,
              border: `1px solid ${styles.border}`,
              boxShadow: styles.shadow,
            }}
          >
            <h2 className="text-base font-semibold" style={{ color: styles.text }}>
              {section.title}
            </h2>
            <p className="mt-2 text-sm leading-relaxed" style={{ color: styles.textMuted }}>
              {section.body}
            </p>
            {section.href && section.linkLabel && (
              <Link
                href={section.href}
                className="mt-3 inline-block text-sm font-medium underline-offset-4 hover:underline"
                style={{ color: styles.text }}
              >
                {section.linkLabel}
              </Link>
            )}
          </article>
        ))}
      </div>
    </main>
  );
}

export default function NoticePage() {
  return (
    <AuthGate>
      <NoticeContent />
    </AuthGate>
  );
}
