import { test, expect, type Page } from '@playwright/test';
import { openExercise, questionsStat, seedStorage } from './helpers';

async function clickFirstStack(page: Page) {
  await page.locator('div.grid button').first().click();
}

test('Empilements entraînement: correction then results', async ({ page }) => {
  await seedStorage(page, {
    'aviatest-empilements-settings': {
      numQuestions: 2,
      timePerQuestionSec: 20,
      examMode: false,
    },
  });

  await openExercise(page, '/exercices/empilements');
  await expect(questionsStat(page)).toHaveText('2');
  await page.getByRole('button', { name: 'Jouer' }).click();

  await expect(page.getByText('Question 1 / 2')).toBeVisible();
  await clickFirstStack(page);
  await expect(page.getByText(/^(Correct|Incorrect)/)).toBeVisible();

  await expect(page.getByText('Question 2 / 2')).toBeVisible({ timeout: 8_000 });
  await clickFirstStack(page);
  await expect(page.getByText('Résultats')).toBeVisible({ timeout: 8_000 });
  await expect(page.getByRole('button', { name: 'Rejouer' })).toBeVisible();
});

test('Empilements mode examen: no inter-question correction', async ({ page }) => {
  await seedStorage(page, {
    'aviatest-empilements-settings': {
      numQuestions: 2,
      timePerQuestionSec: 20,
      examMode: true,
    },
  });

  await openExercise(page, '/exercices/empilements');
  await expect(
    page.getByText('Mode examen — pas de correction entre les questions'),
  ).toBeVisible();
  await expect(questionsStat(page)).toHaveText('2');
  await page.getByRole('button', { name: 'Jouer' }).click();

  await expect(page.getByText('Question 1 / 2')).toBeVisible();
  await clickFirstStack(page);
  await expect(page.getByText('Correct', { exact: true })).toHaveCount(0);
  await expect(page.getByText(/Incorrect/)).toHaveCount(0);

  await expect(page.getByText('Question 2 / 2')).toBeVisible({ timeout: 8_000 });
  await clickFirstStack(page);
  await expect(page.getByText('Résultats')).toBeVisible({ timeout: 8_000 });
});
