package favhistory

import (
	"errors"
	"strings"

	"dzglauncher/internal/domain"
)

var ErrQuickFavoritesFull = errors.New("QUICK_FAV_LIMIT")

func NormalizeQuickFavorites(cfg *domain.Settings) {
	if cfg.QuickFavorites == nil {
		cfg.QuickFavorites = []domain.Favorite{}
	}
	if len(cfg.QuickFavorites) == 0 && cfg.QuickFavorite != nil {
		f := *cfg.QuickFavorite
		if strings.TrimSpace(f.Label) == "" && strings.TrimSpace(cfg.QuickFavoriteLabel) != "" {
			f.Label = strings.TrimSpace(cfg.QuickFavoriteLabel)
		}
		cfg.QuickFavorites = []domain.Favorite{f}
	}
	cfg.QuickFavorites = dedupeQuickFavorites(cfg.QuickFavorites)
	if len(cfg.QuickFavorites) > domain.MaxQuickFavorites {
		cfg.QuickFavorites = cfg.QuickFavorites[:domain.MaxQuickFavorites]
	}
	cfg.QuickFavorite = nil
	cfg.QuickFavoriteLabel = ""
}

func dedupeQuickFavorites(in []domain.Favorite) []domain.Favorite {
	seen := make(map[string]struct{}, len(in))
	out := make([]domain.Favorite, 0, len(in))
	for _, f := range in {
		k := FavoriteKey(f)
		if _, ok := seen[k]; ok {
			continue
		}
		seen[k] = struct{}{}
		out = append(out, f)
	}
	return out
}

func UpsertQuickFavorite(cfg *domain.Settings, row domain.ServerRow, label string) error {
	NormalizeQuickFavorites(cfg)
	f := domain.FavoriteFromRow(row)
	ls := strings.TrimSpace(label)
	if ls != "" {
		f.Label = ls
	} else if strings.TrimSpace(f.Label) == "" && strings.TrimSpace(f.Name) != "" {
		f.Label = strings.TrimSpace(f.Name)
	}
	k := FavoriteKey(f)
	for i := range cfg.QuickFavorites {
		if FavoriteKey(cfg.QuickFavorites[i]) == k {
			prevLbl := strings.TrimSpace(cfg.QuickFavorites[i].Label)
			cfg.QuickFavorites[i] = f
			if strings.TrimSpace(cfg.QuickFavorites[i].Label) == "" && prevLbl != "" {
				cfg.QuickFavorites[i].Label = prevLbl
			}
			return nil
		}
	}
	if len(cfg.QuickFavorites) >= domain.MaxQuickFavorites {
		return ErrQuickFavoritesFull
	}
	cfg.QuickFavorites = append(cfg.QuickFavorites, f)
	return nil
}

func RemoveQuickFavoriteAt(cfg *domain.Settings, index int) {
	if index < 0 || index >= len(cfg.QuickFavorites) {
		return
	}
	cfg.QuickFavorites = append(cfg.QuickFavorites[:index], cfg.QuickFavorites[index+1:]...)
}

func ClearQuickFavorites(cfg *domain.Settings) {
	cfg.QuickFavorites = []domain.Favorite{}
}

func AddFavoriteIfMissing(cfg *domain.Settings, f domain.Favorite) {
	k := FavoriteKey(f)
	for _, x := range cfg.Favorites {
		if FavoriteKey(x) == k {
			return
		}
	}
	cfg.Favorites = append(cfg.Favorites, f)
}
