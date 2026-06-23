import type { AnimationDocument } from '../types/document';
import { exportCss } from './cssExport';

/**
 * Self-contained animated SVG export (framework-free): the cleaned markup with
 * the exported CSS `@keyframes` embedded in a `<style>`, so the file animates on
 * its own and renders the same as the editor.
 *
 * Structural nodes (`<defs>`, `<clipPath>`, wrapping `<g clip-path>`) are part of
 * the markup, so they carry through untouched (SVG-138). The CSS is produced by
 * the one `exportCss` serializer — the same `valueAt` source as the editor — so
 * there's no second interpolation path. Falls back to the plain markup when
 * there's nothing animated (or no markup at all).
 */
export function exportAnimatedSvg(doc: AnimationDocument): string {
  const markup = doc.svgMarkup;
  if (markup.trim() === '') return markup;

  const css = exportCss(doc);
  // exportCss only emits `[data-anim-id="…"]` rules when an element contributes
  // something; its empty/placeholder output has none, so skip embedding then.
  if (!css.includes('[data-anim-id="')) return markup;

  return injectStyle(markup, css);
}

/** Insert a `<style>` with the animation CSS as the first child of the `<svg>` root. */
function injectStyle(markup: string, css: string): string {
  const svgStart = markup.indexOf('<svg');
  if (svgStart === -1) return markup;
  const openTagEnd = markup.indexOf('>', svgStart);
  if (openTagEnd === -1) return markup;
  const style = `\n  <style>\n${css}  </style>`;
  return `${markup.slice(0, openTagEnd + 1)}${style}${markup.slice(openTagEnd + 1)}`;
}
