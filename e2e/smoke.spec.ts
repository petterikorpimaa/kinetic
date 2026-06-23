import { test, expect } from '@playwright/test';
import { pausePlayback } from './helpers';

test('boots with the sample scene loaded', async ({ page }) => {
  await page.goto('/');

  await expect(page.getByTestId('editor-layout')).toBeVisible();
  await expect(page.getByTestId('topbar')).toContainText('Kinetic');

  // Sample SVG auto-loads with its example animation; the animated inner ring is selected.
  await expect(page.getByTestId('layers-panel')).toContainText('Inner');
  await expect(page.getByTestId('canvas-stage').locator('[data-anim-id="inner"]')).toBeVisible();
  await expect(page.getByTestId('inspector-panel')).toContainText('Inner');
  await expect(page.getByTestId('timeline-panel')).toBeVisible();
  // Seeded keyframes show on the timeline straight away — no user setup (SVG-155).
  await expect(page.getByTestId('timeline-track').first()).toBeVisible();
});

test('selecting a layer updates the inspector', async ({ page }) => {
  await page.goto('/');
  await page.getByTestId('layers-panel').getByRole('button', { name: 'Middle' }).click();
  await expect(page.getByTestId('inspector-panel')).toContainText('Middle');
});

test('clicking a shape on the canvas selects it', async ({ page }) => {
  await page.goto('/');
  // The editor plays by default; pause so the ring holds still while we map a
  // point on it to screen coords (a moving ring would slip out from the click).
  await pausePlayback(page);
  // Rings draw on from empty, so scrub to where the outer ring is fully drawn
  // but not yet pulsing (≈1s into the 2s loop) before clicking it.
  const ruler = page.getByTestId('timeline-ruler');
  const box = await ruler.boundingBox();
  if (box === null) throw new Error('ruler has no bounding box');
  await ruler.click({ position: { x: box.width * 0.52, y: 8 } });

  // …then click a point on the outer ring's stroke. It's hollow (fill="none"),
  // so map a point along the path to screen coords and click exactly there.
  const outer = page.getByTestId('canvas-stage').locator('[data-anim-id="outer"]');
  const point = await outer.evaluate((el) => {
    const geo = el as SVGGeometryElement;
    const p = geo.getPointAtLength(geo.getTotalLength() * 0.25);
    const m = geo.getScreenCTM();
    if (m === null) throw new Error('no screen CTM');
    return { x: m.a * p.x + m.c * p.y + m.e, y: m.b * p.x + m.d * p.y + m.f };
  });
  await page.mouse.click(point.x, point.y);
  await expect(page.getByTestId('inspector-panel')).toContainText('Outer');
});

test('import dialog opens from the menu and loads the sample', async ({ page }) => {
  await page.goto('/');
  await page.getByTestId('topbar').getByRole('button', { name: 'Menu' }).click();
  await page.getByRole('button', { name: 'Import SVG' }).click();
  await expect(page.getByTestId('import-dialog')).toBeVisible();
  await page.getByTestId('load-sample').click();
  await expect(page.getByTestId('import-dialog')).toBeHidden();
  await expect(page.getByTestId('layers-panel')).toContainText('Inner');
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
  const inner = page.getByTestId('canvas-stage').locator('[data-anim-id="inner"]');
  await expect(inner).toBeVisible();

  await page.getByTestId('layer-vis-inner').click();
  await expect(inner).toBeHidden();

  await page.getByTestId('layer-vis-inner').click();
  await expect(inner).toBeVisible();
});

test('side panels collapse and restore', async ({ page }) => {
  await page.goto('/');

  await page.getByTestId('layers-panel').getByTitle('Collapse panel').click();
  await expect(page.getByTestId('layers-panel')).toBeHidden();
  await expect(page.getByTestId('layers-rail')).toBeVisible();

  await page.getByTestId('layers-rail').click();
  await expect(page.getByTestId('layers-panel')).toBeVisible();
});
