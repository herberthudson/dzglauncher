package a2s

import (
	"bytes"
	"encoding/binary"
	"testing"
)

func TestDayzRulesDecodeOneMod(t *testing.T) {
	var body bytes.Buffer
	body.WriteByte(2)
	body.WriteByte(0)
	_ = binary.Write(&body, binary.LittleEndian, uint16(0))
	body.WriteByte(1)
	_ = binary.Write(&body, binary.LittleEndian, uint32(0x11111111))
	body.WriteByte(4)
	_ = binary.Write(&body, binary.LittleEndian, uint32(1559212036))
	body.WriteByte(4)
	body.WriteString("ModN")
	ids, err := dayzRulesDecodeWorkshopIDs([]ruleKV{{[]byte{0x00, 0x00}, body.Bytes()}})
	if err != nil {
		t.Fatal(err)
	}
	if len(ids) != 1 || ids[0] != "1559212036" {
		t.Fatalf("got %v err %v", ids, err)
	}
}

func TestDayzWorkshopIDsFromRulesResultFallbackRegex(t *testing.T) {
	r := RulesResult{Pairs: map[string]string{"x": "mod 1559212036 ok"}}
	ids := DayzWorkshopIDsFromRulesResult(r)
	if len(ids) != 1 || ids[0] != "1559212036" {
		t.Fatalf("%v", ids)
	}
}

func TestDayzWorkshopIDsFromRulesResultPrefersA3SBMods(t *testing.T) {
	r := RulesResult{
		ModWorkshopIDs: []string{"111", "222"},
		Pairs:          map[string]string{"x": "99999999"},
	}
	ids := DayzWorkshopIDsFromRulesResult(r)
	if len(ids) != 2 || ids[0] != "111" || ids[1] != "222" {
		t.Fatalf("%v", ids)
	}
}
