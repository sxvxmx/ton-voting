import type { Proposal } from '../types';

type Props = {
  proposal: Proposal;
  canInteract: boolean;
  onVote: (proposalId: number, support: boolean) => Promise<void>;
  onFinalize: (proposalId: number) => Promise<void>;
};

function statusText(status: number): string {
  if (status === 0) {
    return 'Active';
  }
  if (status === 1) {
    return 'Passed';
  }
  return 'Rejected';
}

export function ProposalCard({ proposal, canInteract, onVote, onFinalize }: Props) {
  const totalVotes = proposal.yes_votes + proposal.no_votes;
  const now = Math.floor(Date.now() / 1000);
  const isDeadlineReached = now >= proposal.deadline_ts;
  const canVote = canInteract && proposal.status === 0 && !isDeadlineReached;
  const canFinalize = canInteract && proposal.status === 0 && isDeadlineReached;

  return (
    <article className="card proposal-card">
      <div className="proposal-top">
        <h3>#{proposal.id} {proposal.title}</h3>
        <span className={`status status-${proposal.status}`}>{statusText(proposal.status)}</span>
      </div>
      <p>{proposal.description}</p>
      <p className="muted">Creator: {proposal.creator}</p>
      <p className="muted">Deadline: {new Date(proposal.deadline_ts * 1000).toLocaleString()}</p>
      <div className="results-grid">
        <span>Yes: {proposal.yes_votes}</span>
        <span>No: {proposal.no_votes}</span>
        <span>Total: {totalVotes}</span>
        <span>Quorum: {proposal.quorum}</span>
      </div>

      {proposal.status === 0 ? (
        <div className="actions-row">
          <button disabled={!canVote} onClick={() => onVote(proposal.id, true)}>Vote Yes</button>
          <button disabled={!canVote} onClick={() => onVote(proposal.id, false)}>Vote No</button>
          <button disabled={!canFinalize} onClick={() => onFinalize(proposal.id)}>Finalize</button>
        </div>
      ) : null}
    </article>
  );
}
