package steamlaunch

import (
	"context"
	"fmt"
	"os/exec"
	"strings"
)

func AppLaunchID(branch string) string {
	if strings.EqualFold(strings.TrimSpace(branch), "experimental") {
		return "1024020"
	}
	return "221100"
}

func BuildConnectURI(host string, gamePort int, branch string) string {
	appid := AppLaunchID(branch)
	return fmt.Sprintf("steam://run/%s//+connect %s:%d", appid, host, gamePort)
}

func Launch(ctx context.Context, cfgSteamCommand string, host string, gamePort int, branch string) error {
	base := strings.Fields(strings.TrimSpace(cfgSteamCommand))
	if len(base) == 0 {
		base = []string{"steam"}
	}
	appid := AppLaunchID(branch)
	args := append(append([]string{}, base...), "-applaunch", appid, "+connect", fmt.Sprintf("%s:%d", host, gamePort))
	cmd := exec.CommandContext(ctx, args[0], args[1:]...)
	return cmd.Start()
}
