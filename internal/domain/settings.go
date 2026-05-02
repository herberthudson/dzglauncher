package domain

type Favorite struct {
	IP        string `json:"ip"`
	GamePort  int    `json:"gamePort"`
	QueryPort int    `json:"queryPort"`
	Label     string `json:"label,omitempty"`
}

type HistoryLine struct {
	IP        string `json:"ip"`
	GamePort  int    `json:"gamePort"`
	QueryPort int    `json:"queryPort"`
	Name      string `json:"name"`
	AtUnix    int64  `json:"atUnix"`
}

type Settings struct {
	PlayerName         string        `json:"playerName"`
	SteamWebAPIKey     string        `json:"steamWebApiKey"`
	BattlemetricsToken string        `json:"battlemetricsToken"`
	SteamLaunchCommand string        `json:"steamLaunchCommand"`
	SteamRootPath      string        `json:"steamRootPath"`
	DayZBranch         string        `json:"dayZBranch"`
	Fullscreen         bool          `json:"fullscreen"`
	Debug              bool          `json:"debug"`
	ModInstallAuto     bool          `json:"modInstallAuto"`
	Favorites          []Favorite    `json:"favorites"`
	QuickFavorite      *Favorite     `json:"quickFavorite,omitempty"`
	QuickFavoriteLabel string        `json:"quickFavoriteLabel"`
	History            []HistoryLine `json:"history"`
	SteamCooldownUntil int64         `json:"steamCooldownUntil"`
	GeoIPDatabasePath  string        `json:"geoIpDatabasePath"`
	LANQueryPort       int           `json:"lanQueryPort"`
	ClientLat          float64       `json:"clientLat"`
	ClientLon          float64       `json:"clientLon"`
	ClientGeoUpdated   int64         `json:"clientGeoUpdated"`
}

func DefaultSettings() Settings {
	return Settings{
		SteamLaunchCommand: "steam",
		DayZBranch:         "stable",
		LANQueryPort:       2305,
	}
}

type SteamKeyValidation struct {
	OK      bool   `json:"ok"`
	Message string `json:"message"`
}
