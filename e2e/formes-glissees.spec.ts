import { test, expect } from '@playwright/test';
import { openExercise, seedStorage } from './helpers';

test('Formes glissées: couleurs changeantes in settings', async ({ page }) => {
  await seedStorage(page, {});
  await openExercise(page, '/exercices/formes-glissees');
  await page.getByRole('button', { name: 'Paramètres' }).click();
  await expect(page.getByText('Couleurs changeantes')).toBeVisible();
  await expect(page.getByText('Mode examen')).toBeVisible();
});
