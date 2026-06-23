import { expect, type Page } from '@playwright/test';

/**
 * Import a single un-animated "Shape" layer and select it. The bundled sample
 * animates every ring, so author-from-scratch specs start from this clean slate
 * (path is resolved relative to the Playwright working directory — the repo root).
 */
export async function loadCleanSlate(page: Page): Promise<void> {
  await page.getByTestId('menu-button').click();
  await page.getByTestId('menu-import').click();
  await page
    .getByTestId('import-dialog')
    .locator('input[type="file"]')
    .setInputFiles('e2e/fixtures/clean.svg');
  await expect(page.getByTestId('import-dialog')).toBeHidden();
  await page.getByTestId('layers-panel').getByRole('button', { name: 'Shape' }).click();
}
