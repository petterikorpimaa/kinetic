import { test, expect } from '@playwright/test';

// SVG-136/137/138: a grouped SVG imports as a collapsible tree of individually
// selectable layers, and exporting carries the nested ids + clip-path through.
test('imports a grouped SVG as a selectable, exportable layer tree', async ({ page }) => {
  await page.goto('/');

  await page.getByTestId('menu-button').click();
  await page.getByTestId('menu-import').click();
  await page
    .getByTestId('import-dialog')
    .locator('input[type="file"]')
    .setInputFiles('e2e/fixtures/grouped.svg');
  await page.getByTestId('import-confirm').click();
  await expect(page.getByTestId('import-dialog')).toBeHidden();

  const layers = page.getByTestId('layers-panel');

  // The group and both nested shapes are individual rows (SVG-136/137).
  await expect(layers.getByTestId('layer-row-badge')).toBeVisible();
  await expect(layers.getByTestId('layer-row-petal')).toBeVisible();
  await expect(layers.getByTestId('layer-row-core')).toBeVisible();

  // The group has a disclosure; collapsing hides its children, expanding restores them.
  await layers.getByTestId('layer-disclosure-badge').click();
  await expect(layers.getByTestId('layer-row-petal')).toBeHidden();
  await layers.getByTestId('layer-disclosure-badge').click();
  await expect(layers.getByTestId('layer-row-petal')).toBeVisible();

  // Select a nested path and animate it.
  await layers.getByTestId('layer-row-petal').getByText('Petal').click();
  await expect(page.getByTestId('inspector-panel')).toContainText('Petal');
  await page.getByTestId('add-property').click();
  await page.getByTestId('add-prop-opacity').click();
  await expect(page.getByTestId('inspector-panel').getByTestId('prop-row-opacity')).toBeVisible();
  // Drop a keyframe at the playhead so the nested element actually animates.
  await page.getByTestId('prop-key-opacity').click();

  // The nested layer now carries a keyframe-presence dot.
  await expect(layers.getByTestId('layer-dot-petal')).toBeVisible();

  // Export the self-contained animated SVG: nested id targeted + clip-path intact.
  await page.getByTestId('menu-button').click();
  await page.getByTestId('menu-export').click();
  await page.getByTestId('export-tab-svg').click();
  const code = page.getByTestId('export-code');
  await expect(code).toHaveValue(/\[data-anim-id="petal"\]/);
  await expect(code).toHaveValue(/clip-path="url\(#clip0\)"/);
});

// SVG-157: dragging a top-level layer onto a group nests it as a child.
test('drag a layer into a group to nest it', async ({ page }) => {
  await page.goto('/');
  await page.getByTestId('menu-button').click();
  await page.getByTestId('menu-import').click();
  await page
    .getByTestId('import-dialog')
    .locator('input[type="file"]')
    .setInputFiles('e2e/fixtures/grouped.svg');
  await page.getByTestId('import-confirm').click();
  await expect(page.getByTestId('import-dialog')).toBeHidden();

  const layers = page.getByTestId('layers-panel');
  const frame = layers.getByTestId('layer-row-frame');
  const badge = layers.getByTestId('layer-row-badge');
  await expect(frame).toBeVisible();

  // Baseline: 'frame' is top-level, so collapsing the group does not hide it.
  await layers.getByTestId('layer-disclosure-badge').click();
  await expect(frame).toBeVisible();
  await layers.getByTestId('layer-disclosure-badge').click(); // re-expand

  // Drag 'frame' onto the middle of the group row → drop "inside".
  const from = await frame.boundingBox();
  const to = await badge.boundingBox();
  if (from === null || to === null) throw new Error('missing row geometry');
  await page.mouse.move(from.x + from.width / 2, from.y + from.height / 2);
  await page.mouse.down();
  // Move in steps so the threshold trips and the live indicator updates.
  await page.mouse.move(to.x + to.width / 2, to.y + to.height / 2 - 8, { steps: 4 });
  await page.mouse.move(to.x + to.width / 2, to.y + to.height / 2, { steps: 4 });
  await expect(page.getByTestId('layer-drag-ghost')).toBeVisible();
  await page.mouse.up();

  // 'frame' is now a child of the group: collapsing the group hides it.
  await expect(frame).toBeVisible();
  await layers.getByTestId('layer-disclosure-badge').click();
  await expect(frame).toBeHidden();
});
