export function formatPlayersWithQueue(players: number, maxPlayers: number, queueSize?: number): string {
  const base = `${players}/${maxPlayers}`;
  const q = queueSize ?? 0;
  const full =
    q > 0 &&
    Number.isFinite(players) &&
    Number.isFinite(maxPlayers) &&
    maxPlayers > 0 &&
    players >= maxPlayers;
  if (full) {
    return `${base}+${q}`;
  }
  return base;
}
