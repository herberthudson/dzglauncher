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

func TestSaveMergesNilSlicesFromDisk(t *testing.T) {
	dir := t.TempDir()
	s := NewStoreAtPath(filepath.Join(dir, "c.json"))
	base := domain.DefaultSettings()
	base.PlayerName = "orig"
	base.QuickFavorites = []domain.Favorite{{IP: "10.0.0.1", GamePort: 2302, QueryPort: 2303}}
	base.Favorites = []domain.Favorite{{IP: "10.0.0.2", GamePort: 2304, QueryPort: 2305}}
	base.History = []domain.HistoryLine{{IP: "10.0.0.3", GamePort: 2306, QueryPort: 2307, Name: "srv", AtUnix: 1}}
	base.KnownMapNames = []string{"Chernarus"}
	base.WorkshopModTimeUpdated = map[string]int64{"m": 42}
	if err := s.Save(base); err != nil {
		t.Fatal(err)
	}
	partial := domain.Settings{PlayerName: "updated"}
	if err := s.Save(partial); err != nil {
		t.Fatal(err)
	}
	got, err := s.Load()
	if err != nil {
		t.Fatal(err)
	}
	if got.PlayerName != "updated" {
		t.Fatalf("playerName %+v", got.PlayerName)
	}
	if len(got.QuickFavorites) != 1 || got.QuickFavorites[0].IP != "10.0.0.1" {
		t.Fatalf("quickFavorites %+v", got.QuickFavorites)
	}
	if len(got.Favorites) != 1 || got.Favorites[0].IP != "10.0.0.2" {
		t.Fatalf("favorites %+v", got.Favorites)
	}
	if len(got.History) != 1 || got.History[0].Name != "srv" {
		t.Fatalf("history %+v", got.History)
	}
	if len(got.KnownMapNames) != 1 || got.KnownMapNames[0] != "Chernarus" {
		t.Fatalf("knownMapNames %+v", got.KnownMapNames)
	}
	if got.WorkshopModTimeUpdated == nil || got.WorkshopModTimeUpdated["m"] != 42 {
		t.Fatalf("workshopModTimeUpdated %+v", got.WorkshopModTimeUpdated)
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
