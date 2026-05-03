package steamlaunch

import (
	"strings"
	"testing"
)

func TestBuildApplaunchArgv(t *testing.T) {
	g := buildApplaunchArgv("221100", "10.0.0.1", 2302, "player1", "")
	if len(g) < 7 || g[0] != "-applaunch" || g[1] != "221100" {
		t.Fatalf("%q", g)
	}
	if g[2] != "-nolauncher" || g[3] != "-nosplash" || g[4] != "-skipintro" {
		t.Fatalf("%q", g)
	}
	if g[5] != "-name=player1" {
		t.Fatalf("%q", g)
	}
	if g[len(g)-1] != "-connect=10.0.0.1:2302" {
		t.Fatalf("%q", g)
	}
}

func TestBuildApplaunchArgvNoNameNoMod(t *testing.T) {
	g := buildApplaunchArgv("221100", "10.0.0.1", 2302, "", "")
	if len(g) != 6 {
		t.Fatalf("len %d %q", len(g), g)
	}
}

func TestBuildApplaunchArgvWithMod(t *testing.T) {
	g := buildApplaunchArgv("221100", "10.0.0.1", 2302, "", "/a/m1;/a/m2")
	if g[len(g)-1] != "-connect=10.0.0.1:2302" {
		t.Fatalf("%q", g)
	}
	var modArg string
	for _, x := range g {
		if strings.HasPrefix(x, "-mod=") {
			modArg = x
			break
		}
	}
	if modArg != "-mod=/a/m1;/a/m2" {
		t.Fatalf("%q", g)
	}
}

func TestSplitSteamLaunchCmd(t *testing.T) {
	p := splitSteamLaunchCmd("")
	if len(p) != 1 || p[0] != "steam" {
		t.Fatal(p)
	}
	p2 := splitSteamLaunchCmd("flatpak run com.valvesoftware.Steam")
	if len(p2) != 3 || p2[0] != "flatpak" {
		t.Fatal(p2)
	}
}
