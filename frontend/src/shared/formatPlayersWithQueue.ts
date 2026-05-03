export function formatPlayersWithQueue(players: number, maxPlayers: number, queueSize?: number): string {
  const base = `${players}/${maxPlayers}`;
  const q = queueSize ?? 0;
  if (q > 0) {
    return `${base}+${q}`;
  }
  return base;
}
