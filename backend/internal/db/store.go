package db

import (
	"context"
	"database/sql"
	"errors"
	"fmt"
	"os"
	"path/filepath"
	"time"

	_ "modernc.org/sqlite"
)

type Store struct {
	db *sql.DB
}

func New(sqlitePath string) (*Store, error) {
	dir := filepath.Dir(sqlitePath)
	if err := os.MkdirAll(dir, 0o755); err != nil {
		return nil, fmt.Errorf("mkdir sqlite dir: %w", err)
	}

	db, err := sql.Open("sqlite", sqlitePath)
	if err != nil {
		return nil, fmt.Errorf("open sqlite: %w", err)
	}

	store := &Store{db: db}
	if err := store.initSchema(); err != nil {
		_ = db.Close()
		return nil, err
	}

	return store, nil
}

func (s *Store) Close() error {
	return s.db.Close()
}

func (s *Store) initSchema() error {
	schema := `
CREATE TABLE IF NOT EXISTS proposals (
  id INTEGER PRIMARY KEY,
  creator TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  deadline_ts INTEGER NOT NULL,
  quorum INTEGER NOT NULL,
  yes_votes INTEGER NOT NULL DEFAULT 0,
  no_votes INTEGER NOT NULL DEFAULT 0,
  status INTEGER NOT NULL DEFAULT 0,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS votes (
  proposal_id INTEGER NOT NULL,
  voter TEXT NOT NULL,
  support INTEGER NOT NULL,
  created_at INTEGER NOT NULL,
  PRIMARY KEY (proposal_id, voter)
);

CREATE TABLE IF NOT EXISTS events (
  lt TEXT NOT NULL,
  hash TEXT NOT NULL,
  utime INTEGER NOT NULL,
  op INTEGER NOT NULL,
  source TEXT NOT NULL,
  raw_body TEXT NOT NULL,
  PRIMARY KEY (lt, hash)
);

CREATE TABLE IF NOT EXISTS sync_cursor (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  lt TEXT NOT NULL,
  hash TEXT NOT NULL
);

INSERT OR IGNORE INTO sync_cursor(id, lt, hash) VALUES(1, '', '');
`

	if _, err := s.db.Exec(schema); err != nil {
		return fmt.Errorf("init schema: %w", err)
	}

	return nil
}

func (s *Store) SaveEvent(ctx context.Context, event Event) (bool, error) {
	res, err := s.db.ExecContext(
		ctx,
		`INSERT OR IGNORE INTO events(lt, hash, utime, op, source, raw_body) VALUES(?, ?, ?, ?, ?, ?)`,
		event.LT,
		event.Hash,
		event.Utime,
		event.Op,
		event.Source,
		event.RawBody,
	)
	if err != nil {
		return false, fmt.Errorf("save event: %w", err)
	}

	rows, err := res.RowsAffected()
	if err != nil {
		return false, fmt.Errorf("event rows affected: %w", err)
	}

	return rows > 0, nil
}

func (s *Store) NextProposalID(ctx context.Context) (int64, error) {
	var next int64
	err := s.db.QueryRowContext(ctx, `SELECT COALESCE(MAX(id) + 1, 0) FROM proposals`).Scan(&next)
	if err != nil {
		return 0, fmt.Errorf("next proposal id: %w", err)
	}
	return next, nil
}

