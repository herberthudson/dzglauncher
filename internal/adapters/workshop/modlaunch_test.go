package workshop

import (
	"os"
	"path/filepath"
	"strings"
	"testing"
)

func TestModParamFromWorkshopIDs(t *testing.T) {
	root := t.TempDir()
	appid := "221100"
	modDir := filepath.Join(root, "steamapps", "workshop", "content", appid, "1559212036")
	if err := os.MkdirAll(modDir, 0o755); err != nil {
		t.Fatal(err)
	}
	meta := filepath.Join(modDir, "meta.cpp")
	if err := os.WriteFile(meta, []byte("publishedid = 1559212036;\nname = \"TestMod\";\n"), 0o644); err != nil {
		t.Fatal(err)
	}
	param, missing, err := ModParamFromWorkshopIDs(root, "stable", []string{"1559212036"})
	if err != nil {
		t.Fatal(err)
	}
	if len(missing) != 0 {
		t.Fatalf("missing %v", missing)
	}
	if param == "" || !strings.Contains(param, "1559212036") {
		t.Fatalf("param %q", param)
	}
}

func TestModParamFromWorkshopIDsMissing(t *testing.T) {
	root := t.TempDir()
	appid := "221100"
	modDir := filepath.Join(root, "steamapps", "workshop", "content", appid, "111")
	if err := os.MkdirAll(modDir, 0o755); err != nil {
		t.Fatal(err)
	}
	if err := os.WriteFile(filepath.Join(modDir, "meta.cpp"), []byte("publishedid = 111;\n"), 0o644); err != nil {
		t.Fatal(err)
	}
	paramBoth, missing, err := ModParamFromWorkshopIDs(root, "stable", []string{"111", "999"})
	if err != nil {
		t.Fatal(err)
	}
	if paramBoth != "" {
		t.Fatalf("expected empty param when missing mod, got %q", paramBoth)
	}
	if len(missing) != 1 || missing[0] != "999" {
		t.Fatalf("missing %v", missing)
	}
	param, _, err2 := ModParamFromWorkshopIDs(root, "stable", []string{"111"})
	if err2 != nil || param == "" {
		t.Fatalf("param %q err %v", param, err2)
	}
}

func TestModParamFromWorkshopIDsEmptyIDs(t *testing.T) {
	p, m, err := ModParamFromWorkshopIDs("/x", "stable", nil)
	if err != nil || p != "" || len(m) != 0 {
		t.Fatalf("%q %v %v", p, m, err)
	}
}

func TestModParamFromWorkshopIDsNoSteamRoot(t *testing.T) {
	_, _, err := ModParamFromWorkshopIDs("", "stable", []string{"1"})
	if err == nil {
		t.Fatal("expected error")
	}
}
