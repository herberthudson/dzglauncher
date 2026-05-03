package steamlaunch

import (
	"fmt"
	"net"
	"strconv"
	"strings"

	"dzglauncher/internal/domain"
)

func AppLaunchID(branch string) string {
	if strings.EqualFold(strings.TrimSpace(branch), "experimental") {
		return "1024020"
	}
	return "221100"
}

func BuildConnectURI(host string, gamePort int, branch string) string {
	appid := AppLaunchID(branch)
	addr := net.JoinHostPort(strings.TrimSpace(host), strconv.Itoa(gamePort))
	launch := "+connect " + addr
	escaped := strings.ReplaceAll(launch, " ", "%20")
	return "steam://run/" + appid + "//" + escaped
}

func ConnectHostPort(row domain.ServerRow) (host string, gamePort int, err error) {
	host = strings.TrimSpace(row.QueryHost)
	gamePort = row.GamePort
	if host != "" && gamePort > 0 {
		return host, gamePort, nil
	}
	addr := strings.TrimSpace(row.Address)
	if addr == "" {
		return "", 0, fmt.Errorf("missing server address")
	}
	h, portStr, e1 := net.SplitHostPort(addr)
	if e1 != nil {
		return "", 0, fmt.Errorf("invalid address: %w", e1)
	}
	p, e2 := strconv.Atoi(portStr)
	if e2 != nil || p <= 0 {
		return "", 0, fmt.Errorf("invalid game port")
	}
	return h, p, nil
}
