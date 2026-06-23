import { test, expect } from '@playwright/test';
import { loadCleanSlate } from './helpers';

// Filters apply path (M4, SVG-29): adding a filter property composes a CSS
// `filter` on the shape; drop-shadow is one expandable entry (SVG-59).

test('adding a blur filter composes a CSS filter on the shape', async ({ page }) => {
  await page.goto('/');
  await loadCleanSlate(page);

  await page.getByTestId('add-property').click();
  await page.getByTestId('add-prop-blur').click();

  const input = page.getByTestId('prop-row-blur').locator('input');
  await input.fill('4');
  await input.blur();

  const shape = page.getByTestId('canvas-stage').locator('[data-anim-id="shape"]');
  await expect(shape).toHaveAttribute('style', /filter:\s*blur\(4px\)/);
});

test('adding drop-shadow creates one expandable group and applies a shadow', async ({ page }) => {
  await page.goto('/');
  await loadCleanSlate(page);

  await page.getByTestId('add-property').click();
  await page.getByTestId('add-prop-dropShadow').click();

  await expect(page.getByTestId('dropshadow-group')).toBeVisible();
  await expect(page.getByTestId('prop-row-shadowX')).toBeVisible();
  await expect(page.getByTestId('prop-row-shadowColor')).toBeVisible();

  const shape = page.getByTestId('canvas-stage').locator('[data-anim-id="shape"]');
  await expect(shape).toHaveAttribute('style', /filter:.*drop-shadow\(/);
});
