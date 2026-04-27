import axios from 'axios';
import type { Proposal, ProposalResult } from '../types';

const baseURL = import.meta.env.VITE_API_BASE_URL;

const client = axios.create({
  baseURL,
  timeout: 6000,
});

export async function getProposals(status?: 'active' | 'finalized'): Promise<Proposal[]> {
  const response = await client.get<{ items: Proposal[] }>('/proposals', {
    params: status ? { status } : undefined,
  });
  return response.data.items;
}

export async function getProposal(id: number): Promise<Proposal> {
  const response = await client.get<Proposal>(`/proposals/${id}`);
  return response.data;
}

export async function getProposalResults(id: number): Promise<ProposalResult> {
  const response = await client.get<ProposalResult>(`/proposals/${id}/results`);
  return response.data;
}
