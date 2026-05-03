package workshop

import (
	"testing"

	"dzglauncher/internal/adapters/steam"
	"dzglauncher/internal/domain"
)

func TestJoinModalRows_Outdated(t *testing.T) {
	ids := []string{"100"}
	installed := map[string]Item{"100": {ID: "100", Name: "M"}}
	cache := map[string]int64{"100": 10}
	remote := map[string]steam.PublishedFileDetail{"100": {TimeUpdated: 99, Title: "T"}}
	rows := JoinModalRows(ids, installed, cache, remote)
	if len(rows) != 1 || rows[0].Status != domain.WorkshopModOutdated {
		t.Fatalf("%+v", rows)
	}
}

func TestJoinModalRows_OKCached(t *testing.T) {
	ids := []string{"100"}
	installed := map[string]Item{"100": {ID: "100"}}
	cache := map[string]int64{"100": 99}
	remote := map[string]steam.PublishedFileDetail{"100": {TimeUpdated: 99}}
	rows := JoinModalRows(ids, installed, cache, remote)
	if len(rows) != 1 || rows[0].Status != domain.WorkshopModOK {
		t.Fatalf("%+v", rows)
	}
}

func TestJoinModalRows_Missing(t *testing.T) {
	ids := []string{"999"}
	installed := map[string]Item{}
	cache := map[string]int64{}
	remote := map[string]steam.PublishedFileDetail{"999": {TimeUpdated: 1}}
	rows := JoinModalRows(ids, installed, cache, remote)
	if len(rows) != 1 || rows[0].Status != domain.WorkshopModMissing {
		t.Fatalf("%+v", rows)
	}
}

func TestMergeWorkshopTimeCache_SkipOutdated(t *testing.T) {
	cache := map[string]int64{"100": 10}
	installed := map[string]Item{"100": {ID: "100"}}
	remote := map[string]int64{"100": 99}
	out := MergeWorkshopTimeCache(cache, []string{"100"}, installed, remote)
	if out["100"] != 10 {
		t.Fatalf("got %v", out["100"])
	}
}

func TestMergeWorkshopTimeCache_Baseline(t *testing.T) {
	cache := map[string]int64{}
	installed := map[string]Item{"100": {ID: "100"}}
	remote := map[string]int64{"100": 99}
	out := MergeWorkshopTimeCache(cache, []string{"100"}, installed, remote)
	if out["100"] != 99 {
		t.Fatalf("got %v", out["100"])
	}
}

func TestJoinModalRows_OutdatedByMetaTimestamp(t *testing.T) {
	ts := int64(1_700_000_000)
	installed := map[string]Item{"100": {ID: "100", MetaTimestamp: &ts}}
	remote := map[string]steam.PublishedFileDetail{"100": {TimeUpdated: 2_000_000_000}}
	rows := JoinModalRows([]string{"100"}, installed, map[string]int64{}, remote)
	if len(rows) != 1 || rows[0].Status != domain.WorkshopModOutdated {
		t.Fatalf("%+v", rows)
	}
}

func TestJoinModalRows_OKByMetaTimestamp(t *testing.T) {
	ts := int64(1_700_000_000)
	installed := map[string]Item{"100": {ID: "100", MetaTimestamp: &ts}}
	remote := map[string]steam.PublishedFileDetail{"100": {TimeUpdated: 1_700_000_000}}
	rows := JoinModalRows([]string{"100"}, installed, map[string]int64{"100": 1}, remote)
	if len(rows) != 1 || rows[0].Status != domain.WorkshopModOK {
		t.Fatalf("%+v", rows)
	}
}

func TestJoinModalRows_LargeMetaTimestampFallsBackToCache(t *testing.T) {
	ts := int64(5250819655434104733)
	installed := map[string]Item{"100": {ID: "100", MetaTimestamp: &ts}}
	cache := map[string]int64{"100": 1_701_000_000}
	remote := map[string]steam.PublishedFileDetail{"100": {TimeUpdated: 1_701_000_000}}
	rows := JoinModalRows([]string{"100"}, installed, cache, remote)
	if len(rows) != 1 || rows[0].Status != domain.WorkshopModOK {
		t.Fatalf("%+v", rows)
	}
}

func TestJoinModalRows_LargeMetaTimestampOutdatedByCache(t *testing.T) {
	ts := int64(5250819655434104733)
	installed := map[string]Item{"100": {ID: "100", MetaTimestamp: &ts}}
	cache := map[string]int64{"100": 10}
	remote := map[string]steam.PublishedFileDetail{"100": {TimeUpdated: 99}}
	rows := JoinModalRows([]string{"100"}, installed, cache, remote)
	if len(rows) != 1 || rows[0].Status != domain.WorkshopModOutdated {
		t.Fatalf("%+v", rows)
	}
}

func TestMergeWorkshopTimeCache_MetaSyncsStaleCache(t *testing.T) {
	ts := int64(1_700_000_000)
	cache := map[string]int64{"100": 10}
	installed := map[string]Item{"100": {ID: "100", MetaTimestamp: &ts}}
	remote := map[string]int64{"100": 1_700_000_000}
	out := MergeWorkshopTimeCache(cache, []string{"100"}, installed, remote)
	if out["100"] != 1_700_000_000 {
		t.Fatalf("got %v", out["100"])
	}
}
