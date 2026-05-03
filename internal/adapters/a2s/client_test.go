package a2s

import (
	"testing"
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
