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
	FileSize        int64
	Title           string
	Description     string
	PreviewURL      string
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

func parseJSONInt64(v interface{}) int64 {
	if v == nil {
		return 0
	}
	switch x := v.(type) {
	case float64:
		return int64(x)
	case json.Number:
		n, err := x.Int64()
		if err != nil {
			return 0
		}
		return n
	case string:
		n, err := strconv.ParseInt(strings.TrimSpace(x), 10, 64)
		if err != nil {
			return 0
		}
		return n
	case int:
		return int64(x)
	case int64:
		return x
	default:
		return 0
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
				FileSize        interface{} `json:"file_size"`
				Title           string      `json:"title"`
				Description     string      `json:"description"`
				PreviewURL      string      `json:"preview_url"`
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
			FileSize:        parseJSONInt64(d.FileSize),
			Title:           strings.TrimSpace(d.Title),
			Description:     strings.TrimSpace(d.Description),
			PreviewURL:      strings.TrimSpace(d.PreviewURL),
		}
	}
	return out, nil
}
