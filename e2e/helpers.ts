import { expect, type Page } from '@playwright/test';

export async function seedStorage(
  page: Page,
  storage: Record<string, unknown>,
): Promise<void> {
  await page.addInitScript((entries) => {
    localStorage.setItem('aviatest-guest', '1');
    for (const [key, value] of Object.entries(entries)) {
      localStorage.setItem(
        key,
        typeof value === 'string' ? value : JSON.stringify(value),
      );
    }
  }, storage);
}

export async function enterGuest(page: Page): Promise<void> {
  await page.route(/supabase\.co/, async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      json: {},
    });
  });
}

export async function openExercise(page: Page, path: string): Promise<void> {
  await enterGuest(page);
  await page.goto(path);
  const play = page.getByRole('button', { name: 'Jouer' });
  const guest = page.getByRole('button', { name: 'Continuer en invité' });
  const configError = page.getByText('Configuration requise');

  await expect(play.or(guest).or(configError)).toBeVisible({ timeout: 30_000 });
  if (await configError.isVisible()) {
    throw new Error(
      'Supabase env manquante (NEXT_PUBLIC_SUPABASE_URL / ANON_KEY).',
    );
  }
  if (await guest.isVisible()) {
    await guest.click();
  }
  await expect(play).toBeVisible({ timeout: 30_000 });
}

export async function openGuestApp(page: Page, path: string): Promise<void> {
  await enterGuest(page);
  await page.goto(path);
  const guest = page.getByRole('button', { name: 'Continuer en invité' });
  const configError = page.getByText('Configuration requise');
  await expect(guest.or(configError).or(page.locator('main'))).toBeVisible({
    timeout: 30_000,
  });
  if (await configError.isVisible()) {
    throw new Error(
      'Supabase env manquante (NEXT_PUBLIC_SUPABASE_URL / ANON_KEY).',
    );
  }
  if (await guest.isVisible()) {
    await guest.click();
  }
}

export function questionsStat(page: Page) {
  return page.getByText('Questions', { exact: true }).locator('xpath=preceding-sibling::p');
}
