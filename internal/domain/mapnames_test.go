package domain

import (
	"reflect"
	"testing"
)

func TestMergeKnownMapNamesUnion(t *testing.T) {
	got := MergeKnownMapNamesUnion([]string{"a", "b"}, []string{"b", "c"})
	want := []string{"a", "b", "c"}
	if !reflect.DeepEqual(got, want) {
		t.Fatalf("got %v want %v", got, want)
	}
	got2 := MergeKnownMapNamesUnion([]string{}, []string{"x"})
	if len(got2) != 1 || got2[0] != "x" {
		t.Fatalf("got %v", got2)
	}
}
