package steam

import (
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"strconv"
	"strings"
	"time"
)

type PublishedFileDetail struct {
	PublishedFileID string
	TimeUpdated     int64
	Title           string
}

func parsePublishedFileID(v interface{}) string {
	switch x := v.(type) {
	case nil:
		return ""
	case string:
		return strings.TrimSpace(x)
	case float64:
		return strconv.FormatInt(int64(x), 10)
	case json.Number:
		return strings.TrimSpace(x.String())
	default:
		return strings.TrimSpace(fmt.Sprint(x))
	}
}

func GetPublishedFileDetails(ctx context.Context, httpClient *http.Client, apiKeyOptional string, ids []string) (map[string]PublishedFileDetail, error) {
	out := make(map[string]PublishedFileDetail)
	if len(ids) == 0 {
		return out, nil
	}
	if httpClient == nil {
		httpClient = &http.Client{Timeout: 45 * time.Second}
	}
	const chunk = 100
	for i := 0; i < len(ids); i += chunk {
		j := i + chunk
		if j > len(ids) {
			j = len(ids)
		}
		part, err := postPublishedFileDetails(ctx, httpClient, apiKeyOptional, ids[i:j])
		if err != nil {
			return nil, err
		}
		for k, v := range part {
			out[k] = v
		}
	}
	return out, nil
}

func postPublishedFileDetails(ctx context.Context, httpClient *http.Client, apiKeyOptional string, ids []string) (map[string]PublishedFileDetail, error) {
	form := url.Values{}
	form.Set("itemcount", strconv.Itoa(len(ids)))
	for i, id := range ids {
		form.Set(fmt.Sprintf("publishedfileids[%d]", i), strings.TrimSpace(id))
	}
	u := "https://api.steampowered.com/ISteamRemoteStorage/GetPublishedFileDetails/v1/?format=json"
	if strings.TrimSpace(apiKeyOptional) != "" {
		u += "&key=" + url.QueryEscape(strings.TrimSpace(apiKeyOptional))
	}
	req, err := http.NewRequestWithContext(ctx, http.MethodPost, u, strings.NewReader(form.Encode()))
	if err != nil {
		return nil, err
	}
	req.Header.Set("Content-Type", "application/x-www-form-urlencoded")
	res, err := httpClient.Do(req)
	if err != nil {
		return nil, err
	}
	defer res.Body.Close()
	body, err := io.ReadAll(res.Body)
	if err != nil {
		return nil, err
	}
	if res.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("steam GetPublishedFileDetails http %d: %s", res.StatusCode, strings.TrimSpace(string(body)))
	}
	return parsePublishedDetailsJSON(body)
}

func parsePublishedDetailsJSON(body []byte) (map[string]PublishedFileDetail, error) {
	var wrap struct {
		Response struct {
			PublishedFileDetails []struct {
				PublishedFileID interface{} `json:"publishedfileid"`
				TimeUpdated     int64       `json:"time_updated"`
				Title           string      `json:"title"`
			} `json:"publishedfiledetails"`
		} `json:"response"`
	}
	if err := json.Unmarshal(body, &wrap); err != nil {
		return nil, err
	}
	out := make(map[string]PublishedFileDetail)
	for _, d := range wrap.Response.PublishedFileDetails {
		pid := parsePublishedFileID(d.PublishedFileID)
		if pid == "" {
			continue
		}
		out[pid] = PublishedFileDetail{
			PublishedFileID: pid,
			TimeUpdated:     d.TimeUpdated,
			Title:           strings.TrimSpace(d.Title),
		}
	}
	return out, nil
}
