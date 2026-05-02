package geo

import (
	"bufio"
	"encoding/binary"
	"math"
	"net"
	"os"
	"strconv"
	"strings"
)

func HaversineKm(lat1, lon1, lat2, lon2 float64) float64 {
	const R = 6371.0
	p1 := lat1 * math.Pi / 180
	p2 := lat2 * math.Pi / 180
	dphi := (lat2 - lat1) * math.Pi / 180
	dlambda := (lon2 - lon1) * math.Pi / 180
	a := math.Sin(dphi/2)*math.Sin(dphi/2) + math.Cos(p1)*math.Cos(p2)*math.Sin(dlambda/2)*math.Sin(dlambda/2)
	c := 2 * math.Atan2(math.Sqrt(a), math.Sqrt(1-a))
	return R * c
}

type RangeRow struct {
	Start uint32
	End   uint32
	Lat   float64
	Lon   float64
}

func ipv4ToU32(ip net.IP) (uint32, bool) {
	ip = ip.To4()
	if ip == nil {
		return 0, false
	}
	return binary.BigEndian.Uint32(ip), true
}

func ParseRangesBytes(data []byte) ([]RangeRow, error) {
	sc := bufio.NewScanner(strings.NewReader(string(data)))
	return scanRanges(sc)
}

func LoadRanges(path string) ([]RangeRow, error) {
	f, err := os.Open(path)
	if err != nil {
		return nil, err
	}
	defer f.Close()
	return scanRanges(bufio.NewScanner(f))
}

func scanRanges(sc *bufio.Scanner) ([]RangeRow, error) {
	var rows []RangeRow
	for sc.Scan() {
		line := strings.TrimSpace(sc.Text())
		if line == "" || strings.HasPrefix(line, "#") {
			continue
		}
		parts := strings.Split(line, ",")
		if len(parts) < 4 {
			continue
		}
		ip1 := net.ParseIP(strings.TrimSpace(parts[0]))
		ip2 := net.ParseIP(strings.TrimSpace(parts[1]))
		lat, err1 := strconv.ParseFloat(strings.TrimSpace(parts[2]), 64)
		lon, err2 := strconv.ParseFloat(strings.TrimSpace(parts[3]), 64)
		if ip1 == nil || ip2 == nil || err1 != nil || err2 != nil {
			continue
		}
		a, ok1 := ipv4ToU32(ip1)
		b, ok2 := ipv4ToU32(ip2)
		if !ok1 || !ok2 {
			continue
		}
		rows = append(rows, RangeRow{Start: a, End: b, Lat: lat, Lon: lon})
	}
	return rows, sc.Err()
}

func LookupLatLon(rows []RangeRow, ip string) (float64, float64, bool) {
	p := net.ParseIP(ip)
	n, ok := ipv4ToU32(p)
	if !ok {
		return 0, 0, false
	}
	for _, r := range rows {
		if n >= r.Start && n <= r.End {
			return r.Lat, r.Lon, true
		}
	}
	return 0, 0, false
}
