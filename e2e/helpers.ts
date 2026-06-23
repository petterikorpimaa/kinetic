import { expect, type Page } from '@playwright/test';

/** Pause playback if it's running (the editor plays by default). No rewind. */
export async function pausePlayback(page: Page): Promise<void> {
  const play = page.getByTestId('transport-play');
  if ((await play.getAttribute('title')) === 'Pause') await play.click();
}

/**
 * Import a single un-animated "Shape" layer and select it, then pause + rewind
 * to a still playhead at 0. The bundled sample animates every ring and plays by
 * default, so author-from-scratch specs start from this clean, stationary slate
 * (path is resolved relative to the Playwright working directory — the repo root).
 */
export async function loadCleanSlate(page: Page): Promise<void> {
  await page.getByTestId('menu-button').click();
  await page.getByTestId('menu-import').click();
  await page
    .getByTestId('import-dialog')
    .locator('input[type="file"]')
    .setInputFiles('e2e/fixtures/clean.svg');
  // The dialog now previews first; confirm to commit the import (SVG-139).
  await page.getByTestId('import-confirm').click();
  await expect(page.getByTestId('import-dialog')).toBeHidden();
  await page.getByTestId('layers-panel').getByRole('button', { name: 'Shape' }).click();
  await pausePlayback(page);
  await page.getByTestId('transport-rewind').click();
}
