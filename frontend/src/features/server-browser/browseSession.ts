import * as App from '../../../wailsjs/go/main/App';
import {domain} from '../../../wailsjs/go/models';

export const BROWSE_SESSION_KEY = 'dzglauncher.browse.v1';

export type BrowseFiltersPlain = {
  exclude1PP: boolean;
  exclude3PP: boolean;
  excludeDay: boolean;
  excludeNight: boolean;
  excludeEmpty: boolean;
  excludeFull: boolean;
  excludeLowPop: boolean;
  lowPopThresholdPct: number;
  excludeNonASCII: boolean;
  deduplicateByName: boolean;
  excludeOfficial: boolean;
  excludeUnofficial: boolean;
  excludeNonModded: boolean;
  mapEquals: string;
  searchSubstring: string;
};

export type BrowseSessionV1 = {
  v: 1;
  filters: BrowseFiltersPlain;
  page: number;
  pageSize: number;
  filtersListOpen: boolean;
  bmId: string;
  raw: Record<string, unknown>[];
};

const PING_SESSION_PLACEHOLDER = 9999;

function scrubPingOnRawRows(raw: Record<string, unknown>[]) {
  for (const row of raw) {
    if (row && typeof row === 'object') {
      row.ping = PING_SESSION_PLACEHOLDER;
    }
  }
}

function readLegacyBrowserSession(): BrowseSessionV1 | null {
  if (typeof sessionStorage === 'undefined' && typeof localStorage === 'undefined') {
    return null;
  }
  for (const store of [sessionStorage, localStorage]) {
    if (!store) {
      continue;
    }
    try {
      const t = store.getItem(BROWSE_SESSION_KEY);
      if (!t) {
        continue;
      }
      const o = JSON.parse(t) as BrowseSessionV1;
      if (o?.v !== 1 || !o.filters || typeof o.filters !== 'object') {
        continue;
      }
      if (!Array.isArray(o.raw)) {
        o.raw = [];
      }
      scrubPingOnRawRows(o.raw);
      return o;
    } catch {
      continue;
    }
  }
  return null;
}

export async function loadBrowseSessionMigrate(): Promise<BrowseSessionV1 | null> {
  try {
    const disk = await App.LoadBrowseSession();
    if (disk) {
      const o = JSON.parse(disk) as BrowseSessionV1;
      if (o?.v === 1 && o.filters && typeof o.filters === 'object') {
        if (!Array.isArray(o.raw)) {
          o.raw = [];
        }
        scrubPingOnRawRows(o.raw);
        return o;
      }
    }
  } catch {
    /* ignore */
  }
  const leg = readLegacyBrowserSession();
  if (leg) {
    try {
      await App.SaveBrowseSession(JSON.stringify(leg));
    } catch {
      /* ignore */
    }
    try {
      sessionStorage.removeItem(BROWSE_SESSION_KEY);
    } catch {
      /* ignore */
    }
    try {
      localStorage.removeItem(BROWSE_SESSION_KEY);
    } catch {
      /* ignore */
    }
  }
  return leg;
}

export function browseSessionPayload(
  filters: BrowseFiltersPlain,
  raw: domain.ServerRow[],
  page: number,
  pageSize: number,
  filtersListOpen: boolean,
  bmId: string,
): BrowseSessionV1 {
  const rawArr = JSON.parse(JSON.stringify(raw)) as Record<string, unknown>[];
  scrubPingOnRawRows(rawArr);
  return {
    v: 1,
    filters,
    raw: rawArr,
    page,
    pageSize,
    filtersListOpen,
    bmId,
  };
}
