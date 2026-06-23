import { describe, it, expect } from 'vitest';
import { processSvg } from './processSvg';
import { SAMPLE_SVG } from './sample';

describe('processSvg', () => {
  it('extracts the viewBox', () => {
    const { viewBox } = processSvg('<svg viewBox="10 20 300 200"><rect/></svg>');
    expect(viewBox).toEqual({ x: 10, y: 20, w: 300, h: 200 });
  });

  it('falls back to a default viewBox when missing or malformed', () => {
    expect(processSvg('<svg><rect/></svg>').viewBox).toEqual({ x: 0, y: 0, w: 480, h: 360 });
    expect(processSvg('<svg viewBox="bad"><rect/></svg>').viewBox).toEqual({
      x: 0,
      y: 0,
      w: 480,
      h: 360,
    });
  });

  it('keeps only animatable top-level tags', () => {
    const svg = `<svg viewBox="0 0 10 10">
      <defs><linearGradient/></defs>
      <circle/><rect/><title>x</title><path/>
    </svg>`;
    const { elements } = processSvg(svg);
    expect(elements.map((e) => e.tag)).toEqual(['circle', 'rect', 'path']);
  });

  it('assigns a stable data-anim-id, preferring an existing id', () => {
    const { elements, svgMarkup } = processSvg(
      '<svg viewBox="0 0 10 10"><circle id="dot"/><rect/></svg>',
    );
    expect(elements[0]!.id).toBe('dot');
    expect(elements[1]!.id).toBe('rect-1');
    expect(svgMarkup).toContain('data-anim-id="dot"');
    expect(svgMarkup).toContain('data-anim-id="rect-1"');
  });

  it('canonicalizes unsafe ids so they cannot inject into exported selectors/code', () => {
    const { elements, svgMarkup } = processSvg(
      '<svg viewBox="0 0 10 10"><circle id="x&quot;]{}evil"/><rect id="1bad"/></svg>',
    );
    expect(elements[0]!.domRef).toMatch(/^[A-Za-z_][A-Za-z0-9_-]*$/);
    expect(elements[1]!.domRef).toMatch(/^[A-Za-z_][A-Za-z0-9_-]*$/);
    expect(svgMarkup).not.toContain('evil"]');
  });

  it('makes ids unique when they collide after sanitizing', () => {
    const { elements } = processSvg(
      '<svg viewBox="0 0 10 10"><circle id="dot!"/><rect id="dot@"/></svg>',
    );
    expect(elements[0]!.id).not.toBe(elements[1]!.id);
    expect(new Set(elements.map((e) => e.id)).size).toBe(2);
  });

  it('derives a friendly label, preferring data-name', () => {
    const { elements } = processSvg(
      '<svg viewBox="0 0 10 10"><circle data-name="Orb"/><rect/></svg>',
    );
    expect(elements[0]!.label).toBe('Orb');
    expect(elements[1]!.label).toBe('Rect 2');
  });

  it('captures the base transform', () => {
    const { elements } = processSvg(
      '<svg viewBox="0 0 10 10"><g transform="translate(5 5)"/></svg>',
    );
    expect(elements[0]!.baseTransform).toBe('translate(5 5)');
    expect(processSvg('<svg viewBox="0 0 10 10"><rect/></svg>').elements[0]!.baseTransform).toBe(
      '',
    );
  });

  it('strips <script> elements and on* handlers', () => {
    const { svgMarkup } = processSvg(
      '<svg viewBox="0 0 10 10" onload="alert(1)"><script>alert(2)</script><rect onclick="x()"/></svg>',
    );
    expect(svgMarkup).not.toContain('<script');
    expect(svgMarkup.toLowerCase()).not.toContain('onload');
    expect(svgMarkup.toLowerCase()).not.toContain('onclick');
  });

  it('throws on input without an <svg> root', () => {
    expect(() => processSvg('<div>not svg</div>')).toThrow(/no <svg>/);
  });

  it('processes the built-in sample into three ring layers', () => {
    const { elements, viewBox } = processSvg(SAMPLE_SVG);
    expect(viewBox).toEqual({ x: 0, y: 0, w: 480, h: 360 });
    expect(elements.map((e) => e.id)).toEqual(['inner', 'middle', 'outer']);
  });

  it('descends into groups, emitting nested shapes with a parent link (SVG-136)', () => {
    const { elements } = processSvg(
      '<svg viewBox="0 0 10 10"><g id="grp"><path/><circle/></g></svg>',
    );
    // Pre-order: the group, then its children.
    expect(elements.map((e) => e.tag)).toEqual(['g', 'path', 'circle']);
    expect(elements[0]!.parentId).toBeUndefined(); // top-level group
    expect(elements[1]!.parentId).toBe('grp');
    expect(elements[2]!.parentId).toBe('grp');
  });

  it('links arbitrarily deep nesting to the nearest container', () => {
    const { elements } = processSvg(
      '<svg viewBox="0 0 10 10"><g id="a"><g id="b"><path/></g></g></svg>',
    );
    expect(elements.map((e) => e.id)).toEqual(['a', 'b', 'path-2']);
    expect(elements[1]!.parentId).toBe('a');
    expect(elements[2]!.parentId).toBe('b');
  });

  it('labels a group with a readable fallback', () => {
    const { elements } = processSvg('<svg viewBox="0 0 10 10"><g/></svg>');
    expect(elements[0]!.label).toBe('Group 1');
  });

  it('never turns nodes inside <defs>/<clipPath> into layers, and preserves them', () => {
    const { elements, svgMarkup } = processSvg(
      `<svg viewBox="0 0 10 10">
        <defs><clipPath id="c"><rect/></clipPath></defs>
        <g clip-path="url(#c)"><path/></g>
      </svg>`,
    );
    // The clipPath's <rect> must NOT become a layer; only the group + its path.
    expect(elements.map((e) => e.tag)).toEqual(['g', 'path']);
    expect(svgMarkup.toLowerCase()).toContain('clippath');
    expect(svgMarkup).toContain('clip-path="url(#c)"');
  });
});
