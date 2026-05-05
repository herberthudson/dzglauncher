package filters

import (
	"testing"

	"dzglauncher/internal/domain"
)

func TestExcludePassword(t *testing.T) {
	tpw := true
	fpw := false
	rows := []domain.ServerRow{
		{Name: "open", PasswordRequired: &fpw},
		{Name: "locked", PasswordRequired: &tpw},
		{Name: "unknown"},
	}
	f := domain.DefaultFilterState()
	f.ExcludePassword = true
	out := Apply(rows, f)
	if len(out) != 2 {
		t.Fatalf("want 2 got %d %+v", len(out), names(out))
	}
}

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

func TestSearchTokensAnyOrder(t *testing.T) {
	rows := []domain.ServerRow{
		{Name: "Server A noraid pve"},
		{Name: "Server B pve noraid"},
		{Name: "Server C NoRaid PVE"},
		{Name: "Server D Noraid pves"},
		{Name: "Server E pve no raid"},
		{Name: "Server F No-Raid"},
		{Name: "Server G pve"},
	}
	f := domain.DefaultFilterState()
	f.SearchSubstring = "noraid pve"
	out := Apply(rows, f)
	if len(out) != 4 {
		t.Fatalf("want 4 got %d %+v", len(out), names(out))
	}
	f.SearchSubstring = "pve noraid"
	out = Apply(rows, f)
	if len(out) != 4 {
		t.Fatalf("want 4 got %d", len(out))
	}
}

func names(rows []domain.ServerRow) []string {
	s := make([]string, len(rows))
	for i := range rows {
		s[i] = rows[i].Name
	}
	return s
}
