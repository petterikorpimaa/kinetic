import { test, expect } from '@playwright/test';

// M6: undo/redo (SVG-94) and autosave surviving a reload (SVG-95/106).

async function addKeyframe(page: import('@playwright/test').Page): Promise<void> {
  // Author on the un-animated Plate layer for a clean slate — the sample ships
  // an example animation on the other layers (SVG-155).
  await page.getByTestId('layers-panel').getByRole('button', { name: 'Plate' }).click();
  await page.getByTestId('add-property').click();
  await page.getByTestId('add-prop-x').click();
  await page.getByTestId('lane-add-keyframe').click();
  await expect(page.getByTestId('keyframe')).toHaveCount(1);
}

test('undo removes a keyframe and redo restores it', async ({ page }) => {
  await page.goto('/');
  await addKeyframe(page);

  await page.getByTestId('undo').click();
  await expect(page.getByTestId('keyframe')).toHaveCount(0);

  await page.getByTestId('redo').click();
  await expect(page.getByTestId('keyframe')).toHaveCount(1);
});

test('autosave restores the document after a reload', async ({ page }) => {
  await page.goto('/');
  await addKeyframe(page);

  // Let the debounced autosave flush, then reload.
  await expect(page.getByTestId('saved-indicator')).toBeVisible();
  await page.waitForTimeout(700);
  await page.reload();

  // The keyframe is restored without re-adding the property.
  await expect(page.getByTestId('keyframe')).toHaveCount(1);
  await expect(page.getByTestId('saved-indicator')).toBeVisible();
});
