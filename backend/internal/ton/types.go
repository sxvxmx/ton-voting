package ton

type Cursor struct {
	LT   string
	Hash string
}

type TransactionsResponse struct {
	OK     bool             `json:"ok"`
	Result []RawTransaction `json:"result"`
}

type RawTransaction struct {
	TransactionID TransactionID `json:"transaction_id"`
	Utime         int64         `json:"utime"`
	InMsg         *RawMessage   `json:"in_msg"`
	Description   TxDescription `json:"description"`
}

type TransactionID struct {
	LT   string `json:"lt"`
	Hash string `json:"hash"`
}

type TxDescription struct {
	Aborted bool `json:"aborted"`
}

type RawMessage struct {
	Source      string     `json:"source"`
	Destination string     `json:"destination"`
	MsgData     RawMsgData `json:"msg_data"`
}

type RawMsgData struct {
	Type string `json:"@type"`
	Body string `json:"body"`
}

type EventType string

const (
	EventCreate   EventType = "create_proposal"
	EventVote     EventType = "cast_vote"
	EventFinalize EventType = "finalize_proposal"
)

type DecodedEvent struct {
	Type        EventType
	Opcode      uint32
	ProposalID  uint32
	Support     bool
	DeadlineTs  uint64
	Quorum      uint32
	Title       string
	Description string
}
