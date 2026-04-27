package api

import (
	"database/sql"
	"encoding/json"
	"net/http"
	"strconv"
	"strings"
	"sync"
	"time"

	"student-dao/backend/internal/db"
)

type Server struct {
	store           *db.Store
	listCacheMu     sync.RWMutex
	listCache       map[string]cachedList
	listCacheTTL    time.Duration
	lastCacheWarmup time.Time
}

type cachedList struct {
	items     []db.Proposal
	expiresAt time.Time
}

func NewServer(store *db.Store) *Server {
	return &Server{
		store:        store,
		listCache:    make(map[string]cachedList),
		listCacheTTL: 2 * time.Second,
	}
}

func (s *Server) Routes() http.Handler {
	mux := http.NewServeMux()
	mux.HandleFunc("/health", s.handleHealth)
	mux.HandleFunc("/api/proposals", s.handleListProposals)
	mux.HandleFunc("/api/proposals/", s.handleProposalSubroutes)

	return withCORS(mux)
}

func (s *Server) handleHealth(w http.ResponseWriter, r *http.Request) {
	respondJSON(w, http.StatusOK, map[string]string{"status": "ok"})
}

func (s *Server) handleListProposals(w http.ResponseWriter, r *http.Request) {
	status := r.URL.Query().Get("status")
	if status != "" && status != "active" && status != "finalized" {
		respondJSON(w, http.StatusBadRequest, map[string]string{"error": "status must be active or finalized"})
		return
	}

	proposals, ok := s.getCachedList(status)
	if !ok {
		var err error
		proposals, err = s.store.ListProposals(r.Context(), status)
		if err != nil {
			respondJSON(w, http.StatusInternalServerError, map[string]string{"error": "failed to list proposals"})
			return
		}
		s.setCachedList(status, proposals)
	}

	respondJSON(w, http.StatusOK, map[string]any{"items": proposals})
}

func cacheKey(status string) string {
	if status == "" {
		return "all"
	}
	return status
}

func cloneProposals(items []db.Proposal) []db.Proposal {
	out := make([]db.Proposal, len(items))
	copy(out, items)
	return out
}

func (s *Server) getCachedList(status string) ([]db.Proposal, bool) {
	key := cacheKey(status)
	now := time.Now()

	s.listCacheMu.RLock()
	entry, ok := s.listCache[key]
	s.listCacheMu.RUnlock()
	if !ok || now.After(entry.expiresAt) {
		return nil, false
	}

	return cloneProposals(entry.items), true
}

func (s *Server) setCachedList(status string, items []db.Proposal) {
	key := cacheKey(status)
	s.listCacheMu.Lock()
	s.listCache[key] = cachedList{
		items:     cloneProposals(items),
		expiresAt: time.Now().Add(s.listCacheTTL),
	}
	s.lastCacheWarmup = time.Now()
	s.listCacheMu.Unlock()
}

func (s *Server) handleProposalSubroutes(w http.ResponseWriter, r *http.Request) {
	path := strings.TrimPrefix(r.URL.Path, "/api/proposals/")
	path = strings.Trim(path, "/")
	segments := strings.Split(path, "/")

	if len(segments) == 0 || segments[0] == "" {
		respondJSON(w, http.StatusNotFound, map[string]string{"error": "not found"})
		return
	}

	proposalID, err := strconv.ParseInt(segments[0], 10, 64)
	if err != nil {
		respondJSON(w, http.StatusBadRequest, map[string]string{"error": "invalid proposal id"})
		return
	}

	if len(segments) == 1 {
		s.handleGetProposal(w, r, proposalID)
		return
	}

	if len(segments) == 2 && segments[1] == "results" {
		s.handleGetProposalResults(w, r, proposalID)
		return
	}

	respondJSON(w, http.StatusNotFound, map[string]string{"error": "not found"})
}

func (s *Server) handleGetProposal(w http.ResponseWriter, r *http.Request, proposalID int64) {
	proposal, err := s.store.GetProposal(r.Context(), proposalID)
	if err != nil {
		if err == sql.ErrNoRows {
			respondJSON(w, http.StatusNotFound, map[string]string{"error": "proposal not found"})
			return
		}
		respondJSON(w, http.StatusInternalServerError, map[string]string{"error": "failed to load proposal"})
		return
	}

	respondJSON(w, http.StatusOK, proposal)
}

func (s *Server) handleGetProposalResults(w http.ResponseWriter, r *http.Request, proposalID int64) {
	proposal, err := s.store.GetProposal(r.Context(), proposalID)
	if err != nil {
		if err == sql.ErrNoRows {
			respondJSON(w, http.StatusNotFound, map[string]string{"error": "proposal not found"})
			return
		}
		respondJSON(w, http.StatusInternalServerError, map[string]string{"error": "failed to load results"})
		return
	}

	total := proposal.YesVotes + proposal.NoVotes
	respondJSON(w, http.StatusOK, map[string]any{
		"proposal_id": proposal.ID,
		"yes_votes":   proposal.YesVotes,
		"no_votes":    proposal.NoVotes,
		"total_votes": total,
		"quorum":      proposal.Quorum,
		"status":      proposal.Status,
		"passed":      proposal.Status == db.StatusPassed,
	})
}

func respondJSON(w http.ResponseWriter, code int, payload any) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(code)
	_ = json.NewEncoder(w).Encode(payload)
}

func withCORS(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Access-Control-Allow-Origin", "*")
		w.Header().Set("Access-Control-Allow-Methods", "GET, OPTIONS")
		w.Header().Set("Access-Control-Allow-Headers", "Content-Type, Authorization")
		if r.Method == http.MethodOptions {
			w.WriteHeader(http.StatusNoContent)
			return
		}
		next.ServeHTTP(w, r)
	})
}
