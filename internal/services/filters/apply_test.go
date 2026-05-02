package filters

import (
	"testing"

	"dzglauncher/internal/domain"
)

func TestApplyOfficial(t *testing.T) {
	rows := []domain.ServerRow{
		{Name: "a", Provider: "Official", Modded: false, Players: 1, MaxPlayers: 10, MapName: "enoch", InGameTime: "12:00"},
		{Name: "b", Provider: "Unofficial", Modded: true, Players: 2, MaxPlayers: 10, MapName: "enoch", InGameTime: "22:00"},
	}
	f := domain.DefaultFilterState()
	f.ExcludeOfficial = true
	out := Apply(rows, f)
	if len(out) != 1 || out[0].Name != "b" {
		t.Fatalf("%+v", out)
	}
}

func TestSearchSubstring(t *testing.T) {
	rows := []domain.ServerRow{{Name: "Hello", MapName: "x", QueryHost: "10.0.0.1", Address: "10.0.0.1:2302"}}
	f := domain.DefaultFilterState()
	f.SearchSubstring = "ell"
	if len(Apply(rows, f)) != 1 {
		t.Fatal()
	}
	f.SearchSubstring = "nomatch"
	if len(Apply(rows, f)) != 0 {
		t.Fatal()
	}
}
