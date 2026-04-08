/**
 * Format a number with space as thousands separator.
 * 887554   → "887 554"
 * 10000    → "10 000"
 * 1234.56  → "1 234.56"
 * -5000    → "-5 000"
 */
export function fmtNum(n: number | string): string {
  const num = typeof n === "string" ? parseFloat(n) : n;
  if (isNaN(num)) return String(n);
  // Round to 2 decimal places to avoid floating point artifacts
  const rounded = Math.round(num * 100) / 100;
  const [int, dec] = String(rounded).split(".");
  const formatted = int.replace(/\B(?=(\d{3})+(?!\d))/g, "\u00A0");
  return dec !== undefined ? `${formatted}.${dec}` : formatted;
}
