package domain

type WorkshopModStatus string

const (
	WorkshopModOK       WorkshopModStatus = "ok"
	WorkshopModMissing  WorkshopModStatus = "missing"
	WorkshopModOutdated WorkshopModStatus = "outdated"
)

type WorkshopModRow struct {
	ID          string            `json:"id"`
	Name        string            `json:"name"`
	Status      WorkshopModStatus `json:"status"`
	Description string            `json:"description"`
	PreviewURL  string            `json:"previewUrl"`
}
