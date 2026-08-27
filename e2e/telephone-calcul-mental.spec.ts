import { test, expect } from '@playwright/test';
import { openExercise, seedStorage } from './helpers';

test.use({
  viewport: { width: 390, height: 844 },
  isMobile: true,
  hasTouch: true,
});

test('Telephone Calcul mental: play chrome and no foreign settings', async ({
  page,
}) => {
  await seedStorage(page, {
    'aviatest-calcul-mental-mobile-settings': {
      totalQuestions: 1,
      chainLength: 3,
      maxNumber: 20,
      includeMultiply: false,
      timeLimitSec: 600,
      examMode: false,
    },
  });

  await openExercise(page, '/telephone/calcul-mental');
  const play = page.getByRole('button', { name: 'Jouer' });
  const box = await play.boundingBox();
  expect(box).toBeTruthy();
  expect(box!.height).toBeGreaterThanOrEqual(44);

  await page.getByRole('button', { name: 'Paramètres' }).click();
  await expect(page.getByText('Paramètres').first()).toBeVisible();
  await expect(page.getByText('Mode examen')).toBeVisible();
  await expect(page.getByText('Couleurs changeantes')).toHaveCount(0);
});
