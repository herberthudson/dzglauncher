package workshop

import (
	"bytes"
	"os"
	"path/filepath"
	"strconv"
	"strings"
)

type acfScanner struct {
	data []byte
	i    int
}

func (s *acfScanner) skipWS() {
	for s.i < len(s.data) {
		c := s.data[s.i]
		if c == ' ' || c == '\t' || c == '\n' || c == '\r' {
			s.i++
			continue
		}
		break
	}
}

func (s *acfScanner) readQuoted() (string, bool) {
	s.skipWS()
	if s.i >= len(s.data) || s.data[s.i] != '"' {
		return "", false
	}
	s.i++
	start := s.i
	for s.i < len(s.data) && s.data[s.i] != '"' {
		s.i++
	}
	if s.i >= len(s.data) {
		return "", false
	}
	out := string(s.data[start:s.i])
	s.i++
	return out, true
}

func parseACFInnerBlock(s *acfScanner) (acfInstalledEntry, bool) {
	s.skipWS()
	if s.i >= len(s.data) || s.data[s.i] != '{' {
		return acfInstalledEntry{}, false
	}
	s.i++
	var ent acfInstalledEntry
	for {
		s.skipWS()
		if s.i < len(s.data) && s.data[s.i] == '}' {
			s.i++
			return ent, true
		}
		k, ok := s.readQuoted()
		if !ok {
			return acfInstalledEntry{}, false
		}
		v, ok := s.readQuoted()
		if !ok {
			return acfInstalledEntry{}, false
		}
		switch strings.ToLower(k) {
		case "size":
			ent.SizeBytes, _ = strconv.ParseInt(v, 10, 64)
		case "timeupdated":
			ent.TimeUpdated, _ = strconv.ParseInt(v, 10, 64)
		case "manifest":
			ent.Manifest = v
		}
	}
}

type acfInstalledEntry struct {
	SizeBytes   int64
	TimeUpdated int64
	Manifest    string
}

func parseWorkshopItemsInstalled(data []byte) map[string]acfInstalledEntry {
	needle := []byte(`"WorkshopItemsInstalled"`)
	idx := bytes.Index(data, needle)
	if idx < 0 {
		return nil
	}
	s := &acfScanner{data: data, i: idx + len(needle)}
	s.skipWS()
	if s.i >= len(s.data) || s.data[s.i] != '{' {
		return nil
	}
	s.i++
	out := make(map[string]acfInstalledEntry)
	for {
		s.skipWS()
		if s.i < len(s.data) && s.data[s.i] == '}' {
			s.i++
			break
		}
		itemID, ok := s.readQuoted()
		if !ok {
			break
		}
		ent, ok := parseACFInnerBlock(s)
		if !ok {
			break
		}
		out[itemID] = ent
	}
	return out
}

func readAppWorkshopInstalled(contentRoot, appid string) map[string]acfInstalledEntry {
	p := filepath.Join(contentRoot, "steamapps", "workshop", "appworkshop_"+appid+".acf")
	data, err := os.ReadFile(p)
	if err != nil || len(data) == 0 {
		return nil
	}
	m := parseWorkshopItemsInstalled(data)
	if len(m) == 0 {
		return nil
	}
	return m
}

func mergeACFIntoItem(it *Item, ent acfInstalledEntry) {
	sz := ent.SizeBytes
	tu := ent.TimeUpdated
	it.AcfSizeBytes = &sz
	it.AcfTimeUpdated = &tu
	if ent.Manifest != "" {
		mf := ent.Manifest
		it.AcfManifest = &mf
	}
}
