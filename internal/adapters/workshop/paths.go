package workshop

import (
	"path/filepath"
	"strings"
)

func DayZGameInstallRoot(steamRoot, installOverride string) string {
	if strings.TrimSpace(installOverride) != "" {
		return filepath.Clean(strings.TrimSpace(installOverride))
	}
	r := NormalizeSteamRoot(steamRoot)
	if r == "" {
		return ""
	}
	return filepath.Join(r, "steamapps", "common", "DayZ")
}
