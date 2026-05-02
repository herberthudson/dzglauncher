import {domain} from '../../wailsjs/go/models';

export function favoriteKey(f: domain.Favorite) {
  return favoriteKeyParts(f.ip, f.gamePort, f.queryPort);
}

export function favoriteKeyParts(ip: string, gamePort: number, queryPort: number) {
  return (ip || '').trim().toLowerCase() + ':' + gamePort + ':' + queryPort;
}

export function favoriteToServerRow(f: domain.Favorite): domain.ServerRow {
  const nm = (f.name && f.name.trim()) || (f.label && f.label.trim()) || f.ip || '';
  const ping = f.ping != null && f.ping > 0 ? f.ping : 9999;
  return domain.ServerRow.createFrom({
    name: nm,
    mapName: f.mapName ?? '',
    perspective: f.perspective ?? '',
    provider: f.provider ?? '',
    modded: !!f.modded,
    inGameTime: f.inGameTime ?? '',
    queueSize: f.queueSize ?? 0,
    players: f.players ?? 0,
    maxPlayers: f.maxPlayers ?? 0,
    address: f.ip + ':' + f.gamePort,
    queryPort: f.queryPort,
    gamePort: f.gamePort,
    queryHost: f.ip,
    ping,
    distanceLabel: f.distanceLabel ?? '',
    workshopModIds: f.workshopModIds ? [...f.workshopModIds] : [],
  });
}

export function favoritesToRows(s: domain.Settings): domain.ServerRow[] {
  const out: domain.ServerRow[] = [];
  const seen = new Set<string>();
  if (s.quickFavorite) {
    out.push(favoriteToServerRow(s.quickFavorite));
    seen.add(favoriteKey(s.quickFavorite));
  }
  const favs = Array.isArray(s.favorites) ? s.favorites : [];
  for (const f of favs) {
    const k = favoriteKey(f);
    if (seen.has(k)) {
      continue;
    }
    out.push(favoriteToServerRow(f));
    seen.add(k);
  }
  return out;
}

export function rowKey(r: domain.ServerRow) {
  return r.queryHost + ':' + r.queryPort + ':' + r.address;
}
