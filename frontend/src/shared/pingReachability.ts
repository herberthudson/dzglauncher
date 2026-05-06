export function pingLooksUnavailable(ping: unknown): boolean {
  if (ping == null) {
    return true;
  }
  const n = typeof ping === 'number' ? ping : Number(ping);
  return !Number.isFinite(n) || n === 9999;
}
