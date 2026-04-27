package ton

import (
	"encoding/base64"
	"testing"

	"github.com/xssnick/tonutils-go/tvm/cell"
)

func TestDecodeCreateProposal(t *testing.T) {
	body := cell.BeginCell().
		MustStoreUInt(uint64(OpCreateProposal), 32).
		MustStoreUInt(1_900_000_000, 64).
		MustStoreUInt(3, 32).
		MustStoreRef(cell.BeginCell().MustStoreStringSnake("Budget vote").EndCell()).
		MustStoreRef(cell.BeginCell().MustStoreStringSnake("Approve Q2 budget").EndCell()).
		EndCell()

	encoded := base64.StdEncoding.EncodeToString(body.ToBOC())
	event, err := DecodeMessageBody(encoded)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}

	if event.Type != EventCreate {
		t.Fatalf("unexpected type: %s", event.Type)
	}
	if event.Quorum != 3 {
		t.Fatalf("unexpected quorum: %d", event.Quorum)
	}
	if event.Title != "Budget vote" {
		t.Fatalf("unexpected title: %s", event.Title)
	}
}

func TestDecodeVote(t *testing.T) {
	body := cell.BeginCell().
		MustStoreUInt(uint64(OpCastVote), 32).
		MustStoreUInt(7, 32).
		MustStoreUInt(1, 1).
		EndCell()

	encoded := base64.StdEncoding.EncodeToString(body.ToBOC())
	event, err := DecodeMessageBody(encoded)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}

	if event.Type != EventVote || event.ProposalID != 7 || !event.Support {
		t.Fatalf("decoded vote mismatch: %+v", event)
	}
}

func TestDecodeFinalize(t *testing.T) {
	body := cell.BeginCell().
		MustStoreUInt(uint64(OpFinalize), 32).
		MustStoreUInt(12, 32).
		EndCell()

	encoded := base64.StdEncoding.EncodeToString(body.ToBOC())
	event, err := DecodeMessageBody(encoded)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}

	if event.Type != EventFinalize || event.ProposalID != 12 {
		t.Fatalf("decoded finalize mismatch: %+v", event)
	}
}
