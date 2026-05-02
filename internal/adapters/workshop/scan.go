package workshop

import (
	"errors"
	"os"
	"path/filepath"
	"regexp"
	"strings"
)

var rePublished = regexp.MustCompile(`(?i)publishedid\s*=\s*(\d+)`)
var reName = regexp.MustCompile(`(?i)name\s*=\s*"([^"]*)"`)

type Item struct {
	ID   string `json:"id"`
	Name string `json:"name"`
	Path string `json:"path"`
}

func ListInstalled(contentRoot string, appid string) ([]Item, error) {
	root := filepath.Join(contentRoot, "steamapps", "workshop", "content", appid)
	ents, err := os.ReadDir(root)
	if err != nil {
		if errors.Is(err, os.ErrNotExist) {
			return []Item{}, nil
		}
		return nil, err
	}
	var out []Item
	for _, e := range ents {
		if !e.IsDir() {
			continue
		}
		id := e.Name()
		meta := filepath.Join(root, id, "meta.cpp")
		data, err := os.ReadFile(meta)
		name := id
		if err == nil {
			if m := rePublished.FindSubmatch(data); len(m) > 1 {
				id = string(m[1])
			}
			if m := reName.FindSubmatch(data); len(m) > 1 {
				name = string(m[1])
			}
		}
		out = append(out, Item{ID: id, Name: name, Path: filepath.Join(root, e.Name())})
	}
	return out, nil
}

func WorkshopContentRoot(steamRoot string) string {
	return strings.TrimSpace(steamRoot)
}

func DayZAppID(branch string) string {
	if strings.EqualFold(branch, "experimental") {
		return "1024020"
	}
	return "221100"
}
