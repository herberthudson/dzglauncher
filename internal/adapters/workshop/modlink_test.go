package workshop

import "testing"

func TestModLinkNameFromPublishedID_DztuiParity(t *testing.T) {
	got := ModLinkNameFromPublishedID("1559212036")
	want := "@9dd22c91"
	if got != want {
		t.Fatalf("got %q want %q (bash: echo ID | md5sum)", got, want)
	}
}
