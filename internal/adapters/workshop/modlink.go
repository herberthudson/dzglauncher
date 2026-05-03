package workshop

import (
	"crypto/md5"
	"encoding/hex"
	"strings"
)

func ModLinkNameFromPublishedID(publishedID string) string {
	s := strings.TrimSpace(publishedID)
	sum := md5.Sum([]byte(s + "\n"))
	h := hex.EncodeToString(sum[:])
	return "@" + h[:8]
}
