import { test, expect } from '@playwright/test';
import { openExercise, questionsStat, seedStorage } from './helpers';

test('Calcul mental 1: settings, play, results', async ({ page }) => {
  await seedStorage(page, {
    'aviatest-calcul-mental-settings': {
      totalQuestions: 2,
      chainLength: 3,
      maxNumber: 20,
      includeMultiply: false,
      timeLimitSec: 600,
      examMode: false,
    },
  });

  await openExercise(page, '/exercices/calcul-mental');
  await expect(questionsStat(page)).toHaveText('2');

  await page.getByRole('button', { name: 'Paramètres' }).click();
  await expect(page.getByText('Paramètres').first()).toBeVisible();
  await expect(page.getByText('Mode examen')).toBeVisible();
  await expect(page.getByText('Couleurs changeantes')).toHaveCount(0);
  await page.getByRole('button', { name: 'Retour' }).click();
  await expect(questionsStat(page)).toHaveText('2');

  await page.getByRole('button', { name: 'Jouer' }).click();
  await page.getByPlaceholder('?').fill('0');
  await page.getByRole('button', { name: 'Suivant' }).click();
  await expect(page.getByText(/Correct|Pas de reponse|✗/)).toBeVisible();
  await page.getByRole('button', { name: 'Suivant' }).click();

  await page.getByPlaceholder('?').fill('0');
  await page.getByRole('button', { name: 'Suivant' }).click();

  await expect(page.getByText('Résultats')).toBeVisible();
  await expect(page.getByText(/Classe \d/)).toBeVisible();
  await expect(page.getByRole('button', { name: 'Rejouer' })).toBeVisible();
});
