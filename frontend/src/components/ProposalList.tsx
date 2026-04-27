import type { Proposal } from '../types';
import { ProposalCard } from './ProposalCard';

type Props = {
  title: string;
  proposals: Proposal[];
  canInteract: boolean;
  onVote: (proposalId: number, support: boolean) => Promise<void>;
  onFinalize: (proposalId: number) => Promise<void>;
};

export function ProposalList({ title, proposals, canInteract, onVote, onFinalize }: Props) {
  return (
    <section>
      <h2>{title}</h2>
      <div className="proposal-list">
        {proposals.length === 0 ? (
          <p className="muted">No proposals in this category yet.</p>
        ) : (
          proposals.map((proposal) => (
            <ProposalCard
              key={proposal.id}
              proposal={proposal}
              canInteract={canInteract}
              onVote={onVote}
              onFinalize={onFinalize}
            />
          ))
        )}
      </div>
    </section>
  );
}
