package main

import (
	"context"
	_ "embed"
	"fmt"
	"slices"
	"strings"
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

func (a *App) MergeKnownMapNamesFromRows(rows []domain.ServerRow) ([]string, error) {
	discovered := a.DiscoverMapNames(rows)
	cfg, err := a.store.Load()
	if err != nil {
		return nil, err
	}
	merged := domain.MergeKnownMapNamesUnion(cfg.KnownMapNames, discovered)
	if slices.Equal(cfg.KnownMapNames, merged) {
		return merged, nil
	}
	cfg.KnownMapNames = merged
	if err := a.store.Save(cfg); err != nil {
		return nil, err
	}
	return merged, nil
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
		info, err := a2s.Info(out[i].QueryHost, out[i].QueryPort, 2500*time.Millisecond)
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

func (a *App) EnrichServerMods(host string, queryPort int, gamePort int) ([]string, error) {
	r, err := a2s.RulesWithFallback(host, queryPort, gamePort)
	if err != nil {
		return nil, err
	}
	return a2s.DayzWorkshopIDsFromRulesResult(r), nil
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

func (a *App) DeleteWorkshopItems(paths []string) error {
	if len(paths) == 0 {
		return nil
	}
	cfg, err := a.store.Load()
	if err != nil {
		return err
	}
	root := workshop.WorkshopContentRoot(cfg.SteamRootPath)
	if root == "" {
		return fmt.Errorf("pasta raiz Steam não configurada")
	}
	appid := workshop.DayZAppID(cfg.DayZBranch)
	return workshop.DeleteModDirs(root, appid, paths)
}

func (a *App) ToggleFavoriteRow(row domain.ServerRow) error {
	cfg, err := a.store.Load()
	if err != nil {
		return err
	}
	f := domain.FavoriteFromRow(row)
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

func (a *App) MergeFavoriteSnapshots(rows []domain.ServerRow) error {
	if len(rows) == 0 {
		return nil
	}
	cfg, err := a.store.Load()
	if err != nil {
		return err
	}
	by := make(map[string]domain.ServerRow, len(rows))
	for _, r := range rows {
		by[r.FavMatchKey()] = r
	}
	for i := range cfg.Favorites {
		k := favhistory.FavoriteKey(cfg.Favorites[i])
		if r, ok := by[k]; ok {
			lbl := cfg.Favorites[i].Label
			cfg.Favorites[i] = domain.FavoriteFromRow(r)
			cfg.Favorites[i].Label = lbl
		}
	}
	if cfg.QuickFavorite != nil {
		k := favhistory.FavoriteKey(*cfg.QuickFavorite)
		if r, ok := by[k]; ok {
			lbl := cfg.QuickFavorite.Label
			ql := cfg.QuickFavoriteLabel
			nf := domain.FavoriteFromRow(r)
			nf.Label = lbl
			cfg.QuickFavorite = &nf
			cfg.QuickFavoriteLabel = ql
		}
	}
	return a.store.Save(cfg)
}

func (a *App) SetQuickFavorite(row domain.ServerRow, label string) error {
	cfg, err := a.store.Load()
	if err != nil {
		return err
	}
	f := domain.FavoriteFromRow(row)
	f.Label = label
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
	host, gp, err := steamlaunch.ConnectHostPort(row)
	if err != nil {
		return err
	}
	playerName := strings.TrimSpace(cfg.PlayerName)
	if playerName == "" {
		playerName = strings.TrimSpace(row.Name)
	}
	modParam := ""
	if len(row.WorkshopModIDs) > 0 {
		var missing []string
		var werr error
		gameRoot := workshop.DayZGameInstallRoot(cfg.SteamRootPath, cfg.DayZInstallPath)
		modParam, missing, werr = workshop.ModParamFromWorkshopIDs(cfg.SteamRootPath, cfg.DayZBranch, gameRoot, row.WorkshopModIDs)
		if werr != nil {
			return werr
		}
		if len(missing) > 0 {
			return fmt.Errorf("mods workshop em falta (instale na Steam): %s", strings.Join(missing, ", "))
		}
	}
	appID := steamlaunch.AppLaunchID(cfg.DayZBranch)
	if err := steamlaunch.ExecApplaunchDayZ(cfg.SteamLaunchCommand, appID, host, gp, playerName, modParam); err != nil {
		if modParam != "" {
			return fmt.Errorf("steam com lista de mods: %w", err)
		}
		a.OpenExternalURL(steamlaunch.BuildConnectURI(host, gp, cfg.DayZBranch))
	}
	qp := row.QueryPort
	if qp <= 0 {
		qp = 2305
	}
	h := domain.HistoryLine{IP: host, GamePort: gp, QueryPort: qp, Name: row.Name, AtUnix: time.Now().Unix()}
	favhistory.AppendHistory(&cfg, h, 10)
	return a.store.Save(cfg)
}

func cloneInt64Map(m map[string]int64) map[string]int64 {
	if m == nil {
		return make(map[string]int64)
	}
	out := make(map[string]int64, len(m))
	for k, v := range m {
		out[k] = v
	}
	return out
}

func (a *App) JoinModalWorkshopData(host string, queryPort int, gamePort int) ([]domain.WorkshopModRow, error) {
	cfg, err := a.store.Load()
	if err != nil {
		return nil, err
	}
	ids, err := a.EnrichServerMods(host, queryPort, gamePort)
	if err != nil {
		return nil, err
	}
	root := workshop.WorkshopContentRoot(cfg.SteamRootPath)
	var items []workshop.Item
	if root != "" {
		items, err = workshop.ListInstalled(root, workshop.DayZAppID(cfg.DayZBranch))
		if err != nil {
			return nil, err
		}
	}
	installed := make(map[string]workshop.Item)
	for _, it := range items {
		k := workshop.NormWorkshopID(it.ID)
		if k != "" {
			installed[k] = it
		}
	}
	ctx, cancel := context.WithTimeout(a.ctx, 60*time.Second)
	defer cancel()
	details, err := steam.GetPublishedFileDetails(ctx, nil, cfg.SteamWebAPIKey, ids)
	if err != nil {
		return nil, err
	}
	remoteTU := make(map[string]int64)
	remoteTitle := make(map[string]string)
	for k, d := range details {
		remoteTU[k] = d.TimeUpdated
		if d.Title != "" {
			remoteTitle[k] = d.Title
		}
	}
	cache := cfg.WorkshopModTimeUpdated
	rows := workshop.JoinModalRows(ids, installed, cache, remoteTU, remoteTitle)
	newCache := workshop.MergeWorkshopTimeCache(cloneInt64Map(cache), ids, installed, remoteTU)
	cfg.WorkshopModTimeUpdated = newCache
	if err := a.store.Save(cfg); err != nil {
		return nil, err
	}
	return rows, nil
}

func (a *App) WorkshopDownloadItem(id string) error {
	cfg, err := a.store.Load()
	if err != nil {
		return err
	}
	id = strings.TrimSpace(id)
	if id == "" {
		return fmt.Errorf("id vazio")
	}
	if cfg.WorkshopModTimeUpdated == nil {
		cfg.WorkshopModTimeUpdated = map[string]int64{}
	}
	delete(cfg.WorkshopModTimeUpdated, id)
	if err := a.store.Save(cfg); err != nil {
		return err
	}
	appid := workshop.DayZAppID(cfg.DayZBranch)
	u := fmt.Sprintf("steam://url/CommunityFilePage/%s+workshop_download_item %s %s", id, appid, id)
	return steamlaunch.OpenSteamURI(cfg.SteamLaunchCommand, u)
}

func (a *App) OpenExternalURL(u string) {
	if u == "" {
		return
	}
	if strings.HasPrefix(strings.ToLower(strings.TrimSpace(u)), "steam://") {
		cfg, err := a.store.Load()
		if err == nil {
			if err := steamlaunch.OpenSteamURI(cfg.SteamLaunchCommand, u); err == nil {
				return
			}
		}
	}
	runtime.BrowserOpenURL(a.ctx, u)
}

func (a *App) WorkshopPage(id string) {
	a.OpenExternalURL("steam://url/CommunityFilePage/" + id)
}

func (a *App) SaveBrowseSession(json string) error {
	if json == "" {
		return nil
	}
	return a.store.SaveBrowseSessionJSON([]byte(json))
}

func (a *App) LoadBrowseSession() (string, error) {
	b, err := a.store.LoadBrowseSessionJSON()
	if err != nil {
		return "", err
	}
	if len(b) == 0 {
		return "", nil
	}
	return string(b), nil
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
