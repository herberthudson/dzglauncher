export const PAGE_PRESET_SIZES = [10, 20, 50, 100] as const;

export function clampPageSize(n: number): number {
  if (!Number.isFinite(n) || n < 1) {
    return 1;
  }
  if (n > 500) {
    return 500;
  }
  return Math.floor(n);
}