func (s *Store) InsertProposal(ctx context.Context, proposal Proposal) error {
	now := time.Now().Unix()
	_, err := s.db.ExecContext(
		ctx,
		`INSERT OR IGNORE INTO proposals(id, creator, title, description, deadline_ts, quorum, yes_votes, no_votes, status, created_at, updated_at)
		 VALUES(?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
		proposal.ID,
		proposal.Creator,
		proposal.Title,
		proposal.Description,
		proposal.DeadlineTs,
		proposal.Quorum,
		proposal.YesVotes,
		proposal.NoVotes,
		proposal.Status,
		now,
		now,
	)
	if err != nil {
		return fmt.Errorf("insert proposal: %w", err)
	}
	return nil
}

func (s *Store) RecordVote(ctx context.Context, proposalID int64, voter string, support bool) (bool, error) {
	supportInt := 0
	if support {
		supportInt = 1
	}

	res, err := s.db.ExecContext(
		ctx,
		`INSERT OR IGNORE INTO votes(proposal_id, voter, support, created_at) VALUES(?, ?, ?, ?)`,
		proposalID,
		voter,
		supportInt,
		time.Now().Unix(),
	)
	if err != nil {
		return false, fmt.Errorf("insert vote: %w", err)
	}

	rows, err := res.RowsAffected()
	if err != nil {
		return false, fmt.Errorf("vote rows affected: %w", err)
	}

	if rows == 0 {
		return false, nil
	}

	if support {
		_, err = s.db.ExecContext(ctx, `UPDATE proposals SET yes_votes = yes_votes + 1, updated_at = ? WHERE id = ?`, time.Now().Unix(), proposalID)
	} else {
		_, err = s.db.ExecContext(ctx, `UPDATE proposals SET no_votes = no_votes + 1, updated_at = ? WHERE id = ?`, time.Now().Unix(), proposalID)
	}
	if err != nil {
		return false, fmt.Errorf("update proposal tally: %w", err)
	}

	return true, nil
}

func (s *Store) FinalizeProposal(ctx context.Context, proposalID int64) error {
	var yesVotes int64
	var noVotes int64
	var quorum int64

	err := s.db.QueryRowContext(
		ctx,
		`SELECT yes_votes, no_votes, quorum FROM proposals WHERE id = ?`,
		proposalID,
	).Scan(&yesVotes, &noVotes, &quorum)
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return nil
		}
		return fmt.Errorf("load proposal for finalize: %w", err)
	}

	status := StatusRejected
	if yesVotes > noVotes && (yesVotes+noVotes) >= quorum {
		status = StatusPassed
	}

	_, err = s.db.ExecContext(
		ctx,
		`UPDATE proposals SET status = ?, updated_at = ? WHERE id = ?`,
		status,
		time.Now().Unix(),
		proposalID,
	)
	if err != nil {
		return fmt.Errorf("finalize proposal: %w", err)
	}

	return nil
}

func (s *Store) ListProposals(ctx context.Context, filterStatus string) ([]Proposal, error) {
	query := `SELECT id, creator, title, description, deadline_ts, quorum, yes_votes, no_votes, status, created_at, updated_at FROM proposals`
	args := []any{}

	switch filterStatus {
	case "active":
		query += ` WHERE status = ?`
		args = append(args, StatusActive)
	case "finalized":
		query += ` WHERE status IN (?, ?)`
		args = append(args, StatusPassed, StatusRejected)
	}

	query += ` ORDER BY id DESC`

	rows, err := s.db.QueryContext(ctx, query, args...)
	if err != nil {
		return nil, fmt.Errorf("list proposals: %w", err)
	}
	defer rows.Close()

	proposals := make([]Proposal, 0)
	for rows.Next() {
		var proposal Proposal
		if err := rows.Scan(
			&proposal.ID,
			&proposal.Creator,
			&proposal.Title,
			&proposal.Description,
			&proposal.DeadlineTs,
			&proposal.Quorum,
			&proposal.YesVotes,
			&proposal.NoVotes,
			&proposal.Status,
			&proposal.CreatedAt,
			&proposal.UpdatedAt,
		); err != nil {
			return nil, fmt.Errorf("scan proposal: %w", err)
		}
		proposals = append(proposals, proposal)
	}

	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("iterate proposals: %w", err)
	}

	return proposals, nil
}

func (s *Store) GetProposal(ctx context.Context, id int64) (Proposal, error) {
	var proposal Proposal
	err := s.db.QueryRowContext(
		ctx,
		`SELECT id, creator, title, description, deadline_ts, quorum, yes_votes, no_votes, status, created_at, updated_at FROM proposals WHERE id = ?`,
		id,
	).Scan(
		&proposal.ID,
		&proposal.Creator,
		&proposal.Title,
		&proposal.Description,
		&proposal.DeadlineTs,
		&proposal.Quorum,
		&proposal.YesVotes,
		&proposal.NoVotes,
		&proposal.Status,
		&proposal.CreatedAt,
		&proposal.UpdatedAt,
	)
	if err != nil {
		return Proposal{}, err
	}
	return proposal, nil
}

func (s *Store) GetCursor(ctx context.Context) (Cursor, error) {
	var cursor Cursor
	err := s.db.QueryRowContext(ctx, `SELECT lt, hash FROM sync_cursor WHERE id = 1`).Scan(&cursor.LT, &cursor.Hash)
	if err != nil {
		return Cursor{}, fmt.Errorf("get cursor: %w", err)
	}
	return cursor, nil
}

func (s *Store) SetCursor(ctx context.Context, cursor Cursor) error {
	_, err := s.db.ExecContext(
		ctx,
		`UPDATE sync_cursor SET lt = ?, hash = ? WHERE id = 1`,
		cursor.LT,
		cursor.Hash,
	)
	if err != nil {
		return fmt.Errorf("set cursor: %w", err)
	}
	return nil
}
