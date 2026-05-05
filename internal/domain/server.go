package domain

import (
	"strconv"
	"strings"
)

type ServerRow struct {
	Name             string   `json:"name"`
	MapName          string   `json:"mapName"`
	Perspective      string   `json:"perspective"`
	Provider         string   `json:"provider"`
	Modded           bool     `json:"modded"`
	InGameTime       string   `json:"inGameTime"`
	QueueSize        int      `json:"queueSize"`
	Players          int      `json:"players"`
	MaxPlayers       int      `json:"maxPlayers"`
	Address          string   `json:"address"`
	QueryPort        int      `json:"queryPort"`
	GamePort         int      `json:"gamePort"`
	QueryHost        string   `json:"queryHost"`
	Ping             int      `json:"ping"`
	DistanceLabel    string   `json:"distanceLabel"`
	SteamID          string   `json:"steamId,omitempty"`
	WorkshopModIDs   []string `json:"workshopModIds,omitempty"`
	ModNames         []string `json:"modNames,omitempty"`
	PasswordRequired *bool    `json:"passwordRequired,omitempty"`
}

func CloneBoolPtr(p *bool) *bool {
	if p == nil {
		return nil
	}
	v := *p
	return &v
}

func (r ServerRow) FavMatchKey() string {
	return strings.ToLower(strings.TrimSpace(r.QueryHost)) + ":" + strconv.Itoa(r.GamePort) + ":" + strconv.Itoa(r.QueryPort)
}

type FilterState struct {
	Exclude1PP         bool   `json:"exclude1PP"`
	Exclude3PP         bool   `json:"exclude3PP"`
	ExcludeDay         bool   `json:"excludeDay"`
	ExcludeNight       bool   `json:"excludeNight"`
	ExcludeEmpty       bool   `json:"excludeEmpty"`
	ExcludeFull        bool   `json:"excludeFull"`
	ExcludeLowPop      bool   `json:"excludeLowPop"`
	LowPopThresholdPct int    `json:"lowPopThresholdPct"`
	ExcludeNonASCII    bool   `json:"excludeNonASCII"`
	DeduplicateByName  bool   `json:"deduplicateByName"`
	ExcludeOfficial    bool   `json:"excludeOfficial"`
	ExcludeUnofficial  bool   `json:"excludeUnofficial"`
	ExcludeNonModded   bool   `json:"excludeNonModded"`
	ExcludePassword    bool   `json:"excludePassword"`
	MapEquals          string `json:"mapEquals"`
	SearchSubstring    string `json:"searchSubstring"`
}

func DefaultFilterState() FilterState {
	return FilterState{
		LowPopThresholdPct: 30,
		MapEquals:          "",
	}
}
