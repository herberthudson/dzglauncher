package steamlaunch

import "testing"

func TestOpenSteamURIEmpty(t *testing.T) {
	if err := OpenSteamURI("steam", ""); err == nil {
		t.Fatal("expected error")
	}
}
