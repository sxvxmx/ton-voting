package ton

import (
	"fmt"
	"strings"

	"github.com/xssnick/tonutils-go/address"
)

// NormalizeAddress converts any supported TON address format to a canonical raw form.
func NormalizeAddress(value string) (string, error) {
	trimmed := strings.TrimSpace(value)
	if trimmed == "" {
		return "", fmt.Errorf("empty address")
	}

	if parsed, err := address.ParseAddr(trimmed); err == nil {
		return parsed.StringRaw(), nil
	}

	if parsed, err := address.ParseRawAddr(trimmed); err == nil {
		return parsed.StringRaw(), nil
	}

	return "", fmt.Errorf("unsupported address format: %s", value)
}
