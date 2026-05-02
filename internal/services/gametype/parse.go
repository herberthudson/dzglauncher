package gametype

import (
	"regexp"
	"strconv"
	"strings"
)

var reTime = regexp.MustCompile(`(?i)\b(\d{1,2}):(\d{2})\b`)
var reLQS = regexp.MustCompile(`(?i)lqs(\d+)`)

func ParseInGameTime(gametype string) string {
	m := reTime.FindStringSubmatch(gametype)
	if len(m) >= 3 {
		return m[1] + ":" + m[2]
	}
	return "Unknown"
}

func ParseQueue(gametype string) int {
	m := reLQS.FindStringSubmatch(gametype)
	if len(m) >= 2 {
		n, _ := strconv.Atoi(m[1])
		return n
	}
	return 0
}

func Perspective(gametype string) string {
	g := strings.ToLower(gametype)
	if strings.Contains(g, "no3rd") {
		return "1PP"
	}
	return "3PP"
}

func Provider(gametype string) string {
	g := strings.ToLower(gametype)
	if strings.Contains(g, "external") {
		return "Unofficial"
	}
	return "Official"
}

func Modded(gametype string) bool {
	return strings.Contains(strings.ToLower(gametype), "mod")
}

func IsDayInGame(gametype string) bool {
	t := ParseInGameTime(gametype)
	if t == "Unknown" {
		return true
	}
	parts := strings.Split(t, ":")
	if len(parts) != 2 {
		return true
	}
	h, err1 := strconv.Atoi(parts[0])
	m, err2 := strconv.Atoi(parts[1])
	if err1 != nil || err2 != nil {
		return true
	}
	minutes := h*60 + m
	return minutes >= 6*60 && minutes < 18*60
}

func IsNightInGame(gametype string) bool {
	return !IsDayInGame(gametype)
}

func IsDayInGameFromLabel(inGameTime string) bool {
	if inGameTime == "Unknown" {
		return true
	}
	parts := strings.Split(inGameTime, ":")
	if len(parts) != 2 {
		return true
	}
	h, err1 := strconv.Atoi(parts[0])
	m, err2 := strconv.Atoi(parts[1])
	if err1 != nil || err2 != nil {
		return true
	}
	minutes := h*60 + m
	return minutes >= 6*60 && minutes < 18*60
}

func IsNightInGameFromLabel(inGameTime string) bool {
	return !IsDayInGameFromLabel(inGameTime)
}
