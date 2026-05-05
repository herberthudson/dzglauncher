package domain

type AboutInfo struct {
	Version       string `json:"version"`
	AppName       string `json:"appName"`
	RepositoryURL string `json:"repositoryURL"`
	Author        string `json:"author"`
	LicenseName   string `json:"licenseName"`
	LicenseURL    string `json:"licenseURL"`
}
