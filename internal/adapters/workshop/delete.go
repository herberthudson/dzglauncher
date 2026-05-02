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

func DeleteModDirs(contentRoot, appid string, paths []string) error {
	if len(paths) == 0 {
		return nil
	}
	base := filepath.Join(contentRoot, "steamapps", "workshop", "content", appid)
	base = filepath.Clean(base)
	for _, p := range paths {
		t := filepath.Clean(p)
		if !underWorkshopContent(base, t) {
			return fmt.Errorf("caminho inválido: %s", p)
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
