import { test, expect } from '@playwright/test';
import { loadCleanSlate } from './helpers';

test('add a property, edit its value, and see it applied on the canvas', async ({ page }) => {
  await page.goto('/');
  await loadCleanSlate(page);

  const inspector = page.getByTestId('inspector-panel');
  await expect(inspector).toContainText('Shape');
  await expect(page.getByTestId('inspector-count')).toHaveText('0');

  await page.getByTestId('add-property').click();
  await page.getByTestId('add-prop-x').click();
  await expect(page.getByTestId('prop-row-x')).toBeVisible();
  await expect(page.getByTestId('inspector-count')).toHaveText('1');

  // Editing the value writes a keyframe at the playhead and moves the shape.
  const input = page.getByTestId('prop-row-x').locator('input');
  await input.fill('40');
  await input.blur();

  await expect(page.getByTestId('prop-key-x')).toHaveAttribute('data-active', 'true');
  const shape = page.getByTestId('canvas-stage').locator('[data-anim-id="shape"]');
  await expect(shape).toHaveAttribute('transform', /translate\(40 /);
});

test('the add-property menu hides already-active properties', async ({ page }) => {
  await page.goto('/');
  await loadCleanSlate(page);

  await page.getByTestId('add-property').click();
  await page.getByTestId('add-prop-opacity').click();

  await page.getByTestId('add-property').click();
  await expect(page.getByTestId('add-property-menu')).toBeVisible();
  await expect(page.getByTestId('add-prop-opacity')).toHaveCount(0);
  await expect(page.getByTestId('add-prop-x')).toBeVisible();
});

test('remove a property clears its row and resets the count', async ({ page }) => {
  await page.goto('/');
  await loadCleanSlate(page);

  await page.getByTestId('add-property').click();
  await page.getByTestId('add-prop-opacity').click();
  await expect(page.getByTestId('prop-row-opacity')).toBeVisible();
  await expect(page.getByTestId('inspector-count')).toHaveText('1');

  await page.getByTestId('prop-remove-opacity').click();
  await expect(page.getByTestId('prop-row-opacity')).toBeHidden();
  await expect(page.getByTestId('inspector-count')).toHaveText('0');
});

test('a colour property accepts a hex value', async ({ page }) => {
  await page.goto('/');
  await loadCleanSlate(page);

  await page.getByTestId('add-property').click();
  await page.getByTestId('add-prop-fill').click();

  const hex = page.getByTestId('prop-row-fill').locator('input[type="text"]');
  await hex.fill('#ff0000');
  await hex.blur();

  await expect(page.getByTestId('prop-key-fill')).toHaveAttribute('data-active', 'true');
  const shape = page.getByTestId('canvas-stage').locator('[data-anim-id="shape"]');
  await expect(shape).toHaveAttribute('fill', '#ff0000');
});
