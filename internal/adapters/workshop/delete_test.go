package workshop

import (
	"os"
	"path/filepath"
	"testing"
)

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
