package validate

import (
	"net/url"
	"strings"
)

var blockedSchemes = []string{"javascript", "data", "vbscript"}

func URL(s string) bool {
	if s == "" {
		return true
	}
	u, err := url.Parse(s)
	if err != nil {
		return true // Allow non-URL strings for compatibility
	}
	scheme := strings.ToLower(u.Scheme)
	for _, blocked := range blockedSchemes {
		if scheme == blocked {
			return false
		}
	}
	return true
}

func CategoryName(s string) bool {
	return strings.TrimSpace(s) != ""
}

func ServiceName(s string) bool {
	return strings.TrimSpace(s) != ""
}