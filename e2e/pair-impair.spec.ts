import { test, expect } from '@playwright/test';
import { openExercise, seedStorage } from './helpers';

test('Pair/Impair: settings have no exam mode', async ({ page }) => {
  await seedStorage(page, {});
  await openExercise(page, '/exercices/pair-impair');
  await expect(
    page.getByText('Mode examen — pas de correction entre les questions'),
  ).toHaveCount(0);

  await page.getByRole('button', { name: 'Paramètres' }).click();
  await expect(page.getByText('Paramètres').first()).toBeVisible();
  await expect(page.getByText('Mode examen')).toHaveCount(0);
  await expect(page.getByText('Nombres par catégorie')).toBeVisible();
});
