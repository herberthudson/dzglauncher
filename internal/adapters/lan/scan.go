package lan

import (
	"context"
	"net"
	"strconv"
	"strings"
	"sync"
	"time"

	"dzglauncher/internal/adapters/a2s"
	"dzglauncher/internal/domain"
)

func localIPv4Base24() (prefix string, selfHost string, ok bool) {
	conn, err := net.Dial("udp", "8.8.8.8:80")
	if err != nil {
		return "", "", false
	}
	defer conn.Close()
	la, ok := conn.LocalAddr().(*net.UDPAddr)
	if !ok || la.IP == nil {
		return "", "", false
	}
	ip := la.IP.To4()
	if ip == nil {
		return "", "", false
	}
	prefix = strconv.Itoa(int(ip[0])) + "." + strconv.Itoa(int(ip[1])) + "." + strconv.Itoa(int(ip[2]))
	return prefix, ip.String(), true
}

func gamePortForQuery(queryPort int) int {
	if queryPort == 2305 {
		return 2302
	}
	return queryPort
}

func Scan(ctx context.Context, queryPort int) []domain.ServerRow {
	if queryPort <= 0 {
		queryPort = 2305
	}
	prefix, self, ok := localIPv4Base24()
	if !ok {
		return nil
	}
	gp := gamePortForQuery(queryPort)
	var mu sync.Mutex
	var out []domain.ServerRow
	var wg sync.WaitGroup
	sem := make(chan struct{}, 64)
	for last := 1; last <= 254; last++ {
		h := prefix + "." + strconv.Itoa(last)
		if h == self {
			continue
		}
		select {
		case <-ctx.Done():
			wg.Wait()
			return out
		default:
		}
		wg.Add(1)
		sem <- struct{}{}
		go func(host string) {
			defer wg.Done()
			defer func() { <-sem }()
			info, err := a2s.Info(host, queryPort, 220*time.Millisecond)
			if err != nil {
				return
			}
			row := domain.ServerRow{
				Name:          info.Name,
				MapName:       strings.ToLower(info.Map),
				Perspective:   "3PP",
				Provider:      "Unofficial",
				Modded:        false,
				InGameTime:    "Unknown",
				Players:       info.Players,
				MaxPlayers:    info.MaxPlayers,
				Address:       net.JoinHostPort(host, strconv.Itoa(gp)),
				QueryPort:     queryPort,
				GamePort:      gp,
				QueryHost:     host,
				Ping:          info.PingMS,
				DistanceLabel: "LAN",
			}
			mu.Lock()
			out = append(out, row)
			mu.Unlock()
		}(h)
	}
	wg.Wait()
	return out
}
