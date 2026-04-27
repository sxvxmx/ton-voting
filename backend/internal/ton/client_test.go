package ton

import (
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"
)

func TestFetchNewTransactionsStopsAtCursor(t *testing.T) {
	mux := http.NewServeMux()
	mux.HandleFunc("/api/v2/getTransactions", func(w http.ResponseWriter, r *http.Request) {
		lt := r.URL.Query().Get("lt")

		var result []RawTransaction
		switch lt {
		case "":
			result = []RawTransaction{
				{TransactionID: TransactionID{LT: "5", Hash: "h5"}},
				{TransactionID: TransactionID{LT: "4", Hash: "h4"}},
				{TransactionID: TransactionID{LT: "3", Hash: "h3"}},
			}
		case "3":
			result = []RawTransaction{
				{TransactionID: TransactionID{LT: "2", Hash: "h2"}},
			}
		default:
			result = []RawTransaction{}
		}

		_ = json.NewEncoder(w).Encode(TransactionsResponse{
			OK:     true,
			Result: result,
		})
	})

	server := httptest.NewServer(mux)
	defer server.Close()

	client := NewClient(server.URL+"/api/v2", "")
	txs, latest, err := client.FetchNewTransactions(context.Background(), "EQDemo", Cursor{LT: "3", Hash: "h3"})
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}

	if latest == nil || latest.LT != "5" || latest.Hash != "h5" {
		t.Fatalf("unexpected latest cursor: %+v", latest)
	}

	if len(txs) != 2 {
		t.Fatalf("unexpected tx count: %d", len(txs))
	}

	if txs[0].TransactionID.LT != "4" || txs[1].TransactionID.LT != "5" {
		t.Fatalf("expected chronological tx order [4,5], got [%s,%s]", txs[0].TransactionID.LT, txs[1].TransactionID.LT)
	}
}
