package configfile

import (
	"path/filepath"
	"testing"

	"dzglauncher/internal/domain"
)

func TestStoreRoundTrip(t *testing.T) {
	dir := t.TempDir()
	s := NewStoreAtPath(filepath.Join(dir, "c.json"))
	cfg := domain.DefaultSettings()
	cfg.PlayerName = "x"
	cfg.SteamWebAPIKey = "k"
	if err := s.Save(cfg); err != nil {
		t.Fatal(err)
	}
	got, err := s.Load()
	if err != nil {
		t.Fatal(err)
	}
	if got.PlayerName != "x" || got.SteamWebAPIKey != "k" {
		t.Fatalf("%+v", got)
	}
}

func TestBrowseSessionJSONRoundTrip(t *testing.T) {
	dir := t.TempDir()
	s := NewStoreAtPath(filepath.Join(dir, "c.json"))
	payload := []byte(`{"v":1,"filters":{},"raw":[]}`)
	if err := s.SaveBrowseSessionJSON(payload); err != nil {
		t.Fatal(err)
	}
	got, err := s.LoadBrowseSessionJSON()
	if err != nil {
		t.Fatal(err)
	}
	if string(got) != string(payload) {
		t.Fatalf("got %q", got)
	}
}
