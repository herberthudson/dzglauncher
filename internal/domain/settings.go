package domain

import "fmt"

type Favorite struct {
	IP               string   `json:"ip"`
	GamePort         int      `json:"gamePort"`
	QueryPort        int      `json:"queryPort"`
	Label            string   `json:"label,omitempty"`
	Name             string   `json:"name,omitempty"`
	MapName          string   `json:"mapName,omitempty"`
	Perspective      string   `json:"perspective,omitempty"`
	Provider         string   `json:"provider,omitempty"`
	Modded           bool     `json:"modded,omitempty"`
	InGameTime       string   `json:"inGameTime,omitempty"`
	QueueSize        int      `json:"queueSize,omitempty"`
	Players          int      `json:"players,omitempty"`
	MaxPlayers       int      `json:"maxPlayers,omitempty"`
	Ping             int      `json:"ping,omitempty"`
	DistanceLabel    string   `json:"distanceLabel,omitempty"`
	WorkshopModIDs   []string `json:"workshopModIds,omitempty"`
	PasswordRequired *bool    `json:"passwordRequired,omitempty"`
}

func FavoriteFromRow(r ServerRow) Favorite {
	return Favorite{
		IP:               r.QueryHost,
		GamePort:         r.GamePort,
		QueryPort:        r.QueryPort,
		Name:             r.Name,
		MapName:          r.MapName,
		Perspective:      r.Perspective,
		Provider:         r.Provider,
		Modded:           r.Modded,
		InGameTime:       r.InGameTime,
		QueueSize:        r.QueueSize,
		Players:          r.Players,
		MaxPlayers:       r.MaxPlayers,
		Ping:             0,
		DistanceLabel:    r.DistanceLabel,
		WorkshopModIDs:   append([]string(nil), r.WorkshopModIDs...),
		PasswordRequired: CloneBoolPtr(r.PasswordRequired),
	}
}

func (f Favorite) ToServerRow() ServerRow {
	name := f.Name
	if name == "" {
		name = f.Label
	}
	if name == "" {
		name = f.IP
	}
	ping := f.Ping
	if ping <= 0 {
		ping = 9999
	}
	return ServerRow{
		Name:             name,
		MapName:          f.MapName,
		Perspective:      f.Perspective,
		Provider:         f.Provider,
		Modded:           f.Modded,
		InGameTime:       f.InGameTime,
		QueueSize:        f.QueueSize,
		Players:          f.Players,
		MaxPlayers:       f.MaxPlayers,
		Address:          fmt.Sprintf("%s:%d", f.IP, f.GamePort),
		QueryPort:        f.QueryPort,
		GamePort:         f.GamePort,
		QueryHost:        f.IP,
		Ping:             ping,
		DistanceLabel:    f.DistanceLabel,
		WorkshopModIDs:   append([]string(nil), f.WorkshopModIDs...),
		PasswordRequired: CloneBoolPtr(f.PasswordRequired),
	}
}

type HistoryLine struct {
	IP        string `json:"ip"`
	GamePort  int    `json:"gamePort"`
	QueryPort int    `json:"queryPort"`
	Name      string `json:"name"`
	AtUnix    int64  `json:"atUnix"`
}

type Settings struct {
	PlayerName             string           `json:"playerName"`
	SteamWebAPIKey         string           `json:"steamWebApiKey"`
	BattlemetricsToken     string           `json:"battlemetricsToken"`
	SteamLaunchCommand     string           `json:"steamLaunchCommand"`
	SteamRootPath          string           `json:"steamRootPath"`
	DayZInstallPath        string           `json:"dayZInstallPath,omitempty"`
	DayZBranch             string           `json:"dayZBranch"`
	Fullscreen             bool             `json:"fullscreen"`
	Debug                  bool             `json:"debug"`
	ModInstallAuto         bool             `json:"modInstallAuto"`
	Favorites              []Favorite       `json:"favorites"`
	QuickFavorite          *Favorite        `json:"quickFavorite,omitempty"`
	QuickFavoriteLabel     string           `json:"quickFavoriteLabel"`
	QuickFavorites         []Favorite       `json:"quickFavorites,omitempty"`
	History                []HistoryLine    `json:"history"`
	SteamCooldownUntil     int64            `json:"steamCooldownUntil"`
	GeoIPDatabasePath      string           `json:"geoIpDatabasePath"`
	LANQueryPort           int              `json:"lanQueryPort"`
	ClientLat              float64          `json:"clientLat"`
	ClientLon              float64          `json:"clientLon"`
	ClientGeoUpdated       int64            `json:"clientGeoUpdated"`
	Locale                 string           `json:"locale"`
	UITheme                string           `json:"uiTheme"`
	KnownMapNames          []string         `json:"knownMapNames,omitempty"`
	WorkshopModTimeUpdated map[string]int64 `json:"workshopModTimeUpdated,omitempty"`
}

func DefaultSettings() Settings {
	return Settings{
		SteamLaunchCommand: "steam",
		DayZBranch:         "stable",
		LANQueryPort:       2305,
		Favorites:          []Favorite{},
		QuickFavorites:     []Favorite{},
		History:            []HistoryLine{},
		UITheme:            "flat-dark-theme",
	}
}

type SteamKeyValidation struct {
	OK      bool   `json:"ok"`
	Message string `json:"message"`
}
