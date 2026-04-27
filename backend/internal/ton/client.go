package ton

import (
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"net/url"
	"strings"
	"time"
)

type Client struct {
	endpoint   string
	apiKey     string
	httpClient *http.Client
}

func NewClient(endpoint string, apiKey string) *Client {
	return &Client{
		endpoint: strings.TrimRight(endpoint, "/"),
		apiKey:   apiKey,
		httpClient: &http.Client{
			Timeout: 20 * time.Second,
		},
	}
}

func (c *Client) FetchNewTransactions(ctx context.Context, address string, cursor Cursor) ([]RawTransaction, *Cursor, error) {
	const pageLimit = 100

	var allNew []RawTransaction
	var oldestLT string
	var oldestHash string
	var latest *Cursor
	foundCursor := cursor.LT == "" || cursor.Hash == ""

	for {
		txs, err := c.getTransactions(ctx, address, pageLimit, oldestLT, oldestHash)
		if err != nil {
			return nil, nil, err
		}
		if len(txs) == 0 {
			return nil, latest, nil
		}

		if latest == nil {
			latest = &Cursor{LT: txs[0].TransactionID.LT, Hash: txs[0].TransactionID.Hash}
		}

		stop := false
		for _, tx := range txs {
			if tx.TransactionID.LT == cursor.LT && tx.TransactionID.Hash == cursor.Hash {
				foundCursor = true
				stop = true
				break
			}
			allNew = append(allNew, tx)
		}

		if stop || len(txs) < pageLimit {
			break
		}

		last := txs[len(txs)-1]
		oldestLT = last.TransactionID.LT
		oldestHash = last.TransactionID.Hash
	}

	if !foundCursor {
		// Cursor is too old or missing in fetched pages. Processing fetched tail is still safe
		// because event writes are idempotent.
	}

	reverseTransactions(allNew)
	return allNew, latest, nil
}

func reverseTransactions(items []RawTransaction) {
	for i, j := 0, len(items)-1; i < j; i, j = i+1, j-1 {
		items[i], items[j] = items[j], items[i]
	}
}

func (c *Client) getTransactions(ctx context.Context, address string, limit int, lt string, hash string) ([]RawTransaction, error) {
	q := url.Values{}
	q.Set("address", address)
	q.Set("limit", fmt.Sprintf("%d", limit))
	q.Set("archival", "true")
	if lt != "" {
		q.Set("lt", lt)
	}
	if hash != "" {
		q.Set("hash", hash)
	}

	endpoint := fmt.Sprintf("%s/getTransactions?%s", c.endpoint, q.Encode())
	req, err := http.NewRequestWithContext(ctx, http.MethodGet, endpoint, nil)
	if err != nil {
		return nil, fmt.Errorf("create request: %w", err)
	}
	if c.apiKey != "" {
		req.Header.Set("X-API-Key", c.apiKey)
	}

	resp, err := c.httpClient.Do(req)
	if err != nil {
		return nil, fmt.Errorf("request getTransactions: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode >= 300 {
		return nil, fmt.Errorf("getTransactions status %d", resp.StatusCode)
	}

	var payload TransactionsResponse
	if err := json.NewDecoder(resp.Body).Decode(&payload); err != nil {
		return nil, fmt.Errorf("decode getTransactions response: %w", err)
	}
	if !payload.OK {
		return nil, fmt.Errorf("toncenter returned ok=false")
	}

	return payload.Result, nil
}
