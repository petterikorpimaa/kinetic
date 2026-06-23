import { test, expect } from '@playwright/test';

// The M3 happy path: select → add property → keyframe → scrub → play → delete.
// The final "export" step of SVG-103 lands with the export modal in M5.

async function addPositionX(page: import('@playwright/test').Page): Promise<void> {
  await page.getByTestId('add-property').click();
  await page.getByTestId('add-prop-x').click();
  await expect(page.getByTestId('timeline-track')).toBeVisible();
}

test('scrubbing the ruler moves the playhead time', async ({ page }) => {
  await page.goto('/');
  await addPositionX(page);

  await expect(page.getByTestId('inspector-time')).toHaveText('0.00s');

  const ruler = page.getByTestId('timeline-ruler');
  const box = await ruler.boundingBox();
  if (box === null) throw new Error('ruler has no bounding box');
  await ruler.click({ position: { x: box.width / 2, y: 8 } });

  await expect(page.getByTestId('inspector-time')).not.toHaveText('0.00s');
});

test('play advances the playhead and pause holds it', async ({ page }) => {
  await page.goto('/');
  await addPositionX(page);

  await page.getByTestId('transport-rewind').click();
  await expect(page.getByTestId('inspector-time')).toHaveText('0.00s');

  await page.getByTestId('transport-play').click();
  await page.waitForTimeout(300);
  await page.getByTestId('transport-play').click(); // pause

  const paused = await page.getByTestId('inspector-time').textContent();
  expect(paused).not.toBe('0.00s');

  // Once paused, the playhead does not keep moving.
  await page.waitForTimeout(150);
  await expect(page.getByTestId('inspector-time')).toHaveText(paused!);
});

test('add keyframes, select one, and delete it', async ({ page }) => {
  await page.goto('/');
  await addPositionX(page);

  await page.getByTestId('lane-add-keyframe').click();
  await expect(page.getByTestId('keyframe')).toHaveCount(1);

  // Scrub to a fresh time and add a second keyframe.
  const ruler = page.getByTestId('timeline-ruler');
  const box = await ruler.boundingBox();
  if (box === null) throw new Error('ruler has no bounding box');
  await ruler.click({ position: { x: box.width * 0.6, y: 8 } });
  await page.getByTestId('lane-add-keyframe').click();
  await expect(page.getByTestId('keyframe')).toHaveCount(2);

  // Select the first diamond, then delete it with the keyboard.
  await page.getByTestId('keyframe').first().click();
  await expect(page.locator('[data-selected="true"]')).toHaveCount(1);

  await page.keyboard.press('Delete');
  await expect(page.getByTestId('keyframe')).toHaveCount(1);
});
