package workshop

import "testing"

func TestParseMetaTimestamp(t *testing.T) {
	cases := []struct {
		meta string
		want int64
		ok   bool
	}{
		{"publishedid = 1;\ntimestamp = 1700000000;\n", 1700000000, true},
		{`name = "x";
timestamp = "12345";
`, 12345, true},
		{"Timestamp=99;", 99, true},
		{"publishedid = 1;\n", 0, false},
		{"timestamp = 0;\n", 0, false},
		{"timestamp = -1;\n", 0, false},
	}
	for _, tc := range cases {
		got, ok := parseMetaTimestamp([]byte(tc.meta))
		if ok != tc.ok || got != tc.want {
			t.Errorf("meta %q: got %d %v want %d %v", tc.meta, got, ok, tc.want, tc.ok)
		}
	}
}
