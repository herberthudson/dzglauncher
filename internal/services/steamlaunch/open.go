package steamlaunch

import (
	"fmt"
	"os/exec"
	"runtime"
	"strings"
)

func OpenSteamURI(steamLaunchCmd, uri string) error {
	uri = strings.TrimSpace(uri)
	if uri == "" {
		return fmt.Errorf("empty uri")
	}
	steamLaunchCmd = strings.TrimSpace(steamLaunchCmd)

	switch runtime.GOOS {
	case "darwin":
		cmd := exec.Command("open", uri)
		return cmd.Start()
	case "windows":
		parts := strings.Fields(steamLaunchCmd)
		if len(parts) == 0 {
			parts = []string{"steam"}
		}
		args := append(parts[1:], uri)
		cmd := exec.Command(parts[0], args...)
		return cmd.Start()
	default:
		parts := strings.Fields(steamLaunchCmd)
		if len(parts) == 0 {
			parts = []string{"steam"}
		}
		args := append(parts[1:], uri)
		cmd := exec.Command(parts[0], args...)
		return cmd.Start()
	}
}
