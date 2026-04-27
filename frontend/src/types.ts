export type ProposalStatus = 0 | 1 | 2;

export type Proposal = {
  id: number;
  creator: string;
  title: string;
  description: string;
  deadline_ts: number;
  quorum: number;
  yes_votes: number;
  no_votes: number;
  status: ProposalStatus;
  created_at: number;
  updated_at: number;
};

export type ProposalResult = {
  proposal_id: number;
  yes_votes: number;
  no_votes: number;
  total_votes: number;
  quorum: number;
  status: ProposalStatus;
  passed: boolean;
};

export type TelegramUser = {
  id: number;
  username?: string;
  first_name?: string;
  last_name?: string;
  photo_url?: string;
};
