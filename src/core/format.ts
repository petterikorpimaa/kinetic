/** Round to 3 decimals and stringify, trimming trailing zeros (−0 → "0"). */
export function round3(value: number): string {
  const rounded = Math.round(value * 1000) / 1000;
  return (rounded === 0 ? 0 : rounded).toString();
}
