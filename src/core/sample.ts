/**
 * Built-in sample SVG: a circular "loader" scene used by the import dialog and
 * the first-run fallback. Three concentric teal rings, each an open two-arc path
 * starting at twelve o'clock and sweeping clockwise, with round caps so the
 * seeded stroke-draw animation reveals a rounded leading tip.
 */
export const SAMPLE_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 480 360">
  <path data-anim-id="inner" data-name="Inner" id="inner" d="M240 140 a40 40 0 1 1 0 80 a40 40 0 1 1 0 -80" fill="none" stroke="#14b8a6" stroke-width="10" stroke-linecap="round"/>
  <path data-anim-id="middle" data-name="Middle" id="middle" d="M240 108 a72 72 0 1 1 0 144 a72 72 0 1 1 0 -144" fill="none" stroke="#14b8a6" stroke-width="10" stroke-linecap="round"/>
  <path data-anim-id="outer" data-name="Outer" id="outer" d="M240 76 a104 104 0 1 1 0 208 a104 104 0 1 1 0 -208" fill="none" stroke="#14b8a6" stroke-width="10" stroke-linecap="round"/>
</svg>`;

export const SAMPLE_FILE_NAME = 'sample-loader.svg';
