package workshop

import (
	"fmt"
	"os"
	"path/filepath"
	"strings"
)

func underWorkshopContent(base, target string) bool {
	b := filepath.Clean(base)
	t := filepath.Clean(target)
	rel, err := filepath.Rel(b, t)
	if err != nil {
		return false
	}
	return rel != ".." && !strings.HasPrefix(rel, ".."+string(filepath.Separator))
}

func workshopContentBase(contentRoot, appid string) string {
	return filepath.Clean(filepath.Join(contentRoot, "steamapps", "workshop", "content", appid))
}

func EnsureModDirUnderContent(contentRoot, appid, target string) error {
	base := workshopContentBase(contentRoot, appid)
	t := filepath.Clean(target)
	if !underWorkshopContent(base, t) {
		return fmt.Errorf("invalid path: %s", target)
	}
	st, err := os.Stat(t)
	if err != nil {
		return err
	}
	if !st.IsDir() {
		return fmt.Errorf("not a directory: %s", target)
	}
	return nil
}

func DeleteModDirs(contentRoot, appid string, paths []string) error {
	if len(paths) == 0 {
		return nil
	}
	for _, p := range paths {
		if err := EnsureModDirUnderContent(contentRoot, appid, p); err != nil {
			return err
		}
	}
	for _, p := range paths {
		t := filepath.Clean(p)
		if err := os.RemoveAll(t); err != nil {
			return err
		}
	}
	return nil
}
