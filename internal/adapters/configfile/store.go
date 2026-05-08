package configfile

import (
	"encoding/json"
	"os"
	"path/filepath"
	"sync"

	"dzglauncher/internal/domain"
	"dzglauncher/internal/ports"
	"dzglauncher/internal/services/favhistory"
)

type Store struct {
	path string
	mu   sync.Mutex
}

func NewStore() (*Store, error) {
	base, err := os.UserConfigDir()
	if err != nil {
		return nil, err
	}
	dir := filepath.Join(base, "dzglauncher")
	if err := os.MkdirAll(dir, 0o755); err != nil {
		return nil, err
	}
	return &Store{path: filepath.Join(dir, "config.json")}, nil
}

func NewStoreAtPath(path string) *Store {
	return &Store{path: path}
}

var _ ports.ConfigStore = (*Store)(nil)

func (s *Store) readMergedSettings() (domain.Settings, error) {
	data, err := os.ReadFile(s.path)
	if err != nil {
		if os.IsNotExist(err) {
			return mergeDefaults(domain.DefaultSettings()), nil
		}
		return domain.Settings{}, err
	}
	var out domain.Settings
	if err := json.Unmarshal(data, &out); err != nil {
		return domain.Settings{}, err
	}
	return mergeDefaults(out), nil
}

func mergePreserveNilCollections(disk, incoming domain.Settings) domain.Settings {
	out := incoming
	if incoming.Favorites == nil {
		out.Favorites = disk.Favorites
	}
	if incoming.QuickFavorites == nil {
		out.QuickFavorites = disk.QuickFavorites
	}
	if incoming.History == nil {
		out.History = disk.History
	}
	if incoming.KnownMapNames == nil {
		out.KnownMapNames = disk.KnownMapNames
	}
	if incoming.WorkshopModTimeUpdated == nil {
		out.WorkshopModTimeUpdated = disk.WorkshopModTimeUpdated
	}
	if incoming.QuickFavorite == nil && disk.QuickFavorite != nil {
		out.QuickFavorite = disk.QuickFavorite
	}
	if incoming.UITheme == "" && disk.UITheme != "" {
		out.UITheme = disk.UITheme
	}
	return out
}

func (s *Store) Load() (domain.Settings, error) {
	s.mu.Lock()
	defer s.mu.Unlock()
	return s.readMergedSettings()
}

func mergeDefaults(s domain.Settings) domain.Settings {
	d := domain.DefaultSettings()
	if s.SteamLaunchCommand == "" {
		s.SteamLaunchCommand = d.SteamLaunchCommand
	}
	if s.DayZBranch == "" {
		s.DayZBranch = d.DayZBranch
	}
	if s.LANQueryPort == 0 {
		s.LANQueryPort = d.LANQueryPort
	}
	if s.Favorites == nil {
		s.Favorites = d.Favorites
	}
	if s.History == nil {
		s.History = d.History
	}
	if s.UITheme != "flat-dark-theme" && s.UITheme != "flat-light-theme" {
		s.UITheme = d.UITheme
	}
	if s.UITheme == "" {
		s.UITheme = d.UITheme
	}
	if s.KnownMapNames == nil {
		s.KnownMapNames = []string{}
	}
	if s.WorkshopModTimeUpdated == nil {
		s.WorkshopModTimeUpdated = map[string]int64{}
	}
	if s.QuickFavorites == nil {
		s.QuickFavorites = []domain.Favorite{}
	}
	favhistory.NormalizeQuickFavorites(&s)
	for i := range s.Favorites {
		s.Favorites[i].Ping = 0
	}
	for i := range s.QuickFavorites {
		s.QuickFavorites[i].Ping = 0
	}
	return s
}

func (s *Store) Save(cfg domain.Settings) error {
	s.mu.Lock()
	defer s.mu.Unlock()
	disk, err := s.readMergedSettings()
	if err != nil {
		return err
	}
	cfg = mergePreserveNilCollections(disk, cfg)
	cfg = mergeDefaults(cfg)
	if err := os.MkdirAll(filepath.Dir(s.path), 0o755); err != nil {
		return err
	}
	data, err := json.MarshalIndent(cfg, "", "  ")
	if err != nil {
		return err
	}
	tmp := s.path + ".tmp"
	if err := os.WriteFile(tmp, data, 0o600); err != nil {
		return err
	}
	return os.Rename(tmp, s.path)
}

func (s *Store) browseSessionPath() string {
	return filepath.Join(filepath.Dir(s.path), "browsesession.json")
}

func (s *Store) SaveBrowseSessionJSON(data []byte) error {
	s.mu.Lock()
	defer s.mu.Unlock()
	p := s.browseSessionPath()
	if err := os.MkdirAll(filepath.Dir(p), 0o755); err != nil {
		return err
	}
	tmp := p + ".tmp"
	if err := os.WriteFile(tmp, data, 0o600); err != nil {
		return err
	}
	return os.Rename(tmp, p)
}

func (s *Store) LoadBrowseSessionJSON() ([]byte, error) {
	s.mu.Lock()
	defer s.mu.Unlock()
	p := s.browseSessionPath()
	data, err := os.ReadFile(p)
	if err != nil {
		if os.IsNotExist(err) {
			return nil, nil
		}
		return nil, err
	}
	return data, nil
}
