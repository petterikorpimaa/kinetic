import { test, expect } from '@playwright/test';

// SVG-103 terminal step: the full happy path ends at export — select → add a
// property → keyframe → scrub → keyframe → open the export modal → copy.

test('animate a property and export it to CSS and GSAP', async ({ page, context }) => {
  await context.grantPermissions(['clipboard-read', 'clipboard-write']);
  await page.goto('/');

  // Add Position X and lay down two keyframes at different times.
  await page.getByTestId('add-property').click();
  await page.getByTestId('add-prop-x').click();
  await page.getByTestId('lane-add-keyframe').click();

  const ruler = page.getByTestId('timeline-ruler');
  const box = await ruler.boundingBox();
  if (box === null) throw new Error('ruler has no bounding box');
  await ruler.click({ position: { x: box.width * 0.6, y: 8 } });
  await page.getByTestId('lane-add-keyframe').click();
  await expect(page.getByTestId('keyframe')).toHaveCount(2);

  // Open the export modal from the topbar menu.
  await page.getByTestId('menu-button').click();
  await page.getByTestId('menu-export').click();
  await expect(page.getByTestId('export-dialog')).toBeVisible();

  // CSS is the default tab and reflects the document.
  await expect(page.getByTestId('export-code')).toContainText('@keyframes');
  await expect(page.getByTestId('export-code')).toContainText('animation:');

  // The GSAP tab produces runnable timeline code.
  await page.getByTestId('export-tab-gsap').click();
  await expect(page.getByTestId('export-code')).toContainText('gsap.timeline');

  // The SVG tab shows the tagged, inlined markup.
  await page.getByTestId('export-tab-svg').click();
  await expect(page.getByTestId('export-code')).toContainText('data-anim-id');

  // Copy gives feedback.
  await page.getByTestId('export-copy').click();
  await expect(page.getByTestId('export-copy')).toContainText('Copied');
});

// SVG-88: the raster pipeline (frame SVG → canvas → gifenc) only runs in a real
// browser, so the GIF render is validated here rather than in unit tests.
test('renders the animation to a downloadable GIF', async ({ page }) => {
  await page.goto('/');

  await page.getByTestId('menu-button').click();
  await page.getByTestId('menu-export').click();
  await expect(page.getByTestId('export-dialog')).toBeVisible();

  await page.getByTestId('export-tab-gif').click();
  await expect(page.getByTestId('raster-panel')).toBeVisible();

  // A low frame rate keeps the render quick and the test stable.
  await page.getByTestId('raster-fps').fill('8');
  await page.getByTestId('raster-render').click();

  // The encoded GIF previews and is offered for download.
  await expect(page.getByTestId('raster-preview')).toBeVisible({ timeout: 30_000 });
  await expect(page.getByTestId('raster-download')).toContainText('.gif');
});

// SVG-88: WebM uses the native MediaRecorder, which only exists in a browser.
// Assert a non-zero recording is produced so a silently-empty blob would fail.
test('records the animation to a WebM video', async ({ page }) => {
  await page.goto('/');

  await page.getByTestId('menu-button').click();
  await page.getByTestId('menu-export').click();
  await page.getByTestId('export-tab-video').click();
  await expect(page.getByTestId('raster-panel')).toBeVisible();

  // A low frame rate keeps the real-time capture short.
  await page.getByTestId('raster-fps').fill('5');
  await page.getByTestId('raster-render').click();

  const download = page.getByTestId('raster-download');
  await expect(download).toBeVisible({ timeout: 60_000 });
  await expect(download).toContainText('.webm');
  await expect(download).not.toContainText('0 B');
});
