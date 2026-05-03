package a2s

import (
	"fmt"
	"regexp"
	"slices"
	"strconv"
	"strings"
	"time"

	wa2s "github.com/woozymasta/a2s/pkg/a2s"
	"github.com/woozymasta/a2s/pkg/a3sb"
)

const rulesAttemptTimeout = 5 * time.Second

type InfoResult struct {
	Name             string
	Map              string
	Players          int
	MaxPlayers       int
	PingMS           int
	PasswordRequired bool
}

func Info(host string, queryPort int, timeout time.Duration) (InfoResult, error) {
	start := time.Now()
	c, err := wa2s.New(host, queryPort)
	if err != nil {
		return InfoResult{}, err
	}
	defer c.Close()
	sec := int(timeout / time.Second)
	if sec < 1 {
		sec = 1
	}
	c.SetDeadlineTimeout(sec)
	si, err := c.GetInfo()
	if err != nil {
		return InfoResult{}, err
	}
	ping := int(time.Since(start).Milliseconds())
	if si != nil && si.Ping > 0 {
		ping = int(si.Ping.Milliseconds())
	}
	if ping < 1 {
		ping = 1
	}
	return InfoResult{
		Name:             strings.TrimSpace(si.Name),
		Map:              strings.TrimSpace(strings.ToLower(si.Map)),
		Players:          int(si.Players),
		MaxPlayers:       int(si.MaxPlayers),
		PingMS:           ping,
		PasswordRequired: si.Visibility,
	}, nil
}

type RulesResult struct {
	Pairs          map[string]string
	ModWorkshopIDs []string
}

var reWorkshop = regexp.MustCompile(`\b\d{8,12}\b`)

func RulesWithFallback(host string, queryPort, gamePort int) (RulesResult, error) {
	var lastErr error
	if queryPort > 0 {
		r, err := Rules(host, queryPort, rulesAttemptTimeout)
		if err == nil {
			return r, nil
		}
		lastErr = err
	}
	if gamePort > 0 {
		q2 := gamePort + 3
		if q2 > 0 && q2 <= 65535 && q2 != queryPort {
			r, err := Rules(host, q2, rulesAttemptTimeout)
			if err == nil {
				return r, nil
			}
			if lastErr == nil {
				lastErr = err
			}
		}
	}
	if lastErr == nil {
		lastErr = fmt.Errorf("no query port for a2s")
	}
	return RulesResult{}, lastErr
}

func Rules(host string, queryPort int, timeout time.Duration) (RulesResult, error) {
	c, err := wa2s.New(host, queryPort)
	if err != nil {
		return RulesResult{}, err
	}
	defer c.Close()
	sec := int(timeout / time.Second)
	if sec < 1 {
		sec = 1
	}
	c.SetDeadlineTimeout(sec)
	a3c := &a3sb.Client{Client: c}
	rules, err := a3c.GetRulesDayZ()
	if err != nil {
		return RulesResult{}, err
	}
	pairs := map[string]string{}
	if rules.ExtraRules != nil {
		for k, v := range rules.ExtraRules {
			pairs[k] = v
		}
	}
	var modIDs []string
	for _, m := range rules.Mods {
		if m.ID == 0 {
			continue
		}
		modIDs = append(modIDs, strconv.FormatUint(m.ID, 10))
	}
	return RulesResult{Pairs: pairs, ModWorkshopIDs: modIDs}, nil
}

func WorkshopIDsFromRules(r RulesResult) []string {
	keys := make([]string, 0, len(r.Pairs))
	for k := range r.Pairs {
		keys = append(keys, k)
	}
	slices.Sort(keys)
	seen := map[string]struct{}{}
	out := make([]string, 0)
	for _, k := range keys {
		for _, m := range reWorkshop.FindAllString(k, -1) {
			if _, ok := seen[m]; ok {
				continue
			}
			seen[m] = struct{}{}
			out = append(out, m)
		}
		v := r.Pairs[k]
		for _, m := range reWorkshop.FindAllString(v, -1) {
			if _, ok := seen[m]; ok {
				continue
			}
			seen[m] = struct{}{}
			out = append(out, m)
		}
	}
	return out
}
