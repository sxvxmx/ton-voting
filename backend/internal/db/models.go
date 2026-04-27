package db

type ProposalStatus int

const (
	StatusActive   ProposalStatus = 0
	StatusPassed   ProposalStatus = 1
	StatusRejected ProposalStatus = 2
)

type Proposal struct {
	ID          int64          `json:"id"`
	Creator     string         `json:"creator"`
	Title       string         `json:"title"`
	Description string         `json:"description"`
	DeadlineTs  int64          `json:"deadline_ts"`
	Quorum      int64          `json:"quorum"`
	YesVotes    int64          `json:"yes_votes"`
	NoVotes     int64          `json:"no_votes"`
	Status      ProposalStatus `json:"status"`
	CreatedAt   int64          `json:"created_at"`
	UpdatedAt   int64          `json:"updated_at"`
}

type Cursor struct {
	LT   string
	Hash string
}

type Event struct {
	LT      string
	Hash    string
	Utime   int64
	Op      uint32
	Source  string
	RawBody string
}
