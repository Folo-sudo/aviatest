import { test, expect } from '@playwright/test';
import { openGuestApp, seedStorage } from './helpers';

test('Enchaînement: pick tests and open settings', async ({ page }) => {
  await seedStorage(page, {});
  await openGuestApp(page, '/enchainement');

  await expect(page.getByRole('heading', { name: 'Enchaînement' })).toBeVisible();
  await page.getByRole('button', { name: /Angles d'Horloge/ }).click();
  await expect(page.getByText(/1 test/)).toBeVisible();

  await page.getByRole('button', { name: 'Régler' }).click();
  await expect(page.getByText(/Règle ce test/)).toBeVisible();
  await page.getByRole('link', { name: /Retour à l'enchaînement/ }).click();
  await expect(page.getByRole('heading', { name: 'Enchaînement' })).toBeVisible();

  await expect(page.getByRole('button', { name: /Lancer l'enchaînement/ })).toBeEnabled();
});
