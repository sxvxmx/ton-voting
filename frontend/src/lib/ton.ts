import { beginCell, toNano } from '@ton/core';

export const DAO_OPS = {
  CREATE_PROPOSAL: 0x43524541,
  CAST_VOTE: 0x564f5445,
  FINALIZE_PROPOSAL: 0x46494e41,
} as const;

export const TON_AMOUNTS = {
  CREATE_PROPOSAL: toNano('0.25').toString(),
  VOTE: toNano('0.05').toString(),
  FINALIZE: toNano('0.05').toString(),
} as const;

function toBase64(bytes: Uint8Array): string {
  let binary = '';
  for (const byte of bytes) {
    binary += String.fromCharCode(byte);
  }
  return btoa(binary);
}

function textToCell(value: string) {
  return beginCell().storeStringTail(value).endCell();
}

export function buildCreateProposalPayload(params: {
  deadlineTs: number;
  quorum: number;
  title: string;
  description: string;
}): string {
  const body = beginCell()
    .storeUint(DAO_OPS.CREATE_PROPOSAL, 32)
    .storeUint(params.deadlineTs, 64)
    .storeUint(params.quorum, 32)
    .storeRef(textToCell(params.title))
    .storeRef(textToCell(params.description))
    .endCell();

  return toBase64(body.toBoc());
}

export function buildCastVotePayload(params: { proposalId: number; support: boolean }): string {
  const body = beginCell()
    .storeUint(DAO_OPS.CAST_VOTE, 32)
    .storeUint(params.proposalId, 32)
    .storeBit(params.support)
    .endCell();

  return toBase64(body.toBoc());
}

export function buildFinalizePayload(params: { proposalId: number }): string {
  const body = beginCell()
    .storeUint(DAO_OPS.FINALIZE_PROPOSAL, 32)
    .storeUint(params.proposalId, 32)
    .endCell();

  return toBase64(body.toBoc());
}
