import "@stdlib/deploy";

const OP_CREATE_PROPOSAL: Int = 0x43524541; // CREA
const OP_CAST_VOTE: Int = 0x564f5445; // VOTE
const OP_FINALIZE_PROPOSAL: Int = 0x46494e41; // FINA

const STATUS_ACTIVE: Int = 0;
const STATUS_PASSED: Int = 1;
const STATUS_REJECTED: Int = 2;

struct Proposal {
    id: Int as uint32;
    creator: Address;
    title: Cell;
    description: Cell;
    deadlineTs: Int as uint64;
    quorum: Int as uint32;
    yesVotes: Int as uint32;
    noVotes: Int as uint32;
    status: Int as uint8;
}

contract StudentDao with Deployable {
    minProposalDeposit: Int as coins;
    nextProposalId: Int as uint32;
    proposals: map<Int as uint32, Proposal>;
    votes: map<Int as uint256, Bool>;

    init(minProposalDeposit: Int) {
        self.minProposalDeposit = minProposalDeposit;
        self.nextProposalId = 0;
    }

    receive(body: Slice) {
        let op = body.loadUint(32);

        if (op == OP_CREATE_PROPOSAL) {
            self.handleCreateProposal(body);
            return;
        }

        if (op == OP_CAST_VOTE) {
            self.handleCastVote(body);
            return;
        }

        if (op == OP_FINALIZE_PROPOSAL) {
            self.handleFinalizeProposal(body);
            return;
        }

        throw(100);
    }

    fun handleCreateProposal(body: Slice) {
        require(context().value >= self.minProposalDeposit, "INSUFFICIENT_DEPOSIT");

        let deadlineTs = body.loadUint(64);
        let quorum = body.loadUint(32);
        let title = body.loadRef();
        let description = body.loadRef();

        require(deadlineTs > now(), "DEADLINE_MUST_BE_FUTURE");
        require(quorum > 0, "BAD_QUORUM");

        let proposalId = self.nextProposalId;
        self.proposals.set(proposalId, Proposal {
            id: proposalId,
            creator: sender(),
            title: title,
            description: description,
            deadlineTs: deadlineTs,
            quorum: quorum,
            yesVotes: 0,
            noVotes: 0,
            status: STATUS_ACTIVE,
        });

        self.nextProposalId = proposalId + 1;
    }

    fun handleCastVote(body: Slice) {
        let proposalId = body.loadUint(32);
        let support = body.loadUint(1) == 1;

        let maybeProposal = self.proposals.get(proposalId);
        require(maybeProposal != null, "PROPOSAL_NOT_FOUND");

        let proposal = maybeProposal!!;
        require(proposal.status == STATUS_ACTIVE, "PROPOSAL_NOT_ACTIVE");
        require(now() < proposal.deadlineTs, "VOTING_CLOSED");

        let key = self.voteKey(proposalId, sender());
        require(self.votes.get(key) == null, "ALREADY_VOTED");

        self.votes.set(key, support);

        if (support) {
            proposal.yesVotes = proposal.yesVotes + 1;
        } else {
            proposal.noVotes = proposal.noVotes + 1;
        }

        self.proposals.set(proposalId, proposal);
    }

    fun handleFinalizeProposal(body: Slice) {
        let proposalId = body.loadUint(32);

        let maybeProposal = self.proposals.get(proposalId);
        require(maybeProposal != null, "PROPOSAL_NOT_FOUND");

        let proposal = maybeProposal!!;
        require(proposal.status == STATUS_ACTIVE, "PROPOSAL_ALREADY_FINALIZED");
        require(now() >= proposal.deadlineTs, "TOO_EARLY_TO_FINALIZE");

        let totalVotes = proposal.yesVotes + proposal.noVotes;
        let passed = proposal.yesVotes > proposal.noVotes && totalVotes >= proposal.quorum;

        if (passed) {
            proposal.status = STATUS_PASSED;
        } else {
            proposal.status = STATUS_REJECTED;
        }

        self.proposals.set(proposalId, proposal);
    }

    fun voteKey(proposalId: Int, voter: Address): Int {
        let keyCell = beginCell()
            .storeUint(proposalId, 32)
            .storeAddress(voter)
            .endCell();
        return keyCell.hash();
    }

    get fun get_next_proposal_id(): Int {
        return self.nextProposalId;
    }

    get fun get_vote(proposalId: Int, voter: Address): Int {
        let vote = self.votes.get(self.voteKey(proposalId, voter));
        if (vote == null) {
            return -1;
        }
        if (vote!!) {
            return 1;
        }
        return 0;
    }

    get fun get_proposal(id: Int): Proposal? {
        return self.proposals.get(id);
    }

    get fun get_min_proposal_deposit(): Int {
        return self.minProposalDeposit;
    }
}
