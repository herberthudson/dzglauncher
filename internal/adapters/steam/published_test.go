package steam

import "testing"

func TestParsePublishedDetailsJSON(t *testing.T) {
	body := []byte(`{"response":{"publishedfiledetails":[{"publishedfileid":"1559212036","time_updated":1700000000,"file_size":4096000,"title":"Mod A","description":"Hello [b]x[/b]","preview_url":"https://example.com/p.jpg"},{"publishedfileid":999,"time_updated":42,"title":"B"},{"publishedfileid":"777","time_updated":1,"file_size":"8192000","title":"StrSize"}]}}`)
	m, err := parsePublishedDetailsJSON(body)
	if err != nil {
		t.Fatal(err)
	}
	if m["1559212036"].TimeUpdated != 1700000000 || m["1559212036"].FileSize != 4096000 || m["1559212036"].Title != "Mod A" || m["1559212036"].Description != "Hello [b]x[/b]" || m["1559212036"].PreviewURL != "https://example.com/p.jpg" {
		t.Fatalf("%+v", m["1559212036"])
	}
	if m["999"].TimeUpdated != 42 || m["999"].FileSize != 0 {
		t.Fatalf("%+v", m["999"])
	}
	if m["777"].FileSize != 8192000 || m["777"].Title != "StrSize" {
		t.Fatalf("%+v", m["777"])
	}
}

func TestParseJSONInt64(t *testing.T) {
	if parseJSONInt64("12345") != 12345 {
		t.Fatal()
	}
	if parseJSONInt64(float64(99)) != 99 {
		t.Fatal()
	}
	if parseJSONInt64(nil) != 0 || parseJSONInt64("notnum") != 0 {
		t.Fatal()
	}
}

func TestParsePublishedFileID(t *testing.T) {
	if parsePublishedFileID(float64(123)) != "123" {
		t.Fatal()
	}
	if parsePublishedFileID("456") != "456" {
		t.Fatal()
	}
}
