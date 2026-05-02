package workshop

import (
	"os"
	"path/filepath"
	"testing"
)

func TestNormalizeSteamRoot_tilde(t *testing.T) {
	home := t.TempDir()
	t.Setenv("HOME", home)
	want := filepath.Join(home, "a", "b")
	if err := os.MkdirAll(want, 0o755); err != nil {
		t.Fatal(err)
	}
	got := NormalizeSteamRoot("~/a/b")
	if got != filepath.Clean(want) {
		t.Fatalf("got %q want %q", got, want)
	}
}

func TestNormalizeSteamRoot_relLocalShareSteam(t *testing.T) {
	home := t.TempDir()
	t.Setenv("HOME", home)
	steam := filepath.Join(home, ".local", "share", "Steam")
	if err := os.MkdirAll(steam, 0o755); err != nil {
		t.Fatal(err)
	}
	got := NormalizeSteamRoot(".local/share/Steam")
	if got != filepath.Clean(steam) {
		t.Fatalf("got %q want %q", got, filepath.Clean(steam))
	}
}

func TestNormalizeSteamRoot_absUnchanged(t *testing.T) {
	home := t.TempDir()
	p := filepath.Join(home, "Steam")
	if err := os.MkdirAll(p, 0o755); err != nil {
		t.Fatal(err)
	}
	got := NormalizeSteamRoot(p)
	if got != filepath.Clean(p) {
		t.Fatalf("got %q want %q", got, filepath.Clean(p))
	}
}
