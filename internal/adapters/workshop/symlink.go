package workshop

import (
	"errors"
	"io/fs"
	"os"
	"path/filepath"
)

func ensureModSymlink(linkPath, targetDir string) error {
	targetAbs, err := filepath.Abs(targetDir)
	if err != nil {
		targetAbs = filepath.Clean(targetDir)
	}
	fi, err := os.Lstat(linkPath)
	if err == nil {
		if fi.Mode()&fs.ModeSymlink != 0 {
			cur, err := os.Readlink(linkPath)
			if err != nil {
				return err
			}
			resolved := cur
			if !filepath.IsAbs(cur) {
				resolved = filepath.Join(filepath.Dir(linkPath), cur)
			}
			resolved = filepath.Clean(resolved)
			if resolved == filepath.Clean(targetAbs) {
				return nil
			}
		}
		if err := os.Remove(linkPath); err != nil {
			return err
		}
	} else if !errors.Is(err, fs.ErrNotExist) {
		return err
	}
	return os.Symlink(targetAbs, linkPath)
}
