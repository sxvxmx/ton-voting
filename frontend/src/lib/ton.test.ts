import { Cell } from '@ton/core';
import { describe, expect, it } from 'vitest';
import { buildCastVotePayload, buildCreateProposalPayload, buildFinalizePayload, DAO_OPS } from './ton';

function fromBase64(value: string): Uint8Array {
  const binary = atob(value);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

describe('ton payload builders', () => {
  it('encodes create proposal opcode', () => {
    const payload = buildCreateProposalPayload({
      title: 'T',
      description: 'D',
      deadlineTs: 1_900_000_000,
      quorum: 2,
    });

    const root = Cell.fromBoc(fromBase64(payload))[0];
    const slice = root.beginParse();
    expect(Number(slice.loadUint(32))).toBe(DAO_OPS.CREATE_PROPOSAL);
    expect(Number(slice.loadUint(64))).toBe(1_900_000_000);
    expect(Number(slice.loadUint(32))).toBe(2);
  });

  it('encodes vote opcode and bool flag', () => {
    const payload = buildCastVotePayload({ proposalId: 10, support: true });
    const root = Cell.fromBoc(fromBase64(payload))[0];
    const slice = root.beginParse();

    expect(Number(slice.loadUint(32))).toBe(DAO_OPS.CAST_VOTE);
    expect(Number(slice.loadUint(32))).toBe(10);
    expect(slice.loadBit()).toBe(true);
  });

  it('encodes finalize opcode', () => {
    const payload = buildFinalizePayload({ proposalId: 9 });
    const root = Cell.fromBoc(fromBase64(payload))[0];
    const slice = root.beginParse();

    expect(Number(slice.loadUint(32))).toBe(DAO_OPS.FINALIZE_PROPOSAL);
    expect(Number(slice.loadUint(32))).toBe(9);
  });
});
