import { useEffect, useState } from 'react';
import { TonConnectButton, useTonAddress, useTonConnectUI } from '@tonconnect/ui-react';
import { getProposals } from './lib/api';
import { getTelegramUser, initTelegramWebApp } from './lib/telegram';
import { buildCastVotePayload, buildCreateProposalPayload, buildFinalizePayload, TON_AMOUNTS } from './lib/ton';
import type { Proposal, TelegramUser } from './types';
import { ProfileCard } from './components/ProfileCard';
import { ProposalForm } from './components/ProposalForm';
import { ProposalList } from './components/ProposalList';

const contractAddress = import.meta.env.VITE_CONTRACT_ADDRESS;

export default function App() {
  const walletAddress = useTonAddress();
  const [tonConnectUI] = useTonConnectUI();
  const [telegramUser, setTelegramUser] = useState<TelegramUser | null>(null);

  const [activeProposals, setActiveProposals] = useState<Proposal[]>([]);
  const [finalizedProposals, setFinalizedProposals] = useState<Proposal[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    initTelegramWebApp();

    const syncUser = () => {
      setTelegramUser(getTelegramUser());
    };

    syncUser();
    const retryTimer = window.setTimeout(syncUser, 600);

    return () => {
      window.clearTimeout(retryTimer);
    };
  }, []);

  async function reloadProposals(): Promise<void> {
    setError(null);
    try {
      const [active, finalized] = await Promise.all([getProposals('active'), getProposals('finalized')]);
      setActiveProposals(active);
      setFinalizedProposals(finalized);
    } catch (err) {
      console.error(err);
      setError('Failed to load proposals from API');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void reloadProposals();
    const timer = setInterval(() => {
      void reloadProposals();
    }, 8000);
    return () => clearInterval(timer);
  }, []);

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

  async function handleCreateProposal(input: {
    title: string;
    description: string;
    deadlineTs: number;
    quorum: number;
  }): Promise<void> {
    const payload = buildCreateProposalPayload(input);
    await sendTransaction(payload, TON_AMOUNTS.CREATE_PROPOSAL);
    await reloadProposals();
  }

  async function handleVote(proposalId: number, support: boolean): Promise<void> {
    const payload = buildCastVotePayload({ proposalId, support });
    await sendTransaction(payload, TON_AMOUNTS.VOTE);
    await reloadProposals();
  }

  async function handleFinalize(proposalId: number): Promise<void> {
    const payload = buildFinalizePayload({ proposalId });
    await sendTransaction(payload, TON_AMOUNTS.FINALIZE);
    await reloadProposals();
  }

  return (
    <main className="app-shell">
      <header className="top-header">
        <div>
          <h1>Student DAO Voting</h1>
          <p className="muted">TON testnet Mini App for proposal creation, voting, and on-chain finalization.</p>
        </div>
        <TonConnectButton />
      </header>

      <ProfileCard user={telegramUser} walletAddress={walletAddress} />

      <section className="card muted-card">
        <p><strong>Contract:</strong> {contractAddress || 'Not configured'}</p>
        <p><strong>Network:</strong> {import.meta.env.VITE_TON_NETWORK || 'testnet'}</p>
      </section>

      <ProposalForm disabled={!walletAddress} onSubmit={handleCreateProposal} />

      {error ? <section className="card error">{error}</section> : null}

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
    </main>
  );
}
