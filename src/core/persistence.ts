import type { AnimationDocument, ViewBox } from '../types/document';
import type { SceneElement } from '../types/element';
import type { AnyTrack } from '../types/track';
import type { Keyframe } from '../types/keyframe';

/**
 * Document (de)serialization for autosave (framework-free, pure).
 *
 * Stored data is never trusted: `deserializeEnvelope` validates the whole shape
 * and returns null on anything corrupt, foreign, or from a newer schema. Older
 * payloads are upgraded through `MIGRATIONS` before validation, so the rest of
 * the app only ever sees a well-formed current-schema document. The model is
 * already JSON-only (DEC-4), so this is a thin layer with no reshaping.
 */

export const SCHEMA_VERSION = 1;

/** Anim ids are embedded into exported selectors/code, so restored ones must be safe too. */
const SAFE_ID = /^[A-Za-z_][A-Za-z0-9_-]*$/;
/** Guard against a crafted `fps` blowing up per-frame baking on export. */
const MAX_FPS = 240;

interface PersistedEnvelope {
  readonly schemaVersion: number;
  readonly savedAt: number;
  readonly document: AnimationDocument;
}

/** Serialize a document into a versioned, timestamped storage envelope. */
export function serializeDocument(document: AnimationDocument, savedAt: number): string {
  const envelope: PersistedEnvelope = { schemaVersion: SCHEMA_VERSION, savedAt, document };
  return JSON.stringify(envelope);
}

/**
 * Sequential migrations keyed by the version they upgrade FROM. Each returns the
 * raw document one schema version newer. v0 documents predate the `fps` field.
 */
const MIGRATIONS: Record<number, (raw: Record<string, unknown>) => Record<string, unknown>> = {
  0: (raw) => ({ fps: 60, ...raw }),
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}

function isPositiveNumber(value: unknown): value is number {
  return isFiniteNumber(value) && value > 0;
}

function isViewBox(value: unknown): value is ViewBox {
  return (
    isRecord(value) &&
    isFiniteNumber(value.x) &&
    isFiniteNumber(value.y) &&
    isFiniteNumber(value.w) &&
    isFiniteNumber(value.h)
  );
}

function isSceneElement(value: unknown): value is SceneElement {
  return (
    isRecord(value) &&
    typeof value.id === 'string' &&
    typeof value.domRef === 'string' &&
    SAFE_ID.test(value.domRef) &&
    (value.parentId === undefined || typeof value.parentId === 'string') &&
    typeof value.tag === 'string' &&
    typeof value.label === 'string' &&
    isRecord(value.transformOrigin) &&
    isFiniteNumber(value.transformOrigin.x) &&
    isFiniteNumber(value.transformOrigin.y) &&
    typeof value.baseTransform === 'string' &&
    isFiniteNumber(value.pathLength)
  );
}

function isEasing(value: unknown): boolean {
  return Array.isArray(value) && value.length === 4 && value.every(isFiniteNumber);
}

function isKeyframe(value: unknown): value is Keyframe<number | string> {
  return (
    isRecord(value) &&
    typeof value.id === 'string' &&
    isFiniteNumber(value.time) &&
    (isFiniteNumber(value.value) || typeof value.value === 'string') &&
    isEasing(value.easing)
  );
}

function isTrack(value: unknown): value is AnyTrack {
  return (
    isRecord(value) &&
    typeof value.id === 'string' &&
    typeof value.elementId === 'string' &&
    typeof value.property === 'string' &&
    Array.isArray(value.keyframes) &&
    value.keyframes.every(isKeyframe)
  );
}

function isAnimationDocument(value: unknown): value is AnimationDocument {
  return (
    isRecord(value) &&
    typeof value.id === 'string' &&
    typeof value.name === 'string' &&
    isPositiveNumber(value.duration) &&
    isPositiveNumber(value.fps) &&
    value.fps <= MAX_FPS &&
    isViewBox(value.viewBox) &&
    typeof value.svgMarkup === 'string' &&
    Array.isArray(value.elements) &&
    value.elements.every(isSceneElement) &&
    Array.isArray(value.tracks) &&
    value.tracks.every(isTrack) &&
    (value.selectedElementId === null || typeof value.selectedElementId === 'string')
  );
}

/** Upgrade a raw document from `fromVersion` to the current schema, or null if impossible. */
function migrate(
  rawDocument: Record<string, unknown>,
  fromVersion: number,
): Record<string, unknown> | null {
  let document = rawDocument;
  for (let version = fromVersion; version < SCHEMA_VERSION; version++) {
    const step = MIGRATIONS[version];
    if (step === undefined) return null;
    document = step(document);
  }
  return document;
}

/**
 * Parse and validate a storage envelope. Returns the document and its save time,
 * or null when the data is missing, corrupt, from a newer schema, or invalid.
 */
export function deserializeEnvelope(
  json: string,
): { document: AnimationDocument; savedAt: number } | null {
  let parsed: unknown;
  try {
    parsed = JSON.parse(json);
  } catch {
    return null;
  }
  if (!isRecord(parsed) || !isFiniteNumber(parsed.schemaVersion) || !isRecord(parsed.document)) {
    return null;
  }
  if (parsed.schemaVersion > SCHEMA_VERSION) return null;

  const migrated = migrate(parsed.document, parsed.schemaVersion);
  if (migrated === null || !isAnimationDocument(migrated)) return null;

  const savedAt = isFiniteNumber(parsed.savedAt) ? parsed.savedAt : 0;
  return { document: migrated, savedAt };
}
