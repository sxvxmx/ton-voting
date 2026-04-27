import { beginCell, Cell } from '@ton/core';

export const DAO_OPS = {
  CREATE_PROPOSAL: 0x43524541,
  CAST_VOTE: 0x564f5445,
  FINALIZE_PROPOSAL: 0x46494e41,
} as const;

export const DAO_STATUS = {
  ACTIVE: 0,
  PASSED: 1,
  REJECTED: 2,
} as const;

export function toTextCell(value: string): Cell {
  return beginCell().storeStringTail(value).endCell();
}

export function buildCreateProposalBody(params: {
  deadlineTs: bigint;
  quorum: number;
  title: string;
  description: string;
}): Cell {
  return beginCell()
    .storeUint(DAO_OPS.CREATE_PROPOSAL, 32)
    .storeUint(params.deadlineTs, 64)
    .storeUint(params.quorum, 32)
    .storeRef(toTextCell(params.title))
    .storeRef(toTextCell(params.description))
    .endCell();
}

export function buildCastVoteBody(params: { proposalId: number; support: boolean }): Cell {
  return beginCell()
    .storeUint(DAO_OPS.CAST_VOTE, 32)
    .storeUint(params.proposalId, 32)
    .storeBit(params.support)
    .endCell();
}

export function buildFinalizeProposalBody(params: { proposalId: number }): Cell {
  return beginCell()
    .storeUint(DAO_OPS.FINALIZE_PROPOSAL, 32)
    .storeUint(params.proposalId, 32)
    .endCell();
}
