import { test, expect } from '@playwright/test';

test('boots with the sample scene loaded', async ({ page }) => {
  await page.goto('/');

  await expect(page.getByTestId('editor-layout')).toBeVisible();
  await expect(page.getByTestId('topbar')).toContainText('Kinetic');

  // Sample SVG auto-loads: layers populate and the first shape is selected.
  await expect(page.getByTestId('layers-panel')).toContainText('Orb');
  await expect(page.getByTestId('canvas-stage').locator('[data-anim-id="orb"]')).toBeVisible();
  await expect(page.getByTestId('inspector-panel')).toContainText('Plate');
  await expect(page.getByTestId('timeline-panel')).toBeVisible();
});

test('selecting a layer updates the inspector', async ({ page }) => {
  await page.goto('/');
  await page.getByTestId('layers-panel').getByRole('button', { name: 'Ring' }).click();
  await expect(page.getByTestId('inspector-panel')).toContainText('Ring');
});

test('clicking a shape on the canvas selects it', async ({ page }) => {
  await page.goto('/');
  await page.getByTestId('canvas-stage').locator('[data-anim-id="spark"]').click();
  await expect(page.getByTestId('inspector-panel')).toContainText('Spark');
});

test('import dialog opens from the menu and loads the sample', async ({ page }) => {
  await page.goto('/');
  await page.getByTestId('topbar').getByRole('button', { name: 'Menu' }).click();
  await page.getByRole('button', { name: 'Import SVG' }).click();
  await expect(page.getByTestId('import-dialog')).toBeVisible();
  await page.getByTestId('load-sample').click();
  await expect(page.getByTestId('import-dialog')).toBeHidden();
  await expect(page.getByTestId('layers-panel')).toContainText('Orb');
});

test('wheel zoom shows the view indicator and reset restores it', async ({ page }) => {
  await page.goto('/');

  // No view change yet → indicator hidden.
  await expect(page.getByTestId('view-indicator')).toBeHidden();

  await page.getByTestId('canvas-viewport').hover();
  await page.mouse.wheel(0, -120);
  await expect(page.getByTestId('view-indicator')).toBeVisible();

  await page.getByTestId('reset-view').click();
  await expect(page.getByTestId('view-indicator')).toBeHidden();
});

test('toggling a layer eye hides and shows the shape', async ({ page }) => {
  await page.goto('/');
  const orb = page.getByTestId('canvas-stage').locator('[data-anim-id="orb"]');
  await expect(orb).toBeVisible();

  await page.getByTestId('layer-vis-orb').click();
  await expect(orb).toBeHidden();

  await page.getByTestId('layer-vis-orb').click();
  await expect(orb).toBeVisible();
});

test('side panels collapse and restore', async ({ page }) => {
  await page.goto('/');

  await page.getByTestId('layers-panel').getByTitle('Collapse panel').click();
  await expect(page.getByTestId('layers-panel')).toBeHidden();
  await expect(page.getByTestId('layers-rail')).toBeVisible();

  await page.getByTestId('layers-rail').click();
  await expect(page.getByTestId('layers-panel')).toBeVisible();
});
