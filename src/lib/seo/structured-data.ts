import {
  ExerciseConfig,
  Competition,
  EXERCISE_TYPES,
} from '@/lib/data/exercises';

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || 'https://aviatest.fr';

// ============================================================================
// Exercice → LearningResource
// ============================================================================
export function generateExerciseStructuredData(exercise: ExerciseConfig) {
  return {
    '@context': 'https://schema.org',
    '@type': 'LearningResource',
    '@id': `${BASE_URL}/exercices/${exercise.slug}`,
    name: exercise.title,
    description: exercise.longDescription,
    educationalLevel:
      exercise.difficulty === 'facile'
        ? 'beginner'
        : exercise.difficulty === 'moyen'
          ? 'intermediate'
          : 'advanced',
    learningResourceType: 'Practice Test',
    interactivityType: 'active',
    isAccessibleForFree: true,
    inLanguage: 'fr',
    timeRequired: `PT${exercise.estimatedDuration}M`,
    teaches: exercise.types.map((t) => EXERCISE_TYPES[t].label),
    educationalUse: ['assessment', 'practice'],
    audience: {
      '@type': 'Audience',
      audienceType: 'Candidats pilote de ligne',
    },
    provider: {
      '@type': 'Organization',
      name: 'AviaTest',
      url: BASE_URL,
    },
  };
}

// ============================================================================
// Concours → Course
// ============================================================================
export function generateCompetitionStructuredData(
  competition: Competition,
  exercises: ExerciseConfig[]
) {
  return {
    '@context': 'https://schema.org',
    '@type': 'Course',
    '@id': `${BASE_URL}/concours/${competition.slug}`,
    name: `Preparation ${competition.fullName}`,
    description: competition.description,
    provider: {
      '@type': 'Organization',
      name: 'AviaTest',
      url: BASE_URL,
    },
    isAccessibleForFree: true,
    inLanguage: 'fr',
    hasCourseInstance: exercises.map((ex) => ({
      '@type': 'CourseInstance',
      name: ex.title,
      url: `${BASE_URL}/exercices/${ex.slug}`,
    })),
    audience: {
      '@type': 'Audience',
      audienceType: `Candidats ${competition.fullName}`,
    },
  };
}

// ============================================================================
// Site → WebSite
// ============================================================================
export function generateWebsiteStructuredData() {
  return {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: 'AviaTest',
    url: BASE_URL,
    description:
      'Entrainement gratuit aux tests psychotechniques pour les selections pilote de ligne',
    inLanguage: 'fr',
    potentialAction: {
      '@type': 'SearchAction',
      target: `${BASE_URL}/recherche?q={search_term_string}`,
      'query-input': 'required name=search_term_string',
    },
  };
}

// ============================================================================
// Organisation
// ============================================================================
export function generateOrganizationStructuredData() {
  return {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: 'AviaTest',
    url: BASE_URL,
    logo: `${BASE_URL}/logo.png`,
    description:
      'Plateforme d\'entrainement gratuit aux tests psychotechniques pour les selections pilote',
    sameAs: [],
    contactPoint: {
      '@type': 'ContactPoint',
      contactType: 'customer service',
      availableLanguage: 'French',
    },
  };
}

// ============================================================================
// Breadcrumb
// ============================================================================
export function generateBreadcrumbStructuredData(
  items: { name: string; url: string }[]
) {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: item.name,
      item: item.url,
    })),
  };
}

// ============================================================================
// FAQ (pour pages d'information)
// ============================================================================
export function generateFAQStructuredData(
  faqs: { question: string; answer: string }[]
) {
  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: faqs.map((faq) => ({
      '@type': 'Question',
      name: faq.question,
      acceptedAnswer: {
        '@type': 'Answer',
        text: faq.answer,
      },
    })),
  };
}
