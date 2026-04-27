package ton

import "testing"

func TestNormalizeAddressFriendlyAndRaw(t *testing.T) {
	friendly := "kQD56ASxncEq_c6Ij3MMsB2yXA7W2yzjgF0SYiEiBEfRx-IN"
	raw := "0:f9e804b19dc12afdce888f730cb01db25c0ed6db2ce3805d126221220447d1c7"

	friendlyNormalized, err := NormalizeAddress(friendly)
	if err != nil {
		t.Fatalf("friendly normalize failed: %v", err)
	}

	rawNormalized, err := NormalizeAddress(raw)
	if err != nil {
		t.Fatalf("raw normalize failed: %v", err)
	}

	if friendlyNormalized != rawNormalized {
		t.Fatalf("expected equal normalized addresses, got %s and %s", friendlyNormalized, rawNormalized)
	}
}

func TestNormalizeAddressRejectsInvalid(t *testing.T) {
	if _, err := NormalizeAddress("not-a-ton-address"); err == nil {
		t.Fatal("expected error for invalid address")
	}
}
