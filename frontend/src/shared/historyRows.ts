import {domain} from '../../wailsjs/go/models';

export function historyLineToServerRow(h: domain.HistoryLine): domain.ServerRow {
  const ip = (h.ip || '').trim();
  const nm = (h.name && h.name.trim()) || ip || '';
  return domain.ServerRow.createFrom({
    name: nm,
    mapName: h.mapName ?? '',
    perspective: h.perspective ?? '',
    provider: h.provider ?? '',
    modded: false,
    inGameTime: '',
    queueSize: 0,
    players: 0,
    maxPlayers: 0,
    address: ip + ':' + h.gamePort,
    queryPort: h.queryPort,
    gamePort: h.gamePort,
    queryHost: ip,
    ping: 9999,
    distanceLabel: '',
    workshopModIds: [],
  });
}

export type HistoryTableEntry = {
  historyIndex: number;
  row: domain.ServerRow;
  atUnix: number;
};

export function historyEntries(lines: domain.HistoryLine[]): HistoryTableEntry[] {
  if (!Array.isArray(lines)) {
    return [];
  }
  return lines.map((h, i) => ({
    historyIndex: i,
    row: historyLineToServerRow(h),
    atUnix: h.atUnix ?? 0,
  }));
}
