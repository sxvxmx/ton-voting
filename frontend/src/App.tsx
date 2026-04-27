import { useCallback, useEffect, useState } from 'react';
import { TonConnectButton, useTonAddress, useTonConnectUI } from '@tonconnect/ui-react';
import { getProposals } from './lib/api';
import type { Proposal } from './types';
import { ProfileCard } from './components/ProfileCard';
import { ProposalForm } from './components/ProposalForm';
import { ProposalList } from './components/ProposalList';

const contractAddress = import.meta.env.VITE_CONTRACT_ADDRESS;
type AppView = 'create' | 'proposals';
const PROPOSALS_CACHE_KEY = 'student_dao_proposals_cache_v1';

const TON_AMOUNTS = {
  CREATE_PROPOSAL: '250000000',
  VOTE: '50000000',
  FINALIZE: '50000000',
} as const;

let tonPayloadModulePromise: Promise<typeof import('./lib/ton')> | null = null;
function loadTonPayloadModule() {
  if (!tonPayloadModulePromise) {
    tonPayloadModulePromise = import('./lib/ton');
  }
  return tonPayloadModulePromise;
}

function splitByStatus(proposals: Proposal[]): { active: Proposal[]; finalized: Proposal[] } {
  return {
    active: proposals.filter((proposal) => proposal.status === 0),
    finalized: proposals.filter((proposal) => proposal.status !== 0),
  };
}

function readCachedProposals(): Proposal[] {
  try {
    const raw = window.localStorage.getItem(PROPOSALS_CACHE_KEY);
    if (!raw) {
      return [];
    }
    const parsed = JSON.parse(raw) as Proposal[];
    if (!Array.isArray(parsed)) {
      return [];
    }
    return parsed;
  } catch {
    return [];
  }
}

function writeCachedProposals(proposals: Proposal[]): void {
  try {
    window.localStorage.setItem(PROPOSALS_CACHE_KEY, JSON.stringify(proposals));
  } catch {
    // Ignore storage quota or privacy mode errors.
  }
}

export default function App() {
  const walletAddress = useTonAddress();
  const [tonConnectUI] = useTonConnectUI();
  const [bootstrapCache] = useState(() => {
    const cachedProposals = readCachedProposals();
    return {
      cachedCount: cachedProposals.length,
      split: splitByStatus(cachedProposals),
    };
  });

  const [view, setView] = useState<AppView>('create');
  const [activeProposals, setActiveProposals] = useState<Proposal[]>(bootstrapCache.split.active);
  const [finalizedProposals, setFinalizedProposals] = useState<Proposal[]>(bootstrapCache.split.finalized);
  const [loading, setLoading] = useState(bootstrapCache.cachedCount === 0);
  const [error, setError] = useState<string | null>(null);
  const [txNotice, setTxNotice] = useState<string | null>(null);

  const reloadProposals = useCallback(async (): Promise<void> => {
    try {
      const proposals = await getProposals();
      const split = splitByStatus(proposals);
      setActiveProposals(split.active);
      setFinalizedProposals(split.finalized);
      writeCachedProposals(proposals);
      setError(null);
    } catch (err) {
      console.error(err);
      setError('Failed to load proposals from API');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void reloadProposals();
    const timer = setInterval(() => {
      void reloadProposals();
    }, 8000);
    return () => clearInterval(timer);
  }, [reloadProposals]);

  function scheduleFollowUpReload(): void {
    window.setTimeout(() => {
      void reloadProposals();
    }, 12000);
  }

  async function sendTransaction(payload: string, amount: string): Promise<void> {
    if (!walletAddress) {
      throw new Error('Wallet is not connected');
    }
    if (!contractAddress) {
      throw new Error('Contract address is not configured');
    }
    await tonConnectUI.sendTransaction({
      validUntil: Math.floor(Date.now() / 1000) + 300,
      messages: [
        {
          address: contractAddress,
          amount,
          payload,
        },
      ],
    });
  }

  async function completeTxFlow(successMessage: string): Promise<void> {
    setTxNotice(successMessage);
    await reloadProposals();
    scheduleFollowUpReload();
  }

  async function handleCreateProposal(input: {
    title: string;
    description: string;
    deadlineTs: number;
    quorum: number;
  }): Promise<void> {
    try {
      const { buildCreateProposalPayload } = await loadTonPayloadModule();
      const payload = buildCreateProposalPayload(input);
      await sendTransaction(payload, TON_AMOUNTS.CREATE_PROPOSAL);
      setView('proposals');
      await completeTxFlow('Proposal transaction sent. It can take up to 10-20 seconds to appear in the list.');
    } catch (err) {
      console.error(err);
      setError(err instanceof Error ? err.message : 'Failed to create proposal');
    }
  }

  async function handleVote(proposalId: number, support: boolean): Promise<void> {
    try {
      const { buildCastVotePayload } = await loadTonPayloadModule();
      const payload = buildCastVotePayload({ proposalId, support });
      await sendTransaction(payload, TON_AMOUNTS.VOTE);
      await completeTxFlow('Vote transaction sent. Updated tallies will be visible after indexer sync.');
    } catch (err) {
      console.error(err);
      setError(err instanceof Error ? err.message : 'Failed to cast vote');
    }
  }

  async function handleFinalize(proposalId: number): Promise<void> {
    try {
      const { buildFinalizePayload } = await loadTonPayloadModule();
      const payload = buildFinalizePayload({ proposalId });
      await sendTransaction(payload, TON_AMOUNTS.FINALIZE);
      await completeTxFlow('Finalize transaction sent. Proposal status will update after sync.');
    } catch (err) {
      console.error(err);
      setError(err instanceof Error ? err.message : 'Failed to finalize proposal');
    }
  }

  const totalProposals = activeProposals.length + finalizedProposals.length;

  return (
    <main className="app-shell">
      <header className="top-header">
        <div>
          <h1>Student DAO Voting</h1>
          <p className="muted">TON testnet Mini App for proposal creation, voting, and on-chain finalization.</p>
        </div>
        <TonConnectButton />
      </header>

      <ProfileCard user={null} walletAddress={walletAddress} />

      <section className="card view-switch">
        <button
          className={view === 'create' ? 'switch-active' : ''}
          onClick={() => setView('create')}
          type="button"
        >
          Create Proposal
        </button>
        <button
          className={view === 'proposals' ? 'switch-active' : ''}
          onClick={() => setView('proposals')}
          type="button"
        >
          All Proposals
        </button>
      </section>

      <section className="card muted-card">
        <p><strong>Contract:</strong> {contractAddress || 'Not configured'}</p>
        <p><strong>Network:</strong> {import.meta.env.VITE_TON_NETWORK || 'testnet'}</p>
        <p><strong>Total indexed proposals:</strong> {totalProposals}</p>
      </section>

      {txNotice ? <section className="card tx-notice">{txNotice}</section> : null}

      {error ? <section className="card error">{error}</section> : null}

      {view === 'create' ? (
        <ProposalForm disabled={!walletAddress} onSubmit={handleCreateProposal} />
      ) : (
        <>
          {loading ? (
            <section className="card">Loading proposals...</section>
          ) : (
            <>
              <ProposalList
                title="Active Proposals"
                proposals={activeProposals}
                canInteract={Boolean(walletAddress)}
                onVote={handleVote}
                onFinalize={handleFinalize}
              />
              <ProposalList
                title="Finalized Results"
                proposals={finalizedProposals}
                canInteract={Boolean(walletAddress)}
                onVote={handleVote}
                onFinalize={handleFinalize}
              />
            </>
          )}
        </>
      )}
    </main>
  );
}
