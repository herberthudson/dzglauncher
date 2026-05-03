package workshop

import (
	"fmt"
	"path/filepath"
	"strings"
)

func ModParamFromWorkshopIDs(steamRoot, branch string, workshopIDs []string) (param string, missing []string, err error) {
	if len(workshopIDs) == 0 {
		return "", nil, nil
	}
	root := NormalizeSteamRoot(steamRoot)
	if root == "" {
		return "", nil, fmt.Errorf("steam root path required to launch with server mods")
	}
	appid := DayZAppID(branch)
	items, e := ListInstalled(root, appid)
	if e != nil {
		return "", nil, e
	}
	byID := make(map[string]string, len(items))
	for _, it := range items {
		byID[strings.TrimSpace(it.ID)] = it.Path
	}
	var paths []string
	seen := make(map[string]struct{})
	for _, wid := range workshopIDs {
		wid = strings.TrimSpace(wid)
		if wid == "" {
			continue
		}
		if _, dup := seen[wid]; dup {
			continue
		}
		seen[wid] = struct{}{}
		p, ok := byID[wid]
		if !ok {
			missing = append(missing, wid)
			continue
		}
		paths = append(paths, p)
	}
	if len(missing) > 0 {
		return "", missing, nil
	}
	if len(paths) == 0 {
		return "", nil, nil
	}
	var b strings.Builder
	for i, p := range paths {
		abs, e2 := filepath.Abs(p)
		if e2 != nil {
			abs = p
		}
		s := filepath.ToSlash(abs)
		if i > 0 {
			b.WriteString(";")
		}
		b.WriteString(s)
	}
	return b.String(), missing, nil
}
