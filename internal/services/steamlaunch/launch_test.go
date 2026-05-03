package steamlaunch

import (
	"testing"

	"dzglauncher/internal/domain"
)

func TestConnectHostPort(t *testing.T) {
	h, p, err := ConnectHostPort(domain.ServerRow{QueryHost: "10.0.0.1", GamePort: 2302})
	if err != nil || h != "10.0.0.1" || p != 2302 {
		t.Fatalf("direct: %v %q %d", err, h, p)
	}
	h2, p2, err2 := ConnectHostPort(domain.ServerRow{QueryHost: "", GamePort: 0, Address: "192.168.1.5:2402"})
	if err2 != nil || h2 != "192.168.1.5" || p2 != 2402 {
		t.Fatalf("fallback: %v %q %d", err2, h2, p2)
	}
	_, _, err3 := ConnectHostPort(domain.ServerRow{})
	if err3 == nil {
		t.Fatal("expected error")
	}
}

func TestBuildConnectURI(t *testing.T) {
	u := BuildConnectURI("10.0.0.1", 2302, "")
	if want := "steam://run/221100//+connect%2010.0.0.1:2302"; u != want {
		t.Fatalf("stable: got %q want %q", u, want)
	}
	u2 := BuildConnectURI("::1", 2302, "experimental")
	if want2 := "steam://run/1024020//+connect%20[::1]:2302"; u2 != want2 {
		t.Fatalf("experimental: got %q want %q", u2, want2)
	}
}
