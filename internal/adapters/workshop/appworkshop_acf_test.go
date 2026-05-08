package workshop

import "testing"

func TestParseWorkshopItemsInstalled(t *testing.T) {
	data := []byte(`"AppWorkshop"
{
	"WorkshopItemsInstalled"
	{
		"1559212036"
		{
			"size"		"527656"
			"timeupdated"		"1771519119"
			"manifest"		"4114705373119672275"
		}
		"999"
		{
			"size"		"100"
			"timeupdated"		"42"
			"manifest"		"7"
		}
	}
}
`)
	m := parseWorkshopItemsInstalled(data)
	if len(m) != 2 {
		t.Fatalf("entries: got %d want 2", len(m))
	}
	a := m["1559212036"]
	if a.SizeBytes != 527656 || a.TimeUpdated != 1771519119 || a.Manifest != "4114705373119672275" {
		t.Fatalf("1559212036: %+v", a)
	}
	b := m["999"]
	if b.SizeBytes != 100 || b.TimeUpdated != 42 || b.Manifest != "7" {
		t.Fatalf("999: %+v", b)
	}
}

func TestParseWorkshopItemsInstalled_missing(t *testing.T) {
	if m := parseWorkshopItemsInstalled([]byte(`"x" "y"`)); m != nil {
		t.Fatalf("expected nil, got %v", m)
	}
}
