package ton

import (
	"encoding/base64"
	"errors"
	"fmt"

	"github.com/xssnick/tonutils-go/tvm/cell"
)

const (
	OpCreateProposal uint32 = 0x43524541
	OpCastVote       uint32 = 0x564f5445
	OpFinalize       uint32 = 0x46494e41
)

func DecodeMessageBody(bodyBase64 string) (DecodedEvent, error) {
	boc, err := base64.StdEncoding.DecodeString(bodyBase64)
	if err != nil {
		return DecodedEvent{}, fmt.Errorf("decode body base64: %w", err)
	}

	root, err := cell.FromBOC(boc)
	if err != nil {
		return DecodedEvent{}, fmt.Errorf("decode boc: %w", err)
	}

	slice := root.BeginParse()
	opcode, err := slice.LoadUInt(32)
	if err != nil {
		return DecodedEvent{}, fmt.Errorf("load opcode: %w", err)
	}

	switch uint32(opcode) {
	case OpCreateProposal:
		deadlineTs, err := slice.LoadUInt(64)
		if err != nil {
			return DecodedEvent{}, fmt.Errorf("load deadline: %w", err)
		}
		quorum, err := slice.LoadUInt(32)
		if err != nil {
			return DecodedEvent{}, fmt.Errorf("load quorum: %w", err)
		}
		titleRef, err := slice.LoadRef()
		if err != nil {
			return DecodedEvent{}, fmt.Errorf("load title ref: %w", err)
		}
		descriptionRef, err := slice.LoadRef()
		if err != nil {
			return DecodedEvent{}, fmt.Errorf("load description ref: %w", err)
		}

		title, err := cellToText(titleRef)
		if err != nil {
			return DecodedEvent{}, fmt.Errorf("decode title: %w", err)
		}
		description, err := cellToText(descriptionRef)
		if err != nil {
			return DecodedEvent{}, fmt.Errorf("decode description: %w", err)
		}

		return DecodedEvent{
			Type:        EventCreate,
			Opcode:      uint32(opcode),
			DeadlineTs:  deadlineTs,
			Quorum:      uint32(quorum),
			Title:       title,
			Description: description,
		}, nil
	case OpCastVote:
		proposalID, err := slice.LoadUInt(32)
		if err != nil {
			return DecodedEvent{}, fmt.Errorf("load proposal id: %w", err)
		}
		supportFlag, err := slice.LoadUInt(1)
		if err != nil {
			return DecodedEvent{}, fmt.Errorf("load support flag: %w", err)
		}

		return DecodedEvent{
			Type:       EventVote,
			Opcode:     uint32(opcode),
			ProposalID: uint32(proposalID),
			Support:    supportFlag == 1,
		}, nil
	case OpFinalize:
		proposalID, err := slice.LoadUInt(32)
		if err != nil {
			return DecodedEvent{}, fmt.Errorf("load proposal id: %w", err)
		}

		return DecodedEvent{
			Type:       EventFinalize,
			Opcode:     uint32(opcode),
			ProposalID: uint32(proposalID),
		}, nil
	default:
		return DecodedEvent{}, errors.New("unknown opcode")
	}
}

func cellToText(s *cell.Slice) (string, error) {
	return s.LoadStringSnake()
}
