import type {domain} from '../../../wailsjs/go/models';

export type BrowseListSortKey = 'ping' | 'perspective' | 'players';

const PING_BAD = 9e6;

export function pingSortValue(p: number): number {
  if (!Number.isFinite(p) || p < 0 || p >= 4000) {
    return PING_BAD;
  }
  return p;
}

export function compareBrowseRows(a: domain.ServerRow, b: domain.ServerRow, key: BrowseListSortKey): number {
  switch (key) {
    case 'ping':
      return pingSortValue(a.ping) - pingSortValue(b.ping);
    case 'perspective':
      return String(a.perspective ?? '').localeCompare(String(b.perspective ?? ''), undefined, {numeric: true, sensitivity: 'base'});
    case 'players':
      return (Number(a.players) || 0) - (Number(b.players) || 0);
  }
}

export function sortBrowseRows(
  rows: domain.ServerRow[],
  key: BrowseListSortKey | null,
  asc: boolean,
  rowKeyFn: (r: domain.ServerRow) => string,
): domain.ServerRow[] {
  if (!key) {
    return rows;
  }
  const dir = asc ? 1 : -1;
  const out = [...rows];
  out.sort((a, b) => {
    const d = dir * compareBrowseRows(a, b, key);
    if (d !== 0) {
      return d;
    }
    return rowKeyFn(a).localeCompare(rowKeyFn(b));
  });
  return out;
}
