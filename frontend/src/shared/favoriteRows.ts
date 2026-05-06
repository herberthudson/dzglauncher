import {domain} from '../../wailsjs/go/models';

export function favoriteKey(f: domain.Favorite) {
  return favoriteKeyParts(f.ip, f.gamePort, f.queryPort);
}

export function favoriteKeyParts(ip: string, gamePort: number, queryPort: number) {
  return (ip || '').trim().toLowerCase() + ':' + gamePort + ':' + queryPort;
}

export function favRowKey(r: domain.ServerRow): string {
  return favoriteKeyParts(r.queryHost, r.gamePort, r.queryPort);
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
    passwordRequired: f.passwordRequired,
  });
}

export function quickFavoritesList(s: domain.Settings): domain.Favorite[] {
  const q = Array.isArray(s.quickFavorites) ? s.quickFavorites : [];
  if (q.length > 0) {
    return q.slice(0, 5);
  }
  if (s.quickFavorite) {
    return [s.quickFavorite];
  }
  return [];
}

export function quickFavoritesToRows(s: domain.Settings): domain.ServerRow[] {
  return quickFavoritesList(s).map(favoriteToServerRow);
}

export function quickFavoriteEntries(s: domain.Settings): {index: number; row: domain.ServerRow}[] {
  return quickFavoritesList(s).map((f, i) => ({index: i, row: favoriteToServerRow(f)}));
}

export function favoritesOnlyRows(s: domain.Settings): domain.ServerRow[] {
  const favs = Array.isArray(s.favorites) ? s.favorites : [];
  return favs.map(favoriteToServerRow);
}

export function favoritesToRows(s: domain.Settings): domain.ServerRow[] {
  return favoritesOnlyRows(s);
}

export function favoritesKeySet(s: domain.Settings): Set<string> {
  const set = new Set<string>();
  for (const f of s.favorites || []) {
    set.add(favoriteKey(f));
  }
  return set;
}

export function quickFavoritesKeySet(s: domain.Settings): Set<string> {
  const set = new Set<string>();
  for (const f of quickFavoritesList(s)) {
    set.add(favoriteKey(f));
  }
  return set;
}

export function rowKey(r: domain.ServerRow) {
  return r.queryHost + ':' + r.queryPort + ':' + r.address;
}

export const QUICK_FAV_LIMIT = 'QUICK_FAV_LIMIT';

export function mapQuickFavError(err: string, t: (key: string) => string): string {
  if (err.includes(QUICK_FAV_LIMIT)) {
    return t('favorites.quickFavLimit');
  }
  return err;
}
