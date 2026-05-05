package workshop

import (
	"os"
	"path/filepath"
	"testing"
)

func TestEnsureModDirUnderContent(t *testing.T) {
	root := t.TempDir()
	base := filepath.Join(root, "steamapps", "workshop", "content", "221100")
	mod := filepath.Join(base, "999")
	if err := os.MkdirAll(mod, 0o755); err != nil {
		t.Fatal(err)
	}
	if err := EnsureModDirUnderContent(root, "221100", mod); err != nil {
		t.Fatal(err)
	}
	if EnsureModDirUnderContent(root, "221100", filepath.Join(root, "etc", "x")) == nil {
		t.Fatal("expected error outside tree")
	}
	filePath := filepath.Join(base, "fileonly")
	if err := os.WriteFile(filePath, []byte("x"), 0o644); err != nil {
		t.Fatal(err)
	}
	if EnsureModDirUnderContent(root, "221100", filePath) == nil {
		t.Fatal("expected error for non-dir")
	}
}

func TestUnderWorkshopContent(t *testing.T) {
	root := t.TempDir()
	base := filepath.Join(root, "steamapps", "workshop", "content", "221100")
	mod := filepath.Join(base, "999")
	if err := os.MkdirAll(mod, 0o755); err != nil {
		t.Fatal(err)
	}
	if !underWorkshopContent(base, mod) {
		t.Fatal("expected mod under base")
	}
	if underWorkshopContent(base, filepath.Join(root, "steamapps", "workshop", "content", "221099", "1")) {
		t.Fatal("other appid should fail")
	}
	if underWorkshopContent(base, filepath.Join(root, "etc", "passwd")) {
		t.Fatal("outside tree")
	}
}
