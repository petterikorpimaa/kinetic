import { describe, it, expect } from 'vitest';
import type { AnimationDocument } from '../types/document';
import { createEmptyDocument } from '../types/document';
import { SCHEMA_VERSION, serializeDocument, deserializeEnvelope } from './persistence';

function sampleDoc(): AnimationDocument {
  return {
    ...createEmptyDocument('doc-1', 'scene.svg'),
    svgMarkup: '<svg><circle data-anim-id="orb"/></svg>',
    elements: [
      {
        id: 'el',
        domRef: 'orb',
        tag: 'circle',
        label: 'Orb',
        transformOrigin: { x: 10, y: 20 },
        baseTransform: '',
        pathLength: 0,
      },
    ],
    tracks: [
      {
        id: 't',
        elementId: 'el',
        property: 'opacity',
        keyframes: [
          { id: 'k0', time: 0, value: 0, easing: [0, 0, 1, 1] },
          { id: 'k1', time: 1, value: 1, easing: [0.42, 0, 0.58, 1] },
        ],
      },
    ],
    selectedElementId: 'el',
  };
}

describe('persistence — round-trip', () => {
  it('serializes and deserializes a document unchanged', () => {
    const doc = sampleDoc();
    const json = serializeDocument(doc, 1000);
    const restored = deserializeEnvelope(json);
    expect(restored).not.toBeNull();
    expect(restored!.document).toEqual(doc);
    expect(restored!.savedAt).toBe(1000);
  });

  it('stamps the current schema version', () => {
    const json = serializeDocument(sampleDoc(), 0);
    expect(JSON.parse(json).schemaVersion).toBe(SCHEMA_VERSION);
  });
});

describe('persistence — rejecting bad data', () => {
  it('returns null for non-JSON', () => {
    expect(deserializeEnvelope('not json {')).toBeNull();
  });

  it('returns null for an envelope without a document', () => {
    expect(deserializeEnvelope(JSON.stringify({ schemaVersion: 1, savedAt: 0 }))).toBeNull();
  });

  it('returns null for a document of the wrong shape', () => {
    const bad = { schemaVersion: 1, savedAt: 0, document: { id: 'x' } };
    expect(deserializeEnvelope(JSON.stringify(bad))).toBeNull();
  });

  it('returns null for a malformed keyframe', () => {
    const doc = sampleDoc();
    const broken = {
      ...doc,
      tracks: [
        {
          ...doc.tracks[0],
          keyframes: [{ id: 'k', time: 'nope', value: 0, easing: [0, 0, 1, 1] }],
        },
      ],
    };
    const json = JSON.stringify({ schemaVersion: 1, savedAt: 0, document: broken });
    expect(deserializeEnvelope(json)).toBeNull();
  });

  it('returns null for a future schema version it cannot handle', () => {
    const json = JSON.stringify({
      schemaVersion: SCHEMA_VERSION + 1,
      savedAt: 0,
      document: sampleDoc(),
    });
    expect(deserializeEnvelope(json)).toBeNull();
  });

  it('rejects a non-positive duration or fps', () => {
    const zeroDuration = { ...sampleDoc(), duration: 0 };
    const hugeFps = { ...sampleDoc(), fps: 1_000_000 };
    expect(
      deserializeEnvelope(JSON.stringify({ schemaVersion: 1, savedAt: 0, document: zeroDuration })),
    ).toBeNull();
    expect(
      deserializeEnvelope(JSON.stringify({ schemaVersion: 1, savedAt: 0, document: hugeFps })),
    ).toBeNull();
  });

  it('rejects an unsafe domRef that could inject into exported code', () => {
    const doc = sampleDoc();
    const hostile = { ...doc, elements: [{ ...doc.elements[0], domRef: 'x"]{}evil' }] };
    const json = JSON.stringify({ schemaVersion: 1, savedAt: 0, document: hostile });
    expect(deserializeEnvelope(json)).toBeNull();
  });

  it('rejects an element whose parentId is not a string', () => {
    const doc = sampleDoc();
    const bad = { ...doc, elements: [{ ...doc.elements[0], parentId: 42 }] };
    const json = JSON.stringify({ schemaVersion: 1, savedAt: 0, document: bad });
    expect(deserializeEnvelope(json)).toBeNull();
  });
});

describe('persistence — nested hierarchy (SVG-136)', () => {
  it('round-trips a nested element with its parent link', () => {
    const doc = sampleDoc();
    const nested: AnimationDocument = {
      ...doc,
      elements: [
        { ...doc.elements[0]!, id: 'grp', domRef: 'grp', tag: 'g', label: 'Group 1' },
        { ...doc.elements[0]!, parentId: 'grp' },
      ],
    };
    const restored = deserializeEnvelope(serializeDocument(nested, 1));
    expect(restored).not.toBeNull();
    expect(restored!.document.elements[1]!.parentId).toBe('grp');
    expect(restored!.document.elements[0]!.parentId).toBeUndefined();
  });
});

describe('persistence — migration', () => {
  it('migrates a v0 document (no fps) up to the current schema', () => {
    const withoutFps: Record<string, unknown> = { ...sampleDoc() };
    delete withoutFps.fps;
    const json = JSON.stringify({ schemaVersion: 0, savedAt: 5, document: withoutFps });
    const restored = deserializeEnvelope(json);
    expect(restored).not.toBeNull();
    expect(restored!.document.fps).toBe(60);
  });
});
