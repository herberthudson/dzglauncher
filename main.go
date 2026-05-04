package main

import (
	"embed"
	"log"
	"os"
	"path/filepath"

	"github.com/wailsapp/wails/v2"
	"github.com/wailsapp/wails/v2/pkg/options"
	"github.com/wailsapp/wails/v2/pkg/options/assetserver"
	"github.com/wailsapp/wails/v2/pkg/options/linux"
)

//go:embed all:frontend/dist
var assets embed.FS

//go:embed packaging/linux/icons/hicolor/256x256/apps/dzglauncher.png
var linuxWindowIcon []byte

func setWebKitExecDirFromLayout() {
	if os.Getenv("WEBKIT_EXEC_DIR") != "" {
		return
	}
	exe, err := os.Executable()
	if err != nil {
		return
	}
	exe, err = filepath.EvalSymlinks(exe)
	if err != nil {
		return
	}
	binDir := filepath.Dir(exe)
	candidates := [][]string{
		{"..", "lib", "x86_64-linux-gnu", "webkit2gtk-4.1"},
		{"..", "lib", "webkit2gtk-4.1"},
	}
	for _, rel := range candidates {
		cand := filepath.Join(append([]string{binDir}, rel...)...)
		cand, err = filepath.Abs(cand)
		if err != nil {
			continue
		}
		fi, err := os.Stat(cand)
		if err != nil || !fi.IsDir() {
			continue
		}
		_ = os.Setenv("WEBKIT_EXEC_DIR", cand)
		return
	}
}

func main() {
	setWebKitExecDirFromLayout()
	app, err := NewApp()
	if err != nil {
		log.Fatal(err)
	}
	err = wails.Run(&options.App{
		Title:  "dzglauncher",
		Width:  1280,
		Height: 800,
		AssetServer: &assetserver.Options{
			Assets: assets,
		},
		BackgroundColour: &options.RGBA{R: 18, G: 22, B: 30, A: 1},
		OnStartup:        app.startup,
		Bind: []interface{}{
			app,
		},
		Linux: &linux.Options{
			Icon:             linuxWindowIcon,
			ProgramName:      "dzglauncher",
			WebviewGpuPolicy: linux.WebviewGpuPolicyNever,
		},
	})
	if err != nil {
		println("Error:", err.Error())
	}
}
