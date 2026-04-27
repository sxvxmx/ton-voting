package indexer

import (
	"context"
	"fmt"
	"log"
	"time"

	"student-dao/backend/internal/config"
	"student-dao/backend/internal/db"
	"student-dao/backend/internal/ton"
)

type Service struct {
	cfg    config.Config
	store  *db.Store
	client *ton.Client
	logger *log.Logger
}

func NewService(cfg config.Config, store *db.Store, client *ton.Client, logger *log.Logger) *Service {
	return &Service{
		cfg:    cfg,
		store:  store,
		client: client,
		logger: logger,
	}
}

func (s *Service) Run(ctx context.Context) error {
	if err := s.syncOnce(ctx); err != nil {
		s.logger.Printf("initial sync failed: %v", err)
	}

	ticker := time.NewTicker(time.Duration(s.cfg.PollIntervalSec) * time.Second)
	defer ticker.Stop()

	for {
		select {
		case <-ctx.Done():
			return nil
		case <-ticker.C:
			if err := s.syncOnce(ctx); err != nil {
				s.logger.Printf("sync failed: %v", err)
			}
		}
	}
}

func (s *Service) syncOnce(ctx context.Context) error {
	contractAddress, err := ton.NormalizeAddress(s.cfg.ContractAddress)
	if err != nil {
		return fmt.Errorf("normalize contract address: %w", err)
	}

	cursor, err := s.store.GetCursor(ctx)
	if err != nil {
		return err
	}

	newTxs, latestCursor, err := s.client.FetchNewTransactions(ctx, s.cfg.ContractAddress, ton.Cursor{
		LT:   cursor.LT,
		Hash: cursor.Hash,
	})
	if err != nil {
		return err
	}

	for _, tx := range newTxs {
		if tx.Description.Aborted || tx.InMsg == nil {
			continue
		}

		destination, err := ton.NormalizeAddress(tx.InMsg.Destination)
		if err != nil || destination != contractAddress {
			continue
		}

		if tx.InMsg.MsgData.Type != "msg.dataRaw" || tx.InMsg.MsgData.Body == "" {
			continue
		}

		decoded, err := ton.DecodeMessageBody(tx.InMsg.MsgData.Body)
		if err != nil {
			continue
		}

		inserted, err := s.store.SaveEvent(ctx, db.Event{
			LT:      tx.TransactionID.LT,
			Hash:    tx.TransactionID.Hash,
			Utime:   tx.Utime,
			Op:      decoded.Opcode,
			Source:  tx.InMsg.Source,
			RawBody: tx.InMsg.MsgData.Body,
		})
		if err != nil {
			return err
		}
		if !inserted {
			continue
		}

		switch decoded.Type {
		case ton.EventCreate:
			source := tx.InMsg.Source
			if normalizedSource, err := ton.NormalizeAddress(source); err == nil {
				source = normalizedSource
			}

			proposalID, err := s.store.NextProposalID(ctx)
			if err != nil {
				return err
			}
			err = s.store.InsertProposal(ctx, db.Proposal{
				ID:          proposalID,
				Creator:     source,
				Title:       decoded.Title,
				Description: decoded.Description,
				DeadlineTs:  int64(decoded.DeadlineTs),
				Quorum:      int64(decoded.Quorum),
				YesVotes:    0,
				NoVotes:     0,
				Status:      db.StatusActive,
				CreatedAt:   tx.Utime,
				UpdatedAt:   tx.Utime,
			})
			if err != nil {
				return err
			}
		case ton.EventVote:
			voter := tx.InMsg.Source
			if normalizedVoter, err := ton.NormalizeAddress(voter); err == nil {
				voter = normalizedVoter
			}

			_, err := s.store.RecordVote(ctx, int64(decoded.ProposalID), voter, decoded.Support)
			if err != nil {
				return err
			}
		case ton.EventFinalize:
			if err := s.store.FinalizeProposal(ctx, int64(decoded.ProposalID)); err != nil {
				return err
			}
		}
	}

	if latestCursor != nil {
		if err := s.store.SetCursor(ctx, db.Cursor{LT: latestCursor.LT, Hash: latestCursor.Hash}); err != nil {
			return err
		}
	}

	return nil
}
