package steam

import (
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"strings"
	"time"
)

type Client struct {
	HTTP *http.Client
}

type RawServer struct {
	Addr       string `json:"addr"`
	GamePort   int    `json:"gameport"`
	SteamID    string `json:"steamid"`
	Name       string `json:"name"`
	Map        string `json:"map"`
	GameType   string `json:"gametype"`
	Players    int    `json:"players"`
	MaxPlayers int    `json:"max_players"`
	Ping       int    `json:"ping"`
}

type listResponse struct {
	Response struct {
		Servers []RawServer `json:"servers"`
	} `json:"response"`
}

func (c *Client) GetServerList(ctx context.Context, apiKey, filter string, limit int) ([]RawServer, error) {
	if c.HTTP == nil {
		c.HTTP = &http.Client{Timeout: 45 * time.Second}
	}
	if limit <= 0 {
		limit = 2000
	}
	u, err := url.Parse("https://api.steampowered.com/IGameServersService/GetServerList/v1/")
	if err != nil {
		return nil, err
	}
	q := u.Query()
	q.Set("key", apiKey)
	q.Set("filter", filter)
	q.Set("limit", fmt.Sprintf("%d", limit))
	u.RawQuery = q.Encode()
	req, err := http.NewRequestWithContext(ctx, http.MethodGet, u.String(), nil)
	if err != nil {
		return nil, err
	}
	res, err := c.HTTP.Do(req)
	if err != nil {
		return nil, err
	}
	defer res.Body.Close()
	body, err := io.ReadAll(res.Body)
	if err != nil {
		return nil, err
	}
	if res.StatusCode == http.StatusForbidden || res.StatusCode == http.StatusUnauthorized {
		return nil, fmt.Errorf("steam api http %d", res.StatusCode)
	}
	if res.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("steam api http %d: %s", res.StatusCode, strings.TrimSpace(string(body)))
	}
	var lr listResponse
	if err := json.Unmarshal(body, &lr); err != nil {
		return nil, err
	}
	return lr.Response.Servers, nil
}

func ValidateKey(ctx context.Context, apiKey string) error {
	cl := &Client{HTTP: &http.Client{Timeout: 15 * time.Second}}
	_, err := cl.GetServerList(ctx, apiKey, `\appid\221100`, 1)
	return err
}
