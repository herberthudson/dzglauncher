package domain

import "strings"

func MergeKnownMapNamesUnion(existing, discovered []string) []string {
	seen := make(map[string]struct{})
	out := make([]string, 0, len(existing)+len(discovered))
	for _, s := range existing {
		s = strings.TrimSpace(s)
		if s == "" {
			continue
		}
		if _, ok := seen[s]; ok {
			continue
		}
		seen[s] = struct{}{}
		out = append(out, s)
	}
	for _, s := range discovered {
		s = strings.TrimSpace(s)
		if s == "" {
			continue
		}
		if _, ok := seen[s]; ok {
			continue
		}
		seen[s] = struct{}{}
		out = append(out, s)
	}
	return out
}
