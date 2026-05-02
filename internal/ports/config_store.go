package ports

import "dzglauncher/internal/domain"

type ConfigStore interface {
	Load() (domain.Settings, error)
	Save(domain.Settings) error
}
