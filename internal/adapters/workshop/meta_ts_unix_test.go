package workshop

import "testing"

func TestIsMetaTimestampUnixEpoch(t *testing.T) {
	if !IsMetaTimestampUnixEpoch(1_700_000_000) {
		t.Fatal()
	}
	if IsMetaTimestampUnixEpoch(5250819655434104733) {
		t.Fatal("Enfusion-style timestamp must not be treated as Unix epoch")
	}
	if IsMetaTimestampUnixEpoch(99) {
		t.Fatal()
	}
	if IsMetaTimestampUnixEpoch(999_999_999) {
		t.Fatal()
	}
}
