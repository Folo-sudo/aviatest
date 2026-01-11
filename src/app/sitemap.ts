import { MetadataRoute } from 'next';
import { EXERCISES, getAllCompetitions } from '@/lib/data/exercises';

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || 'https://psychotech-training.fr';

export default function sitemap(): MetadataRoute.Sitemap {
  const staticPages: MetadataRoute.Sitemap = [
    {
      url: BASE_URL,
      lastModified: new Date(),
      changeFrequency: 'weekly',
      priority: 1,
    },
    {
      url: `${BASE_URL}/exercices`,
      lastModified: new Date(),
      changeFrequency: 'weekly',
      priority: 0.9,
    },
    {
      url: `${BASE_URL}/concours`,
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 0.9,
    },
  ];

  // Exercise pages
  const exercisePages: MetadataRoute.Sitemap = EXERCISES.filter((e) => e.ready).map(
    (exercise) => {
      // Handle m-back special cases
      let url = `${BASE_URL}/exercices/${exercise.slug}`;
      if (exercise.id === 'm2-back') {
        url = `${BASE_URL}/exercices/m-back?n=2`;
      } else if (exercise.id === 'm3-back') {
        url = `${BASE_URL}/exercices/m-back?n=3`;
      }

      return {
        url,
        lastModified: new Date(),
        changeFrequency: 'monthly' as const,
        priority: 0.8,
      };
    }
  );

  // Competition pages
  const competitionPages: MetadataRoute.Sitemap = getAllCompetitions().map(
    (competition) => ({
      url: `${BASE_URL}/concours/${competition.slug}`,
      lastModified: new Date(),
      changeFrequency: 'monthly' as const,
      priority: 0.9,
    })
  );

  return [...staticPages, ...exercisePages, ...competitionPages];
}
