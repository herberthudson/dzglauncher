package workshop

import (
	"strings"

	"dzglauncher/internal/adapters/steam"
	"dzglauncher/internal/domain"
)

func NormWorkshopID(s string) string {
	return strings.TrimSpace(s)
}

func JoinModalRows(serverIDs []string, installedByID map[string]Item, cache map[string]int64, remote map[string]steam.PublishedFileDetail) []domain.WorkshopModRow {
	seen := make(map[string]struct{})
	var rows []domain.WorkshopModRow
	for _, raw := range serverIDs {
		id := NormWorkshopID(raw)
		if id == "" {
			continue
		}
		if _, dup := seen[id]; dup {
			continue
		}
		seen[id] = struct{}{}
		it, hasLocal := installedByID[id]
		detail, hasRemote := remote[id]
		rTU := detail.TimeUpdated
		name := id
		if hasLocal && it.Name != "" {
			name = it.Name
		}
		if t := strings.TrimSpace(detail.Title); t != "" {
			name = t
		}
		var st domain.WorkshopModStatus
		switch {
		case !hasLocal:
			st = domain.WorkshopModMissing
		case !hasRemote || rTU <= 0:
			st = domain.WorkshopModOK
		default:
			cached := cache[id]
			if it.MetaTimestamp != nil && *it.MetaTimestamp > 0 && IsMetaTimestampUnixEpoch(*it.MetaTimestamp) {
				if *it.MetaTimestamp != rTU {
					st = domain.WorkshopModOutdated
				} else {
					st = domain.WorkshopModOK
				}
			} else {
				if cached > 0 && cached != rTU {
					st = domain.WorkshopModOutdated
				} else {
					st = domain.WorkshopModOK
				}
			}
		}
		rows = append(rows, domain.WorkshopModRow{
			ID:          id,
			Name:        name,
			Status:      st,
			Description: detail.Description,
			PreviewURL:  detail.PreviewURL,
		})
	}
	return rows
}

func MergeWorkshopTimeCache(cache map[string]int64, serverIDs []string, installedByID map[string]Item, remoteTU map[string]int64) map[string]int64 {
	if cache == nil {
		cache = make(map[string]int64)
	}
	seen := make(map[string]struct{})
	for _, raw := range serverIDs {
		id := NormWorkshopID(raw)
		if id == "" {
			continue
		}
		if _, dup := seen[id]; dup {
			continue
		}
		seen[id] = struct{}{}
		if _, ok := installedByID[id]; !ok {
			continue
		}
		tu, ok := remoteTU[id]
		if !ok || tu <= 0 {
			continue
		}
		it := installedByID[id]
		metaOK := it.MetaTimestamp != nil && *it.MetaTimestamp > 0 &&
			IsMetaTimestampUnixEpoch(*it.MetaTimestamp) && *it.MetaTimestamp == tu
		c := cache[id]
		if metaOK {
			cache[id] = tu
			continue
		}
		if c > 0 && c != tu {
			continue
		}
		cache[id] = tu
	}
	return cache
}
