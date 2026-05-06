package lan

import (
	"context"
	"errors"
	"net"
	"strconv"
	"strings"
	"sync"
	"time"

	"dzglauncher/internal/adapters/a2s"
	"dzglauncher/internal/domain"
)

func localIPv4ViaUDPProbe() (prefix string, selfHost string, ok bool) {
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

func isPrivateLANIPv4(ip net.IP) bool {
	b := ip.To4()
	if b == nil {
		return false
	}
	if b[0] == 10 {
		return true
	}
	if b[0] == 172 && b[1] >= 16 && b[1] <= 31 {
		return true
	}
	if b[0] == 192 && b[1] == 168 {
		return true
	}
	return false
}

func localIPv4ViaInterfaces() (prefix string, selfHost string, ok bool) {
	ifs, err := net.Interfaces()
	if err != nil {
		return "", "", false
	}
	for _, iface := range ifs {
		if iface.Flags&net.FlagLoopback != 0 {
			continue
		}
		if iface.Flags&net.FlagUp == 0 {
			continue
		}
		addrs, err := iface.Addrs()
		if err != nil {
			continue
		}
		for _, a := range addrs {
			var ip net.IP
			switch v := a.(type) {
			case *net.IPNet:
				ip = v.IP
			case *net.IPAddr:
				ip = v.IP
			default:
				continue
			}
			if ip == nil || !isPrivateLANIPv4(ip) {
				continue
			}
			ip4 := ip.To4()
			prefix = strconv.Itoa(int(ip4[0])) + "." + strconv.Itoa(int(ip4[1])) + "." + strconv.Itoa(int(ip4[2]))
			return prefix, ip4.String(), true
		}
	}
	return "", "", false
}

func localIPv4Base24() (prefix string, selfHost string, ok bool) {
	prefix, selfHost, ok = localIPv4ViaUDPProbe()
	if ok {
		return prefix, selfHost, true
	}
	return localIPv4ViaInterfaces()
}

func gamePortForQuery(queryPort int) int {
	if queryPort == 2305 {
		return 2302
	}
	return queryPort
}

func Scan(ctx context.Context, queryPort int) ([]domain.ServerRow, error) {
	if queryPort <= 0 {
		queryPort = 2305
	}
	prefix, self, ok := localIPv4Base24()
	if !ok {
		return nil, errors.New("local IPv4 network not detected: no default route or active RFC1918 interface")
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
			return out, nil
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
			if info.QueueSizeFromInfo {
				row.QueueSize = info.QueueSize
			}
			pr := info.PasswordRequired
			row.PasswordRequired = &pr
			mu.Lock()
			out = append(out, row)
			mu.Unlock()
		}(h)
	}
	wg.Wait()
	return out, nil
}
