package steam

import "testing"

func TestParsePublishedDetailsJSON(t *testing.T) {
	body := []byte(`{"response":{"publishedfiledetails":[{"publishedfileid":"1559212036","time_updated":1700000000,"title":"Mod A","description":"Hello [b]x[/b]","preview_url":"https://example.com/p.jpg"},{"publishedfileid":999,"time_updated":42,"title":"B"}]}}`)
	m, err := parsePublishedDetailsJSON(body)
	if err != nil {
		t.Fatal(err)
	}
	if m["1559212036"].TimeUpdated != 1700000000 || m["1559212036"].Title != "Mod A" || m["1559212036"].Description != "Hello [b]x[/b]" || m["1559212036"].PreviewURL != "https://example.com/p.jpg" {
		t.Fatalf("%+v", m["1559212036"])
	}
	if m["999"].TimeUpdated != 42 {
		t.Fatalf("%+v", m["999"])
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
