package filemgr

import (
	"fmt"
	"os"
	"os/exec"
	"path/filepath"
	"runtime"
)

func OpenDirectory(abs string) error {
	p := filepath.Clean(abs)
	st, err := os.Stat(p)
	if err != nil {
		return err
	}
	if !st.IsDir() {
		return fmt.Errorf("not a directory: %s", p)
	}

	switch runtime.GOOS {
	case "linux":
		xdg, err := exec.LookPath("xdg-open")
		if err != nil {
			return fmt.Errorf("xdg-open not found; install the xdg-utils package from your distribution")
		}
		cmd := exec.Command(xdg, p)
		return cmd.Start()
	case "darwin":
		cmd := exec.Command("open", p)
		return cmd.Start()
	case "windows":
		cmd := exec.Command("explorer", p)
		return cmd.Start()
	default:
		xdg, err := exec.LookPath("xdg-open")
		if err != nil {
			return fmt.Errorf("opening directories is not supported on this system")
		}
		cmd := exec.Command(xdg, p)
		return cmd.Start()
	}
}
