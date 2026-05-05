package ghrelease

import (
	"encoding/json"
	"fmt"
	"net/http"
	"strings"
	"time"
)

const requestTimeout = 12 * time.Second

type apiRelease struct {
	TagName string `json:"tag_name"`
	HTMLURL string `json:"html_url"`
}

func FetchLatestRelease(owner, repo string) (tagName, pageURL string, err error) {
	u := fmt.Sprintf("https://api.github.com/repos/%s/%s/releases/latest", owner, repo)
	req, err := http.NewRequest(http.MethodGet, u, nil)
	if err != nil {
		return "", "", err
	}
	req.Header.Set("Accept", "application/vnd.github+json")
	req.Header.Set("User-Agent", "dzglauncher")
	c := &http.Client{Timeout: requestTimeout}
	resp, err := c.Do(req)
	if err != nil {
		return "", "", err
	}
	defer resp.Body.Close()
	if resp.StatusCode != http.StatusOK {
		return "", "", fmt.Errorf("github api: %s", resp.Status)
	}
	var rel apiRelease
	if err := json.NewDecoder(resp.Body).Decode(&rel); err != nil {
		return "", "", err
	}
	tag := strings.TrimSpace(rel.TagName)
	page := strings.TrimSpace(rel.HTMLURL)
	if tag == "" || page == "" {
		return "", "", fmt.Errorf("github api: empty release")
	}
	return tag, page, nil
}
