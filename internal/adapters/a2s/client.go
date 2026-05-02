package a2s

import (
	"bytes"
	"encoding/binary"
	"errors"
	"net"
	"regexp"
	"strconv"
	"strings"
	"time"
)

type InfoResult struct {
	Name       string
	Map        string
	Players    int
	MaxPlayers int
	PingMS     int
}

var errParse = errors.New("a2s parse")

func Info(host string, queryPort int, timeout time.Duration) (InfoResult, error) {
	start := time.Now()
	b, err := queryWithChallenge(host, queryPort, buildInfoPayload(0), timeout)
	if err != nil {
		return InfoResult{}, err
	}
	ping := int(time.Since(start).Milliseconds())
	if ping < 1 {
		ping = 1
	}
	name, mapn, pl, mx, err := parseInfoResponse(b)
	if err != nil {
		return InfoResult{}, err
	}
	return InfoResult{Name: name, Map: mapn, Players: pl, MaxPlayers: mx, PingMS: ping}, nil
}

func buildInfoPayload(challenge int32) []byte {
	buf := bytes.NewBuffer(nil)
	buf.Write([]byte{0xFF, 0xFF, 0xFF, 0xFF, 0x54})
	buf.WriteString("Source Engine Query")
	buf.WriteByte(0)
	if challenge != 0 {
		_ = binary.Write(buf, binary.LittleEndian, challenge)
	}
	return buf.Bytes()
}

func queryWithChallenge(host string, port int, first []byte, timeout time.Duration) ([]byte, error) {
	b, err := queryUDP(host, port, first, timeout)
	if err != nil {
		return nil, err
	}
	if len(b) >= 9 && b[0] == 0xFF && b[1] == 0xFF && b[2] == 0xFF && b[3] == 0xFF && b[4] == 'A' {
		ch := int32(binary.LittleEndian.Uint32(b[5:9]))
		return queryUDP(host, port, buildInfoPayload(ch), timeout)
	}
	return b, nil
}

func queryUDP(host string, port int, payload []byte, timeout time.Duration) ([]byte, error) {
	raddr, err := net.ResolveUDPAddr("udp", net.JoinHostPort(host, strconv.Itoa(port)))
	if err != nil {
		return nil, err
	}
	conn, err := net.DialUDP("udp", nil, raddr)
	if err != nil {
		return nil, err
	}
	defer conn.Close()
	_ = conn.SetDeadline(time.Now().Add(timeout))
	if _, err := conn.Write(payload); err != nil {
		return nil, err
	}
	buf := make([]byte, 16384)
	n, err := conn.Read(buf)
	if err != nil {
		return nil, err
	}
	return buf[:n], nil
}

func parseInfoResponse(b []byte) (name, mapName string, players, maxPlayers int, err error) {
	if len(b) < 6 {
		return "", "", 0, 0, errParse
	}
	if b[0] != 0xFF || b[1] != 0xFF || b[2] != 0xFF || b[3] != 0xFF {
		return "", "", 0, 0, errParse
	}
	if b[4] != 'I' {
		return "", "", 0, 0, errParse
	}
	off := 6
	readStr := func() string {
		if off >= len(b) {
			return ""
		}
		idx := bytes.IndexByte(b[off:], 0)
		if idx < 0 {
			return ""
		}
		s := string(b[off : off+idx])
		off += idx + 1
		return s
	}
	name = strings.TrimSpace(readStr())
	mapName = strings.TrimSpace(strings.ToLower(readStr()))
	_ = readStr()
	_ = readStr()
	if len(b) < off+2 {
		return name, mapName, 0, 0, errParse
	}
	off += 2
	if len(b) < off+2 {
		return name, mapName, 0, 0, errParse
	}
	players = int(b[off])
	maxPlayers = int(b[off+1])
	return name, mapName, players, maxPlayers, nil
}

type RulesResult struct {
	Pairs map[string]string
}

var reWorkshop = regexp.MustCompile(`\b\d{8,12}\b`)

func Rules(host string, queryPort int, timeout time.Duration) (RulesResult, error) {
	out := RulesResult{Pairs: map[string]string{}}
	payload := []byte{0xFF, 0xFF, 0xFF, 0xFF, 0x56, 0xFF, 0xFF, 0xFF, 0xFF}
	b, err := queryUDP(host, queryPort, payload, timeout)
	if err != nil {
		return out, err
	}
	if len(b) >= 9 && b[4] == 'A' {
		ch := binary.LittleEndian.Uint32(b[5:9])
		buf := bytes.NewBuffer([]byte{0xFF, 0xFF, 0xFF, 0xFF, 0x56})
		_ = binary.Write(buf, binary.LittleEndian, ch)
		b, err = queryUDP(host, queryPort, buf.Bytes(), timeout)
		if err != nil {
			return out, err
		}
	}
	return parseRules(b)
}

func parseRules(b []byte) (RulesResult, error) {
	out := RulesResult{Pairs: map[string]string{}}
	if len(b) < 8 {
		return out, nil
	}
	if b[4] != 'E' {
		return out, nil
	}
	off := 7
	if off+2 > len(b) {
		return out, nil
	}
	nRules := int(binary.LittleEndian.Uint16(b[off : off+2]))
	off += 2
	for i := 0; i < nRules && off < len(b); i++ {
		k := readCString(b, &off)
		v := readCString(b, &off)
		if k != "" {
			out.Pairs[k] = v
		}
	}
	return out, nil
}

func readCString(b []byte, off *int) string {
	if *off >= len(b) {
		return ""
	}
	idx := bytes.IndexByte(b[*off:], 0)
	if idx < 0 {
		return ""
	}
	s := string(b[*off : *off+idx])
	*off += idx + 1
	return s
}

func WorkshopIDsFromRules(r RulesResult) []string {
	seen := map[string]struct{}{}
	var out []string
	for _, v := range r.Pairs {
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
