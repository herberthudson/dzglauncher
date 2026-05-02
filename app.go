package main

import (
	"context"
	_ "embed"
	"fmt"
	"sync"
	"time"

	"github.com/wailsapp/wails/v2/pkg/runtime"

	"dzglauncher/internal/adapters/a2s"
	"dzglauncher/internal/adapters/battlemetrics"
	"dzglauncher/internal/adapters/configfile"
	"dzglauncher/internal/adapters/lan"
	"dzglauncher/internal/adapters/steam"
	"dzglauncher/internal/adapters/workshop"
	"dzglauncher/internal/domain"
	"dzglauncher/internal/services/favhistory"
	"dzglauncher/internal/services/filters"
	"dzglauncher/internal/services/geo"
	"dzglauncher/internal/services/steambrowser"
	"dzglauncher/internal/services/steamlaunch"
)

//go:embed data/dbip-sample.csv
var embeddedGeoSample string

type App struct {
	ctx            context.Context
	store          *configfile.Store
	steam          *steambrowser.Service
	bm             *battlemetrics.Client
	geoMu          sync.RWMutex
	geoRows        []geo.RangeRow
	defaultGeoRows []geo.RangeRow
	geoPath        string
	pingMu         sync.Mutex
	lastPingAt     time.Time
}

func NewApp() (*App, error) {
	st, err := configfile.NewStore()
	if err != nil {
		return nil, err
	}
	return &App{
		store: st,
		steam: steambrowser.NewService(),
		bm:    &battlemetrics.Client{},
	}, nil
}

func (a *App) startup(ctx context.Context) {
	a.ctx = ctx
	if rows, err := geo.ParseRangesBytes([]byte(embeddedGeoSample)); err == nil {
		a.defaultGeoRows = rows
	}
	cfg, err := a.store.Load()
	if err == nil {
		a.reloadGeo(cfg.GeoIPDatabasePath)
	}
}

func (a *App) reloadGeo(path string) {
	a.geoMu.Lock()
	defer a.geoMu.Unlock()
	if path != "" {
		if rows, err := geo.LoadRanges(path); err == nil && len(rows) > 0 {
			a.geoRows = rows
			a.geoPath = path
			return
		}
	}
	a.geoRows = a.defaultGeoRows
	a.geoPath = path
}

func (a *App) LoadSettings() (domain.Settings, error) {
	s, err := a.store.Load()
	if err != nil {
		return domain.Settings{}, err
	}
	a.reloadGeo(s.GeoIPDatabasePath)
	return s, nil
}

func (a *App) SaveSettings(s domain.Settings) error {
	a.reloadGeo(s.GeoIPDatabasePath)
	return a.store.Save(s)
}

func (a *App) ValidateSteamAPIKey(key string) domain.SteamKeyValidation {
	ctx, cancel := context.WithTimeout(a.ctx, 15*time.Second)
	defer cancel()
	if err := steam.ValidateKey(ctx, key); err != nil {
		return domain.SteamKeyValidation{OK: false, Message: err.Error()}
	}
	return domain.SteamKeyValidation{OK: true, Message: ""}
}

func (a *App) FetchSteamServers() ([]domain.ServerRow, error) {
	cfg, err := a.store.Load()
	if err != nil {
		return nil, err
	}
	if time.Now().Unix() < cfg.SteamCooldownUntil {
		return nil, fmt.Errorf("cooldown ativo")
	}
	key := cfg.SteamWebAPIKey
	if key == "" {
		return nil, fmt.Errorf("configure a chave Steam Web API")
	}
	ctx, cancel := context.WithTimeout(a.ctx, 120*time.Second)
	defer cancel()
	rows, err := a.steam.FetchAll(ctx, key, cfg.DayZBranch)
	if len(rows) == 0 {
		if err != nil {
			cfg.SteamCooldownUntil = steambrowser.CooldownUntil()
			_ = a.store.Save(cfg)
			return nil, err
		}
		return nil, fmt.Errorf("lista vazia")
	}
	cfg.SteamCooldownUntil = 0
	_ = a.store.Save(cfg)
	for i := range rows {
		rows[i].DistanceLabel = a.distanceFor(&cfg, rows[i].QueryHost)
	}
	return rows, nil
}

