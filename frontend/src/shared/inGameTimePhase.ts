export type InGameTimePhase = 'unknown' | 'dawn' | 'day' | 'dusk' | 'night';

export function inGameTimePhase(inGameTime: string): InGameTimePhase {
  if (inGameTime === 'Unknown') {
    return 'unknown';
  }
  const parts = inGameTime.split(':');
  if (parts.length !== 2) {
    return 'unknown';
  }
  const h = Number.parseInt(parts[0]!, 10);
  const m = Number.parseInt(parts[1]!, 10);
  if (!Number.isFinite(h) || !Number.isFinite(m) || m < 0 || m > 59 || h < 0) {
    return 'unknown';
  }
  if (h > 23) {
    return 'unknown';
  }
  const minutes = h * 60 + m;
  if (minutes >= 6 * 60 && minutes < 8 * 60) {
    return 'dawn';
  }
  if (minutes >= 8 * 60 && minutes < 16 * 60) {
    return 'day';
  }
  if (minutes >= 16 * 60 && minutes < 18 * 60) {
    return 'dusk';
  }
  return 'night';
}
