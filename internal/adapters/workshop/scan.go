package workshop

import (
	"errors"
	"fmt"
	"os"
	"path/filepath"
	"regexp"
	"strconv"
	"strings"
)

var rePublished = regexp.MustCompile(`(?i)publishedid\s*=\s*(\d+)`)
var reName = regexp.MustCompile(`(?i)name\s*=\s*"([^"]*)"`)

type Item struct {
	ID            string  `json:"id"`
	Name          string  `json:"name"`
	Path          string  `json:"path"`
	SizeBytes     int64   `json:"sizeBytes"`
	MetaTimestamp *int64  `json:"metaTimestamp,omitempty"`
}

var reTimestamp = regexp.MustCompile(`(?i)timestamp\s*=\s*"?(\d+)"?\s*;?`)

func parseMetaTimestamp(data []byte) (int64, bool) {
	m := reTimestamp.FindSubmatch(data)
	if len(m) < 2 {
		return 0, false
	}
	v, err := strconv.ParseInt(string(m[1]), 10, 64)
	if err != nil || v <= 0 {
		return 0, false
	}
	return v, true
}

func ListInstalled(contentRoot string, appid string) ([]Item, error) {
	root := filepath.Join(contentRoot, "steamapps", "workshop", "content", appid)
	fi, err := os.Stat(root)
	if err != nil {
		if errors.Is(err, os.ErrNotExist) {
			return nil, fmt.Errorf("pasta workshop DayZ não encontrada (appid %s): %s", appid, root)
		}
		return nil, err
	}
	if !fi.IsDir() {
		return nil, fmt.Errorf("caminho workshop não é pasta: %s", root)
	}
	ents, err := os.ReadDir(root)
	if err != nil {
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
		var metaTS *int64
		if err == nil {
			if m := rePublished.FindSubmatch(data); len(m) > 1 {
				id = string(m[1])
			}
			if m := reName.FindSubmatch(data); len(m) > 1 {
				name = string(m[1])
			}
			if ts, ok := parseMetaTimestamp(data); ok {
				metaTS = new(int64)
				*metaTS = ts
			}
		}
		modPath := filepath.Join(root, e.Name())
		sz, _ := DirSizeBytes(modPath)
		out = append(out, Item{ID: id, Name: name, Path: modPath, SizeBytes: sz, MetaTimestamp: metaTS})
	}
	return out, nil
}

func WorkshopContentRoot(steamRoot string) string {
	return NormalizeSteamRoot(steamRoot)
}

func NormalizeSteamRoot(raw string) string {
	p := strings.TrimSpace(raw)
	if p == "" {
		return ""
	}
	if p == "~" {
		if h, err := os.UserHomeDir(); err == nil {
			return filepath.Clean(h)
		}
		return p
	}
	if len(p) >= 2 && p[0] == '~' && (p[1] == filepath.Separator || p[1] == '/') {
		if h, err := os.UserHomeDir(); err == nil {
			rest := strings.TrimPrefix(p[2:], "/")
			if rest == "" {
				return filepath.Clean(h)
			}
			return filepath.Clean(filepath.Join(h, rest))
		}
	}
	if filepath.IsAbs(p) {
		return filepath.Clean(p)
	}
	if h, err := os.UserHomeDir(); err == nil {
		candidate := filepath.Join(h, p)
		if st, err := os.Stat(candidate); err == nil && st.IsDir() {
			return filepath.Clean(candidate)
		}
	}
	return filepath.Clean(p)
}

func DayZAppID(branch string) string {
	if strings.EqualFold(branch, "experimental") {
		return "1024020"
	}
	return "221100"
}
