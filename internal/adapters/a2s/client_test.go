package a2s

import (
	"testing"

	wa2s "github.com/woozymasta/a2s/pkg/a2s"
)

func TestWorkshopIDsFromRulesSortedKeysPreservesValueOrder(t *testing.T) {
	r := RulesResult{Pairs: map[string]string{
		"zebra": "99999999",
		"alpha": "1559212036;1559212037",
	}}
	ids := WorkshopIDsFromRules(r)
	if len(ids) != 3 {
		t.Fatalf("got %v", ids)
	}
	if ids[0] != "1559212036" || ids[1] != "1559212037" || ids[2] != "99999999" {
		t.Fatalf("order %v", ids)
	}
}

func TestWorkshopIDsFromRulesKeyAndValue(t *testing.T) {
	r := RulesResult{Pairs: map[string]string{"mods": "1559212036"}}
	ids := WorkshopIDsFromRules(r)
	if len(ids) != 1 || ids[0] != "1559212036" {
		t.Fatalf("%v", ids)
	}
}

func TestParseDayZQueueFromInfo(t *testing.T) {
	cases := []struct {
		si    *wa2s.Info
		wantK bool
		wantQ int
	}{
		{&wa2s.Info{ID: 221100, Keywords: []string{"lqs12"}}, true, 12},
		{&wa2s.Info{ID: 221100, Keywords: []string{"battleye", "lqs0"}}, true, 0},
		{&wa2s.Info{ID: 221100, Keywords: []string{}}, false, 0},
		{&wa2s.Info{ID: 999, Keywords: []string{"lqs5"}}, false, 0},
		{&wa2s.Info{ID: 1024020, Keywords: []string{"mod", "lqs3"}}, true, 3},
	}
	for i, tc := range cases {
		gotK, gotQ := parseDayZQueueFromInfo(tc.si)
		if gotK != tc.wantK || gotQ != tc.wantQ {
			t.Fatalf("case %d: got (%v,%d) want (%v,%d)", i, gotK, gotQ, tc.wantK, tc.wantQ)
		}
	}
}
