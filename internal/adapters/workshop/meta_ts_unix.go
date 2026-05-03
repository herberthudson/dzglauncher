package workshop

func IsMetaTimestampUnixEpoch(t int64) bool {
	return t >= 1_000_000_000 && t <= 2_500_000_000
}
