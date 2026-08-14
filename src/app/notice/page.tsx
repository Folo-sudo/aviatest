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

type NoticeSection = {
  title: string;
  paragraphs: string[];
  href?: string;
  linkLabel?: string;
};

const sections: NoticeSection[] = [
  {
    title: 'Bienvenue sur AviaTest',
    paragraphs: [
      'Tu prépares une sélection pilote ? Tu es au bon endroit. AviaTest te propose des entraînements psychotechniques gratuits, pensés pour les concours Cadets Air France (PSY0 / PSY1) et ENAC EPL.',
      'L’idée est simple : t’entraîner souvent, voir où tu progresses, et te comparer aux autres quand tu te sens prêt. Pas besoin d’être déjà un crack — on commence où on en est.',
    ],
  },
  {
    title: 'Par où commencer ?',
    paragraphs: [
      'Sur l’accueil, tu as trois portes d’entrée utiles.',
      'Les concours : clique sur PSY0, PSY1 ou ENAC EPL pour voir les tests qui collent à ta sélection. PSY0 et PSY1 font partie du même parcours Cadets Air France — c’est normal qu’ils soient regroupés.',
      'Les compétences : attention, spatial, calcul… Si tu veux travailler un point faible précis, c’est là.',
      'Tout en bas : « Tous les tests », listés un peu en vrac mais rangés par famille. Tu peux explorer librement.',
    ],
    href: '/',
    linkLabel: 'Retour à l’accueil',
  },
  {
    title: 'Les exercices',
    paragraphs: [
      'Chaque test s’ouvre dans son propre écran. Avant de lancer, tu peux souvent régler le nombre de questions, le temps, et le mode examen.',
      'En entraînement (mode examen désactivé), tu vois la correction après chaque réponse — parfait pour apprendre. En mode examen, pas de feedback entre les questions : tu te mets dans les conditions du jour J.',
      'À la fin, ton score est enregistré sur ton compte. Plus tu rejoues, plus tu vois ta progression.',
    ],
    href: '/exercices',
    linkLabel: 'Voir les exercices',
  },
  {
    title: 'Les concours',
    paragraphs: [
      'PSY0 : plutôt vitesse, attention, formats psychotechniques nerveux — souvent le premier palier Cadets.',
      'PSY1 : on monte d’un cran (calcul, logique, doubles tâches…).',
      'ENAC EPL : une préparation plus large, qui touche beaucoup de familles de tests.',
      'Choisis le concours que tu vises vraiment : tu auras une liste claire d’exercices pour t’y préparer sans te disperser.',
    ],
    href: '/concours',
    linkLabel: 'Voir les concours',
  },
  {
    title: 'Le Stadium',
    paragraphs: [
      'Envie de te mesurer aux autres ? Le Stadium, c’est la compétition en direct : même épreuve, même chrono, classement à la clé. Idéal pour sentir la pression (la bonne) avant le vrai concours.',
      'Tu peux aussi défier un ami en duel : tu l’invites, vous lancez ensemble, et vous gardez l’historique. Amical… mais sérieux.',
    ],
    href: '/stadium',
    linkLabel: 'Ouvrir le Stadium',
  },
  {
    title: 'Ton compte et ta progression',
    paragraphs: [
      'Ton pseudo te suit partout : scores, Stadium, amis. C’est ton identité sur AviaTest — choisis-le bien à l’inscription.',
      'Dans ton profil, tu retrouves ton historique, tes réglages de confidentialité (public, amis seulement, ou privé), tes demandes d’amis et tes duels.',
      'Tu peux aussi consulter la page progression pour voir l’évolution de tes résultats dans le temps. C’est motivant de voir la courbe monter.',
    ],
    href: '/compte',
    linkLabel: 'Mon compte',
  },
  {
    title: 'L’Agora',
    paragraphs: [
      'L’Agora, c’est la place de la communauté. Les missives sont des idées ou demandes publiées : tu peux leur donner ton accord (maximum 3 accords au total). Plus une idée a d’accords, plus elle est prioritaire pour l’équipe.',
      'Les NOTAM sont des questions ouvertes à tout le monde : tu lis, tu réponds, tu votes avec les pouces. Parfait pour débloquer un doute ou partager une astuce.',
    ],
    href: '/agora',
    linkLabel: 'Ouvrir l’Agora',
  },
  {
    title: 'L’Aéropostale',
    paragraphs: [
      'Besoin d’écrire à l’équipe ou à la communauté ? L’Aéropostale est ta boîte aux lettres.',
      'Tu peux signaler un bug, proposer une idée (missive), ou poser un NOTAM. Ensuite, si tu veux que ta missive recueille des accords, tu la publies dans l’Agora.',
      'On lit vraiment ce qui remonte — n’hésite pas, même pour un détail qui te semble petit.',
    ],
    href: '/boite',
    linkLabel: 'Ouvrir l’Aéropostale',
  },
  {
    title: 'Les fiches',
    paragraphs: [
      'Les fiches, c’est l’entraînement sans chrono : calcul, angles, etc. Tu t’entraînes tranquillement pour ancrer les réflexes, puis tu repasses sur les tests chronométrés.',
      'Utile les soirs où tu veux progresser sans te mettre la pression.',
    ],
    href: '/fiches',
    linkLabel: 'Voir les fiches',
  },
  {
    title: 'Mode téléphone',
    paragraphs: [
      'Certains exercices ont une version pensée pour le mobile (calcul mental, fiches…). Sur téléphone, utilise l’accès « Téléphone » quand il est proposé : l’écran et les boutons seront plus confortables.',
    ],
    href: '/telephone',
    linkLabel: 'Mode téléphone',
  },
  {
    title: 'Créer un compte',
    paragraphs: [
      'Tu peux t’inscrire avec un email et un mot de passe, ou continuer avec Google. Les deux fonctionnent.',
      'Avec Google, à la première connexion, on te demande juste un pseudo unique — c’est ton nom pour la progression et le Stadium.',
      'Une fois connecté, tout ton entraînement reste lié à ton compte. Tu peux revenir quand tu veux.',
    ],
  },
  {
    title: 'Petit conseil pour la route',
    paragraphs: [
      'Entraîne-toi régulièrement, même par petites sessions. Alterne mode entraînement (pour apprendre) et mode examen (pour te tester). Puis, quand tu te sens chaud, lance un Stadium.',
      'Tu n’es pas seul : l’Agora et l’Aéropostale sont là si tu bloques ou si tu as une idée pour améliorer le site.',
      'Bon courage — et bon vol.',
    ],
    href: '/',
    linkLabel: 'C’est parti',
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
        <div>
          <h2 className="text-2xl font-semibold" style={{ color: styles.text }}>
            Comment ça marche ?
          </h2>
          <p className="mt-2 text-sm leading-relaxed" style={{ color: styles.textMuted }}>
            Tu débutes ici ? Parfait. Voici tout ce qu’il faut savoir pour te sentir à l’aise
            et avancer sereinement.
          </p>
        </div>

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
            <h3 className="text-base font-semibold" style={{ color: styles.text }}>
              {section.title}
            </h3>
            <div className="mt-2 space-y-2.5">
              {section.paragraphs.map((paragraph, index) => (
                <p
                  key={`${section.title}-${index}`}
                  className="text-sm leading-relaxed"
                  style={{ color: styles.textMuted }}
                >
                  {paragraph}
                </p>
              ))}
            </div>
            {section.href && section.linkLabel && (
              <Link
                href={section.href}
                className="mt-4 inline-block text-sm font-medium underline-offset-4 hover:underline"
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
