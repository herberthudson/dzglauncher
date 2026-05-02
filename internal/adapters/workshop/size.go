package workshop

import (
	"io/fs"
	"path/filepath"
)

func DirSizeBytes(root string) (int64, error) {
	var n int64
	err := filepath.WalkDir(root, func(path string, d fs.DirEntry, err error) error {
		if err != nil {
			return nil
		}
		if d.IsDir() {
			return nil
		}
		info, err := d.Info()
		if err != nil {
			return nil
		}
		n += info.Size()
		return nil
	})
	if err != nil {
		return n, err
	}
	return n, nil
}
