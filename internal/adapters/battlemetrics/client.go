package battlemetrics

import (
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"strings"
	"time"
)

type Client struct {
	HTTP *http.Client
}

type ServerDetail struct {
	IP        string `json:"ip"`
	Port      int    `json:"port"`
	PortQuery int  `json:"portQuery"`
}

type bmServer struct {
	Data struct {
		Attributes struct {
			IP        string `json:"ip"`
			Port      int    `json:"port"`
			PortQuery int    `json:"portQuery"`
		} `json:"attributes"`
	} `json:"data"`
}

func (c *Client) ServerByID(ctx context.Context, token, id string) (ServerDetail, error) {
	if c.HTTP == nil {
		c.HTTP = &http.Client{Timeout: 20 * time.Second}
	}
	id = strings.TrimSpace(id)
	if id == "" {
		return ServerDetail{}, fmt.Errorf("empty id")
	}
	u := "https://api.battlemetrics.com/servers/" + id
	req, err := http.NewRequestWithContext(ctx, http.MethodGet, u, nil)
	if err != nil {
		return ServerDetail{}, err
	}
	req.Header.Set("Authorization", "Bearer "+token)
	res, err := c.HTTP.Do(req)
	if err != nil {
		return ServerDetail{}, err
	}
	defer res.Body.Close()
	body, err := io.ReadAll(res.Body)
	if err != nil {
		return ServerDetail{}, err
	}
	if res.StatusCode != http.StatusOK {
		return ServerDetail{}, fmt.Errorf("battlemetrics http %d", res.StatusCode)
	}
	var out bmServer
	if err := json.Unmarshal(body, &out); err != nil {
		return ServerDetail{}, err
	}
	a := out.Data.Attributes
	return ServerDetail{IP: a.IP, Port: a.Port, PortQuery: a.PortQuery}, nil
}