func (a *App) ApplyServerFilters(rows []domain.ServerRow, f domain.FilterState) []domain.ServerRow {
	return filters.Apply(rows, f)
}

func (a *App) DiscoverMapNames(rows []domain.ServerRow) []string {
	seen := map[string]struct{}{}
	var out []string
	for _, r := range rows {
		m := r.MapName
		if m == "" {
			continue
		}
		if _, ok := seen[m]; ok {
			continue
		}
		seen[m] = struct{}{}
		out = append(out, m)
	}
	return out
}

func (a *App) RefreshServersPing(rows []domain.ServerRow) ([]domain.ServerRow, error) {
	a.pingMu.Lock()
	if time.Since(a.lastPingAt) < 2*time.Second {
		a.pingMu.Unlock()
		return rows, fmt.Errorf("aguarde antes de novo ping")
	}
	a.lastPingAt = time.Now()
	a.pingMu.Unlock()
	out := make([]domain.ServerRow, len(rows))
	copy(out, rows)
	for i := range out {
		if out[i].QueryHost == "" || out[i].QueryPort <= 0 {
			continue
		}
		info, err := a2s.Info(out[i].QueryHost, out[i].QueryPort, 900*time.Millisecond)
		if err != nil {
			continue
		}
		out[i].Ping = info.PingMS
		if info.Name != "" {
			out[i].Name = info.Name
		}
		if info.Map != "" {
			out[i].MapName = info.Map
		}
		out[i].Players = info.Players
		out[i].MaxPlayers = info.MaxPlayers
	}
	return out, nil
}

func (a *App) EnrichServerMods(host string, queryPort int) ([]string, error) {
	r, err := a2s.Rules(host, queryPort, 900*time.Millisecond)
	if err != nil {
		return nil, err
	}
	return a2s.WorkshopIDsFromRules(r), nil
}

func (a *App) ResolveBattlemetricsID(id string) (domain.ServerRow, error) {
	cfg, err := a.store.Load()
	if err != nil {
		return domain.ServerRow{}, err
	}
	if cfg.BattlemetricsToken == "" {
		return domain.ServerRow{}, fmt.Errorf("token battlemetrics em falta")
	}
	ctx, cancel := context.WithTimeout(a.ctx, 25*time.Second)
	defer cancel()
	d, err := a.bm.ServerByID(ctx, cfg.BattlemetricsToken, id)
	if err != nil {
		return domain.ServerRow{}, err
	}
	gp := d.Port
	if gp == 0 {
		gp = 2302
	}
	qp := d.PortQuery
	if qp == 0 {
		qp = 2305
	}
	row := domain.ServerRow{
		Name:          "Battlemetrics " + id,
		MapName:       "",
		Perspective:   "3PP",
		Provider:      "Unofficial",
		Modded:        false,
		InGameTime:    "Unknown",
		Address:       fmt.Sprintf("%s:%d", d.IP, gp),
		QueryPort:     qp,
		GamePort:      gp,
		QueryHost:     d.IP,
		Ping:          9999,
		DistanceLabel: a.distanceFor(&cfg, d.IP),
	}
	return row, nil
}

func (a *App) ScanLAN() ([]domain.ServerRow, error) {
	cfg, err := a.store.Load()
	if err != nil {
		return nil, err
	}
	ctx, cancel := context.WithTimeout(a.ctx, 35*time.Second)
	defer cancel()
	rows := lan.Scan(ctx, cfg.LANQueryPort)
	for i := range rows {
		rows[i].DistanceLabel = a.distanceFor(&cfg, rows[i].QueryHost)
	}
	return rows, nil
}

