package favhistory

import (
	"testing"

	"dzglauncher/internal/domain"
)

func TestAppendHistoryDedupeAndCap(t *testing.T) {
	var cfg domain.Settings
	h1 := domain.HistoryLine{IP: "1.1.1.1", GamePort: 1, QueryPort: 2, Name: "a", AtUnix: 1}
	AppendHistory(&cfg, h1, 3)
	AppendHistory(&cfg, h1, 3)
	if len(cfg.History) != 1 {
		t.Fatal(len(cfg.History))
	}
	AppendHistory(&cfg, domain.HistoryLine{IP: "2.2.2.2", GamePort: 1, QueryPort: 2, Name: "b", AtUnix: 2}, 3)
	AppendHistory(&cfg, domain.HistoryLine{IP: "3.3.3.3", GamePort: 1, QueryPort: 2, Name: "c", AtUnix: 3}, 3)
	AppendHistory(&cfg, domain.HistoryLine{IP: "4.4.4.4", GamePort: 1, QueryPort: 2, Name: "d", AtUnix: 4}, 3)
	if len(cfg.History) != 3 {
		t.Fatal(len(cfg.History))
	}
	if cfg.History[0].Name != "b" {
		t.Fatal(cfg.History[0].Name)
	}
}
