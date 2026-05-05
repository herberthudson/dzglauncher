package filters

import (
	"strings"
	"unicode"

	"dzglauncher/internal/domain"
	"dzglauncher/internal/services/gametype"
)

func isDayRow(r domain.ServerRow) bool {
	return gametype.IsDayInGameFromLabel(r.InGameTime)
}

func isNightRow(r domain.ServerRow) bool {
	return gametype.IsNightInGameFromLabel(r.InGameTime)
}

func rowMatchesSearchTokens(r domain.ServerRow, query string) bool {
	tokens := strings.Fields(strings.TrimSpace(query))
	if len(tokens) == 0 {
		return true
	}
	ln := strings.ToLower(r.Name)
	lm := strings.ToLower(r.MapName)
	ip := strings.ToLower(r.QueryHost + r.Address)
	for _, tok := range tokens {
		t := strings.ToLower(tok)
		if t == "" {
			continue
		}
		if !strings.Contains(ln, t) && !strings.Contains(lm, t) && !strings.Contains(ip, t) {
			return false
		}
	}
	return true
}

func Apply(rows []domain.ServerRow, f domain.FilterState) []domain.ServerRow {
	out := make([]domain.ServerRow, 0, len(rows))
	seenName := make(map[string]struct{})
	for _, r := range rows {
		if f.Exclude1PP && r.Perspective == "1PP" {
			continue
		}
		if f.Exclude3PP && r.Perspective == "3PP" {
			continue
		}
		if f.ExcludeDay && isDayRow(r) {
			continue
		}
		if f.ExcludeNight && isNightRow(r) {
			continue
		}
		if f.ExcludeEmpty && r.Players == 0 {
			continue
		}
		if f.ExcludeFull && r.MaxPlayers > 0 && r.Players >= r.MaxPlayers {
			continue
		}
		if f.ExcludeLowPop && r.MaxPlayers > 0 {
			pct := 100 * r.Players / r.MaxPlayers
			th := f.LowPopThresholdPct
			if th <= 0 {
				th = 30
			}
			if pct > th {
				continue
			}
		}
		if f.ExcludeNonASCII && hasNonASCII(r.Name) {
			continue
		}
		if f.ExcludeOfficial && r.Provider == "Official" {
			continue
		}
		if f.ExcludeUnofficial && r.Provider == "Unofficial" {
			continue
		}
		if f.ExcludeNonModded && !r.Modded {
			continue
		}
		if f.ExcludePassword && r.PasswordRequired != nil && *r.PasswordRequired {
			continue
		}
		if f.MapEquals != "" && !strings.EqualFold(strings.TrimSpace(f.MapEquals), "all") {
			if !strings.EqualFold(normalizeMap(r.MapName), normalizeMap(f.MapEquals)) {
				continue
			}
		}
		if strings.TrimSpace(f.SearchSubstring) != "" {
			if !rowMatchesSearchTokens(r, f.SearchSubstring) {
				continue
			}
		}
		if f.DeduplicateByName {
			k := strings.ToLower(strings.TrimSpace(r.Name))
			if k == "" {
				k = r.Address
			}
			if _, ok := seenName[k]; ok {
				continue
			}
			seenName[k] = struct{}{}
		}
		out = append(out, r)
	}
	return out
}

func normalizeMap(m string) string {
	return strings.ToLower(strings.TrimSpace(m))
}

func hasNonASCII(s string) bool {
	for _, r := range s {
		if r > unicode.MaxASCII {
			return true
		}
	}
	return false
}