func (a *App) ListWorkshopItems() ([]workshop.Item, error) {
	cfg, err := a.store.Load()
	if err != nil {
		return nil, err
	}
	root := workshop.WorkshopContentRoot(cfg.SteamRootPath)
	if root == "" {
		return []workshop.Item{}, nil
	}
	appid := workshop.DayZAppID(cfg.DayZBranch)
	return workshop.ListInstalled(root, appid)
}

func (a *App) ToggleFavoriteRow(row domain.ServerRow) error {
	cfg, err := a.store.Load()
	if err != nil {
		return err
	}
	f := domain.Favorite{IP: row.QueryHost, GamePort: row.GamePort, QueryPort: row.QueryPort}
	favhistory.ToggleFavorite(&cfg, f)
	return a.store.Save(cfg)
}

func (a *App) RemoveFavorite(ip string, gamePort, queryPort int) error {
	cfg, err := a.store.Load()
	if err != nil {
		return err
	}
	favhistory.RemoveFavorite(&cfg, domain.Favorite{IP: ip, GamePort: gamePort, QueryPort: queryPort})
	return a.store.Save(cfg)
}

func (a *App) SetQuickFavorite(row domain.ServerRow, label string) error {
	cfg, err := a.store.Load()
	if err != nil {
		return err
	}
	f := domain.Favorite{IP: row.QueryHost, GamePort: row.GamePort, QueryPort: row.QueryPort, Label: label}
	cfg.QuickFavorite = &f
	cfg.QuickFavoriteLabel = label
	return a.store.Save(cfg)
}

func (a *App) ClearQuickFavorite() error {
	cfg, err := a.store.Load()
	if err != nil {
		return err
	}
	cfg.QuickFavorite = nil
	cfg.QuickFavoriteLabel = ""
	return a.store.Save(cfg)
}

func (a *App) AppendHistoryRow(row domain.ServerRow) error {
	cfg, err := a.store.Load()
	if err != nil {
		return err
	}
	favhistory.AppendHistory(&cfg, domain.HistoryLine{
		IP: row.QueryHost, GamePort: row.GamePort, QueryPort: row.QueryPort,
		Name: row.Name, AtUnix: time.Now().Unix(),
	}, 10)
	return a.store.Save(cfg)
}

func (a *App) RemoveHistoryIndex(index int) error {
	cfg, err := a.store.Load()
	if err != nil {
		return err
	}
	favhistory.RemoveHistoryAt(&cfg, index)
	return a.store.Save(cfg)
}

func (a *App) LaunchConnect(row domain.ServerRow) error {
	cfg, err := a.store.Load()
	if err != nil {
		return err
	}
	_ = favhistory.AppendHistory
	ctx, cancel := context.WithTimeout(a.ctx, 5*time.Second)
	defer cancel()
	if err := steamlaunch.Launch(ctx, cfg.SteamLaunchCommand, row.QueryHost, row.GamePort, cfg.DayZBranch); err != nil {
		return err
	}
	h := domain.HistoryLine{IP: row.QueryHost, GamePort: row.GamePort, QueryPort: row.QueryPort, Name: row.Name, AtUnix: time.Now().Unix()}
	favhistory.AppendHistory(&cfg, h, 10)
	return a.store.Save(cfg)
}

func (a *App) OpenExternalURL(u string) {
	if u == "" {
		return
	}
	runtime.BrowserOpenURL(a.ctx, u)
}

func (a *App) WorkshopPage(id string) {
	a.OpenExternalURL("steam://url/CommunityFilePage/" + id)
}

func (a *App) distanceFor(cfg *domain.Settings, serverIP string) string {
	if cfg.ClientLat == 0 && cfg.ClientLon == 0 {
		return "Unknown"
	}
	a.geoMu.RLock()
	rows := a.geoRows
	a.geoMu.RUnlock()
	lat, lon, ok := geo.LookupLatLon(rows, serverIP)
	if !ok {
		return "Unknown"
	}
	d := geo.HaversineKm(cfg.ClientLat, cfg.ClientLon, lat, lon)
	return fmt.Sprintf("%.0f km", d)
}
