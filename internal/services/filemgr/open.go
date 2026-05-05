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
		return fmt.Errorf("não é pasta: %s", p)
	}

	switch runtime.GOOS {
	case "linux":
		xdg, err := exec.LookPath("xdg-open")
		if err != nil {
			return fmt.Errorf("xdg-open não encontrado; instale o pacote xdg-utils da sua distro")
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
			return fmt.Errorf("abrir pasta não suportado neste sistema")
		}
		cmd := exec.Command(xdg, p)
		return cmd.Start()
	}
}
