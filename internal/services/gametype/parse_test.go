package gametype

import "testing"

func TestPerspectiveAndProvider(t *testing.T) {
	if g := Perspective("no3rd"); g != "1PP" {
		t.Fatal(g)
	}
	if g := Perspective(""); g != "3PP" {
		t.Fatal(g)
	}
	if Provider("external") != "Unofficial" {
		t.Fatal()
	}
	if Provider("") != "Official" {
		t.Fatal()
	}
}

func TestParseTime(t *testing.T) {
	if ParseInGameTime("foo 14:30 bar") != "14:30" {
		t.Fatal()
	}
	if ParseInGameTime("x") != "Unknown" {
		t.Fatal()
	}
}
