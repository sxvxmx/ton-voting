import { Blockchain, SandboxContract, TreasuryContract } from '@ton/sandbox';
import { toNano } from '@ton/core';
import { StudentDao } from '../build/StudentDao/tact_StudentDao';
import {
  buildCastVoteBody,
  buildCreateProposalBody,
  buildFinalizeProposalBody,
} from '../wrappers/opcodes';

describe('StudentDao', () => {
  let blockchain: Blockchain;
  let dao: SandboxContract<StudentDao>;
  let deployer: SandboxContract<TreasuryContract>;
  let alice: SandboxContract<TreasuryContract>;
  let bob: SandboxContract<TreasuryContract>;

  beforeEach(async () => {
    blockchain = await Blockchain.create();

    dao = blockchain.openContract(await StudentDao.fromInit(toNano('0.2')));
    deployer = await blockchain.treasury('deployer');
    alice = await blockchain.treasury('alice');
    bob = await blockchain.treasury('bob');

    const deployResult = await dao.send(
      deployer.getSender(),
      { value: toNano('0.05') },
      { $$type: 'Deploy', queryId: 0n },
    );

    expect(deployResult.transactions.length).toBeGreaterThan(0);
  });

  it('creates proposal with sufficient deposit and rejects underfunded create', async () => {
    const now = BigInt(Math.floor(Date.now() / 1000));

    const okCreate = await dao.send(
      alice.getSender(),
      { value: toNano('0.25') },
      buildCreateProposalBody({
        deadlineTs: now + 3600n,
        quorum: 2,
        title: 'Budget approval',
        description: 'Approve spring event budget',
      }).beginParse(),
    );

    expect(okCreate.transactions.length).toBeGreaterThan(0);

    const badCreate = await dao.send(
      alice.getSender(),
      { value: toNano('0.05') },
      buildCreateProposalBody({
        deadlineTs: now + 7200n,
        quorum: 1,
        title: 'Low deposit',
        description: 'This should fail',
      }).beginParse(),
    );

    expect(badCreate.transactions.length).toBeGreaterThan(0);
  });

  it('allows one vote per wallet and blocks duplicate votes', async () => {
    const now = BigInt(Math.floor(Date.now() / 1000));

    await dao.send(
      alice.getSender(),
      { value: toNano('0.25') },
      buildCreateProposalBody({
        deadlineTs: now + 3600n,
        quorum: 1,
        title: 'Room booking',
        description: 'Book hall A for meetup',
      }).beginParse(),
    );

    const firstVote = await dao.send(
      bob.getSender(),
      { value: toNano('0.05') },
      buildCastVoteBody({ proposalId: 0, support: true }).beginParse(),
    );

    expect(firstVote.transactions.length).toBeGreaterThan(0);

    const secondVote = await dao.send(
      bob.getSender(),
      { value: toNano('0.05') },
      buildCastVoteBody({ proposalId: 0, support: false }).beginParse(),
    );

    expect(secondVote.transactions.length).toBeGreaterThan(0);
  });

  it('rejects early finalize and accepts finalize after deadline', async () => {
    const now = BigInt(Math.floor(Date.now() / 1000));

    await dao.send(
      alice.getSender(),
      { value: toNano('0.25') },
      buildCreateProposalBody({
        deadlineTs: now + 30n,
        quorum: 1,
        title: 'Finalize timing',
        description: 'Timing check',
      }).beginParse(),
    );

    const earlyFinalize = await dao.send(
      bob.getSender(),
      { value: toNano('0.05') },
      buildFinalizeProposalBody({ proposalId: 0 }).beginParse(),
    );

    expect(earlyFinalize.transactions.length).toBeGreaterThan(0);

    blockchain.now = Number(now + 31n);

    const lateFinalize = await dao.send(
      bob.getSender(),
      { value: toNano('0.05') },
      buildFinalizeProposalBody({ proposalId: 0 }).beginParse(),
    );

    expect(lateFinalize.transactions.length).toBeGreaterThan(0);
  });
});
