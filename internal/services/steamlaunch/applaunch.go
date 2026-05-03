package steamlaunch

import (
	"fmt"
	"log"
	"net"
	"os/exec"
	"strconv"
	"strings"
)

func buildApplaunchArgv(appID, host string, gamePort int, playerName, modParam string) []string {
	addr := net.JoinHostPort(strings.TrimSpace(host), strconv.Itoa(gamePort))
	out := []string{
		"-applaunch", appID,
		"-nolauncher",
		"-nosplash",
		"-skipintro",
	}
	if pn := strings.TrimSpace(playerName); pn != "" {
		out = append(out, "-name="+pn)
	}
	if modParam != "" {
		out = append(out, "-mod="+modParam)
	}
	out = append(out, "-connect="+addr)
	return out
}

func splitSteamLaunchCmd(steamLaunchCmd string) []string {
	parts := strings.Fields(strings.TrimSpace(steamLaunchCmd))
	if len(parts) == 0 {
		return []string{"steam"}
	}
	return parts
}

func ExecApplaunchDayZ(steamLaunchCmd, appID, host string, gamePort int, playerName, modParam string) error {
	argv := buildApplaunchArgv(appID, host, gamePort, playerName, modParam)
	parts := splitSteamLaunchCmd(steamLaunchCmd)
	args := append(append([]string{}, parts[1:]...), argv...)
	quoted := make([]string, 0, 1+len(args))
	quoted = append(quoted, strconv.Quote(parts[0]))
	for _, a := range args {
		quoted = append(quoted, strconv.Quote(a))
	}
	log.Printf("steam launch: %s", strings.Join(quoted, " "))
	cmd := exec.Command(parts[0], args...)
	if err := cmd.Start(); err != nil {
		return fmt.Errorf("applaunch: %w", err)
	}
	return nil
}
