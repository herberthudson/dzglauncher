package workshop

import (
	"fmt"
	"os"
	"path/filepath"
	"strings"
)

func ModParamFromWorkshopIDs(steamRoot, branch, gameInstallRoot string, workshopIDs []string) (param string, missing []string, err error) {
	if len(workshopIDs) == 0 {
		return "", nil, nil
	}
	root := NormalizeSteamRoot(steamRoot)
	if root == "" {
		return "", nil, fmt.Errorf("steam root path required to launch with server mods")
	}
	gameRoot := strings.TrimSpace(gameInstallRoot)
	if gameRoot == "" {
		gameRoot = filepath.Join(root, "steamapps", "common", "DayZ")
	} else {
		gameRoot = filepath.Clean(gameRoot)
	}
	if fi, e := os.Stat(gameRoot); e != nil || !fi.IsDir() {
		if e != nil {
			return "", nil, fmt.Errorf("DayZ folder not found: %s: %w", gameRoot, e)
		}
		return "", nil, fmt.Errorf("DayZ path is not a directory: %s", gameRoot)
	}
	appid := DayZAppID(branch)
	items, e := ListInstalled(root, appid)
	if e != nil {
		return "", nil, e
	}
	byID := make(map[string]Item, len(items))
	for _, it := range items {
		byID[strings.TrimSpace(it.ID)] = it
	}
	var linkNames []string
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
		it, ok := byID[wid]
		if !ok {
			missing = append(missing, wid)
			continue
		}
		pub := strings.TrimSpace(it.ID)
		link := ModLinkNameFromPublishedID(pub)
		linkPath := filepath.Join(gameRoot, link)
		if e := ensureModSymlink(linkPath, it.Path); e != nil {
			return "", nil, fmt.Errorf("symlink mod %s: %w", wid, e)
		}
		linkNames = append(linkNames, link)
	}
	if len(missing) > 0 {
		return "", missing, nil
	}
	if len(linkNames) == 0 {
		return "", nil, nil
	}
	return strings.Join(linkNames, ";"), missing, nil
}
