package steambrowser

import (
	"context"
	"fmt"
	"net"
	"strconv"
	"strings"
	"sync"
	"time"

	"dzglauncher/internal/adapters/steam"
	"dzglauncher/internal/domain"
	"dzglauncher/internal/services/gametype"
)

const cooldownAfterFailure = 45 * time.Second

type Service struct {
	Steam *steam.Client
}

func NewService() *Service {
	return &Service{Steam: &steam.Client{}}
}

func AppIDForBranch(branch string) string {
	if strings.EqualFold(branch, "experimental") {
		return "1024020"
	}
	return "221100"
}

func filterQueries(appid string) []string {
	base := `\appid\` + appid
	return []string{
		base + `\map\dayzOffline.chernarusplus`,
		base + `\map\dayzOffline.enoch`,
		base + `\map\dayzOffline.sakhal`,
		base + `\map\dayzOffline.namalsk`,
		base + `\empty\1`,
		base + `\noplayers\1`,
		base + `\map\dayzOffline.chernarusplus\empty\1`,
		base + `\map\dayzOffline.enoch\empty\1`,
	}
}

func ParseAddr(addr string) (host string, queryPort int, ok bool) {
	host, p, err := net.SplitHostPort(addr)
	if err != nil {
		return "", 0, false
	}
	port, err := strconv.Atoi(p)
	if err != nil {
		return "", 0, false
	}
	return host, port, true
}

func RawToRow(r steam.RawServer) domain.ServerRow {
	host, qport, ok := ParseAddr(r.Addr)
	if !ok {
		host = r.Addr
		qport = 0
	}
	gp := r.GamePort
	if gp == 0 {
		gp = qport
	}
	ping := r.Ping
	if ping <= 0 {
		ping = 9999
	}
	addr := fmt.Sprintf("%s:%d", host, gp)
	return domain.ServerRow{
		Name:          sanitizeName(r.Name),
		MapName:       strings.ToLower(strings.TrimSpace(r.Map)),
		Perspective:   gametype.Perspective(r.GameType),
		Provider:      gametype.Provider(r.GameType),
		Modded:        gametype.Modded(r.GameType),
		InGameTime:    gametype.ParseInGameTime(r.GameType),
		QueueSize:     gametype.ParseQueue(r.GameType),
		Players:       r.Players,
		MaxPlayers:    r.MaxPlayers,
		Address:       addr,
		QueryPort:     qport,
		GamePort:      gp,
		QueryHost:     host,
		Ping:          ping,
		DistanceLabel: "Unknown",
		SteamID:       r.SteamID,
	}
}

func sanitizeName(s string) string {
	s = strings.TrimSpace(s)
	if len(s) > 200 {
		s = s[:200]
	}
	return strings.Map(func(r rune) rune {
		if r == 0 || r == '\n' || r == '\r' {
			return -1
		}
		return r
	}, s)
}

func MergeDedupe(rows []domain.ServerRow) []domain.ServerRow {
	seen := make(map[string]struct{})
	out := make([]domain.ServerRow, 0, len(rows))
	for _, r := range rows {
		key := r.SteamID
		if key == "" {
			key = r.QueryHost + "|" + strconv.Itoa(r.GamePort) + "|" + strconv.Itoa(r.QueryPort)
		}
		if _, ok := seen[key]; ok {
			continue
		}
		seen[key] = struct{}{}
		out = append(out, r)
	}
	return out
}

func (s *Service) FetchAll(ctx context.Context, apiKey, branch string) ([]domain.ServerRow, error) {
	if strings.TrimSpace(apiKey) == "" {
		return nil, fmt.Errorf("chave steam em falta")
	}
	appid := AppIDForBranch(branch)
	var mu sync.Mutex
	var all []domain.ServerRow
	var firstErr error
	var wg sync.WaitGroup
	for _, f := range filterQueries(appid) {
		f := f
		wg.Add(1)
		go func() {
			defer wg.Done()
			raw, err := s.Steam.GetServerList(ctx, apiKey, f, 4000)
			if err != nil {
				mu.Lock()
				if firstErr == nil {
					firstErr = err
				}
				mu.Unlock()
				return
			}
			part := make([]domain.ServerRow, 0, len(raw))
			for _, x := range raw {
				part = append(part, RawToRow(x))
			}
			mu.Lock()
			all = append(all, part...)
			mu.Unlock()
		}()
	}
	wg.Wait()
	if len(all) == 0 && firstErr != nil {
		return nil, firstErr
	}
	return MergeDedupe(all), nil
}

func CooldownUntil() int64 {
	return time.Now().Add(cooldownAfterFailure).Unix()
}
