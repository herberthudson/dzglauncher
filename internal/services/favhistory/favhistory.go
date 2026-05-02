package favhistory

import (
	"strconv"
	"strings"

	"dzglauncher/internal/domain"
)

func favKey(f domain.Favorite) string {
	return strings.ToLower(strings.TrimSpace(f.IP)) + ":" + strconv.Itoa(f.GamePort) + ":" + strconv.Itoa(f.QueryPort)
}

func FavoriteKey(f domain.Favorite) string {
	return favKey(f)
}

func ToggleFavorite(cfg *domain.Settings, f domain.Favorite) {
	k := favKey(f)
	for i, x := range cfg.Favorites {
		if favKey(x) == k {
			cfg.Favorites = append(cfg.Favorites[:i], cfg.Favorites[i+1:]...)
			return
		}
	}
	cfg.Favorites = append(cfg.Favorites, f)
}

func RemoveFavorite(cfg *domain.Settings, f domain.Favorite) {
	k := favKey(f)
	var kept []domain.Favorite
	for _, x := range cfg.Favorites {
		if favKey(x) != k {
			kept = append(kept, x)
		}
	}
	cfg.Favorites = kept
}

func HistoryKey(h domain.HistoryLine) string {
	return strings.ToLower(h.IP) + ":" + strconv.Itoa(h.GamePort) + ":" + strconv.Itoa(h.QueryPort)
}

func AppendHistory(cfg *domain.Settings, h domain.HistoryLine, max int) {
	if max <= 0 {
		max = 10
	}
	k := HistoryKey(h)
	for _, x := range cfg.History {
		if HistoryKey(x) == k {
			return
		}
	}
	cfg.History = append(cfg.History, h)
	if len(cfg.History) > max {
		ex := len(cfg.History) - max
		cfg.History = cfg.History[ex:]
	}
}

func RemoveHistoryAt(cfg *domain.Settings, index int) {
	if index < 0 || index >= len(cfg.History) {
		return
	}
	cfg.History = append(cfg.History[:index], cfg.History[index+1:]...)
}
